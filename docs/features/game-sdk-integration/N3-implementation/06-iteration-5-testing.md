# ✅ Iteration 5: Testing & Polish

**Estimated duration**: ~2 hours
**Priority**: P2
**Depends on**: All previous iterations

---

## 📋 E2E Test Scenarios

### Test 1: Happy Path - Complete Game
```
1. Open /game/test-123?token=token1 in Tab 1
   ✓ Expected: "Waiting for opponent..."

2. Open /game/test-123?token=token2 in Tab 2
   ✓ Expected: Game starts automatically
   ✓ Log: "[SDK] Match started"
   ✓ Log: "[SDK] Player joined" x2

3. Play moves until victory
   ✓ Expected: Winner displayed
   ✓ Log: "[SDK] Result reported"
```

### Test 2: No Token
```
1. Open /game/test-123 (without ?token=)
   ✓ Expected: Error view
   ✓ Expected: "No authentication token provided"
   ✓ Expected: Link to platform
```

### Test 3: Invalid Token
```
1. Open /game/test-123?token=invalid
   ✓ Expected: Error view
   ✓ Expected: "Invalid or expired token"
```

### Test 4: Timeout
```
1. Start game with two players
2. Wait 30 seconds without making a move
   ✓ Expected: Other player wins
   ✓ Expected: "timed out" message
   ✓ Log: "[SDK] Error reported: ... timed out"
```

### Test 5: Disconnect
```
1. Start game with two players
2. Make at least one move
3. Close one tab
   ✓ Expected: Remaining player wins
   ✓ Expected: "disconnected" message
   ✓ Log: "[SDK] Error reported: ... disconnected"
```

### Test 6: Draw
```
1. Play game to a draw (all cells filled, no winner)
   ✓ Expected: "It's a draw!"
   ✓ Log: "[SDK] Result reported: ... winner: draw"
```

### Test 7: Room Full
```
1. Two players connect to /game/test-123
2. Third player tries /game/test-123?token=token3
   ✓ Expected: Error "Match is full"
```

### Test 8: Reconnect (same player)
```
1. Player 1 connects
2. Player 1 refreshes page (same token)
   ✓ Expected: Reconnects to same position
```

---

## 🔧 Debug Checklist

### Server Logs
- [ ] `[Socket] Connected: {socketId}` on connection
- [ ] `[Room] Created: {matchId}` for new room
- [ ] `[Room] {matchId}: {username} joined as {X/O}` on join
- [ ] `[Game] {matchId}: Game started!` when both present
- [ ] `[SDK] Match started: {matchId}` SDK call
- [ ] `[SDK] Player joined: {username}` SDK call
- [ ] `[SDK] Result reported: {matchId}` at end
- [ ] `[SDK] Error reported: {matchId}` for timeout/disconnect

### Frontend
- [ ] Auto-join on mount
- [ ] Usernames displayed (not X/O)
- [ ] Timer works correctly
- [ ] Winning cells animated
- [ ] Status messages correct
- [ ] Back to Platform button visible

---

## 🧹 Code Cleanup

### Remove
- [ ] Leftover console.log debugging
- [ ] Unused imports
- [ ] Commented out code
- [ ] TODO comments (or resolve them)

### Add
- [ ] JSDoc comments for public functions
- [ ] Error boundaries for React components
- [ ] TypeScript strict mode check

---

## 📝 Documentation Update

### README.md Update
```markdown
## How It Works

1. Users create/join matches on GamerStake Platform
2. Platform redirects to this game with match ID and auth token
3. Game validates token, connects players, runs the match
4. Results are reported back to Platform via SDK

## Environment Variables

- `GAMERSTAKE_API_KEY` - SDK API key (server only)
- `GAMERSTAKE_ENVIRONMENT` - development/staging/production
- `NEXT_PUBLIC_PLATFORM_URL` - Platform URL for redirects
- `NEXT_PUBLIC_SOCKET_URL` - Game server WebSocket URL

## URL Format

Platform redirects players to:
\`\`\`
https://your-game.vercel.app/game/{matchId}?token={jwt}
\`\`\`
```

---

## 🚀 Deployment Checklist

### Vercel Setup
- [ ] Environment variables configured
- [ ] CORS origin includes production domain
- [ ] Socket server deployed (if separate)

### Pre-Production
- [ ] Test with staging API key
- [ ] Test with production-like tokens
- [ ] Check SDK error handling
- [ ] Check timeout handling

### Production
- [ ] Production API key
- [ ] `GAMERSTAKE_ENVIRONMENT=production`
- [ ] Debug mode OFF
- [ ] Monitoring setup (optional)

---

## ✅ Final Checklist

- [ ] All E2E test scenarios pass
- [ ] SDK reporting works
- [ ] Error handling complete
- [ ] UI polished
- [ ] Documentation updated
- [ ] Deployment ready
