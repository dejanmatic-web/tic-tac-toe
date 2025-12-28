"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
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
const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";
const PLATFORM_URL =
  process.env.NEXT_PUBLIC_PLATFORM_URL || "https://dev.gamerstake.io";

type ConnectionStatus = "connecting" | "connected" | "error";

function GameContent() {
  const params = useParams();
  const searchParams = useSearchParams();

  const matchId = params.matchId as string;
  const token = searchParams.get("token");

  // Connection state
  const [socket, setSocket] = useState<GameSocket | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("connecting");
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Player state
  const [myPlayer, setMyPlayer] = useState<PlayerInfo | null>(null);

  // Game state
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);

  // Socket connection + auto join
  useEffect(() => {
    if (!token) {
      setConnectionStatus("error");
      setConnectionError("No authentication token provided");
      return;
    }

    const newSocket: GameSocket = io(SOCKET_URL);
    setSocket(newSocket);

    // Handle successful join
    newSocket.on("matchJoined", (player) => {
      setMyPlayer(player);
      setConnectionStatus("connected");
      console.log("Joined as:", player.username, player.symbol);
    });

    // Handle errors
    newSocket.on("matchError", (message) => {
      setConnectionError(message);
      setConnectionStatus("error");
      console.error("Match error:", message);
    });

    // Handle room state updates
    newSocket.on("roomState", (state) => {
      setRoomState(state);
    });

    // Auto-join immediately
    newSocket.emit("joinMatch", matchId, token);

    return () => {
      newSocket.close();
    };
  }, [matchId, token]);

  // Turn timer
  useEffect(() => {
    if (
      !roomState?.turnStartedAt ||
      roomState.winner ||
      roomState.gameStatus !== "playing"
    ) {
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
  const handleClick = useCallback(
    (index: number) => {
      if (socket) {
        socket.emit("makeMove", index);
      }
    },
    [socket]
  );

  // ERROR STATE
  if (connectionStatus === "error") {
    return (
      <GameContainer>
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
          <h1
            style={{ color: "#e53935", marginBottom: "1rem", fontSize: "2rem" }}
          >
            ❌ Error
          </h1>
          <p style={{ color: "#666", marginBottom: "1.5rem" }}>
            {connectionError || "Connection failed"}
          </p>
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

  // CONNECTING STATE
  if (connectionStatus === "connecting" || !myPlayer) {
    return (
      <GameContainer>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            backgroundColor: "white",
            borderRadius: "16px",
            padding: "2rem",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
            textAlign: "center",
          }}
        >
          <Spinner />
          <p style={{ color: "#666", marginTop: "1rem" }}>
            Connecting to match...
          </p>
        </motion.div>
      </GameContainer>
    );
  }

  // WAITING FOR OPPONENT
  if (roomState?.gameStatus === "waiting") {
    return (
      <GameContainer>
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
          <h2 style={{ marginBottom: "1rem" }}>Waiting for opponent...</h2>
          <p style={{ color: "#666", marginBottom: "0.5rem" }}>
            Match: <code style={{ background: "#f0f0f0", padding: "0.2rem 0.5rem", borderRadius: "4px" }}>{matchId}</code>
          </p>
          <p style={{ color: "#666", marginBottom: "1rem" }}>
            Playing as: <strong>{myPlayer.symbol}</strong> ({myPlayer.username})
          </p>
          <Spinner />
        </motion.div>
      </GameContainer>
    );
  }

  // LOADING GAME STATE
  if (!roomState) {
    return (
      <GameContainer>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            backgroundColor: "white",
            borderRadius: "16px",
            padding: "2rem",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
            textAlign: "center",
          }}
        >
          <Spinner />
          <p style={{ color: "#666", marginTop: "1rem" }}>Loading game...</p>
        </motion.div>
      </GameContainer>
    );
  }

  // GAME VIEW
  const isMyTurn = roomState.currentPlayer === myPlayer.symbol;
  const isLocked = !!roomState.winner || !isMyTurn || roomState.gameStatus !== "playing";

  const getOpponentName = (): string => {
    return myPlayer.symbol === "X"
      ? roomState.players.O || "Opponent"
      : roomState.players.X || "Opponent";
  };

  const getStatus = (): string => {
    if (roomState.gameStatus === "finished") {
      if (roomState.disconnectReason === "timeout") {
        return roomState.winner === myPlayer.symbol
          ? `${getOpponentName()} timed out! You win!`
          : "You timed out!";
      }
      if (roomState.disconnectReason === "disconnect") {
        return roomState.winner === myPlayer.symbol
          ? `${getOpponentName()} disconnected! You win!`
          : "You disconnected!";
      }
      if (roomState.winner === "draw") {
        return "It's a draw!";
      }
      return roomState.winner === myPlayer.symbol ? "🎉 You won!" : "You lost!";
    }
    return isMyTurn ? "Your turn" : `${getOpponentName()}'s turn`;
  };

  const isWinningCell = (index: number) => roomState.winningLine?.includes(index);
  const cellSize = "min(100px, calc((100vw - 3rem) / 3))";

  return (
    <GameContainer>
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
        {/* Match Info */}
        <p style={{ color: "#666", fontSize: "0.85rem", marginBottom: "0.5rem" }}>
          Playing as <strong>{myPlayer.symbol}</strong> ({myPlayer.username})
        </p>

        {/* Player Cards */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "1.5rem",
            marginBottom: "1rem",
          }}
        >
          <PlayerCard
            symbol="X"
            username={roomState.players.X}
            isActive={roomState.currentPlayer === "X" && !roomState.winner}
            isMe={myPlayer.symbol === "X"}
          />
          <PlayerCard
            symbol="O"
            username={roomState.players.O}
            isActive={roomState.currentPlayer === "O" && !roomState.winner}
            isMe={myPlayer.symbol === "O"}
          />
        </div>

        {/* Timer */}
        {remainingTime !== null && roomState.gameStatus === "playing" && (
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

        {/* Status */}
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

        {/* Board */}
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
                  ? { scale: 1.05, backgroundColor: "#f0f0f0" }
                  : {}
              }
              whileTap={cell === "" && !isLocked ? { scale: 0.95 } : {}}
              animate={
                isWinningCell(index) && showResult
                  ? {
                      scale: [1, 1.1, 1],
                      transition: { repeat: Infinity, duration: 0.8 },
                    }
                  : {}
              }
              style={{
                width: cellSize,
                height: cellSize,
                fontSize: "clamp(1.5rem, 8vw, 2.5rem)",
                cursor: cell !== "" || isLocked ? "not-allowed" : "pointer",
                backgroundColor:
                  isWinningCell(index) && showResult ? "#c8e6c9" : "#fafafa",
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
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    style={{
                      display: "block",
                      color: cell === "X" ? "#667eea" : "#764ba2",
                    }}
                  >
                    {cell}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          ))}
        </div>

        {/* Back to Platform Button */}
        {roomState.gameStatus === "finished" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ marginTop: "1.5rem" }}
          >
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
        )}
      </motion.div>
    </GameContainer>
  );
}

