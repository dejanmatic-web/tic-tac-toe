# 🧹 Iteration 1: Cleanup + SDK Setup

**Estimated duration**: ~2 hours
**Priority**: P0 (Blocks everything else)

---

## 📋 Prerequisites

- [x] Node.js 18+ installed
- [ ] Access to GamerStake API key
- [x] Understanding of new flow (platform → game)

---

## 📁 Files

### To Create
```
server/
├── sdk/
│   ├── sdk-client.ts          # NEW
│   └── player-validator.ts    # NEW
.env.local                      # NEW
.env.example                    # NEW
```

### To Modify
```
server/index.ts                 # REMOVE createRoom, joinRoom
app/game/[roomId]/page.tsx     # RENAME folder + REMOVE lobby UI
lib/socket-types.ts            # REMOVE old events
```

### To Rename
```
app/game/[roomId]/ → app/game/[matchId]/
```

---

## 🔨 Step 1: Install SDK

```bash
npm install @gamerstake/game-platform-sdk
```

**Verification:**
```bash
npm ls @gamerstake/game-platform-sdk
```

---

## 🔨 Step 2: Environment Variables

### `.env.example`
```env
# GamerStake SDK Configuration
GAMERSTAKE_API_KEY=your_api_key_here
GAMERSTAKE_ENVIRONMENT=development
NEXT_PUBLIC_PLATFORM_URL=https://dev.gamerstake.io
```

### `.env.local`
```env
GAMERSTAKE_API_KEY=actual_dev_api_key
GAMERSTAKE_ENVIRONMENT=development
NEXT_PUBLIC_PLATFORM_URL=https://dev.gamerstake.io
```

---

## 🔨 Step 3: SDK Client

### `server/sdk/sdk-client.ts`

```typescript
import { GameSDK, type Environment } from '@gamerstake/game-platform-sdk';

let sdkInstance: GameSDK | null = null;

export function getSDKInstance(): GameSDK {
  if (!sdkInstance) {
    const apiKey = process.env.GAMERSTAKE_API_KEY;
    const environment = (process.env.GAMERSTAKE_ENVIRONMENT || 'development') as Environment;

    if (!apiKey) {
      throw new Error('GAMERSTAKE_API_KEY is not set');
    }

    sdkInstance = new GameSDK({
      apiKey,
      environment,
      debug: process.env.NODE_ENV !== 'production',
    });

    console.log(`[SDK] Initialized in ${environment} mode`);
  }

  return sdkInstance;
}
```

---

## 🔨 Step 4: Player Validator

### `server/sdk/player-validator.ts`

```typescript
import { getSDKInstance } from './sdk-client';
import { AuthenticationError } from '@gamerstake/game-platform-sdk';

export interface ValidatedPlayer {
  id: number;
  username: string;
  validatedAt: number;
}

const playerCache = new Map<string, ValidatedPlayer>();
const CACHE_TTL_MS = 60 * 1000;

export async function validatePlayer(token: string): Promise<ValidatedPlayer | null> {
  // Check cache
  const cached = playerCache.get(token);
  if (cached && Date.now() - cached.validatedAt < CACHE_TTL_MS) {
    return cached;
  }

  try {
    const sdk = getSDKInstance();
    const identity = await sdk.validatePlayerToken(token);

    const player: ValidatedPlayer = {
      id: identity.id,
      username: identity.username,
      validatedAt: Date.now(),
    };

    playerCache.set(token, player);
    console.log(`[Auth] Validated: ${identity.username} (${identity.id})`);

    return player;
  } catch (error) {
    if (error instanceof AuthenticationError) {
      console.log(`[Auth] Invalid token: ${error.message}`);
    } else {
      console.error(`[Auth] Error:`, error);
    }
    return null;
  }
}
```

---

## 🔨 Step 5: Remove from Server

### `server/index.ts` - REMOVE these event handlers:

```typescript
// REMOVE ENTIRE BLOCK:
socket.on('createRoom', (roomId) => {
  // ... all code ...
});

// REMOVE ENTIRE BLOCK:
socket.on('joinRoom', (roomId) => {
  // ... all code ...
});

// REMOVE ENTIRE BLOCK:
socket.on('rejoinRoom', (roomId) => {
  // ... all code ...
});

// REMOVE OR MODIFY:
socket.on('restartGame', () => {
  // Consider if this is needed
  // Probably NOT - new game = new room on platform
});
```

---

## 🔨 Step 6: Update Socket Types

### `lib/socket-types.ts` - New version:

```typescript
import { Board, Player, Winner } from './game';

export interface PlayerInfo {
  id: number;
  username: string;
  symbol: Player;
}

export interface RoomState {
  matchId: string;
  board: Board;
  currentPlayer: Player;
  players: {
    X: string | null;  // username
    O: string | null;  // username
  };
  winner: Winner;
  winningLine: number[] | null;
  turnStartedAt: number | null;
  disconnectReason: 'timeout' | 'disconnect' | null;
  gameStatus: 'waiting' | 'playing' | 'finished';
}

export interface ServerToClientEvents {
  roomState: (state: RoomState) => void;
  matchJoined: (player: PlayerInfo) => void;
  matchError: (message: string) => void;
}

export interface ClientToServerEvents {
  joinMatch: (matchId: string, token: string) => void;
  makeMove: (index: number) => void;
  // REMOVED: createRoom, joinRoom, rejoinRoom, restartGame
}
```

---

## 🔨 Step 7: Rename Folder

```bash
# Rename folder
mv app/game/[roomId] app/game/[matchId]
```

---

## 🔨 Step 8: Clean Frontend

### `app/game/[matchId]/page.tsx` - REMOVE:

```typescript
// REMOVE these functions:
const handleCreate = useCallback(() => { ... }, []);
const handleJoin = useCallback(() => { ... }, []);
const handleCopyCode = useCallback(() => { ... }, []);
const handleShare = useCallback(() => { ... }, []);

// REMOVE these states:
const [isCreating, setIsCreating] = useState(false);
const [copied, setCopied] = useState(false);

// REMOVE socket event handlers:
socket.on('playerAssigned', ...);  // replaced with matchJoined

// REMOVE socket emits:
newSocket.emit('rejoinRoom', roomId);
socket.emit('createRoom', roomId);
socket.emit('joinRoom', roomId);
socket.emit('restartGame');

// REMOVE ENTIRE LOBBY UI BLOCK (if (!roomState) return ...)
// That's the large JSX block with Create/Join buttons
```

---

## ✅ Verification

### Checklist

- [x] SDK installed (`npm ls @gamerstake/game-platform-sdk`)
- [x] `.env.local` created
- [x] `server/sdk/sdk-client.ts` exists
- [x] `server/sdk/player-validator.ts` exists
- [x] `createRoom` removed from server
- [x] `joinRoom` removed from server
- [x] `rejoinRoom` removed from server
- [x] Lobby UI removed from frontend
- [x] Folder renamed to `[matchId]`
- [x] `socket-types.ts` updated

### State After This Iteration

Server has:
- ❌ `createRoom` - REMOVED
- ❌ `joinRoom` - REMOVED
- ❌ `rejoinRoom` - REMOVED
- ✅ `makeMove` - STAYS
- ⏳ `joinMatch` - WILL BE IN I2
- ✅ Disconnect handling - STAYS

Frontend has:
- ❌ Lobby UI - REMOVED
- ❌ Create/Join buttons - REMOVED
- ✅ Game board - STAYS
- ⏳ Auto-join - WILL BE IN I4

---

## 📝 Next Step

→ `03-iteration-2-match-lifecycle.md`
