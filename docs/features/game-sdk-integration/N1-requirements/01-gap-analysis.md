# 📋 Gap Analysis: Current State vs SDK Requirements

> **Date**: December 2025
> **SDK Version**: 1.0.5

---

## 🌐 Understanding the Architecture

### GamerStake Platform vs Game

```
┌─────────────────────────────────────────────────────────────────────┐
│  GAMERSTAKE PLATFORM (dev.gamerstake.io)                           │
│  ─────────────────────────────────────────                          │
│  • Game registration (admin panel)                                 │
│  • Game Rooms list                                                 │
│  • Create Private Room                                              │
│  • Lobby UI + Matchmaking                                           │
│  • Stake/Currency handling                                          │
│  • Token generation                                                │
│  • Redirect to game when all players are ready                       │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ Redirect with token
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  GAME (xy-game.vercel.app)                                        │
│  ───────────────────────────                                        │
│  • Receives matchId and token from URL                              │
│  • Validates token (SDK)                                             │
│  • Gameplay                                                         │
│  • SDK Reporting (start, join, result, error)                       │
└─────────────────────────────────────────────────────────────────────┘
```

### Platform URL Structure

```
dev.gamerstake.io/games/{game-slug}/lobby/{lobbyId}
                        ↑                  ↑
                   game slug          lobby ID

Examples:
- /games/lie-dice/lobby/14
- /games/rock-paper-scissors-ultimate/lobby/9
- /games/xo-game/lobby/123  ← Our game
```

---

## 🔍 Current State Overview

### Game (XO Game)

| Aspect            | Current State             |
| ----------------- | ------------------------- |
| **Type**          | Tic-Tac-Toe (1v1 PvP)     |
| **Matchmaking**   | ❌ In-game (WRONG)        |
| **Communication** | Socket.io (WebSocket)     |
| **Server**        | Node.js (source of truth) |
| **Frontend**      | Next.js + React           |

### ❌ Problem: Game Has Its Own Lobby

Current code has:

```typescript
// WRONG - the PLATFORM does this, not the game!
socket.emit("createRoom", roomId);
socket.emit("joinRoom", roomId);
```

```tsx
// WRONG - the game SHOULD NOT have lobby UI!
<button onClick={handleCreate}>Create Room</button>
<button onClick={handleJoin}>Join Room</button>
```

---

## 🎯 Correct Flow

### Step by Step

```
1. PLATFORM: User opens /games/xo-game
2. PLATFORM: User creates room or joins existing one
3. PLATFORM: Lobby page (/games/xo-game/lobby/123)
   - "Players in Lobby: 1"
   - "Searching for Match: 1/2 needed"
4. PLATFORM: Second player joins
   - "Players in Lobby: 2"
   - Match found!
5. PLATFORM: Generates tokens for both players
6. PLATFORM: Redirects both to:
   https://xy-game.vercel.app/game/{matchId}?token={jwt}
7. GAME: Receives matchId and token
8. GAME: Validates token (SDK)
9. GAME: Both players automatically connect
10. GAME: reportMatchStart + reportPlayerJoin
11. GAME: Gameplay
12. GAME: reportMatchResult
13. GAME: Redirect back to platform (optional)
```

### Sequence Diagram

```
  PLATFORM              GAME               SDK/API
      │                    │                    │
      │ 1. Create lobby    │                    │
      │ 2. User joins      │                    │
      │ 3. Match found     │                    │
      │                    │                    │
      │ 4. Generate tokens │                    │
      │ 5. Redirect ───────►                    │
      │    /game/xyz?token=│                    │
      │                    │                    │
      │                    │ 6. validateToken   │
      │                    │ ──────────────────►│
      │                    │ ◄─ PlayerIdentity ─│
      │                    │                    │
      │                    │ 7. Both connected  │
      │                    │                    │
      │                    │ 8. reportMatchStart│
      │                    │ ──────────────────►│
      │                    │                    │
      │                    │ 9. reportPlayerJoin│
      │                    │ ──────────────────►│
      │                    │                    │
      │                    │ 10. GAMEPLAY       │
      │                    │                    │
      │                    │ 11. reportResult   │
      │                    │ ──────────────────►│
      │                    │                    │
      │ ◄────────────────── 12. Redirect back   │
```

---

## 📊 Gap Summary

### ❌ Must REMOVE from Game

| Component        | Why                           |
| ---------------- | ----------------------------- |
| `createRoom`     | Platform creates rooms        |
| `joinRoom`       | Platform joins players        |
| Lobby UI         | Platform has its own lobby    |
| Create/Join btns | Platform controls matchmaking |

### ✅ Must ADD to Game

| Component              | Description                        |
| ---------------------- | ---------------------------------- |
| Token reading from URL | `?token=xxx` parameter             |
| Auto-join              | Automatic join by matchId from URL |
| Token validation       | `sdk.validatePlayerToken(token)`   |
| `reportMatchStart`     | When both players are connected    |
| `reportPlayerJoin`     | For each player after match start  |
| `reportMatchResult`    | At game end (winner/draw)          |
| `reportMatchError`     | For timeout/disconnect             |
| Redirect to platform   | Optional, after game ends          |

### ✅ Stays the Same

| Component        | Status                  |
| ---------------- | ----------------------- |
| Game logic       | ✅ `checkWinner`, etc.  |
| Socket.io server | ✅ Only gameplay events |
| Turn timer       | ✅ 30s timeout          |
| Board rendering  | ✅ Gameplay UI          |

---

## 🔧 Technical Requirements

### URL Format (from Platform)

```
https://xy-game.vercel.app/game/{matchId}?token={jwt}

Example:
https://xy-game.vercel.app/game/match-abc-123?token=eyJhbGc...
```

### Server Dependencies

```json
{
    "dependencies": {
        "@gamerstake/game-platform-sdk": "^1.0.5"
    }
}
```

### Environment Variables

```env
GAMERSTAKE_API_KEY=your_api_key_here
GAMERSTAKE_ENVIRONMENT=development
NEXT_PUBLIC_PLATFORM_URL=https://dev.gamerstake.io
```

### TypeScript Types

```typescript
// URL parameters the game receives
interface GameURLParams {
    matchId: string; // from URL path: /game/{matchId}
    token: string; // from query: ?token=xxx
}

// Player identity from SDK
interface PlayerIdentity {
    id: number; // GamerStake user ID
    username: string; // GamerStake username
}

// Room state (extended)
interface SDKRoomState {
    matchId: string;
    board: Board;
    currentPlayer: Player;
    winner: Winner;
    winningLine: number[] | null;
    turnStartedAt: number | null;
    disconnectReason: "timeout" | "disconnect" | null;
    players: {
        X: PlayerIdentity | null;
        O: PlayerIdentity | null;
    };
    sdkState: {
        matchStarted: boolean;
        matchEnded: boolean;
        playersReported: Set<number>;
    };
}
```

---

## 📝 Next Step

See → `02-requirements-checklist.md` for detailed requirements checklist.
