import { createServer } from 'http';
import { Server } from 'socket.io';
import type { ServerToClientEvents, ClientToServerEvents, RoomState } from '../lib/socket-types';
import { Board, Player, checkWinner, getWinningLine } from '../lib/game';

const httpServer = createServer();

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

const TURN_TIMEOUT_MS = 30000;

interface Room {
  state: RoomState;
  playerSockets: { X: string | null; O: string | null };
  turnTimer: NodeJS.Timeout | null;
}

const rooms = new Map<string, Room>();

function createEmptyBoard(): Board {
  return ['', '', '', '', '', '', '', '', ''];
}

function createRoom(roomId: string): Room {
  return {
    state: {
      roomId,
      board: createEmptyBoard(),
      currentPlayer: 'X',
      players: { X: null, O: null },
      winner: null,
      winningLine: null,
      turnStartedAt: null,
      disconnectReason: null,
    },
    playerSockets: { X: null, O: null },
    turnTimer: null,
  };
}

function clearTurnTimer(room: Room) {
  if (room.turnTimer) {
    clearTimeout(room.turnTimer);
    room.turnTimer = null;
  }
}

function startTurnTimer(room: Room, roomId: string) {
  clearTurnTimer(room);

  if (room.state.winner || !room.state.players.X || !room.state.players.O) {
    return;
  }

  room.state.turnStartedAt = Date.now();

  room.turnTimer = setTimeout(() => {
    const winner: Player = room.state.currentPlayer === 'X' ? 'O' : 'X';
    room.state.winner = winner;
    room.state.disconnectReason = 'timeout';
    room.state.turnStartedAt = null;
    io.to(roomId).emit('roomState', room.state);
    console.log(`Room ${roomId}: ${room.state.currentPlayer} timed out, ${winner} wins`);
  }, TURN_TIMEOUT_MS);
}

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  let currentRoomId: string | null = null;
  let currentPlayer: Player | null = null;

  socket.on('createRoom', (roomId) => {
    if (rooms.has(roomId)) {
      socket.emit('error', 'Room already exists');
      return;
    }

    const room = createRoom(roomId);
    room.state.players.X = socket.id;
    room.playerSockets.X = socket.id;
    rooms.set(roomId, room);

    currentRoomId = roomId;
    currentPlayer = 'X';

    socket.join(roomId);
    socket.emit('playerAssigned', 'X');
    io.to(roomId).emit('roomState', room.state);

    console.log(`Room ${roomId} created by ${socket.id}`);
  });

  socket.on('joinRoom', (roomId) => {
    const room = rooms.get(roomId);

    if (!room) {
      socket.emit('error', 'Room not found');
      return;
    }

    if (room.state.players.X && room.state.players.O) {
      socket.emit('error', 'Room is full');
      return;
    }

    const assignedPlayer: Player = room.state.players.X ? 'O' : 'X';
    room.state.players[assignedPlayer] = socket.id;
    room.playerSockets[assignedPlayer] = socket.id;

    currentRoomId = roomId;
    currentPlayer = assignedPlayer;

    socket.join(roomId);
    socket.emit('playerAssigned', assignedPlayer);

    if (room.state.players.X && room.state.players.O && !room.state.winner) {
      startTurnTimer(room, roomId);
    }

    io.to(roomId).emit('roomState', room.state);

    console.log(`${socket.id} joined room ${roomId} as ${assignedPlayer}`);
  });

  socket.on('rejoinRoom', (roomId) => {
    const room = rooms.get(roomId);

    if (!room) {
      socket.emit('error', 'Room not found');
      return;
    }

    let assignedPlayer: Player | null = null;

    if (!room.state.players.X && room.playerSockets.X === null) {
      assignedPlayer = 'X';
    } else if (!room.state.players.O && room.playerSockets.O === null) {
      assignedPlayer = 'O';
    } else if (!room.state.players.X) {
      assignedPlayer = 'X';
    } else if (!room.state.players.O) {
      assignedPlayer = 'O';
    }

    if (!assignedPlayer) {
      socket.emit('error', 'Room is full');
      return;
    }

    room.state.players[assignedPlayer] = socket.id;
    room.playerSockets[assignedPlayer] = socket.id;

    currentRoomId = roomId;
    currentPlayer = assignedPlayer;

    socket.join(roomId);
    socket.emit('playerAssigned', assignedPlayer);

    if (room.state.players.X && room.state.players.O && !room.state.winner) {
      startTurnTimer(room, roomId);
    }

    io.to(roomId).emit('roomState', room.state);

    console.log(`${socket.id} rejoined room ${roomId} as ${assignedPlayer}`);
  });

  socket.on('makeMove', (index) => {
    if (!currentRoomId || !currentPlayer) return;

    const room = rooms.get(currentRoomId);
    if (!room) return;

    const { state } = room;

    if (state.winner) return;
    if (state.currentPlayer !== currentPlayer) return;
    if (state.board[index] !== '') return;

    state.board[index] = currentPlayer;
    state.winner = checkWinner(state.board);
    state.winningLine = state.winner && state.winner !== 'draw' ? getWinningLine(state.board) : null;
    state.currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
    state.disconnectReason = null;

    if (state.winner) {
      clearTurnTimer(room);
      state.turnStartedAt = null;
    } else {
      startTurnTimer(room, currentRoomId);
    }

    io.to(currentRoomId).emit('roomState', state);
  });

  socket.on('restartGame', () => {
    if (!currentRoomId) return;

    const room = rooms.get(currentRoomId);
    if (!room) return;

    room.state.board = createEmptyBoard();
    room.state.currentPlayer = 'X';
    room.state.winner = null;
    room.state.winningLine = null;
    room.state.disconnectReason = null;

    if (room.state.players.X && room.state.players.O) {
      startTurnTimer(room, currentRoomId);
    } else {
      room.state.turnStartedAt = null;
    }

    io.to(currentRoomId).emit('roomState', room.state);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);

    if (currentRoomId) {
      const room = rooms.get(currentRoomId);
      if (room && currentPlayer) {
        room.state.players[currentPlayer] = null;
        room.playerSockets[currentPlayer] = null;

        if (!room.state.players.X && !room.state.players.O) {
          clearTurnTimer(room);
          rooms.delete(currentRoomId);
          console.log(`Room ${currentRoomId} deleted`);
        } else {
          clearTurnTimer(room);
          room.state.turnStartedAt = null;

          if (!room.state.winner && room.state.board.some((cell) => cell !== '')) {
            const winner: Player = currentPlayer === 'X' ? 'O' : 'X';
            room.state.winner = winner;
            room.state.disconnectReason = 'disconnect';
            console.log(`Room ${currentRoomId}: ${currentPlayer} disconnected, ${winner} wins`);
          }

          io.to(currentRoomId).emit('roomState', room.state);
        }
      }
    }
  });
});

const PORT = 3001;
httpServer.listen(PORT, () => {
  console.log(`Socket.io server running on port ${PORT}`);
});
