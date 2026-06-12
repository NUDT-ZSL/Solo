export type AttackType = 'light' | 'heavy' | 'dash';

export interface GameParams {
  jumpHeight: number;
  gravity: number;
  lightDamage: number;
  heavyDamage: number;
  dashCooldown: number;
}

export interface Hitbox {
  x: number;
  y: number;
  width: number;
  height: number;
  damage: number;
  knockback: number;
  active: boolean;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface InputState {
  left: boolean;
  right: boolean;
  up: boolean;
  jumpPressed: boolean;
  lightPressed: boolean;
  heavyPressed: boolean;
  dashPressed: boolean;
}

export type AttackPhase = 'startup' | 'active' | 'recovery' | 'none';

export interface PlayerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  facing: 1 | -1;
  onGround: boolean;
  jumpsRemaining: number;
  health: number;
  maxHealth: number;
  isAttacking: boolean;
  attackPhase: AttackPhase;
  attackType: AttackType | null;
  attackTimer: number;
  dashCooldownTimer: number;
  isDashing: boolean;
  dashDistance: number;
  invincible: boolean;
  invincibleTimer: number;
}

export interface EnemyState {
  id: number;
  x: number;
  y: number;
  vx: number;
  radius: number;
  health: number;
  maxHealth: number;
  patrolLeft: number;
  patrolRight: number;
  direction: 1 | -1;
  hitFlashTimer: number;
  deathScale: number;
  alive: boolean;
  knockbackTimer: number;
}

export interface PlatformData {
  x: number;
  y: number;
  width: number;
  height: number;
  isGround: boolean;
}

export interface RecordedFrame {
  timestamp: number;
  playerX: number;
  playerY: number;
  inputs: InputState;
  attackEvents: { type: AttackType; x: number; y: number }[];
  hits: { x: number; y: number }[];
}

export interface DirtyRect {
  x: number;
  y: number;
  width: number;
  height: number;
}
