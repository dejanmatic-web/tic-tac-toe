"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { motion, AnimatePresence } from "framer-motion";
import type {
    ServerToClientEvents,
    ClientToServerEvents,
    RoomState,
} from "@/lib/socket-types";
import type { Player } from "@/lib/game";

type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const TURN_TIMEOUT_SECONDS = 30;
const SOCKET_URL =
    process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";

export default function GameRoom() {
    const params = useParams();
    const roomId = params.roomId as string;

    const [socket, setSocket] = useState<GameSocket | null>(null);
    const [roomState, setRoomState] = useState<RoomState | null>(null);
    const [myPlayer, setMyPlayer] = useState<Player | null>(() => {
        if (typeof window !== "undefined") {
            return sessionStorage.getItem(`player-${roomId}`) as Player | null;
        }
        return null;
    });
    const [error, setError] = useState<string | null>(null);
    const [showResult, setShowResult] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [remainingTime, setRemainingTime] = useState<number | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const newSocket: GameSocket = io(SOCKET_URL);
        setSocket(newSocket);

        newSocket.on("roomState", (state) => {
            setRoomState(state);
            setError(null);
        });

        newSocket.on("playerAssigned", (player) => {
            setMyPlayer(player);
            if (typeof window !== "undefined") {
                sessionStorage.setItem(`player-${roomId}`, player);
            }
        });

        newSocket.on("error", (message) => {
            setError(message);
        });

        const savedPlayer =
            typeof window !== "undefined"
                ? sessionStorage.getItem(`player-${roomId}`)
                : null;

        if (savedPlayer) {
            newSocket.emit("rejoinRoom", roomId);
        }

        return () => {
            newSocket.close();
        };
    }, [roomId]);

    useEffect(() => {
        if (!roomState?.turnStartedAt || roomState.winner) {
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
    }, [roomState?.turnStartedAt, roomState?.winner]);

    useEffect(() => {
        if (roomState?.winner) {
            const timer = setTimeout(() => setShowResult(true), 400);
            return () => clearTimeout(timer);
        } else {
            setShowResult(false);
        }
    }, [roomState?.winner]);

    const handleCreate = useCallback(() => {
        if (socket && roomId) {
            setIsCreating(true);
            socket.emit("createRoom", roomId);
        }
    }, [socket, roomId]);

    const handleJoin = useCallback(() => {
        if (socket && roomId) {
            socket.emit("joinRoom", roomId);
        }
    }, [socket, roomId]);

    const handleClick = useCallback(
        (index: number) => {
            if (socket) {
                socket.emit("makeMove", index);
            }
        },
        [socket]
    );

    const handleReset = useCallback(() => {
        if (socket) {
            socket.emit("restartGame");
        }
    }, [socket]);

    const handleCopyCode = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(roomId);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback for older browsers
            const input = document.createElement("input");
            input.value = roomId;
            document.body.appendChild(input);
            input.select();
            document.execCommand("copy");
            document.body.removeChild(input);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    }, [roomId]);

    const handleShare = useCallback(async () => {
        const shareUrl = window.location.href;
        const shareData = {
            title: "XO Game",
            text: `Join my XO game! Room code: ${roomId}`,
            url: shareUrl,
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch {
                // User cancelled or share failed, fallback to copy
                handleCopyCode();
            }
        } else {
            // Fallback: copy link
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    }, [roomId, handleCopyCode]);

    const buttonStyle = {
        padding: "0.75rem 1.5rem",
        fontSize: "1rem",
        cursor: "pointer",
        border: "2px solid #667eea",
        borderRadius: "8px",
        fontWeight: "bold" as const,
    };

    if (!roomState) {
        return (
            <main
                style={{
                    minHeight: "100vh",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "1rem",
                    background:
                        "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                }}
            >
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                        backgroundColor: "white",
                        borderRadius: "16px",
                        padding: "2rem",
                        boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
                        textAlign: "center",
                        maxWidth: "400px",
                        width: "100%",
                    }}
                >
                    <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>
                        XO Game
                    </h1>

                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "0.5rem",
                            marginBottom: "1rem",
                        }}
                    >
                        <span style={{ color: "#666" }}>Room:</span>
                        <span
                            style={{
                                fontFamily: "monospace",
                                fontSize: "1.5rem",
                                fontWeight: "bold",
                                letterSpacing: "0.1em",
                                color: "#667eea",
                            }}
                        >
                            {roomId}
                        </span>
                        <motion.button
                            onClick={handleCopyCode}
                            whileTap={{ scale: 0.95 }}
                            style={{
                                padding: "0.25rem 0.5rem",
                                fontSize: "0.8rem",
                                border: "1px solid #ddd",
                                borderRadius: "4px",
                                background: copied ? "#4CAF50" : "white",
                                color: copied ? "white" : "#666",
                                cursor: "pointer",
                            }}
                        >
                            {copied ? "✓" : "Copy"}
                        </motion.button>
                    </div>

                    {error && (
                        <p style={{ color: "#e53935", marginBottom: "1rem" }}>
                            {error}
                        </p>
                    )}

                    <div
                        style={{
                            display: "flex",
                            gap: "0.75rem",
                            justifyContent: "center",
                            flexWrap: "wrap",
                        }}
                    >
                        <motion.button
                            onClick={handleCreate}
                            disabled={isCreating}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            style={{
                                ...buttonStyle,
                                background:
                                    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                color: "white",
                                border: "none",
                            }}
                        >
                            Create Room
                        </motion.button>
                        <motion.button
                            onClick={handleJoin}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            style={{
                                ...buttonStyle,
                                background: "white",
                                color: "#667eea",
                            }}
                        >
                            Join Room
                        </motion.button>
                    </div>

                    <motion.button
                        onClick={handleShare}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        style={{
                            marginTop: "1rem",
                            padding: "0.5rem 1rem",
                            fontSize: "0.9rem",
                            border: "1px solid #ddd",
                            borderRadius: "8px",
                            background: "white",
                            color: "#666",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            margin: "1rem auto 0",
                        }}
                    >
                        📤 Share Link
                    </motion.button>
                </motion.div>
            </main>
        );
    }

    const isMyTurn = roomState.currentPlayer === myPlayer;
    const bothPlayersConnected = roomState.players.X && roomState.players.O;
    const isLocked = !!roomState.winner || !isMyTurn || !bothPlayersConnected;

    const getStatus = (): string => {
        if (!bothPlayersConnected) {
            return "Waiting for opponent...";
        }
        if (showResult) {
            if (roomState!.disconnectReason === "timeout") {
                return roomState!.winner === myPlayer
                    ? "Opponent timed out!"
                    : "You timed out!";
            }
            if (roomState!.disconnectReason === "disconnect") {
                return roomState!.winner === myPlayer
                    ? "Opponent disconnected!"
                    : "You disconnected!";
            }
            if (roomState!.winner === "draw") {
                return "Draw!";
            }
            if (roomState!.winner) {
                return roomState!.winner === myPlayer
                    ? "You won!"
                    : "You lost!";
            }
        }
        return isMyTurn ? "Your turn" : "Opponent's turn";
    };

    const isWinningCell = (index: number) =>
        roomState!.winningLine?.includes(index);

    const cellSize = "min(100px, calc((100vw - 3rem) / 3))";

    return (
        <main
            style={{
                minHeight: "100vh",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "1rem",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            }}
        >
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                    backgroundColor: "white",
                    borderRadius: "16px",
                    padding: "1.5rem",
                    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
                    textAlign: "center",
                    maxWidth: "400px",
                    width: "100%",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.5rem",
                        marginBottom: "0.5rem",
                    }}
                >
                    <span style={{ color: "#666", fontSize: "0.9rem" }}>
                        Room:
                    </span>
                    <span
                        style={{
                            fontFamily: "monospace",
                            fontWeight: "bold",
                            color: "#667eea",
                        }}
                    >
                        {roomId}
                    </span>
                    <motion.button
                        onClick={handleShare}
                        whileTap={{ scale: 0.95 }}
                        style={{
                            padding: "0.2rem 0.4rem",
                            fontSize: "0.75rem",
                            border: "1px solid #ddd",
                            borderRadius: "4px",
                            background: "white",
                            cursor: "pointer",
                        }}
                    >
                        📤
                    </motion.button>
                </div>
                <p
                    style={{
                        marginBottom: "1rem",
                        opacity: 0.7,
                        fontSize: "0.9rem",
                    }}
                >
                    You are: <strong>{myPlayer}</strong>
                </p>

                <div
                    style={{
                        display: "flex",
                        justifyContent: "center",
                        gap: "1.5rem",
                        marginBottom: "1rem",
                    }}
                >
                    <motion.div
                        animate={{
                            scale:
                                roomState.currentPlayer === "X" &&
                                !roomState.winner
                                    ? 1.15
                                    : 1,
                            opacity:
                                roomState.currentPlayer === "X" &&
                                !roomState.winner
                                    ? 1
                                    : 0.4,
                        }}
                        style={{
                            fontSize: "1.25rem",
                            fontWeight: "bold",
                            padding: "0.4rem 0.8rem",
                            borderRadius: "8px",
                            backgroundColor:
                                roomState.currentPlayer === "X" &&
                                !roomState.winner
                                    ? "#e3f2fd"
                                    : "transparent",
                            border:
                                myPlayer === "X"
                                    ? "2px solid #667eea"
                                    : "2px solid transparent",
                        }}
                    >
                        X {!roomState.players.X && "⏳"}
                    </motion.div>
                    <motion.div
                        animate={{
                            scale:
                                roomState.currentPlayer === "O" &&
                                !roomState.winner
                                    ? 1.15
                                    : 1,
                            opacity:
                                roomState.currentPlayer === "O" &&
                                !roomState.winner
                                    ? 1
                                    : 0.4,
                        }}
                        style={{
                            fontSize: "1.25rem",
                            fontWeight: "bold",
                            padding: "0.4rem 0.8rem",
                            borderRadius: "8px",
                            backgroundColor:
                                roomState.currentPlayer === "O" &&
                                !roomState.winner
                                    ? "#fce4ec"
                                    : "transparent",
                            border:
                                myPlayer === "O"
                                    ? "2px solid #764ba2"
                                    : "2px solid transparent",
                        }}
                    >
                        O {!roomState.players.O && "⏳"}
                    </motion.div>
                </div>

                {remainingTime !== null &&
                    bothPlayersConnected &&
                    !roomState.winner && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            style={{
                                marginBottom: "0.75rem",
                                fontSize: "1.5rem",
                                color: remainingTime <= 10 ? "#e53935" : "#333",
                                fontWeight: "bold",
                            }}
                        >
                            {remainingTime}s
                        </motion.div>
                    )}

                <AnimatePresence mode="wait">
                    <motion.p
                        key={getStatus()}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        style={{
                            fontSize: "1.1rem",
                            marginBottom: "1rem",
                            minHeight: "1.5rem",
                            fontWeight: "500",
                        }}
                    >
                        {getStatus()}
                    </motion.p>
                </AnimatePresence>

                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: `repeat(3, ${cellSize})`,
                        gap: "4px",
                        justifyContent: "center",
                        opacity: isLocked ? 0.8 : 1,
                    }}
                >
                    {roomState.board.map((cell, index) => (
                        <motion.button
                            key={index}
                            onClick={() => handleClick(index)}
                            disabled={cell !== "" || isLocked}
                            whileHover={
                                cell === "" && !isLocked
                                    ? {
                                          scale: 1.05,
                                          backgroundColor: "#f0f0f0",
                                      }
                                    : {}
                            }
                            whileTap={
                                cell === "" && !isLocked ? { scale: 0.95 } : {}
                            }
                            animate={
                                isWinningCell(index) && showResult
                                    ? {
                                          scale: [1, 1.1, 1],
                                          transition: {
                                              repeat: Infinity,
                                              duration: 0.8,
                                          },
                                      }
                                    : {}
                            }
                            style={{
                                width: cellSize,
                                height: cellSize,
                                fontSize: "clamp(1.5rem, 8vw, 2.5rem)",
                                cursor:
                                    cell !== "" || isLocked
                                        ? "not-allowed"
                                        : "pointer",
                                backgroundColor:
                                    isWinningCell(index) && showResult
                                        ? "#c8e6c9"
                                        : "#fafafa",
                                border: "2px solid #333",
                                borderRadius: "8px",
                            }}
                        >
                            <AnimatePresence mode="wait">
                                {cell && (
                                    <motion.span
                                        key={cell}
                                        initial={{ scale: 0, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 0, opacity: 0 }}
                                        transition={{
                                            type: "spring",
                                            stiffness: 300,
                                            damping: 20,
                                        }}
                                        style={{
                                            display: "block",
                                            color:
                                                cell === "X"
                                                    ? "#667eea"
                                                    : "#764ba2",
                                        }}
                                    >
                                        {cell}
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        </motion.button>
                    ))}
                </div>

                <div
                    style={{
                        marginTop: "1.5rem",
                        display: "flex",
                        justifyContent: "center",
                        gap: "1rem",
                    }}
                >
                    <AnimatePresence>
                        {roomState.winner && (
                            <motion.button
                                onClick={handleReset}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                style={{
                                    padding: "0.75rem 1.5rem",
                                    fontSize: "1rem",
                                    borderRadius: "8px",
                                    border: "none",
                                    background:
                                        "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                    color: "#fff",
                                    cursor: "pointer",
                                    fontWeight: "bold",
                                }}
                            >
                                Play Again
                            </motion.button>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </main>
    );
}
