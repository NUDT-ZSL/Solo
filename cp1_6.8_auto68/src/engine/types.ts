export type PlayerId = 0 | 1;
export type GamePhase = 'menu' | 'playing' | 'paused' | 'ended';
export type ParticleType = 'trail' | 'explosion' | 'shield_break' | 'pulse' | 'charge';
export type BubbleType = 'speed' | 'shield';

export interface Vec2 {
  x: number;
  y: number;
}

export interface PlayerState {
  id: PlayerId;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  shield: number;
  maxShield: number;
  charging: boolean;
  chargeProgress: number;
  speed: number;
  baseSpeed: number;
  speedBoostTimer: number;
  attackCooldown: number;
  color: string;
  glowColor: string;
  facingRight: boolean;
  invincibleTimer: number;
}

export interface Projectile {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ownerId: PlayerId;
  isCharged: boolean;
  radius: number;
  color: string;
  life: number;
  maxLife: number;
}

export interface BeatTrackState {
  amplitude: number;
  baseAmplitude: number;
  frequency: number;
  phase: number;
  beatCount: number;
  bpm: number;
  beatInterval: number;
  lastBeatTime: number;
}

export interface BeatBubble {
  id: number;
  x: number;
  y: number;
  radius: number;
  type: BubbleType;
  collected: boolean;
  expired: boolean;
  spawnBeat: number;
  life: number;
  maxLife: number;
  pulsePhase: number;
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
  type: ParticleType;
  alpha: number;
  rotation: number;
  rotationSpeed: number;
}

export interface ScreenEffect {
  redFlash: number;
  shakeX: number;
  shakeY: number;
  shakeIntensity: number;
  shakeDecay: number;
}

export interface GameState {
  phase: GamePhase;
  players: [PlayerState, PlayerState];
  beatTrack: BeatTrackState;
  particles: Particle[];
  projectiles: Projectile[];
  beatBubbles: BeatBubble[];
  screenEffect: ScreenEffect;
  time: number;
  timeRemaining: number;
  matchDuration: number;
  winner: PlayerId | null;
  nextProjectileId: number;
  nextBubbleId: number;
}

export const COLORS = {
  bg1: '#1a0a2e',
  bg2: '#0a0a0a',
  neonBlue: '#00f0ff',
  neonPurple: '#bf00ff',
  neonRed: '#ff0055',
  neonGreen: '#00ff88',
  neonYellow: '#ffdd00',
  p1Main: '#00f0ff',
  p1Glow: '#0088ff',
  p2Main: '#ff0055',
  p2Glow: '#ff00aa',
  trackLine: '#bf00ff',
  trackGlow: '#8800aa',
  shieldColor: '#00ddff',
  hpHigh: '#00ff88',
  hpMid: '#ffdd00',
  hpLow: '#ff0055',
  bubbleSpeed: '#00ff88',
  bubbleShield: '#00ddff',
};

export const GAME_CONFIG = {
  PLAYER_MAX_HP: 5,
  PLAYER_MAX_SHIELD: 3,
  PLAYER_BASE_SPEED: 300,
  PLAYER_SIZE: 24,
  PROJECTILE_SPEED: 500,
  PROJECTILE_RADIUS: 8,
  CHARGED_PROJECTILE_RADIUS: 14,
  CHARGE_DURATION: 0.8,
  ATTACK_COOLDOWN: 0.3,
  SHIELD_DAMAGE_NORMAL: 1,
  SHIELD_DAMAGE_CHARGED: 2,
  HP_DAMAGE_NORMAL: 1,
  HP_DAMAGE_CHARGED: 2,
  BEAT_BUBBLE_INTERVAL: 8,
  BEAT_BUBBLE_RADIUS: 20,
  BEAT_BUBBLE_LIFETIME: 4,
  BPM: 120,
  MATCH_DURATION: 120,
  PARTICLE_MAX: 200,
  INVINCIBLE_DURATION: 0.5,
  SPEED_BOOST_DURATION: 3,
  PROJECTILE_LIFETIME: 3,
  TRACK_MARGIN: 80,
};
