export type BulletType = 'normal' | 'scatter' | 'tracking';
export type HitReactionType = 'knockback' | 'knockup' | 'flicker';

export const BULLET_PRESET_COLORS: string[] = [
  '#FF5555',
  '#55FF55',
  '#5555FF',
  '#FFFF55',
  '#FF55FF',
];

export const ENEMY_PRESET_COLORS: string[] = [
  '#E06666',
  '#6FA8DC',
  '#93C47D',
  '#FFD966',
  '#C27BA0',
  '#76A5AF',
  '#F6B26B',
  '#8E7CC3',
  '#674EA7',
  '#A64D79',
];

export const BULLET_SPEEDS: Record<BulletType, number> = {
  normal: 400,
  scatter: 300,
  tracking: 250,
};

export const BULLET_TYPE_LABELS: Record<BulletType, string> = {
  normal: '普通弹 - 速度400px/s',
  scatter: '散射弹 - 5发15°扇形, 速度300px/s',
  tracking: '追踪弹 - 速度250px/s, 最大转弯15°/帧',
};

export const HIT_REACTION_LABELS: Record<HitReactionType, string> = {
  knockback: '后仰动画 - 受击时向后位移20px并恢复',
  knockup: '击飞动画 - 受击时向后上方抛射30px并下落',
  flicker: '闪烁无敌动画 - 受击后闪烁0.5秒并免疫伤害',
};

export interface BulletConfig {
  type: BulletType;
  bulletSize: number;
  bulletColor: string;
}

export interface EnemyConfig {
  hitReaction: HitReactionType;
  health: number;
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
  trail: TrailParticle[];
  hitEnemyIds: Set<string>;
  scatterPenetration: boolean;
}

export interface TrailParticle {
  x: number;
  y: number;
  alpha: number;
  size: number;
  color: string;
}

export interface ExplosionParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
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
  reactionDuration: number;
  isInvincible: boolean;
  flickerTimer: number;
  originalX: number;
  originalY: number;
  knockbackOffsetX: number;
  knockupOffsetX: number;
  knockupOffsetY: number;
  knockupVelocityY: number;
}

export interface HitRecord {
  enemyId: string;
  enemyIndex: number;
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

export interface PerformanceStats {
  fps: number;
  hitRate: number;
  enemyCount: number;
}
