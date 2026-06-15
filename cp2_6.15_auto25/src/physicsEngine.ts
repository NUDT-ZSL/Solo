export interface Ball {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  trail: { x: number; y: number }[];
  scale: number;
  scaleTarget: number;
  deleting: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  life: number;
  maxLife: number;
}

export const COLOR_PALETTE = [
  '#ff6b6b', '#ffa94d', '#ffd43b', '#a9e34b',
  '#51cf66', '#38d9a9', '#4dabf7', '#748ffc',
  '#9775fa', '#cc5de8', '#f06595', '#ff922b',
  '#e64980', '#20c997', '#339af0', '#845ef7'
];

const RESTITUTION = 0.85;
const TRAIL_LENGTH = 5;
const PARTICLE_MIN_COUNT = 8;
const PARTICLE_MAX_COUNT = 12;
const PARTICLE_MIN_RADIUS = 2;
const PARTICLE_MAX_RADIUS = 4;
const PARTICLE_MIN_SPEED = 2;
const PARTICLE_MAX_SPEED = 6;
const PARTICLE_LIFE_FRAMES = 18;
const SCALE_ANIMATION_SPEED = 0.15;

let ballIdCounter = 0;

export function createBall(
  x: number,
  y: number,
  radius: number,
  color: string
): Ball {
  const vx = (Math.random() - 0.5) * 6;
  const vy = -Math.random() * 3 - 2;
  return {
    id: `ball_${++ballIdCounter}`,
    x,
    y,
    vx,
    vy,
    radius,
    color,
    trail: [],
    scale: 0,
    scaleTarget: 1,
    deleting: false
  };
}

function getBrightness(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function createCollisionParticles(
  ballA: Ball,
  ballB: Ball,
  normalX: number,
  normalY: number,
  particles: Particle[]
): void {
  const brighterColor = getBrightness(ballA.color) > getBrightness(ballB.color)
    ? ballA.color : ballB.color;

  const count = Math.floor(
    Math.random() * (PARTICLE_MAX_COUNT - PARTICLE_MIN_COUNT + 1)
  ) + PARTICLE_MIN_COUNT;

  const contactX = ballA.x + normalX * ballA.radius;
  const contactY = ballA.y + normalY * ballA.radius;

  const tanX = -normalY;
  const tanY = normalX;

  const spreadAngle = Math.PI / 3;

  for (let i = 0; i < count; i++) {
    const angle = (Math.random() - 0.5) * spreadAngle;
    const speed = Math.random() * (PARTICLE_MAX_SPEED - PARTICLE_MIN_SPEED) + PARTICLE_MIN_SPEED;

    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    const dirX = normalX * cos + tanX * sin;
    const dirY = normalY * cos + tanY * sin;

    particles.push({
      x: contactX,
      y: contactY,
      vx: dirX * speed,
      vy: dirY * speed,
      radius: Math.random() * (PARTICLE_MAX_RADIUS - PARTICLE_MIN_RADIUS) + PARTICLE_MIN_RADIUS,
      color: brighterColor,
      life: 1,
      maxLife: PARTICLE_LIFE_FRAMES
    });
  }
}

function resolveBallCollision(
  ballA: Ball,
  ballB: Ball,
  particles: Particle[]
): boolean {
  const dx = ballB.x - ballA.x;
  const dy = ballB.y - ballA.y;
  const distSq = dx * dx + dy * dy;
  const minDist = ballA.radius + ballB.radius;

  if (distSq > minDist * minDist) return false;

  const dist = Math.sqrt(distSq) || 0.0001;
  const nx = dx / dist;
  const ny = dy / dist;

  const rvx = ballB.vx - ballA.vx;
  const rvy = ballB.vy - ballA.vy;

  const velAlongNormal = rvx * nx + rvy * ny;

  if (velAlongNormal > 0) return false;

  const massA = Math.PI * ballA.radius * ballA.radius;
  const massB = Math.PI * ballB.radius * ballB.radius;

  const j = -(1 + RESTITUTION) * velAlongNormal / (1 / massA + 1 / massB);

  const impulseX = j * nx;
  const impulseY = j * ny;

  ballA.vx -= impulseX / massA;
  ballA.vy -= impulseY / massA;
  ballB.vx += impulseX / massB;
  ballB.vy += impulseY / massB;

  const overlap = minDist - dist;
  const separationRatio = overlap / (massA + massB);
  ballA.x -= nx * separationRatio * massB;
  ballA.y -= ny * separationRatio * massB;
  ballB.x += nx * separationRatio * massA;
  ballB.y += ny * separationRatio * massA;

  createCollisionParticles(ballA, ballB, nx, ny, particles);

  return true;
}

function checkWallCollisions(
  ball: Ball,
  canvasWidth: number,
  canvasHeight: number
): void {
  if (ball.x - ball.radius < 0) {
    ball.x = ball.radius;
    ball.vx = -ball.vx * RESTITUTION;
  } else if (ball.x + ball.radius > canvasWidth) {
    ball.x = canvasWidth - ball.radius;
    ball.vx = -ball.vx * RESTITUTION;
  }

  if (ball.y - ball.radius < 0) {
    ball.y = ball.radius;
    ball.vy = -ball.vy * RESTITUTION;
  } else if (ball.y + ball.radius > canvasHeight) {
    ball.y = canvasHeight - ball.radius;
    ball.vy = -ball.vy * RESTITUTION;
  }
}

interface SpatialGrid {
  [key: string]: number[];
}

function buildSpatialGrid(
  balls: Ball[],
  cellSize: number
): SpatialGrid {
  const grid: SpatialGrid = {};

  for (let i = 0; i < balls.length; i++) {
    const ball = balls[i];
    const cellX = Math.floor(ball.x / cellSize);
    const cellY = Math.floor(ball.y / cellSize);
    const key = `${cellX},${cellY}`;

    if (!grid[key]) {
      grid[key] = [];
    }
    grid[key].push(i);
  }

  return grid;
}

function getPotentialPairs(
  balls: Ball[],
  grid: SpatialGrid,
  cellSize: number
): [number, number][] {
  const pairs: [number, number][] = [];
  const checked = new Set<string>();

  for (let i = 0; i < balls.length; i++) {
    const ball = balls[i];
    const cellX = Math.floor(ball.x / cellSize);
    const cellY = Math.floor(ball.y / cellSize);

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const key = `${cellX + dx},${cellY + dy}`;
        const cell = grid[key];
        if (!cell) continue;

        for (const j of cell) {
          if (j <= i) continue;
          const pairKey = `${i},${j}`;
          if (checked.has(pairKey)) continue;
          checked.add(pairKey);
          pairs.push([i, j]);
        }
      }
    }
  }

  return pairs;
}

