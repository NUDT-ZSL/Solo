export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;
export const TILE_SIZE = 64;
export const PLAYER_WIDTH = 32;
export const PLAYER_HEIGHT = 48;
export const PLAYER_SPEED = 200;
export const JUMP_VELOCITY = 350;
export const GRAVITY = 800;
export const SPIKE_SIZE = 32;
export const SPIKE_SPEED = 60;
export const STAR_SIZE = 24;
export const INITIAL_LIVES = 3;

export const PLATFORM_COLORS = ['#2ecc71', '#f39c12', '#e74c3c', '#3498db'] as const;
export const PARTICLE_COLORS = ['#ffcc00', '#ff66cc', '#66ff66'] as const;

export const APPEAR_DURATION = 0.2;
export const DISAPPEAR_DURATION = 0.15;
export const LAND_FLASH_DURATION = 0.1;
export const SPIKE_SLIDE_DURATION = 0.3;
export const HIT_FLASH_DURATION = 0.3;
export const HIT_FLASH_ALPHA = 0.7;
export const PARTICLE_LIFE = 0.5;
export const PARTICLE_COUNT = 20;
export const STAR_RESPAWN_TIME = 2;
export const INVINCIBLE_TIME = 1.0;
export const TRAIL_LENGTH = 8;

export type PlatformColor = typeof PLATFORM_COLORS[number];
export type ParticleColor = typeof PARTICLE_COLORS[number];

export interface PlatformBlock {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  color: PlatformColor;
  state: 'appearing' | 'visible' | 'disappearing';
  stateTime: number;
  flashTime: number;
}

export interface Spike {
  id: number;
  x: number;
  y: number;
  size: number;
  platformId: number;
  velocity: number;
  platformLeft: number;
  platformRight: number;
  slideInTime: number;
  slideFromLeft: boolean;
}

export interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  collected: boolean;
  respawnTimer: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: ParticleColor;
  size: number;
  life: number;
  maxLife: number;
  trail: { x: number; y: number }[];
}

export interface ScreenFlash {
  color: string;
  alpha: number;
  duration: number;
  time: number;
}

export interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  onGround: boolean;
  lives: number;
  facing: 1 | -1;
  invincibleTime: number;
}

export interface InputState {
  left: boolean;
  right: boolean;
  jump: boolean;
  jumpPressed: boolean;
}

export interface Camera {
  x: number;
  y: number;
}

export interface HUDData {
  score: number;
  lives: number;
  level: number;
}
