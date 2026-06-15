export type BlockColor = 'red' | 'green' | 'blue' | 'yellow';

export type Direction = 'top' | 'bottom' | 'left' | 'right';

export type GameState = 'IDLE' | 'PLAYING' | 'TRANSITION' | 'RESULT' | 'GAME_OVER';

export interface Block {
  id: number;
  color: BlockColor;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  targetBeatTime: number;
  spawnTime: number;
  hit: boolean;
  missed: boolean;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  opacity: number;
  life: number;
  maxLife: number;
  type: 'combo' | 'ultimate' | 'shatter';
}

export interface SlashLine {
  id: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
  life: number;
  maxLife: number;
}

export interface BeatPulse {
  id: number;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
}

export interface GameStats {
  score: number;
  round: number;
  combo: number;
  maxCombo: number;
  perfectHits: number;
  goodHits: number;
  misses: number;
  energy: number;
  totalBlocksThisRound: number;
  hitBlocksThisRound: number;
  roundScore: number;
  isDoubleScore: boolean;
  doubleScoreTimer: number;
  ultimateReady: boolean;
  transitionProgress: number;
  resultShowTime: number;
}

export interface RoundResult {
  round: number;
  score: number;
  accuracy: number;
  maxCombo: number;
  passed: boolean;
}

export interface LeaderboardEntry {
  timestamp: number;
  totalScore: number;
  date: string;
}

export const COLORS: Record<BlockColor, string> = {
  red: '#ef4444',
  green: '#22c55e',
  blue: '#3b82f6',
  yellow: '#eab308'
};

export const COLORS_GLOW: Record<BlockColor, string> = {
  red: '#fca5a5',
  green: '#86efac',
  blue: '#93c5fd',
  yellow: '#fde047'
};
