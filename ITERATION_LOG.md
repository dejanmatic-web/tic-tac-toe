## Iteration 0 – Scope and rules

Goal: don't make chaos.

-   1v1 XO (tic-tac-toe)
-   Real-time PvP
-   No auth initially (room code)
-   No ranking
-   Focus: gameplay + UX

Status: ✅

---

## Iteration 1 – Project bootstrap

Goal: app runs, no game yet.

-   Next.js (App Router)
-   TypeScript
-   ESLint
-   / → landing
-   /game/[roomId] → empty page

Status: ✅

---

## Iteration 2 – Game state (no UI magic)

Goal: clean logic.

-   board: Cell[] (9 cells)
-   currentPlayer: 'X' | 'O'
-   status: 'idle' | 'playing' | 'finished'
-   winner: 'X' | 'O' | 'draw' | null

Functions:

-   makeMove(state, index)
-   checkWinner(board)
-   resetGame()

Status: ✅

---

## Iteration 3 – Minimal UI (static)

Goal: playable locally.

-   Grid 3×3
-   Click on cell → move
-   Disable invalid moves
-   Text status: "X turn", "O won"

Status: ✅

---

## Iteration 4 – UX animations (Framer Motion)

Goal: feel of the game.

-   Hover cell animation
-   Place X/O (scale + fade)
-   Winning line pulse
-   motion.button with initial → animate

Status: ✅

---

## Iteration 5 – Game flow polish

Goal: doesn't look amateur.

-   Restart button (animated, appears during game)
-   Highlight active player (X/O indicators with scale + opacity)
-   Lock board when game over
-   400ms delay before win screen

Status: ✅

---

## Iteration 6 – Real-time PvP (core)

Goal: two players, same board.

-   Socket.io server on port 3001
-   Room creation/joining with roomId
-   Server validates moves
-   Broadcast state to both players

Server holds:

-   board
-   turn
-   connected players

Flow:

-   Player A creates room
-   Player B joins room
-   Server validates moves
-   Broadcast state

Run: `npm run server` (in one terminal) + `npm run dev` (in another)

Status: ✅

---

## Iteration 7 – Sync & conflict handling

Goal: no desync.

Already implemented in Iteration 6:

-   Server is source of truth
-   Client sends only move(index)
-   Server checks turn before accepting
-   Server checks if cell is empty
-   Server checks if game is finished
-   Server sends full state on every action

No changes needed.

Status: ✅

---

## Iteration 8 – Animations for multiplayer

Status: ⏭️ Skipped

---

## Iteration 9 – Edge cases

Goal: production stability.

-   Player disconnect → auto-win for remaining player (if game started)
-   Timeout: 30s per move → auto-win
-   Timer displayed during turns (red when ≤10s)
-   Reload page → resync state via sessionStorage + rejoinRoom
-   Show disconnect/timeout reason in status message

Status: ✅

---

## Iteration 10 – Polish & deploy

Goal: can show to people.

-   Landing page with Create/Join flow
-   Auto-generated room codes
-   Share link (Web Share API + fallback)
-   Copy room code button
-   Mobile responsive (fluid grid, clamp font sizes)
-   Polished UI with gradient theme
-   Environment variable for socket URL: `NEXT_PUBLIC_SOCKET_URL`

Deploy notes:

-   Frontend: Vercel (just push to GitHub and connect)
-   Backend: Deploy socket.io server separately (Railway, Render, Fly.io)
-   Set `NEXT_PUBLIC_SOCKET_URL` in Vercel to your backend URL

Status: ✅