function checkBallCollisions(
  balls: Ball[],
  particles: Particle[],
  useSpatialGrid: boolean
): void {
  if (balls.length < 2) return;

  if (useSpatialGrid) {
    let maxRadius = 0;
    for (const ball of balls) {
      if (ball.radius > maxRadius) maxRadius = ball.radius;
    }
    const cellSize = maxRadius * 2;
    const grid = buildSpatialGrid(balls, cellSize);
    const pairs = getPotentialPairs(balls, grid, cellSize);

    for (const [i, j] of pairs) {
      resolveBallCollision(balls[i], balls[j], particles);
    }
  } else {
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        resolveBallCollision(balls[i], balls[j], particles);
      }
    }
  }
}

export function updatePhysics(
  balls: Ball[],
  particles: Particle[],
  gravity: number,
  friction: number,
  canvasWidth: number,
  canvasHeight: number,
  frameCount: number
): { balls: Ball[]; particles: Particle[]; totalKineticEnergy: number } {
  const ballCount = balls.length;
  const useSpatialGrid = ballCount > 20;
  const collisionIterations = ballCount > 200 ? 2 : 3;
  const doCollisionThisFrame = ballCount <= 200 || frameCount % 2 === 0;

  for (let i = balls.length - 1; i >= 0; i--) {
    const ball = balls[i];

    if (ball.scale !== ball.scaleTarget) {
      const diff = ball.scaleTarget - ball.scale;
      ball.scale += diff * SCALE_ANIMATION_SPEED;
      if (Math.abs(diff) < 0.001) {
        ball.scale = ball.scaleTarget;
      }
    }

    if (ball.deleting && ball.scale <= 0.01) {
      balls.splice(i, 1);
      continue;
    }

    if (ball.scaleTarget === 1 && !ball.deleting) {
      ball.vy += gravity;

      ball.vx *= (1 - friction);
      ball.vy *= (1 - friction);

      ball.x += ball.vx;
      ball.y += ball.vy;

      ball.trail.unshift({ x: ball.x, y: ball.y });
      if (ball.trail.length > TRAIL_LENGTH) {
        ball.trail.pop();
      }

      checkWallCollisions(ball, canvasWidth, canvasHeight);
    }
  }

  if (doCollisionThisFrame) {
    for (let iter = 0; iter < collisionIterations; iter++) {
      checkBallCollisions(balls, particles, useSpatialGrid);
    }
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += gravity * 0.3;
    p.life -= 1 / p.maxLife;

    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }

  let totalKineticEnergy = 0;
  for (const ball of balls) {
    if (ball.deleting) continue;
    const mass = Math.PI * ball.radius * ball.radius;
    const speedSq = ball.vx * ball.vx + ball.vy * ball.vy;
    totalKineticEnergy += 0.5 * mass * speedSq;
  }

  return { balls, particles, totalKineticEnergy };
}

export function rotateBallVelocity(
  ball: Ball,
  angleDeg: number
): void {
  const angleRad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);

  const newVx = ball.vx * cos - ball.vy * sin;
  const newVy = ball.vx * sin + ball.vy * cos;

  ball.vx = newVx;
  ball.vy = newVy;
}

export function deleteBall(ball: Ball): void {
  ball.deleting = true;
  ball.scaleTarget = 0;
}

export function getBallAtPosition(
  balls: Ball[],
  x: number,
  y: number
): Ball | null {
  for (let i = balls.length - 1; i >= 0; i--) {
    const ball = balls[i];
    if (ball.deleting) continue;
    const dx = x - ball.x;
    const dy = y - ball.y;
    if (dx * dx + dy * dy <= ball.radius * ball.radius) {
      return ball;
    }
  }
  return null;
}
