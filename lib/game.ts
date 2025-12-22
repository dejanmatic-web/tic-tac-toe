export type Player = 'X' | 'O';
export type Cell = Player | '';
export type Board = Cell[];
export type Status = 'idle' | 'playing' | 'finished';
export type Winner = Player | 'draw' | null;

export interface GameState {
  board: Board;
  currentPlayer: Player;
  status: Status;
  winner: Winner;
  winningLine: number[] | null;
}

const WINNING_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export function createInitialState(): GameState {
  return {
    board: ['', '', '', '', '', '', '', '', ''],
    currentPlayer: 'X',
    status: 'idle',
    winner: null,
    winningLine: null,
  };
}

export function getWinningLine(board: Board): number[] | null {
  for (const line of WINNING_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return line;
    }
  }
  return null;
}

export function checkWinner(board: Board): Winner {
  const line = getWinningLine(board);
  if (line) {
    return board[line[0]] as Player;
  }

  if (board.every((cell) => cell !== '')) {
    return 'draw';
  }

  return null;
}

export function makeMove(state: GameState, index: number): GameState {
  if (state.status === 'finished') {
    return state;
  }

  if (state.board[index] !== '') {
    return state;
  }

  const newBoard = [...state.board];
  newBoard[index] = state.currentPlayer;

  const winner = checkWinner(newBoard);
  const winningLine = winner && winner !== 'draw' ? getWinningLine(newBoard) : null;

  return {
    board: newBoard,
    currentPlayer: state.currentPlayer === 'X' ? 'O' : 'X',
    status: winner ? 'finished' : 'playing',
    winner,
    winningLine,
  };
}

export function resetGame(): GameState {
  return createInitialState();
}
