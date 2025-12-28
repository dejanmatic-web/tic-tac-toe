# 🏗️ SDK Integration Architecture

---

## 📐 High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SYSTEM OVERVIEW                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────┐                                                         │
│  │   GAMERSTAKE   │                                                         │
│  │   PLATFORM     │                                                         │
│  │  ────────────  │                                                         │
│  │ • Lobby UI     │                                                         │
│  │ • Matchmaking  │                                                         │
│  │ • Token gen    │                                                         │
│  └───────┬────────┘                                                         │
│          │                                                                   │
│          │ Redirect: /game/{matchId}?token={jwt}                            │
│          ▼                                                                   │
│  ┌──────────────┐         ┌──────────────────┐         ┌────────────────┐  │
│  │   Browser    │ WS/HTTP │   Game Server    │  HTTP   │  GamerStake    │  │
│  │   (Next.js)  │◄───────►│   (Node.js)      │◄───────►│  Platform API  │  │
│  │              │         │                  │         │                │  │
│  └──────────────┘         └──────────────────┘         └────────────────┘  │
│        │                          │                            │           │
│        │                          │                            │           │
│        ▼                          ▼                            ▼           │
│  ┌──────────────┐         ┌──────────────────┐         ┌────────────────┐  │
│  │ URL Params   │         │ SDK Wrapper      │         │ Match/Payout   │  │
│  │ matchId+token│         │ (GameSDK)        │         │ Processing     │  │
│  └──────────────┘         └──────────────────┘         └────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 New File Structure

```
server/
├── index.ts                    # Main entry point (SIGNIFICANTLY MODIFIED)
├── sdk/
│   ├── sdk-client.ts          # SDK singleton wrapper
│   ├── match-reporter.ts      # Match lifecycle reporting
│   └── player-validator.ts    # Token validation wrapper
├── types/
│   └── room-types.ts          # SDK-related TypeScript types
└── utils/
    └── error-handler.ts       # SDK error handling utilities

lib/
├── game.ts                    # (unchanged)
└── socket-types.ts            # (SIGNIFICANTLY MODIFIED)

app/
└── game/
    └── [matchId]/             # RENAMED from [roomId]
        └── page.tsx           # (SIGNIFICANTLY MODIFIED - no lobby UI)
```

---

## 🔄 Flow Diagram

### Complete User Flow

```
┌─────────┐          ┌─────────┐          ┌─────────┐          ┌─────────┐
│PLATFORM │          │ Browser │          │ Server  │          │   SDK   │
└────┬────┘          └────┬────┘          └────┬────┘          └────┬────┘
     │                    │                    │                    │
     │ User in lobby      │                    │                    │
     │ Match found        │                    │                    │
     │                    │                    │                    │
     │ Redirect ─────────►│                    │                    │
     │ /game/xyz?token=abc│                    │                    │
     │                    │                    │                    │
     │                    │ Connect + joinMatch│                    │
     │                    │───────────────────►│                    │
     │                    │                    │                    │
     │                    │                    │ validatePlayerToken│
     │                    │                    │───────────────────►│
     │                    │                    │◄─PlayerIdentity────│
     │                    │                    │                    │
     │                    │◄──matchJoined──────│                    │
     │                    │                    │                    │
     ═══════════════════════════════════════════════════════════════
     ║              Second player connects                         ║
     ═══════════════════════════════════════════════════════════════
     │                    │                    │                    │
     │                    │                    │ reportMatchStart   │
     │                    │                    │───────────────────►│
     │                    │                    │                    │
     │                    │                    │ reportPlayerJoin x2│
     │                    │                    │───────────────────►│
     │                    │                    │                    │
     │                    │◄───roomState───────│                    │
     │                    │  (game starts)     │                    │
     │                    │                    │                    │
     ═══════════════════════════════════════════════════════════════
     ║                    GAMEPLAY                                  ║
     ═══════════════════════════════════════════════════════════════
     │                    │                    │                    │
     │                    │                    │ reportMatchResult  │
     │                    │                    │───────────────────►│
     │                    │                    │                    │
     │◄───────────────────│ Redirect (optional)│                    │
```

