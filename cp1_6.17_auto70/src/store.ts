import { create } from 'zustand';

export type GamePhase = 'countdown' | 'playing' | 'gameover';

export interface PlayerState {
  track: number;
  targetTrack: number;
  y: number;
  isJumping: boolean;
  jumpStartTime: number;
  jumpProgress: number;
  isFlashing: boolean;
  flashStartTime: number;
  trackTransitionProgress: number;
  trackTransitionStartTime: number;
  isTransitioningTrack: boolean;
  rotation: number;
}

export interface GameState {
  phase: GamePhase;
  score: number;
  energy: number;
  perfectHits: number;
  consecutiveMisses: number;
  isPowerUpActive: boolean;
  powerUpEndTime: number;
  screenFlash: boolean;
  screenFlashStartTime: number;
  scoreAnimation: boolean;
  scoreAnimationStartTime: number;
  player: PlayerState;
  countdown: number;
  countdownStartTime: number;
  speedMultiplier: number;
  diamondColorIndex: number;
  diamondColorSwapTime: number;
}

export interface GameActions {
  startGame: () => void;
  resetGame: () => void;
  updateCountdown: (currentTime: number) => void;
  moveLeft: () => void;
  moveRight: () => void;
  jump: (currentTime: number) => void;
  activatePowerUp: (currentTime: number) => void;
  updatePlayer: (currentTime: number, deltaTime: number) => void;
  addScore: (points: number, currentTime: number) => void;
  addEnergy: (amount: number) => void;
  deductEnergy: (amount: number) => void;
  registerHit: (type: 'perfect' | 'normal' | 'miss', currentTime: number) => void;
  triggerScreenFlash: (currentTime: number) => void;
  updatePowerUp: (currentTime: number) => void;
  updateDiamondColor: (currentTime: number) => void;
  setPhase: (phase: GamePhase) => void;
}

const initialPlayerState: PlayerState = {
  track: 1,
  targetTrack: 1,
  y: 0,
  isJumping: false,
  jumpStartTime: 0,
  jumpProgress: 0,
  isFlashing: false,
  flashStartTime: 0,
  trackTransitionProgress: 1,
  trackTransitionStartTime: 0,
  isTransitioningTrack: false,
  rotation: 0,
};

const initialGameState: Omit<GameState, keyof GameActions> = {
  phase: 'countdown',
  score: 0,
  energy: 0,
  perfectHits: 0,
  consecutiveMisses: 0,
  isPowerUpActive: false,
  powerUpEndTime: 0,
  screenFlash: false,
  screenFlashStartTime: 0,
  scoreAnimation: false,
  scoreAnimationStartTime: 0,
  player: initialPlayerState,
  countdown: 3,
  countdownStartTime: 0,
  speedMultiplier: 1,
  diamondColorIndex: 0,
  diamondColorSwapTime: 0,
};

