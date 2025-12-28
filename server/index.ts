import { createServer } from 'http';
import { Server } from 'socket.io';
import type { ServerToClientEvents, ClientToServerEvents, RoomState } from '../lib/socket-types';
import { Player, checkWinner, getWinningLine } from '../lib/game';
import { validatePlayer, type ValidatedPlayer } from './sdk/player-validator';
import { matchReporter } from './sdk/match-reporter';
import { createRoom, type SDKRoom, type AuthenticatedPlayer } from './types/room-types';

const httpServer = createServer();

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: [
      'http://localhost:3000',
      'https://dev.gamerstake.io',
      'https://gamerstake.io',
      // Vercel deployment URLs (auto-detected)
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '',
      process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : '',
    ].filter(Boolean),
    methods: ['GET', 'POST'],
  },
});

const TURN_TIMEOUT_MS = 30000;
const rooms = new Map<string, SDKRoom>();

// Socket tracking
interface SocketData {
  matchId: string | null;
  playerId: string | null;  // SDK returns string IDs
  symbol: Player | null;
}
const socketData = new Map<string, SocketData>();

// Helper: Convert room to client state
function toClientState(room: SDKRoom): RoomState {
  return {
    matchId: room.matchId,
    board: room.board,
    currentPlayer: room.currentPlayer,
    players: {
      X: room.players.X?.username ?? null,
      O: room.players.O?.username ?? null,
    },
    winner: room.winner,
    winningLine: room.winningLine,
    turnStartedAt: room.turnStartedAt,
    disconnectReason: room.disconnectReason,
    gameStatus: room.gameStatus,
  };
}

// Helper: Clear turn timer
function clearTurnTimer(room: SDKRoom): void {
  if (room.turnTimer) {
    clearTimeout(room.turnTimer);
    room.turnTimer = null;
  }
}

// Helper: Start turn timer
function startTurnTimer(room: SDKRoom): void {
  clearTurnTimer(room);

  if (room.winner || room.gameStatus !== 'playing') {
    return;
  }

  room.turnStartedAt = Date.now();
  const currentPlayer = room.currentPlayer;
  const currentPlayerInfo = room.players[currentPlayer];

  room.turnTimer = setTimeout(async () => {
    const winner: Player = currentPlayer === 'X' ? 'O' : 'X';
    room.winner = winner;
    room.disconnectReason = 'timeout';
    room.turnStartedAt = null;
    room.gameStatus = 'finished';

    // Report to SDK
    const timedOutUsername = currentPlayerInfo?.username || currentPlayer;
    const reason = `Player ${timedOutUsername} timed out - turn limit exceeded`;
    await matchReporter.reportError(room, reason);

    io.to(room.matchId).emit('roomState', toClientState(room));
    console.log(`[Game] ${room.matchId}: ${timedOutUsername} timed out, ${winner} wins`);
  }, TURN_TIMEOUT_MS);
}

// Helper: Start game when both players ready
async function startGameIfReady(room: SDKRoom): Promise<void> {
  if (room.players.X && room.players.O && room.gameStatus === 'waiting') {
    room.gameStatus = 'playing';
    console.log(`[Game] ${room.matchId}: Both players connected, starting game!`);

    // Report to SDK
    await matchReporter.startMatch(room);
    await matchReporter.playerJoined(room, room.players.X);
    await matchReporter.playerJoined(room, room.players.O);

    // Start turn timer
    startTurnTimer(room);
  }
}

// Helper: Assign player to room
function assignPlayer(
  room: SDKRoom,
  player: ValidatedPlayer,
  socketId: string,
  token: string
): Player | null {
  // Check if player already in this room (reconnect)
  if (room.players.X?.id === player.id) {
    room.players.X.socketId = socketId;
    return 'X';
  }
  if (room.players.O?.id === player.id) {
    room.players.O.socketId = socketId;
    return 'O';
  }

  // Assign to empty slot
  const symbol: Player = room.players.X ? 'O' : 'X';

  if (room.players[symbol]) {
    return null; // Room full
  }

  const authPlayer: AuthenticatedPlayer = {
    ...player,
    symbol,
    socketId,
    token,
  };

  room.players[symbol] = authPlayer;
  return symbol;
}

