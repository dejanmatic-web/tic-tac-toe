# 🚀 Iteration Plan for SDK Integration

---

## 📋 Iterations Overview

| Iteration | Name | Duration | Focus |
|-----------|------|----------|-------|
| **I1** | Cleanup + SDK Setup | ~2h | Remove lobby, install SDK |
| **I2** | Server Refactor | ~3h | joinMatch, token validation |
| **I3** | Match Lifecycle | ~2h | SDK reporting |
| **I4** | Frontend Refactor | ~2h | Auto-join, no lobby UI |
| **I5** | Testing & Polish | ~2h | E2E testing |

**Total estimated**: ~11 hours

---

## 🎯 Iteration 1: Cleanup + SDK Setup

### Goal
Remove unnecessary code (lobby) and install SDK.

### Tasks

1. **Install SDK**
   ```bash
   npm install @gamerstake/game-platform-sdk
   ```

2. **Environment Variables**
   - Create `.env.local`
   - Add `GAMERSTAKE_API_KEY`, `GAMERSTAKE_ENVIRONMENT`

3. **Remove from Server**
   - `createRoom` event handler
   - `joinRoom` event handler
   - `rejoinRoom` event handler

4. **Remove from Frontend**
   - Lobby UI (Create/Join buttons)
   - Share/Copy functionality
   - `handleCreate`, `handleJoin` functions

5. **Rename folder**
   - `app/game/[roomId]` → `app/game/[matchId]`

### Deliverables
- [x] SDK installed
- [x] Lobby code removed
- [x] Folder renamed

---

## 🔧 Iteration 2: Server Refactor

### Goal
Implement new `joinMatch` flow with token validation.

### Tasks

1. **SDK Client Singleton**
   - Create `server/sdk/sdk-client.ts`

2. **Player Validator**
   - Create `server/sdk/player-validator.ts`
   - Wrapper around `validatePlayerToken`

3. **New Room Types**
   - Create `server/types/room-types.ts`
   - Add `AuthenticatedPlayer`, `SDKState`

4. **joinMatch Event**
   ```typescript
   socket.on('joinMatch', async (matchId, token) => {
     // Validate token
     // Create/join room
     // Assign symbol
   });
   ```

5. **Auto-Start Match**
   - When both players present → start timer
   - Emit `roomState` with `gameStatus: 'playing'`

### Deliverables
- [x] `joinMatch` works
- [x] Token validation works
- [x] Auto-start when both present

---

## 📤 Iteration 3: Match Lifecycle Reporting

### Goal
Implement SDK reporting for match lifecycle.

### Tasks

1. **Match Reporter Service**
   - Create `server/sdk/match-reporter.ts`

2. **Report Match Start**
   - Call when both players connected
   - `reportPlayerJoin` for each

3. **Report Match Result**
   - Call when game ends
   - Map `Winner` → `MatchResult`

4. **Report Match Error**
   - Timeout handling
   - Disconnect handling

5. **Retry Logic**
   - Exponential backoff for network errors

### Deliverables
- [x] `reportMatchStart` called when both present
- [x] `reportMatchResult` called at game end
- [x] `reportMatchError` for timeout/disconnect

---

## 🖥️ Iteration 4: Frontend Refactor

### Goal
Adapt frontend for new flow (no lobby).

### Tasks

1. **URL Parsing**
   - Read `matchId` from path
   - Read `token` from query

2. **Auto-Join**
   - `joinMatch` emit on mount
   - No user input for join

3. **State Management**
   - `connectionStatus`: connecting/connected/error
   - Remove `isCreating`, `myPlayer` init

4. **Error Views**
   - No token → Error + link to platform
   - Invalid token → Error + link to platform

5. **Waiting View**
   - "Waiting for opponent..." while waiting for second player
   - `gameStatus === 'waiting'`

6. **Player Display**
   - Show usernames instead of X/O

### Deliverables
- [x] Auto-join works
- [x] Error views displayed
- [x] Usernames displayed

---

## ✅ Iteration 5: Testing & Polish

### Goal
End-to-end testing and final polishing.

### Tasks

1. **E2E Test Scenarios**
   - Two players connect → game starts
   - Timeout → other player wins
   - Disconnect → other player wins
   - No token → error view
   - Invalid token → error view

2. **Logging**
   - SDK call logging
   - Error logging

3. **Code Cleanup**
   - Remove leftover code
   - Add comments

4. **Documentation**
   - Update README
   - Add deployment notes

### Deliverables
- [ ] All test scenarios pass
- [ ] Documentation updated

---

## 📊 Dependency Graph

```
I1: Cleanup + SDK Setup
    │
    ▼
I2: Server Refactor
    │
    ├──► I3: Match Lifecycle (depends on I2)
    │
    └──► I4: Frontend Refactor (depends on I2)
            │
            ▼
         I5: Testing (depends on I3 and I4)
```

---

## 🔧 Development Tips

### Testing Without Platform

For local testing, you can simulate platform redirect:

```bash
# Open in browser:
http://localhost:3000/game/test-match-123?token=mock.jwt.token
```

### Mock SDK for Development

```typescript
// If SDK is not available:
const mockSDK = {
  validatePlayerToken: async (token: string) => ({
    id: parseInt(token.split('.')[0]) || 1,
    username: `Player${token.slice(-4)}`,
  }),
  reportMatchStart: async () => console.log('[MOCK] Match started'),
  reportPlayerJoin: async () => console.log('[MOCK] Player joined'),
  reportMatchResult: async () => console.log('[MOCK] Match result'),
  reportMatchError: async () => console.log('[MOCK] Match error'),
};
```

---

## 📝 Next Step

See → `02-iteration-1-sdk-setup.md` for first iteration details.
