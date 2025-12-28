# 🔧 Iteration 2: Server Refactor

**Estimated duration**: ~3 hours
**Priority**: P0
**Depends on**: Iteration 1

---

## 📋 Prerequisites

- [x] Iteration 1 completed
- [x] SDK installed
- [x] Old event handlers removed

---

## 📁 Files

### To Create
```
server/
├── types/
│   └── room-types.ts          # NEW
```

### To Modify
```
server/index.ts                 # ADD joinMatch handler
```

---

## 🔨 Step 1: Room Types

### `server/types/room-types.ts`

```typescript
import { Board, Player, Winner } from '../../lib/game';
import type { ValidatedPlayer } from '../sdk/player-validator';

export interface AuthenticatedPlayer extends ValidatedPlayer {
  symbol: Player;
  socketId: string;
  token: string;
}

export interface SDKState {
  matchStarted: boolean;
  matchEnded: boolean;
  playersReported: Set<number>;
}

export interface SDKRoom {
  matchId: string;
  board: Board;
  currentPlayer: Player;
  winner: Winner;
  winningLine: number[] | null;
  turnStartedAt: number | null;
  disconnectReason: 'timeout' | 'disconnect' | null;
  gameStatus: 'waiting' | 'playing' | 'finished';
  players: {
    X: AuthenticatedPlayer | null;
    O: AuthenticatedPlayer | null;
  };
  turnTimer: NodeJS.Timeout | null;
  sdkState: SDKState;
}

export function createRoom(matchId: string): SDKRoom {
  return {
    matchId,
    board: ['', '', '', '', '', '', '', '', ''],
    currentPlayer: 'X',
    winner: null,
    winningLine: null,
    turnStartedAt: null,
    disconnectReason: null,
    gameStatus: 'waiting',
    players: { X: null, O: null },
    turnTimer: null,
    sdkState: {
      matchStarted: false,
      matchEnded: false,
      playersReported: new Set(),
    },
  };
}
```

---

## 🔨 Step 2: Refactored Server

### `server/index.ts` - Complete New Version

```typescript
import { createServer } from 'http';
import { Server } from 'socket.io';
import type { ServerToClientEvents, ClientToServerEvents, RoomState } from '../lib/socket-types';
import { Player, checkWinner, getWinningLine } from '../lib/game';
import { validatePlayer } from './sdk/player-validator';
import { createRoom, type SDKRoom, type AuthenticatedPlayer } from './types/room-types';

const httpServer = createServer();

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: [
      'http://localhost:3000',
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '',
    ].filter(Boolean),
    methods: ['GET', 'POST'],
  },
});

const TURN_TIMEOUT_MS = 30000;
const rooms = new Map<string, SDKRoom>();

// Socket tracking
interface SocketData {
  matchId: string | null;
  playerId: number | null;
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

  room.turnTimer = setTimeout(() => {
    const winner: Player = room.currentPlayer === 'X' ? 'O' : 'X';
    room.winner = winner;
    room.disconnectReason = 'timeout';
    room.turnStartedAt = null;
    room.gameStatus = 'finished';

    io.to(room.matchId).emit('roomState', toClientState(room));
    console.log(`[Game] ${room.matchId}: ${room.currentPlayer} timed out`);

    // TODO I3: reportMatchError
  }, TURN_TIMEOUT_MS);
}

// Helper: Start game when both players ready
function startGameIfReady(room: SDKRoom): void {
  if (room.players.X && room.players.O && room.gameStatus === 'waiting') {
    room.gameStatus = 'playing';
    startTurnTimer(room);
    console.log(`[Game] ${room.matchId}: Game started!`);

    // TODO I3: reportMatchStart + reportPlayerJoin
  }
}

// Helper: Assign player to room
function assignPlayer(
  room: SDKRoom,
  player: ValidatedPlayer,
  socketId: string,
  token: string
): Player | null {
  // Check if player already in this room
  if (room.players.X?.id === player.id) return 'X';
  if (room.players.O?.id === player.id) return 'O';

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

  // JOIN MATCH - only way for player to connect
  socket.on('joinMatch', async (matchId: string, token: string) => {
    console.log(`[Socket] joinMatch: ${matchId}`);

    // Validate inputs
    if (!matchId || !token) {
      socket.emit('matchError', 'Match ID and token are required');
      return;
    }

    // Validate token
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

    // Assign player
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

    // Emit success
    socket.emit('matchJoined', {
      id: player.id,
      username: player.username,
      symbol,
    });

    // Start game if both players ready
    startGameIfReady(room);

    // Broadcast room state
    io.to(matchId).emit('roomState', toClientState(room));
    console.log(`[Room] ${matchId}: ${player.username} joined as ${symbol}`);
  });

  // MAKE MOVE
  socket.on('makeMove', (index: number) => {
    const data = socketData.get(socket.id);
    if (!data?.matchId || !data?.symbol) return;

    const room = rooms.get(data.matchId);
    if (!room) return;

    // Validations
    if (room.gameStatus !== 'playing') return;
    if (room.winner) return;
    if (room.currentPlayer !== data.symbol) return;
    if (room.board[index] !== '') return;

    // Make move
    room.board[index] = data.symbol;
    room.winner = checkWinner(room.board);
    room.winningLine = room.winner && room.winner !== 'draw'
      ? getWinningLine(room.board)
      : null;
    room.currentPlayer = data.symbol === 'X' ? 'O' : 'X';
    room.disconnectReason = null;

    if (room.winner) {
      clearTurnTimer(room);
      room.turnStartedAt = null;
      room.gameStatus = 'finished';

      // TODO I3: reportMatchResult
    } else {
      startTurnTimer(room);
    }

    io.to(data.matchId).emit('roomState', toClientState(room));
  });

  // DISCONNECT
  socket.on('disconnect', () => {
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

    // Clear player from room
    room.players[data.symbol] = null;

    // If both gone, delete room
    if (!room.players.X && !room.players.O) {
      clearTurnTimer(room);
      rooms.delete(data.matchId);
      console.log(`[Room] Deleted: ${data.matchId}`);
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

      console.log(`[Game] ${data.matchId}: ${data.symbol} disconnected`);

      // TODO I3: reportMatchError
    }

    io.to(data.matchId).emit('roomState', toClientState(room));
    socketData.delete(socket.id);
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`[Server] Running on port ${PORT}`);
});
```

---

## ✅ Verification

### Test 1: joinMatch with valid token
```javascript
socket.emit('joinMatch', 'test-match', 'valid.jwt.token');
// Expected: matchJoined event with player info
```

### Test 2: joinMatch with invalid token
```javascript
socket.emit('joinMatch', 'test-match', 'invalid');
// Expected: matchError('Invalid or expired token')
```

### Test 3: Two players
```javascript
// Player 1
socket1.emit('joinMatch', 'test-match', 'token1');
// Expected: matchJoined, gameStatus: 'waiting'

// Player 2
socket2.emit('joinMatch', 'test-match', 'token2');
// Expected: matchJoined, gameStatus: 'playing'
```

### Test 4: Room full
```javascript
// Player 3 tries
socket3.emit('joinMatch', 'test-match', 'token3');
// Expected: matchError('Match is full')
```

---

## 📝 Checklist

- [x] `server/types/room-types.ts` created
- [x] `server/index.ts` refactored
- [x] `joinMatch` event works
- [x] Token validation works
- [x] Auto-start when both players present
- [x] Disconnect handling works
- [x] `makeMove` still works

---

## 📝 Next Step

→ `04-iteration-3-error-handling.md`
