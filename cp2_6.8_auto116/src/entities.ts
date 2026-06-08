import { gameConfig } from './controls';

export interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  invincibleTimer: number;
  hitFlashTimer: number;
  angle: number;
}

export interface Asteroid {
  id: number;
  x: number;
  y: number;
  size: number;
  vx: number;
  vy: number;
  points: number[];
  crystalCount: number;
  hp: number;
  rotation: number;
  rotationSpeed: number;
  isFragment: boolean;
  life: number;
}

export interface Crystal {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  trail: { x: number; y: number; alpha: number }[];
  collected: boolean;
}

export interface Enemy {
  id: number;
  x: number;
  y: number;
  hp: number;
  respawnTimer: number;
  active: boolean;
  shootCooldown: number;
}

export interface Bullet {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  isEnemy: boolean;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface Laser {
  active: boolean;
  flashTimer: number;
  hitX: number;
  hitY: number;
}

export interface Star {
  x: number;
  y: number;
  size: number;
  baseAlpha: number;
  phase: number;
  phaseSpeed: number;
}

export interface GameState {
  player: Player;
  asteroids: Asteroid[];
  crystals: Crystal[];
  enemies: Enemy[];
  bullets: Bullet[];
  particles: Particle[];
  stars: Star[];
  laser: Laser;
  crystalStock: number;
  totalMined: number;
  screenFlashTimer: number;
}

let entityIdCounter = 0;
export function nextId(): number {
  return entityIdCounter++;
}

export function resetIdCounter(): void {
  entityIdCounter = 0;
}

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randInt(min: number, max: number): number {
  return Math.floor(rand(min, max + 1));
}

function generateAsteroidPoints(size: number): number[] {
  const points: number[] = [];
  const numPoints = randInt(7, 11);
  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * Math.PI * 2;
    const r = size * rand(0.7, 1.0);
    points.push(angle, r);
  }
  return points;
}

export function createPlayer(): Player {
  return {
    x: gameConfig.canvasWidth / 2,
    y: gameConfig.canvasHeight / 2,
    vx: 0,
    vy: 0,
    invincibleTimer: 0,
    hitFlashTimer: 0,
    angle: -Math.PI / 2
  };
}

export function createAsteroid(isFragment = false, x?: number, y?: number, size?: number): Asteroid {
  const actualSize = isFragment ? rand(10, 20) : (size ?? rand(20, 50));
  const actualX = x ?? rand(actualSize, gameConfig.canvasWidth - actualSize);
  const actualY = y ?? rand(actualSize, gameConfig.canvasHeight - actualSize);
  return {
    id: nextId(),
    x: actualX,
    y: actualY,
    size: actualSize,
    vx: rand(-0.5, 0.5),
    vy: rand(-0.5, 0.5),
    points: generateAsteroidPoints(actualSize),
    crystalCount: isFragment ? 0 : randInt(Math.max(1, gameConfig.crystalDropRate - 2), gameConfig.crystalDropRate + 2),
    hp: isFragment ? 1 : (actualSize > 35 ? 2 : 1),
    rotation: rand(0, Math.PI * 2),
    rotationSpeed: rand(-0.02, 0.02),
    isFragment,
    life: isFragment ? 180 : Infinity
  };
}

export function createCrystal(x: number, y: number): Crystal {
  return {
    id: nextId(),
    x,
    y,
    vx: rand(-1, 1),
    vy: rand(-1, 1),
    trail: [],
    collected: false
  };
}

export function createEnemy(id: number): Enemy {
  const edge = randInt(0, 3);
  let x = 0;
  let y = 0;
  if (edge === 0) { x = rand(0, gameConfig.canvasWidth); y = 0; }
  if (edge === 1) { x = gameConfig.canvasWidth; y = rand(0, gameConfig.canvasHeight); }
  if (edge === 2) { x = rand(0, gameConfig.canvasWidth); y = gameConfig.canvasHeight; }
  if (edge === 3) { x = 0; y = rand(0, gameConfig.canvasHeight); }

  return {
    id,
    x,
    y,
    hp: gameConfig.enemyHp,
    respawnTimer: 0,
    active: true,
    shootCooldown: 0
  };
}

export function createBullet(x: number, y: number, targetX: number, targetY: number, isEnemy: boolean): Bullet {
  const dx = targetX - x;
  const dy = targetY - y;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const speed = isEnemy ? gameConfig.bulletSpeed : 0;
  return {
    id: nextId(),
    x,
    y,
    vx: (dx / dist) * speed,
    vy: (dy / dist) * speed,
    isEnemy
  };
}

export function createParticle(
  x: number,
  y: number,
  vx: number,
  vy: number,
  color: string,
  size: number,
  life: number
): Particle {
  return {
    id: nextId(),
    x,
    y,
    vx,
    vy,
    life,
    maxLife: life,
    color,
    size
  };
}

export function createStars(count: number): Star[] {
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: rand(0, gameConfig.canvasWidth),
      y: rand(0, gameConfig.canvasHeight),
      size: rand(1, 2),
      baseAlpha: rand(0.3, 0.9),
      phase: rand(0, Math.PI * 2),
      phaseSpeed: rand(0.01, 0.04)
    });
  }
  return stars;
}

export function createInitialState(): GameState {
  resetIdCounter();
  const asteroidCount = randInt(10, 15);
  const asteroids: Asteroid[] = [];
  for (let i = 0; i < asteroidCount; i++) {
    asteroids.push(createAsteroid());
  }

  const enemies: Enemy[] = [
    createEnemy(nextId()),
    createEnemy(nextId())
  ];

  return {
    player: createPlayer(),
    asteroids,
    crystals: [],
    enemies,
    bullets: [],
    particles: [],
    stars: createStars(40),
    laser: {
      active: false,
      flashTimer: 0,
      hitX: 0,
      hitY: 0
    },
    crystalStock: 0,
    totalMined: 0,
    screenFlashTimer: 0
  };
}