// Connection handler
io.on('connection', (socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);

  socketData.set(socket.id, {
    matchId: null,
    playerId: null,
    symbol: null,
  });

  // JOIN MATCH - main entry point
  socket.on('joinMatch', async (matchId: string, token: string) => {
    console.log(`[Socket] joinMatch request: ${matchId}`);

    // Validate inputs
    if (!matchId || typeof matchId !== 'string') {
      socket.emit('matchError', 'Match ID is required');
      return;
    }

    if (!token || typeof token !== 'string') {
      socket.emit('matchError', 'Authentication token is required');
      return;
    }

    // Validate token with SDK
    const player = await validatePlayer(token);
    if (!player) {
      socket.emit('matchError', 'Invalid or expired token');
      return;
    }

    // Get or create room
    let room = rooms.get(matchId);
    if (!room) {
      room = createRoom(matchId);
      rooms.set(matchId, room);
      console.log(`[Room] Created: ${matchId}`);
    }

    // Check if game already finished
    if (room.gameStatus === 'finished') {
      socket.emit('matchError', 'This match has already ended');
      return;
    }

    // Assign player to room
    const symbol = assignPlayer(room, player, socket.id, token);
    if (!symbol) {
      socket.emit('matchError', 'Match is full');
      return;
    }

    // Update socket tracking
    const data = socketData.get(socket.id);
    if (data) {
      data.matchId = matchId;
      data.playerId = player.id;
      data.symbol = symbol;
    }

    // Join socket room
    socket.join(matchId);

    // Emit success to this player
    socket.emit('matchJoined', {
      id: player.id,
      username: player.username,
      symbol,
    });

    console.log(`[Room] ${matchId}: ${player.username} joined as ${symbol}`);

    // Start game if both players ready
    await startGameIfReady(room);

    // Broadcast room state to all in room
    io.to(matchId).emit('roomState', toClientState(room));
  });

  // MAKE MOVE
  socket.on('makeMove', async (index: number) => {
    const data = socketData.get(socket.id);
    if (!data?.matchId || !data?.symbol) return;

    const room = rooms.get(data.matchId);
    if (!room) return;

    // Validations
    if (room.gameStatus !== 'playing') return;
    if (room.winner) return;
    if (room.currentPlayer !== data.symbol) return;
    if (index < 0 || index > 8) return;
    if (room.board[index] !== '') return;

    // Make move
    room.board[index] = data.symbol;
    room.winner = checkWinner(room.board);
    room.winningLine = room.winner && room.winner !== 'draw' ? getWinningLine(room.board) : null;
    room.currentPlayer = data.symbol === 'X' ? 'O' : 'X';
    room.disconnectReason = null;

    if (room.winner) {
      clearTurnTimer(room);
      room.turnStartedAt = null;
      room.gameStatus = 'finished';

      // Report result to SDK
      await matchReporter.reportResult(room, room.winner);
      console.log(`[Game] ${data.matchId}: Game over, winner: ${room.winner}`);
    } else {
      startTurnTimer(room);
    }

    io.to(data.matchId).emit('roomState', toClientState(room));
  });

  // DISCONNECT
  socket.on('disconnect', async () => {
    console.log(`[Socket] Disconnected: ${socket.id}`);

    const data = socketData.get(socket.id);
    if (!data?.matchId || !data?.symbol) {
      socketData.delete(socket.id);
      return;
    }

    const room = rooms.get(data.matchId);
    if (!room) {
      socketData.delete(socket.id);
      return;
    }

    const disconnectedPlayer = room.players[data.symbol];

    // Clear player from room
    room.players[data.symbol] = null;

    // If both gone, delete room
    if (!room.players.X && !room.players.O) {
      clearTurnTimer(room);
      rooms.delete(data.matchId);
      console.log(`[Room] Deleted: ${data.matchId} - all players left`);
      socketData.delete(socket.id);
      return;
    }

    // If game was in progress, other player wins
    if (room.gameStatus === 'playing' && !room.winner) {
      const winner: Player = data.symbol === 'X' ? 'O' : 'X';
      room.winner = winner;
      room.disconnectReason = 'disconnect';
      room.gameStatus = 'finished';
      clearTurnTimer(room);
      room.turnStartedAt = null;

      // Report error to SDK
      const disconnectedUsername = disconnectedPlayer?.username || data.symbol;
      const reason = `Player ${disconnectedUsername} disconnected during active match`;
      await matchReporter.reportError(room, reason);

      console.log(`[Game] ${data.matchId}: ${disconnectedUsername} disconnected, ${winner} wins`);
    }

    io.to(data.matchId).emit('roomState', toClientState(room));
    socketData.delete(socket.id);
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`[Server] XO Game server running on port ${PORT}`);
});