// Sub-components

function GameContainer({ children }: { children: React.ReactNode }) {
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

function PlayerCard({
  symbol,
  username,
  isActive,
  isMe,
}: {
  symbol: Player;
  username: string | null;
  isActive: boolean;
  isMe: boolean;
}) {
  return (
    <motion.div
      animate={{
        scale: isActive ? 1.1 : 1,
        opacity: isActive ? 1 : 0.5,
      }}
      style={{
        padding: "0.5rem 1rem",
        borderRadius: "8px",
        backgroundColor: isActive
          ? symbol === "X"
            ? "#e3f2fd"
            : "#fce4ec"
          : "transparent",
        border: isMe ? `2px solid ${symbol === "X" ? "#667eea" : "#764ba2"}` : "2px solid transparent",
        minWidth: "100px",
      }}
    >
      <div style={{ fontSize: "1.25rem", fontWeight: "bold" }}>{symbol}</div>
      <div style={{ fontSize: "0.8rem", color: "#666" }}>
        {username || "Waiting..."}
      </div>
    </motion.div>
  );
}

// Main export with Suspense boundary
export default function GamePage() {
  return (
    <Suspense
      fallback={
        <GameContainer>
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "16px",
              padding: "2rem",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
              textAlign: "center",
            }}
          >
            <Spinner />
            <p style={{ color: "#666", marginTop: "1rem" }}>Loading...</p>
          </div>
        </GameContainer>
      }
    >
      <GameContent />
    </Suspense>
  );
}
