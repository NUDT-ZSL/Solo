export interface Position {
  x: number;
  y: number;
}

export interface CellState {
  type: 'empty' | 'trap' | 'player' | 'ai' | 'goal' | 'player-start' | 'ai-start';
  isFlashing?: boolean;
  isExploding?: boolean;
  isPulsing?: boolean;
  particles?: Particle[];
}

export interface Particle {
  id: number;
  dx: number;
  dy: number;
}

export interface GameState {
  board: CellState[][];
  playerPos: Position;
  aiPos: Position;
  goalPos: Position;
  path: Position[];
  turn: number;
  score: number;
  aiStepsRemaining: number;
  isGameOver: boolean;
  winner: 'player' | 'ai' | null;
  aiPaused: boolean;
}

export type CellClickHandler = (x: number, y: number) => void;
