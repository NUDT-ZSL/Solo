export type BulletType = 'normal' | 'scatter' | 'tracking';
export type HitReactionType = 'knockback' | 'knockup' | 'flicker';

export interface BulletConfig {
  type: BulletType;
  size: number;
  color: string;
}

export interface EnemyConfig {
  hitReaction: HitReactionType;
  maxHealth: number;
}

export interface Bullet {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  type: BulletType;
  angle: number;
  trail: { x: number; y: number; alpha: number }[];
  hitEnemyIds: Set<string>;
}

export interface Enemy {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  health: number;
  maxHealth: number;
  hitReaction: HitReactionType;
  reactionTimer: number;
  reactionPhase: number;
  isInvincible: boolean;
  originalX: number;
  originalY: number;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
}

export interface HitRecord {
  enemyId: string;
  bulletType: BulletType;
  hitReaction: HitReactionType;
  frameDuration: number;
  timestamp: number;
}

export interface ShotRecord {
  hit: boolean;
  timestamp: number;
}

export interface AppConfig {
  bullet: BulletConfig;
  enemy: EnemyConfig;
}
