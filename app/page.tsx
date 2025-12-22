"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

function generateRoomCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default function Home() {
    const router = useRouter();
    const [joinCode, setJoinCode] = useState("");

    const handleCreateRoom = () => {
        const roomId = generateRoomCode();
        router.push(`/game/${roomId}`);
    };

    const handleJoinRoom = () => {
        if (joinCode.trim()) {
            router.push(`/game/${joinCode.trim().toUpperCase()}`);
        }
    };

    return (
        <main
            style={{
                minHeight: "100vh",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "2rem",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            }}
        >
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                    backgroundColor: "white",
                    borderRadius: "16px",
                    padding: "3rem",
                    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
                    textAlign: "center",
                    maxWidth: "400px",
                    width: "100%",
                }}
            >
                <motion.h1
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    style={{
                        fontSize: "3rem",
                        marginBottom: "0.5rem",
                        background:
                            "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                    }}
                >
                    XO
                </motion.h1>
                <p
                    style={{
                        color: "#666",
                        marginBottom: "2rem",
                        fontSize: "1.1rem",
                    }}
                >
                    Real-time PvP Tic-Tac-Toe
                </p>

                <motion.button
                    onClick={handleCreateRoom}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                        width: "100%",
                        padding: "1rem",
                        fontSize: "1.1rem",
                        fontWeight: "bold",
                        border: "none",
                        borderRadius: "8px",
                        background:
                            "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        color: "white",
                        cursor: "pointer",
                        marginBottom: "1.5rem",
                    }}
                >
                    Create New Game
                </motion.button>

                <div style={{ position: "relative", marginBottom: "1.5rem" }}>
                    <div
                        style={{
                            position: "absolute",
                            top: "50%",
                            left: 0,
                            right: 0,
                            height: "1px",
                            backgroundColor: "#ddd",
                        }}
                    />
                    <span
                        style={{
                            position: "relative",
                            backgroundColor: "white",
                            padding: "0 1rem",
                            color: "#999",
                            fontSize: "0.9rem",
                        }}
                    >
                        or join existing
                    </span>
                </div>

                <div style={{ display: "flex", gap: "0.5rem" }}>
                    <input
                        type="text"
                        placeholder="Enter room code"
                        value={joinCode}
                        onChange={(e) =>
                            setJoinCode(e.target.value.toUpperCase())
                        }
                        onKeyDown={(e) => e.key === "Enter" && handleJoinRoom()}
                        maxLength={6}
                        style={{
                            flex: 1,
                            padding: "1rem",
                            fontSize: "1rem",
                            border: "2px solid #ddd",
                            borderRadius: "8px",
                            textAlign: "center",
                            letterSpacing: "0.2em",
                            fontWeight: "bold",
                        }}
                    />
                    <motion.button
                        onClick={handleJoinRoom}
                        disabled={!joinCode.trim()}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        style={{
                            padding: "1rem 1.5rem",
                            fontSize: "1rem",
                            fontWeight: "bold",
                            border: "2px solid #667eea",
                            borderRadius: "8px",
                            background: "transparent",
                            color: "#667eea",
                            cursor: joinCode.trim() ? "pointer" : "not-allowed",
                            opacity: joinCode.trim() ? 1 : 0.5,
                        }}
                    >
                        Join
                    </motion.button>
                </div>
            </motion.div>
        </main>
    );
}
