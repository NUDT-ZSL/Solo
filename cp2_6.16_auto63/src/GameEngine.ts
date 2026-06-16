export type AnimationType = 'idle' | 'walk' | 'eat' | 'sleep';
export type MoodType = 'happy' | 'normal' | 'sad';

export interface PetState {
  name: string;
  happiness: number;
  hunger: number;
  cleanliness: number;
  energy: number;
  currentAnimation: AnimationType;
  animationFrame: number;
  lastUpdateTime: number;
  lastHungerDecayTime: number;
  lastCleanDecayTime: number;
  isNightMode: boolean;
  simulatedHour: number;
}

export const PET_SCALE = 8;
export const PET_SIZE = 16;
export const CANVAS_WIDTH = 480;
export const CANVAS_HEIGHT = 320;

export const PALETTE = {
  darkBrown: '#4a2e1b',
  yellow: '#f5d742',
  green: '#2b8c4e',
  red: '#c94f4f',
  blue: '#3b82f6',
  brightGreen: '#22c55e',
  purple: '#7c3aed',
  lightRed: '#ff6b6b',
  darkRed: '#ff4757',
  orange: '#ffa502',
  darkOrange: '#ff6348',
  skyBlue: '#1e90ff',
  lightSky: '#00bfff',
  gold: '#ffd700',
  darkGold: '#ffaa00',
  nightBg: '#0a0a2e',
  dayBg: '#9bbc0f',
  uiBg: '#1a1a2e',
  border: '#1a1a2e',
  white: '#ffffff',
  black: '#000000',
  lightYellow: '#fff8c4',
  darkGreen: '#0f380f',
};

export const ANIMATION_CONFIG: Record<AnimationType, { frames: number; interval: number }> = {
  idle: { frames: 2, interval: 400 },
  walk: { frames: 4, interval: 200 },
  eat: { frames: 2, interval: 300 },
  sleep: { frames: 2, interval: 400 },
};

export class GameEngine {
  static getInitialState(): PetState {
    const now = Date.now();
    return {
      name: 'Pixel',
      happiness: 70,
      hunger: 80,
      cleanliness: 90,
      energy: 60,
      currentAnimation: 'idle',
      animationFrame: 0,
      lastUpdateTime: now,
      lastHungerDecayTime: now,
      lastCleanDecayTime: now,
      isNightMode: false,
      simulatedHour: new Date().getHours(),
    };
  }

  static clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  static getMood(state: PetState): MoodType {
    if (state.hunger < 20) return 'sad';
    if (state.hunger > 60) return 'happy';
    return 'normal';
  }

  static checkNightMode(hour: number): boolean {
    return hour >= 21 || hour < 7;
  }

  static updateSimulatedTime(state: PetState): PetState {
    const now = Date.now();
    const elapsed = (now - state.lastUpdateTime) / 1000;
    const simulatedElapsed = elapsed * 0.1;
    let newHour = state.simulatedHour + simulatedElapsed / 60;
    if (newHour >= 24) newHour -= 24;
    if (newHour < 0) newHour += 24;
    return { ...state, simulatedHour: newHour };
  }

  static applyNaturalDecay(state: PetState): PetState {
    const now = Date.now();
    let newState = { ...state };

    if (now - state.lastHungerDecayTime >= 10000) {
      const decayCount = Math.floor((now - state.lastHungerDecayTime) / 10000);
      newState.hunger = this.clamp(newState.hunger - decayCount, 0, 100);
      newState.lastHungerDecayTime = now;
    }

    if (now - state.lastCleanDecayTime >= 15000) {
      const decayCount = Math.floor((now - state.lastCleanDecayTime) / 15000);
      newState.cleanliness = this.clamp(newState.cleanliness - decayCount, 0, 100);
      newState.lastCleanDecayTime = now;
    }

    return newState;
  }

  static updateHappiness(state: PetState): PetState {
    let targetHappiness = state.happiness;
    if (state.hunger < 20) {
      targetHappiness = this.clamp(targetHappiness - 2, 0, 100);
    } else if (state.hunger > 60) {
      targetHappiness = this.clamp(targetHappiness + 1, 0, 100);
    }
    return { ...state, happiness: targetHappiness };
  }

  static feed(state: PetState): PetState {
    if (state.isNightMode) return state;
    return {
      ...state,
      hunger: this.clamp(state.hunger + 20, 0, 100),
      currentAnimation: 'eat',
      lastUpdateTime: Date.now(),
    };
  }

  static bath(state: PetState): PetState {
    return {
      ...state,
      cleanliness: this.clamp(state.cleanliness + 30, 0, 100),
      lastUpdateTime: Date.now(),
    };
  }

  static play(state: PetState): PetState {
    if (state.isNightMode) return state;
    return {
      ...state,
      happiness: this.clamp(state.happiness + 15, 0, 100),
      energy: this.clamp(state.energy - 5, 0, 100),
      currentAnimation: 'walk',
      lastUpdateTime: Date.now(),
    };
  }

  static sleep(state: PetState): PetState {
    return {
      ...state,
      energy: this.clamp(state.energy + 30, 0, 100),
      currentAnimation: 'sleep',
      lastUpdateTime: Date.now(),
    };
  }

  static advanceAnimationFrame(state: PetState): PetState {
    const config = ANIMATION_CONFIG[state.currentAnimation];
    const newFrame = (state.animationFrame + 1) % config.frames;
    return { ...state, animationFrame: newFrame };
  }

  static resetToIdle(state: PetState): PetState {
    if (state.isNightMode) {
      return { ...state, currentAnimation: 'sleep', animationFrame: 0 };
    }
    return { ...state, currentAnimation: 'idle', animationFrame: 0 };
  }

  static toggleNightMode(state: PetState, isNight: boolean): PetState {
    return {
      ...state,
      isNightMode: isNight,
      currentAnimation: isNight ? 'sleep' : 'idle',
      animationFrame: 0,
    };
  }
}
