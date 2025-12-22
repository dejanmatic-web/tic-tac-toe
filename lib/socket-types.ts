import { Board, Player, Winner } from './game';

export interface RoomState {
  roomId: string;
  board: Board;
  currentPlayer: Player;
  players: { X: string | null; O: string | null };
  winner: Winner;
  winningLine: number[] | null;
  turnStartedAt: number | null;
  disconnectReason: 'timeout' | 'disconnect' | null;
}

export interface ServerToClientEvents {
  roomState: (state: RoomState) => void;
  playerAssigned: (player: Player) => void;
  error: (message: string) => void;
  timeUpdate: (remainingSeconds: number) => void;
}

export interface ClientToServerEvents {
  createRoom: (roomId: string) => void;
  joinRoom: (roomId: string) => void;
  rejoinRoom: (roomId: string) => void;
  makeMove: (index: number) => void;
  restartGame: () => void;
}
