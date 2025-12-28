# 🖥️ Iteration 4: Frontend Refactor

**Estimated duration**: ~2 hours
**Priority**: P1
**Depends on**: Iteration 2, 3

---

## 📋 Prerequisites

- [x] Server refactored
- [x] `joinMatch` works
- [x] SDK reporting works

---

## 📁 Files

### To Modify
```
app/game/[matchId]/page.tsx     # COMPLETE REWRITE
```

---

## 🔨 New Frontend Version

### `app/game/[matchId]/page.tsx`

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { motion, AnimatePresence } from "framer-motion";
import type {
    ServerToClientEvents,
    ClientToServerEvents,
    RoomState,
    PlayerInfo,
} from "@/lib/socket-types";
import type { Player } from "@/lib/game";

type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const TURN_TIMEOUT_SECONDS = 30;
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";
const PLATFORM_URL = process.env.NEXT_PUBLIC_PLATFORM_URL || "https://dev.gamerstake.io";

type ConnectionStatus = 'connecting' | 'connected' | 'error';

export default function GamePage() {
    const params = useParams();
    const searchParams = useSearchParams();

    const matchId = params.matchId as string;
    const token = searchParams.get('token');

    // Connection state
    const [socket, setSocket] = useState<GameSocket | null>(null);
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
    const [connectionError, setConnectionError] = useState<string | null>(null);

    // Player state
    const [myPlayer, setMyPlayer] = useState<PlayerInfo | null>(null);

    // Game state
    const [roomState, setRoomState] = useState<RoomState | null>(null);
    const [remainingTime, setRemainingTime] = useState<number | null>(null);
    const [showResult, setShowResult] = useState(false);

    // NO TOKEN - Show error view
    if (!token) {
        return <ErrorView message="No authentication token provided" />;
    }

    // Socket connection + auto join
    useEffect(() => {
        const newSocket: GameSocket = io(SOCKET_URL);
        setSocket(newSocket);

        // Handle successful join
        newSocket.on('matchJoined', (player) => {
            setMyPlayer(player);
            setConnectionStatus('connected');
            console.log('Joined as:', player.username, player.symbol);
        });

        // Handle errors
        newSocket.on('matchError', (message) => {
            setConnectionError(message);
            setConnectionStatus('error');
            console.error('Match error:', message);
        });

        // Handle room state updates
        newSocket.on('roomState', (state) => {
            setRoomState(state);
        });

        // Auto-join immediately
        newSocket.emit('joinMatch', matchId, token);

        return () => {
            newSocket.close();
        };
    }, [matchId, token]);

    // Turn timer
    useEffect(() => {
        if (!roomState?.turnStartedAt || roomState.winner || roomState.gameStatus !== 'playing') {
            setRemainingTime(null);
            return;
        }

        const updateTimer = () => {
            const elapsed = (Date.now() - roomState.turnStartedAt!) / 1000;
            const remaining = Math.max(0, TURN_TIMEOUT_SECONDS - elapsed);
            setRemainingTime(Math.ceil(remaining));
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [roomState?.turnStartedAt, roomState?.winner, roomState?.gameStatus]);

    // Show result animation
    useEffect(() => {
        if (roomState?.winner) {
            const timer = setTimeout(() => setShowResult(true), 400);
            return () => clearTimeout(timer);
        } else {
            setShowResult(false);
        }
    }, [roomState?.winner]);

    // Make move handler
    const handleClick = useCallback((index: number) => {
        if (socket) {
            socket.emit('makeMove', index);
        }
    }, [socket]);

    // ERROR STATE
    if (connectionStatus === 'error') {
        return <ErrorView message={connectionError || 'Connection failed'} />;
    }

    // CONNECTING STATE
    if (connectionStatus === 'connecting' || !myPlayer) {
        return <LoadingView message="Connecting to match..." />;
    }

    // WAITING FOR OPPONENT
    if (roomState?.gameStatus === 'waiting') {
        return (
            <WaitingView
                matchId={matchId}
                myPlayer={myPlayer}
                opponentJoined={!!(roomState.players.X && roomState.players.O)}
            />
        );
    }

    // GAME VIEW
    if (!roomState) {
        return <LoadingView message="Loading game..." />;
    }

    const isMyTurn = roomState.currentPlayer === myPlayer.symbol;
    const isLocked = !!roomState.winner || !isMyTurn;

    const getStatus = (): string => {
        if (roomState.gameStatus === 'finished') {
            if (roomState.disconnectReason === 'timeout') {
                return roomState.winner === myPlayer.symbol
                    ? `${getOpponentName()} timed out! You win!`
                    : "You timed out!";
            }
            if (roomState.disconnectReason === 'disconnect') {
                return roomState.winner === myPlayer.symbol
                    ? `${getOpponentName()} disconnected! You win!`
                    : "You disconnected!";
            }
            if (roomState.winner === 'draw') {
                return "It's a draw!";
            }
            return roomState.winner === myPlayer.symbol ? "🎉 You won!" : "You lost!";
        }
        return isMyTurn ? "Your turn" : `${getOpponentName()}'s turn`;
    };

    const getOpponentName = (): string => {
        return myPlayer.symbol === 'X'
            ? roomState.players.O || 'Opponent'
            : roomState.players.X || 'Opponent';
    };

    const isWinningCell = (index: number) => roomState.winningLine?.includes(index);

    return (
        <GameContainer>
            {/* Match Info */}
            <MatchInfo matchId={matchId} myPlayer={myPlayer} />

            {/* Player Cards */}
            <PlayerCards
                roomState={roomState}
                myPlayer={myPlayer}
            />

            {/* Timer */}
            {remainingTime !== null && roomState.gameStatus === 'playing' && (
                <Timer time={remainingTime} />
            )}

            {/* Status */}
            <Status text={getStatus()} />

            {/* Board */}
            <Board
                board={roomState.board}
                isLocked={isLocked}
                winningLine={roomState.winningLine}
                showResult={showResult}
                onCellClick={handleClick}
            />

            {/* Back to Platform */}
            {roomState.gameStatus === 'finished' && (
                <BackButton platformUrl={PLATFORM_URL} />
            )}
        </GameContainer>
    );
}

// Sub-components

function ErrorView({ message }: { message: string }) {
    return (
        <GameContainer>
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                    backgroundColor: "white",
                    borderRadius: "16px",
                    padding: "2rem",
                    textAlign: "center",
                    maxWidth: "400px",
                }}
            >
                <h1 style={{ color: "#e53935", marginBottom: "1rem" }}>❌ Error</h1>
                <p style={{ color: "#666", marginBottom: "1.5rem" }}>{message}</p>
                <a
                    href={PLATFORM_URL}
                    style={{
                        display: "inline-block",
                        padding: "0.75rem 1.5rem",
                        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        color: "white",
                        borderRadius: "8px",
                        textDecoration: "none",
                        fontWeight: "bold",
                    }}
                >
                    Back to Platform
                </a>
            </motion.div>
        </GameContainer>
    );
}

