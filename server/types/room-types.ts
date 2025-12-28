import type { Board, Player, Winner } from '../../lib/game';
import type { ValidatedPlayer } from '../sdk/player-validator';

export interface AuthenticatedPlayer extends ValidatedPlayer {
  symbol: Player;
  socketId: string;
  token: string;
}

export interface SDKState {
  matchStarted: boolean;
  matchEnded: boolean;
  playersReported: Set<string>;  // Player IDs are strings
}

export interface SDKRoom {
  matchId: string;
  board: Board;
  currentPlayer: Player;
  winner: Winner;
  winningLine: number[] | null;
  turnStartedAt: number | null;
  disconnectReason: 'timeout' | 'disconnect' | null;
  gameStatus: 'waiting' | 'playing' | 'finished';
  players: {
    X: AuthenticatedPlayer | null;
    O: AuthenticatedPlayer | null;
  };
  turnTimer: NodeJS.Timeout | null;
  sdkState: SDKState;
}

export function createRoom(matchId: string): SDKRoom {
  return {
    matchId,
    board: ['', '', '', '', '', '', '', '', ''],
    currentPlayer: 'X',
    winner: null,
    winningLine: null,
    turnStartedAt: null,
    disconnectReason: null,
    gameStatus: 'waiting',
    players: { X: null, O: null },
    turnTimer: null,
    sdkState: {
      matchStarted: false,
      matchEnded: false,
      playersReported: new Set(),
    },
  };
}

