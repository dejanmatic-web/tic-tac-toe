# ✅ Requirements Checklist for SDK Integration

---

## 🗑️ To Remove (Platform Handles This)

-   [x] **DEL-01**: Remove `createRoom` socket event
-   [x] **DEL-02**: Remove `joinRoom` socket event
-   [x] **DEL-03**: Remove `rejoinRoom` socket event
-   [x] **DEL-04**: Remove "Create Room" button from UI
-   [x] **DEL-05**: Remove "Join Room" button from UI
-   [x] **DEL-06**: Remove lobby UI (pre-game display)
-   [x] **DEL-07**: Remove `handleCreate` function
-   [x] **DEL-08**: Remove `handleJoin` function
-   [x] **DEL-09**: Remove Share/Copy room code functionality

---

## 🔐 Authentication & Validation

-   [x] **REQ-AUTH-01**: Read token from URL query parameter (`?token=xxx`)
-   [x] **REQ-AUTH-02**: Read matchId from URL path (`/game/{matchId}`)
-   [x] **REQ-AUTH-03**: Server validates token via `sdk.validatePlayerToken()`
-   [x] **REQ-AUTH-04**: Invalid token → show error, redirect to platform
-   [x] **REQ-AUTH-05**: Store `PlayerIdentity` (id, username) in room state
-   [x] **REQ-AUTH-06**: Reject connection if no token

---

## 🎮 Match Lifecycle

-   [x] **REQ-MATCH-01**: Auto-join room by matchId (no user input)
-   [x] **REQ-MATCH-02**: Create room if doesn't exist (first player)
-   [x] **REQ-MATCH-03**: Join room if exists (second player)
-   [x] **REQ-MATCH-04**: Call `sdk.reportMatchStart(matchId)` when both players ready
-   [x] **REQ-MATCH-05**: Call `sdk.reportPlayerJoin(matchId, playerId)` for each player
-   [x] **REQ-MATCH-06**: Call `sdk.reportMatchResult(matchId, result)` at game end
-   [x] **REQ-MATCH-07**: Match can only start once (idempotency)

---

## ⚠️ Error Handling

-   [x] **REQ-ERR-01**: Timeout → `reportMatchError` with appropriate reason
-   [x] **REQ-ERR-02**: Disconnect → `reportMatchError` with appropriate reason
-   [ ] **REQ-ERR-03**: Retry logic for SDK network errors
-   [x] **REQ-ERR-04**: Graceful degradation if SDK unavailable
-   [x] **REQ-ERR-05**: Show error UI if validation fails

---

## 🔄 Socket Events (New Structure)

### New Events

-   [x] **REQ-SOCKET-01**: `joinMatch(matchId, token)` - only way for player to connect
-   [x] **REQ-SOCKET-02**: `matchJoined(playerInfo)` - server confirms successful join
-   [x] **REQ-SOCKET-03**: `matchError(message)` - server reports error

### Modified Events

-   [x] **REQ-SOCKET-04**: `roomState` includes player usernames
-   [x] **REQ-SOCKET-05**: `roomState` sent automatically when both players present

### Removed Events

-   [x] **REQ-SOCKET-06**: ~~`createRoom`~~ - REMOVED
-   [x] **REQ-SOCKET-07**: ~~`joinRoom`~~ - REMOVED
-   [x] **REQ-SOCKET-08**: ~~`rejoinRoom`~~ - REMOVED
-   [x] **REQ-SOCKET-09**: ~~`playerAssigned`~~ - replaced with `matchJoined`

---

## 🖥️ Frontend Requirements

### Remove

-   [x] **REQ-FE-DEL-01**: Lobby UI component
-   [x] **REQ-FE-DEL-02**: Create/Join buttons
-   [x] **REQ-FE-DEL-03**: Room code display
-   [x] **REQ-FE-DEL-04**: Share functionality

### Add

-   [x] **REQ-FE-01**: Read `matchId` from URL path
-   [x] **REQ-FE-02**: Read `token` from URL query
-   [x] **REQ-FE-03**: Loading state while waiting for other player
-   [x] **REQ-FE-04**: Error state for auth failures
-   [x] **REQ-FE-05**: Display usernames instead of X/O
-   [x] **REQ-FE-06**: Redirect to platform after game ends (optional)
-   [x] **REQ-FE-07**: "No token" error view with link to platform

---

## 📝 Configuration

-   [x] **REQ-CFG-01**: Environment variable for API key
-   [x] **REQ-CFG-02**: Environment variable for SDK environment
-   [x] **REQ-CFG-03**: Environment variable for platform URL (for redirect)
-   [x] **REQ-CFG-04**: Debug mode only in development
-   [x] **REQ-CFG-05**: CORS configuration for Vercel domain

---

## 🧪 Testing

-   [ ] **REQ-TEST-01**: Test: Access without token → error view
-   [ ] **REQ-TEST-02**: Test: Access with invalid token → error view
-   [ ] **REQ-TEST-03**: Test: Two players connect → game starts automatically
-   [ ] **REQ-TEST-04**: Test: One player disconnects → other wins
-   [ ] **REQ-TEST-05**: Test: Timeout → other player wins
-   [ ] **REQ-TEST-06**: Test: Play to end → reportMatchResult called
-   [ ] **REQ-TEST-07**: Test: Draw → reportMatchResult with draw result

---

## 📖 Documentation

-   [ ] **REQ-DOC-01**: Updated README with new flow
-   [ ] **REQ-DOC-02**: Environment variables documentation
-   [ ] **REQ-DOC-03**: URL format documentation for platform
-   [ ] **REQ-DOC-04**: Deployment checklist

---

## 🎯 Priorities

### P0 - Blocks Integration

-   REQ-AUTH-01 to REQ-AUTH-06 (Token handling)
-   REQ-MATCH-01 to REQ-MATCH-07 (Match lifecycle)
-   DEL-01 to DEL-09 (Lobby removal)

### P1 - Required for Stability

-   REQ-ERR-01 to REQ-ERR-05 (Error handling)
-   REQ-SOCKET-01 to REQ-SOCKET-05 (Socket events)
-   REQ-FE-01 to REQ-FE-07 (Frontend updates)

### P2 - Nice to Have

-   REQ-TEST-\* (Testing)
-   REQ-DOC-\* (Documentation)
-   REQ-FE-06 (Redirect to platform)