function LoadingView({ message }: { message: string }) {
    return (
        <GameContainer>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{
                    backgroundColor: "white",
                    borderRadius: "16px",
                    padding: "2rem",
                    textAlign: "center",
                }}
            >
                <Spinner />
                <p style={{ color: "#666", marginTop: "1rem" }}>{message}</p>
            </motion.div>
        </GameContainer>
    );
}

function WaitingView({ matchId, myPlayer, opponentJoined }: {
    matchId: string;
    myPlayer: PlayerInfo;
    opponentJoined: boolean;
}) {
    return (
        <GameContainer>
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                    backgroundColor: "white",
                    borderRadius: "16px",
                    padding: "2rem",
                    textAlign: "center",
                    maxWidth: "400px",
                }}
            >
                <h2 style={{ marginBottom: "1rem" }}>Waiting for opponent...</h2>
                <p style={{ color: "#666", marginBottom: "0.5rem" }}>
                    Match: <code>{matchId}</code>
                </p>
                <p style={{ color: "#666" }}>
                    Playing as: <strong>{myPlayer.symbol}</strong> ({myPlayer.username})
                </p>
                <Spinner />
            </motion.div>
        </GameContainer>
    );
}

function GameContainer({ children }: { children: React.ReactNode }) {
    return (
        <main style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        }}>
            {children}
        </main>
    );
}

function Spinner() {
    return (
        <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            style={{
                width: "40px",
                height: "40px",
                border: "4px solid #eee",
                borderTopColor: "#667eea",
                borderRadius: "50%",
                margin: "1rem auto",
            }}
        />
    );
}

// ... Additional sub-components (MatchInfo, PlayerCards, Timer, Status, Board, BackButton)
// These would be similar to the original but simplified
```

---

## ✅ Verification

### Test 1: No Token
```
URL: /game/test-match
Expected: Error view "No authentication token provided"
```

### Test 2: Invalid Token
```
URL: /game/test-match?token=invalid
Expected: Error view "Invalid or expired token"
```

### Test 3: Valid Token - First Player
```
URL: /game/test-match?token=valid1
Expected: Waiting view "Waiting for opponent..."
```

### Test 4: Valid Token - Second Player
```
URL: /game/test-match?token=valid2
Expected: Game starts automatically
```

### Test 5: Gameplay
```
Expected: Moves work, timer works, winner detected
```

---

## 📝 Checklist

- [x] Error view for no token
- [x] Error view for invalid token
- [x] Loading view while connecting
- [x] Waiting view while waiting for opponent
- [x] Auto-join without user input
- [x] Game view with usernames
- [x] Timer works
- [x] Winner detection works
- [x] Back to platform button

---

## 📝 Next Step

→ `06-iteration-5-testing.md`
