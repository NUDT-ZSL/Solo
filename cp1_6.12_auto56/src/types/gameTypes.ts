export type GameTheme = 'vegetation' | 'ruins' | 'future';

export type BeatWindow = 'loose' | 'standard' | 'strict';

export interface GameSettings {
  musicVolume: number;
  scrollSpeed: number;
  jumpSensitivity: BeatWindow;
}

export interface PlatformData {
  id: number;
  beatIndex: number;
  x: number;
  y: number;
  z: number;
  lane: number;
  type: 'normal' | 'obstacle' | 'rotate' | 'high' | 'low';
  width: number;
  height: number;
  passed: boolean;
  hit: boolean;
}

export interface ParticleData {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: number;
  size: number;
}

export interface GameState {
  score: number;
  combo: number;
  maxCombo: number;
  lives: number;
  currentTheme: GameTheme;
  unlockedThemes: GameTheme[];
  isFeverMode: boolean;
  feverComboCount: number;
  gameOver: boolean;
  isPaused: boolean;
}

export interface PlayerState {
  x: number;
  y: number;
  z: number;
  velocityY: number;
  lane: number;
  targetLane: number;
  isGrounded: boolean;
  isJumping: boolean;
  jumpCharge: number;
  scale: number;
  canAirDodge: boolean;
  airDodgeDirection: number;
}

export const DEFAULT_SETTINGS: GameSettings = {
  musicVolume: 70,
  scrollSpeed: 1.0,
  jumpSensitivity: 'standard'
};

export const THEME_COLORS: Record<GameTheme, { bg: number; platform: number; accent: number; glow: number }> = {
  vegetation: {
    bg: 0x1A0A2E,
    platform: 0x2E8B57,
    accent: 0x00FFFF,
    glow: 0x00FF00
  },
  ruins: {
    bg: 0x2E1A0A,
    platform: 0x8B7355,
    accent: 0xFFD700,
    glow: 0xFF8C00
  },
  future: {
    bg: 0x0A1A2E,
    platform: 0x4169E1,
    accent: 0xFF00FF,
    glow: 0x00FFFF
  }
};

export const THEME_THRESHOLDS: { score: number; theme: GameTheme }[] = [
  { score: 0, theme: 'vegetation' },
  { score: 1000, theme: 'ruins' },
  { score: 5000, theme: 'future' }
];
