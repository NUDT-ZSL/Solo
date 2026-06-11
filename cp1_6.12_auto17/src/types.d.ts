export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Vector2 {
  x: number;
  y: number;
}

export interface Bullet {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  active: boolean;
}

export interface Enemy {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  active: boolean;
  formation: 'v' | 'line';
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  active: boolean;
}

export interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  twinkle: number;
  twinkleSpeed: number;
}

export interface PlayerState {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  lives: number;
  fireLevel: number;
  powerUpTimer: number;
  isPowerUp: boolean;
  invincibleTimer: number;
  isInvincible: boolean;
  glowIntensity: number;
  shieldActive: boolean;
  speedBoostActive: boolean;
}

export interface VirtualJoystick {
  active: boolean;
  touchId: number;
  baseX: number;
  baseY: number;
  stickX: number;
  stickY: number;
  radius: number;
}

export interface ShootButton {
  x: number;
  y: number;
  radius: number;
  active: boolean;
  touchId: number;
}

export interface GameUIState {
  score: number;
  lives: number;
  fireLevel: number;
  isGameOver: boolean;
  isPowerUp: boolean;
  isMobile: boolean;
  canvasWidth: number;
  canvasHeight: number;
  shieldActive: boolean;
  speedBoostActive: boolean;
}

export interface PowerUpState {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  type: string;
  active: boolean;
  picked: boolean;
  rotation: number;
}

export type FormationType = 'v' | 'line';
export type PowerUpType = 'double_fire' | 'shield' | 'speed_boost';
