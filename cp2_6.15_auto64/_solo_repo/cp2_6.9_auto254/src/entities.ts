export interface Vec2 {
  x: number;
  y: number;
}

export interface Player {
  id: 1 | 2;
  pos: Vec2;
  size: number;
  color: string;
  glowColor: string;
  hp: number;
  maxHp: number;
  ammo: number;
  maxAmmo: number;
  ammoCooldown: number[];
  speed: number;
  angle: number;
  pulseCooldown: number;
  shieldCooldown: number;
  shieldActive: number;
  invincible: number;
  flashTimer: number;
  flashCount: number;
  resetting: boolean;
  score: number;
}

export interface Bullet {
  id: number;
  pos: Vec2;
  vel: Vec2;
  radius: number;
  color: string;
  owner: 1 | 2;
  alive: boolean;
  trail: Vec2[];
}

export interface Particle {
  pos: Vec2;
  radius: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  expanding: boolean;
}

export interface Cover {
  pos: Vec2;
  size: number;
  corner: 'tl' | 'tr' | 'bl' | 'br';
}

export interface Core {
  pos: Vec2;
  radius: number;
  owner: 0 | 1 | 2;
  progress: number;
  captureTimer: number;
  targetOffset: Vec2;
}

export interface GameState {
  players: [Player, Player];
  bullets: Bullet[];
  particles: Particle[];
  covers: Cover[];
  core: Core;
  arena: { x: number; y: number; w: number; h: number };
  keys: Set<string>;
  gameOver: boolean;
  winner: 0 | 1 | 2;
  roundTime: number;
  bulletIdCounter: number;
}

export const ARENA_X = 0;
export const ARENA_Y = 40;
export const ARENA_SIZE = 600;

export function createPlayer(id: 1 | 2, arenaX: number, arenaY: number, arenaW: number): Player {
  const isLeft = id === 1;
  return {
    id,
    pos: {
      x: isLeft ? arenaX + 80 : arenaX + arenaW - 80,
      y: arenaY + arenaW / 2
    },
    size: 30,
    color: isLeft ? '#00D4FF' : '#FF6B35',
    glowColor: isLeft ? 'rgba(0, 212, 255, 0.6)' : 'rgba(255, 107, 53, 0.6)',
    hp: 100,
    maxHp: 100,
    ammo: 3,
    maxAmmo: 3,
    ammoCooldown: [0, 0, 0],
    speed: 4,
    angle: isLeft ? 0 : Math.PI,
    pulseCooldown: 0,
    shieldCooldown: 0,
    shieldActive: 0,
    invincible: 0,
    flashTimer: 0,
    flashCount: 0,
    resetting: false,
    score: 0
  };
}

export function createCovers(arenaX: number, arenaY: number, arenaSize: number): Cover[] {
  const size = 60;
  return [
    { pos: { x: arenaX, y: arenaY }, size, corner: 'tl' },
    { pos: { x: arenaX + arenaSize - size, y: arenaY }, size, corner: 'tr' },
    { pos: { x: arenaX, y: arenaY + arenaSize - size }, size, corner: 'bl' },
    { pos: { x: arenaX + arenaSize - size, y: arenaY + arenaSize - size }, size, corner: 'br' }
  ];
}

export function createCore(arenaX: number, arenaY: number, arenaSize: number): Core {
  return {
    pos: { x: arenaX + arenaSize / 2, y: arenaY + arenaSize / 2 },
    radius: 12,
    owner: 0,
    progress: 0,
    captureTimer: 0,
    targetOffset: { x: 0, y: 0 }
  };
}
