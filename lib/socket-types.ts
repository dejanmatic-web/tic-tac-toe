import type { Board, Player, Winner } from './game';

export interface PlayerInfo {
  id: string;  // SDK returns string IDs
  username: string;
  symbol: Player;
}

export interface RoomState {
  matchId: string;
  board: Board;
  currentPlayer: Player;
  players: {
    X: string | null; // username
    O: string | null; // username
  };
  winner: Winner;
  winningLine: number[] | null;
  turnStartedAt: number | null;
  disconnectReason: 'timeout' | 'disconnect' | null;
  gameStatus: 'waiting' | 'playing' | 'finished';
}

export interface ServerToClientEvents {
  roomState: (state: RoomState) => void;
  matchJoined: (player: PlayerInfo) => void;
  matchError: (message: string) => void;
}

export interface ClientToServerEvents {
  joinMatch: (matchId: string) => void; // Token is read from HTTP-only cookies on server
  makeMove: (index: number) => void;
}