---

## 🔧 Components

### 1. URL Handler (Frontend)

```typescript
// app/game/[matchId]/page.tsx
export default function GamePage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const matchId = params.matchId as string;
  const token = searchParams.get('token');

  // No token? Error view
  if (!token) {
    return <NoTokenError />;
  }

  // Auto-join
  useEffect(() => {
    socket.emit('joinMatch', matchId, token);
  }, []);
}
```

### 2. Join Match Handler (Server)

```typescript
// server/index.ts
socket.on('joinMatch', async (matchId: string, token: string) => {
  // 1. Validate token
  const player = await validatePlayer(token);
  if (!player) {
    socket.emit('matchError', 'Invalid token');
    return;
  }

  // 2. Find or create room
  let room = rooms.get(matchId);
  if (!room) {
    room = createRoom(matchId);
    rooms.set(matchId, room);
  }

  // 3. Assign player
  const symbol = assignPlayer(room, player, socket.id);
  if (!symbol) {
    socket.emit('matchError', 'Room is full');
    return;
  }

  // 4. Join socket room
  socket.join(matchId);
  socket.emit('matchJoined', { ...player, symbol });

  // 5. If both present, start match
  if (room.players.X && room.players.O) {
    await startMatchIfReady(room);
  }

  io.to(matchId).emit('roomState', toClientState(room));
});
```

### 3. SDK Match Reporter

```typescript
// server/sdk/match-reporter.ts
class MatchReporter {
  async startMatch(room: SDKRoom): Promise<boolean>;
  async playerJoined(room: SDKRoom, player: AuthPlayer): Promise<boolean>;
  async reportResult(room: SDKRoom, winner: Winner): Promise<boolean>;
  async reportError(room: SDKRoom, reason: string): Promise<boolean>;
}
```

---

## 📝 Extended Socket Types

```typescript
// lib/socket-types.ts

export interface PlayerInfo {
  id: number;          // GamerStake user ID
  username: string;    // GamerStake username
  symbol: Player;      // 'X' | 'O'
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

## ⚙️ Configuration

### Environment Variables

```env
# .env.local (development)
GAMERSTAKE_API_KEY=dev_api_key_here
GAMERSTAKE_ENVIRONMENT=development
NEXT_PUBLIC_PLATFORM_URL=https://dev.gamerstake.io

# Production (Vercel)
GAMERSTAKE_API_KEY=prod_api_key_here
GAMERSTAKE_ENVIRONMENT=production
NEXT_PUBLIC_PLATFORM_URL=https://gamerstake.io
```

### CORS Config (Server)

```typescript
const io = new Server(httpServer, {
  cors: {
    origin: [
      'http://localhost:3000',           // Local dev
      'https://xy-game.vercel.app',      // Production
      'https://dev.gamerstake.io',       // Platform dev
      'https://gamerstake.io',           // Platform prod
    ],
    methods: ['GET', 'POST'],
  },
});
```

---

## 🔐 Security Considerations

1. **Token Validation**
   - EVERY request must have a valid token
   - Reject connections without token
   - Cache validated tokens (60s TTL)

2. **API Key Protection**
   - Never expose API key to client
   - Only server communicates with SDK

3. **Match Integrity**
   - Idempotent SDK calls (no duplicates)
   - Server is the only reporter

---

## 📊 Error Handling

```
Token Error         → matchError('Invalid or expired token')
                    → UI: Show error, link to platform

Room Full           → matchError('Match is full')
                    → UI: Show error, link to platform

SDK Network Error   → Retry with backoff
                    → Log for monitoring
                    → Game continues (graceful degradation)

Player Disconnect   → reportMatchError to SDK
                    → Other player wins
                    → UI: Show result

Player Timeout      → reportMatchError to SDK
                    → Other player wins
                    → UI: Show result
```

---

## 📝 Next Step

See → `02-data-models.md` for data models, or `N3-implementation/01-iteration-plan.md` for implementation plan.
