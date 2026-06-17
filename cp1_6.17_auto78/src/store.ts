import { create } from 'zustand';
import type { Diamond } from './轨道系统';

export interface PlayerState {
  track: number;
  targetTrack: number;
  y: number;
  isJumping: boolean;
  jumpProgress: number;
  jumpHeight: number;
  isFlashing: boolean;
  flashTimer: number;
  trackTransitionProgress: number;
  rotation: number;
}

export interface GameState {
  gameStatus: 'countdown' | 'playing' | 'gameover';
  countdown: number;
  score: number;
  energy: number;
  perfectHits: number;
  consecutiveHits: number;
  isPowerUp: boolean;
  powerUpTimer: number;
  isScreenFlash: boolean;
  screenFlashTimer: number;
  scoreAnimation: boolean;
  scoreAnimationTimer: number;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
}

interface StoreState {
  player: PlayerState;
  game: GameState;
  diamonds: Diamond[];
  particles: Particle[];
  isPowerUpActive: boolean;
  diamondColor: string;
  resetGame: () => void;
  startGame: () => void;
  updateCountdown: (delta: number) => void;
}

const initialPlayer: PlayerState = {
  track: 1,
  targetTrack: 1,
  y: 0,
  isJumping: false,
  jumpProgress: 0,
  jumpHeight: 0,
  isFlashing: false,
  flashTimer: 0,
  trackTransitionProgress: 1,
  rotation: 0,
};

const initialGame: GameState = {
  gameStatus: 'countdown',
  countdown: 3,
  score: 0,
  energy: 0,
  perfectHits: 0,
  consecutiveHits: 0,
  isPowerUp: false,
  powerUpTimer: 0,
  isScreenFlash: false,
  screenFlashTimer: 0,
  scoreAnimation: false,
  scoreAnimationTimer: 0,
};

export const useGameStore = create<StoreState>((set, get) => ({
  player: initialPlayer,
  game: initialGame,
  diamonds: [],
  particles: [],
  isPowerUpActive: false,
  diamondColor: '#00FFFF',

  resetGame: () => {
    set({
      player: { ...initialPlayer },
      game: { ...initialGame },
      diamonds: [],
      particles: [],
      isPowerUpActive: false,
      diamondColor: '#00FFFF',
    });
  },

  startGame: () => {
    set((state) => ({
      game: { ...state.game, gameStatus: 'playing' },
    }));
  },

  updateCountdown: (delta: number) => {
    set((state) => {
      const newCountdown = state.game.countdown - delta;
      if (newCountdown <= 0) {
        return {
          game: { ...state.game, gameStatus: 'playing', countdown: 0 },
        };
      }
      return {
        game: { ...state.game, countdown: newCountdown },
      };
    });
  },
}));