export const useGameStore = create<GameState & GameActions>((set, get) => ({
  ...initialGameState,

  startGame: () => {
    const now = performance.now();
    set({
      phase: 'countdown',
      countdownStartTime: now,
      countdown: 3,
    });
  },

  resetGame: () => {
    const now = performance.now();
    set({
      ...initialGameState,
      phase: 'countdown',
      countdownStartTime: now,
      player: { ...initialPlayerState },
    });
  },

  updateCountdown: (currentTime: number) => {
    const state = get();
    if (state.phase !== 'countdown') return;

    const elapsed = (currentTime - state.countdownStartTime) / 1000;
    const newCountdown = Math.max(0, 3 - Math.floor(elapsed));

    if (elapsed >= 3) {
      set({
        phase: 'playing',
        countdown: 0,
      });
    } else if (newCountdown !== state.countdown) {
      set({ countdown: newCountdown });
    }
  },

  moveLeft: () => {
    const state = get();
    if (state.phase !== 'playing') return;
    if (state.player.isTransitioningTrack) return;

    const newTrack = Math.max(0, state.player.track - 1);
    if (newTrack !== state.player.track) {
      set({
        player: {
          ...state.player,
          targetTrack: newTrack,
          isTransitioningTrack: true,
          trackTransitionStartTime: performance.now(),
          trackTransitionProgress: 0,
        },
      });
    }
  },

  moveRight: () => {
    const state = get();
    if (state.phase !== 'playing') return;
    if (state.player.isTransitioningTrack) return;

    const newTrack = Math.min(2, state.player.track + 1);
    if (newTrack !== state.player.track) {
      set({
        player: {
          ...state.player,
          targetTrack: newTrack,
          isTransitioningTrack: true,
          trackTransitionStartTime: performance.now(),
          trackTransitionProgress: 0,
        },
      });
    }
  },

  jump: (currentTime: number) => {
    const state = get();
    if (state.phase !== 'playing') return;
    if (state.player.isJumping) return;

    set({
      player: {
        ...state.player,
        isJumping: true,
        jumpStartTime: currentTime,
        jumpProgress: 0,
      },
    });
  },

  activatePowerUp: (currentTime: number) => {
    const state = get();
    if (state.phase !== 'playing') return;
    if (state.energy < 100) return;
    if (state.isPowerUpActive) return;

    set({
      energy: 0,
      isPowerUpActive: true,
      powerUpEndTime: currentTime + 10000,
      speedMultiplier: 1.5,
      screenFlash: true,
      screenFlashStartTime: currentTime,
    });
  },

  updatePlayer: (currentTime: number, deltaTime: number) => {
    const state = get();
    const player = { ...state.player };
    let needsUpdate = false;

    if (player.isTransitioningTrack) {
      const transitionDuration = 150;
      const elapsed = currentTime - player.trackTransitionStartTime;
      const progress = Math.min(1, elapsed / transitionDuration);
      const easedProgress = 1 - Math.pow(1 - progress, 3);

      player.trackTransitionProgress = easedProgress;
      player.track = player.track + (player.targetTrack - player.track) * easedProgress;

      if (progress >= 1) {
        player.track = player.targetTrack;
        player.isTransitioningTrack = false;
        player.trackTransitionProgress = 1;
      }
      needsUpdate = true;
    }

    if (player.isJumping) {
      const jumpDuration = 400;
      const elapsed = currentTime - player.jumpStartTime;
      const progress = Math.min(1, elapsed / jumpDuration);

      if (progress < 0.5) {
        player.jumpProgress = progress * 2;
      } else {
        player.jumpProgress = 2 - progress * 2;
      }

      player.rotation = progress * Math.PI / 2;

      if (progress >= 1) {
        player.isJumping = false;
        player.jumpProgress = 0;
        player.rotation = 0;
      }
      needsUpdate = true;
    }

    if (player.isFlashing) {
      const flashDuration = 300;
      const elapsed = currentTime - player.flashStartTime;
      if (elapsed >= flashDuration) {
        player.isFlashing = false;
      }
      needsUpdate = true;
    }

    if (needsUpdate) {
      set({ player });
    }
  },

  addScore: (points: number, currentTime: number) => {
    const state = get();
    const multiplier = state.isPowerUpActive ? 2 : 1;
    const newScore = Math.max(0, state.score + points * multiplier);
    set({
      score: newScore,
      scoreAnimation: true,
      scoreAnimationStartTime: currentTime,
    });
  },

  addEnergy: (amount: number) => {
    const state = get();
    set({
      energy: Math.min(100, state.energy + amount),
    });
  },

  deductEnergy: (amount: number) => {
    const state = get();
    set({
      energy: Math.max(0, state.energy - amount),
    });
  },

  registerHit: (type: 'perfect' | 'normal' | 'miss', currentTime: number) => {
    const state = get();
    let newState: Partial<GameState> = {};

    if (type === 'perfect') {
      newState = {
        perfectHits: state.perfectHits + 1,
        consecutiveMisses: 0,
      };
    } else if (type === 'miss') {
      const newConsecutiveMisses = state.consecutiveMisses + 1;
      newState = {
        consecutiveMisses: newConsecutiveMisses,
        player: {
          ...state.player,
          isFlashing: true,
          flashStartTime: currentTime,
        },
      };
      if (newConsecutiveMisses >= 3) {
        newState.phase = 'gameover';
      }
    } else {
      newState = {
        consecutiveMisses: 0,
      };
    }

    set(newState);
  },

  triggerScreenFlash: (currentTime: number) => {
    set({
      screenFlash: true,
      screenFlashStartTime: currentTime,
    });
  },

  updatePowerUp: (currentTime: number) => {
    const state = get();
    if (state.isPowerUpActive && currentTime >= state.powerUpEndTime) {
      set({
        isPowerUpActive: false,
        speedMultiplier: 1,
      });
    }

    if (state.screenFlash) {
      const flashDuration = 100;
      if (currentTime - state.screenFlashStartTime >= flashDuration) {
        set({ screenFlash: false });
      }
    }

    if (state.scoreAnimation) {
      const animationDuration = 300;
      if (currentTime - state.scoreAnimationStartTime >= animationDuration) {
        set({ scoreAnimation: false });
      }
    }
  },

  updateDiamondColor: (currentTime: number) => {
    const state = get();
    if (!state.isPowerUpActive) return;

    const swapInterval = 200;
    if (currentTime - state.diamondColorSwapTime >= swapInterval) {
      set({
        diamondColorIndex: state.diamondColorIndex === 0 ? 1 : 0,
        diamondColorSwapTime: currentTime,
      });
    }
  },

  setPhase: (phase: GamePhase) => {
    set({ phase });
  },
}));
