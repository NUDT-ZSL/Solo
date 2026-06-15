export interface Riddle {
  id: number;
  category: string;
  riddle: string;
  hint?: string;
  answer?: string;
}

export interface RoomState {
  code: string;
  name: string;
  host: string;
  players: string[];
  riddles: Riddle[];
  solved: number[];
  likes: Record<number, string[]>;
  timeLeft: number;
  status: 'waiting' | 'playing' | 'finished';
  maxPlayers: number;
  category: string;
}

export interface AnswerResult {
  correct: boolean;
  riddleId?: number;
  playerName?: string;
  answer?: string;
  message?: string;
}

export interface LikeUpdate {
  riddleId: number;
  likes: string[];
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
}
