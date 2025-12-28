# 📤 Iteration 3: SDK Reporting

**Estimated duration**: ~2 hours
**Priority**: P0
**Depends on**: Iteration 2

---

## 📋 Prerequisites

- [x] Iteration 2 completed
- [x] `joinMatch` works
- [x] Token validation works

---

## 📁 Files

### To Create
```
server/
├── sdk/
│   └── match-reporter.ts      # NEW
```

### To Modify
```
server/index.ts                 # ADD SDK calls
```

---

## 🔨 Step 1: Match Reporter Service

### `server/sdk/match-reporter.ts`

```typescript
import { getSDKInstance } from './sdk-client';
import type { SDKRoom, AuthenticatedPlayer } from '../types/room-types';
import type { Winner } from '../../lib/game';

export class MatchReporter {
  /**
   * Report match start
   */
  async startMatch(room: SDKRoom): Promise<boolean> {
    if (room.sdkState.matchStarted) return false;
    if (!room.players.X || !room.players.O) return false;

    try {
      const sdk = getSDKInstance();
      await sdk.reportMatchStart(room.matchId);
      room.sdkState.matchStarted = true;
      console.log(`[SDK] Match started: ${room.matchId}`);
      return true;
    } catch (error) {
      console.error(`[SDK] Failed to start match:`, error);
      return false;
    }
  }

  /**
   * Report player joined
   */
  async playerJoined(room: SDKRoom, player: AuthenticatedPlayer): Promise<boolean> {
    if (room.sdkState.playersReported.has(player.id)) return false;
    if (!room.sdkState.matchStarted) return false;

    try {
      const sdk = getSDKInstance();
      await sdk.reportPlayerJoin(room.matchId, player.id);
      room.sdkState.playersReported.add(player.id);
      console.log(`[SDK] Player joined: ${player.username}`);
      return true;
    } catch (error) {
      console.error(`[SDK] Failed to report player join:`, error);
      return false;
    }
  }

  /**
   * Report match result
   */
  async reportResult(room: SDKRoom, winner: Winner): Promise<boolean> {
    if (room.sdkState.matchEnded) return false;
    if (!room.sdkState.matchStarted) return false;
    if (!room.players.X || !room.players.O) return false;

    const result = this.buildResult(room, winner);

    try {
      const sdk = getSDKInstance();
      await sdk.reportMatchResult(room.matchId, result);
      room.sdkState.matchEnded = true;
      console.log(`[SDK] Result reported: ${room.matchId}, winner: ${winner}`);
      return true;
    } catch (error) {
      console.error(`[SDK] Failed to report result:`, error);
      return false;
    }
  }

  /**
   * Report match error
   */
  async reportError(room: SDKRoom, reason: string): Promise<boolean> {
    if (room.sdkState.matchEnded) return false;
    if (!room.sdkState.matchStarted) return false;

    try {
      const sdk = getSDKInstance();
      await sdk.reportMatchError(room.matchId, reason);
      room.sdkState.matchEnded = true;
      console.log(`[SDK] Error reported: ${room.matchId}, reason: ${reason}`);
      return true;
    } catch (error) {
      console.error(`[SDK] Failed to report error:`, error);
      return false;
    }
  }

  private buildResult(room: SDKRoom, winner: Winner) {
    const playerX = room.players.X!;
    const playerO = room.players.O!;

    if (winner === 'draw') {
      return {
        players: [
          { id: playerX.id, score: 0, isWinner: false },
          { id: playerO.id, score: 0, isWinner: false },
        ],
      };
    }

    const winnerPlayer = winner === 'X' ? playerX : playerO;
    const loserPlayer = winner === 'X' ? playerO : playerX;

    return {
      players: [
        { id: winnerPlayer.id, score: 1, isWinner: true },
        { id: loserPlayer.id, score: 0, isWinner: false },
      ],
    };
  }
}

export const matchReporter = new MatchReporter();
```

---

## 🔨 Step 2: Integrate into Server

### Update `server/index.ts`

```typescript
// Add import at top
import { matchReporter } from './sdk/match-reporter';

// Update startGameIfReady function:
async function startGameIfReady(room: SDKRoom): Promise<void> {
  if (room.players.X && room.players.O && room.gameStatus === 'waiting') {
    room.gameStatus = 'playing';
    startTurnTimer(room);
    console.log(`[Game] ${room.matchId}: Game started!`);

    // SDK REPORTING
    await matchReporter.startMatch(room);
    await matchReporter.playerJoined(room, room.players.X);
    await matchReporter.playerJoined(room, room.players.O);
  }
}

// Update makeMove handler - add at end when winner:
if (room.winner) {
  clearTurnTimer(room);
  room.turnStartedAt = null;
  room.gameStatus = 'finished';

  // SDK REPORTING
  await matchReporter.reportResult(room, room.winner);
}

// Update timeout handler:
room.turnTimer = setTimeout(async () => {
  // ... existing code ...

  // SDK REPORTING
  const timedOutPlayer = room.players[room.currentPlayer];
  const reason = `Player ${timedOutPlayer?.username || room.currentPlayer} timed out`;
  await matchReporter.reportError(room, reason);
}, TURN_TIMEOUT_MS);

// Update disconnect handler:
if (room.gameStatus === 'playing' && !room.winner) {
  // ... existing code ...

  // SDK REPORTING
  const disconnectedPlayer = room.players[data.symbol];
  const reason = `Player ${disconnectedPlayer?.username || data.symbol} disconnected`;
  await matchReporter.reportError(room, reason);
}
```

---

## ✅ Verification

### Test 1: Match Start Reporting
```
1. Two players connect
2. Log: "[SDK] Match started: {matchId}"
3. Log: "[SDK] Player joined: {username}" x2
```

### Test 2: Match Result Reporting
```
1. Play game to victory
2. Log: "[SDK] Result reported: {matchId}, winner: X/O"
```

### Test 3: Timeout Error Reporting
```
1. Start game
2. Wait 30 seconds without making a move
3. Log: "[SDK] Error reported: {matchId}, reason: Player X timed out"
```

### Test 4: Disconnect Error Reporting
```
1. Start game
2. Make at least one move
3. Close one tab
4. Log: "[SDK] Error reported: {matchId}, reason: Player X disconnected"
```

---

## 📝 Checklist

- [x] `server/sdk/match-reporter.ts` created
- [x] `reportMatchStart` called when both players present
- [x] `reportPlayerJoin` called for both players
- [x] `reportMatchResult` called at game end
- [x] `reportMatchError` called for timeout
- [x] `reportMatchError` called for disconnect

---

## 📝 Next Step

→ `05-iteration-4-frontend.md`
