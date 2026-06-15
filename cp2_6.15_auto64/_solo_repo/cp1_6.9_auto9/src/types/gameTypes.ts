export type EntityType = 'boat' | 'island' | 'vortex' | 'stardust' | 'boss' | 'projectile';

export type GamePhase = 'playing' | 'boss' | 'gameover';

export interface BaseEntity {
  id: string;
  x: number;
  y: number;
  type: EntityType;
  alive: boolean;
}

export interface BoatEntity extends BaseEntity {
  type: 'boat';
  speed: number;
  glowIntensity: number;
  glowTimer: number;
  slowTimer: number;
  blinkPhase: number;
}

export interface IslandEntity extends BaseEntity {
  type: 'island';
  width: number;
  height: number;
  rotation: number;
}

export interface VortexEntity extends BaseEntity {
  type: 'vortex';
  radius: number;
  rotation: number;
  rotationSpeed: number;
}

export interface StardustEntity extends BaseEntity {
  type: 'stardust';
  radius: number;
  blinkPhase: number;
}

export interface BossEntity extends BaseEntity {
  type: 'boss';
  radius: number;
  initialRadius: number;
  vertices: number;
  horizontalSpeed: number;
  direction: 1 | -1;
  health: number;
  maxHealth: number;
}

export interface ProjectileEntity extends BaseEntity {
  type: 'projectile';
  radius: number;
  velocityY: number;
}

export type GameEntity =
  | BoatEntity
  | IslandEntity
  | VortexEntity
  | StardustEntity
  | BossEntity
  | ProjectileEntity;

export type ParticleType = 'trail' | 'shockwave' | 'background' | 'ripple';

export interface Particle {
  x: number;
  y: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
  type: ParticleType;
}

export interface ShockwaveEffect {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
  color: string;
}

export interface GameState {
  phase: GamePhase;
  score: number;
  lives: number;
  level: number;
  cameraY: number;
  stardustCollected: number;
  stardustForBoss: number;
  bossTimer: number;
  riverSpeed: number;
  islandDensity: number;
  shockwaves: ShockwaveEffect[];
  particles: Particle[];
  lastProjectileTime: number;
  gameOverTimer: number;
  boatTargetX: number;
}

export interface AudioController {
  startAmbient: () => void;
  stopAmbient: () => void;
  playStardustCollect: () => void;
  playVortexHit: () => void;
  playBossAppear: () => void;
  stopBossAppear: () => void;
  playProjectile: () => void;
  playBossHit: () => void;
  playLevelUp: () => void;
  playGameOver: () => void;
}
