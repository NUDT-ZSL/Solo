import { Wall } from './scene';
import { RuneBall } from './ball';

const GRAVITY = 800;
const PENDULUM_RADIUS = 22;
const COLLISION_FORCE_TRANSFER = 1.4;
const MAX_ANGLE = Math.PI * 0.75;

export interface Pendulum {
  anchorX: number;
  anchorY: number;
  ropeLength: number;
  angle: number;
  angularVelocity: number;
  x: number;
  y: number;
  isDragging: boolean;
  dragX: number;
  dragY: number;
  isSwinging: boolean;
  glowIntensity: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  alpha: number;
}

export function createPendulum(anchorX: number, anchorY: number, ropeLength: number): Pendulum {
  return {
    anchorX,
    anchorY,
    ropeLength,
    angle: 0,
    angularVelocity: 0,
    x: anchorX,
    y: anchorY + ropeLength,
    isDragging: false,
    dragX: 0,
    dragY: 0,
    isSwinging: false,
    glowIntensity: 0.8,
  };
}

export function updatePendulum(p: Pendulum, dt: number): void {
  if (p.isDragging) {
    const dx = p.dragX - p.anchorX;
    const dy = p.dragY - p.anchorY;
    let dragAngle = Math.atan2(dx, dy);
    dragAngle = Math.max(-MAX_ANGLE, Math.min(MAX_ANGLE, dragAngle));

    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > p.ropeLength * 1.5) {
      dragAngle *= (p.ropeLength * 1.5) / dist;
    }

    p.angle = dragAngle;
    p.x = p.anchorX + Math.sin(p.angle) * p.ropeLength;
    p.y = p.anchorY + Math.cos(p.angle) * p.ropeLength;
    p.angularVelocity = 0;
    return;
  }

  if (!p.isSwinging) {
    p.angle *= 0.95;
    p.angularVelocity *= 0.9;
    if (Math.abs(p.angle) < 0.001 && Math.abs(p.angularVelocity) < 0.001) {
      p.angle = 0;
      p.angularVelocity = 0;
    }
    p.x = p.anchorX + Math.sin(p.angle) * p.ropeLength;
    p.y = p.anchorY + Math.cos(p.angle) * p.ropeLength;
    return;
  }

  const angularAccel = -(GRAVITY / p.ropeLength) * Math.sin(p.angle);
  p.angularVelocity += angularAccel * dt;
  p.angularVelocity *= 0.998;
  p.angle += p.angularVelocity * dt;

  if (Math.abs(p.angle) > MAX_ANGLE) {
    p.angle = Math.sign(p.angle) * MAX_ANGLE;
    p.angularVelocity *= -0.5;
  }

  p.x = p.anchorX + Math.sin(p.angle) * p.ropeLength;
  p.y = p.anchorY + Math.cos(p.angle) * p.ropeLength;

  const speed = Math.abs(p.angularVelocity) * p.ropeLength;
  p.glowIntensity = 0.5 + Math.min(0.5, speed / 400);

  if (Math.abs(p.angularVelocity) < 0.02 && Math.abs(p.angle) < 0.05) {
    p.isSwinging = false;
  }
}

export function getPendulumVelocity(p: Pendulum): { vx: number; vy: number } {
  const speed = p.angularVelocity * p.ropeLength;
  const vx = Math.cos(p.angle) * speed;
  const vy = -Math.sin(p.angle) * speed;
  return { vx, vy };
}

export function collidePendulumWithBall(p: Pendulum, ball: RuneBall): Particle[] {
  if (ball.isSlotted) return [];

  const dx = ball.x - p.x;
  const dy = ball.y - p.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const minDist = PENDULUM_RADIUS + ball.radius;

  if (dist < minDist && dist > 0) {
    const nx = dx / dist;
    const ny = dy / dist;
    const overlap = minDist - dist;

    ball.x += nx * overlap;
    ball.y += ny * overlap;

    const vel = getPendulumVelocity(p);
    const relVx = vel.vx - ball.vx;
    const relVy = vel.vy - ball.vy;
    const relDot = relVx * nx + relVy * ny;

    if (relDot > 0) {
      ball.vx += nx * relDot * COLLISION_FORCE_TRANSFER;
      ball.vy += ny * relDot * COLLISION_FORCE_TRANSFER;

      const impactSpeed = Math.abs(relDot);
      const particles = createImpactParticles(
        (p.x + ball.x) / 2,
        (p.y + ball.y) / 2,
        impactSpeed,
        ball.color
      );
      return particles;
    }
  }
  return [];
}

export function collidePendulumWithWalls(p: Pendulum, walls: Wall[]): void {
  for (const wall of walls) {
    const closestX = Math.max(wall.x, Math.min(p.x, wall.x + wall.w));
    const closestY = Math.max(wall.y, Math.min(p.y, wall.y + wall.h));
    const dx = p.x - closestX;
    const dy = p.y - closestY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < PENDULUM_RADIUS && dist > 0) {
      const nx = dx / dist;
      const ny = dy / dist;
      const overlap = PENDULUM_RADIUS - dist;
      p.x += nx * overlap;
      p.y += ny * overlap;

      p.angularVelocity *= -0.3;
    }
  }
}

export function createImpactParticles(x: number, y: number, speed: number, color: string): Particle[] {
  const count = Math.min(20, Math.floor(speed / 30) + 5);
  const particles: Particle[] = [];
  const colorMap: Record<string, string> = {
    red: '#ff3b4a',
    blue: '#3b8bff',
    green: '#3bff6f',
    gold: '#ffd93b',
  };
  const c = colorMap[color] || '#ffffff';

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const v = (30 + Math.random() * speed * 0.8);
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * v,
      vy: Math.sin(angle) * v,
      life: 1,
      maxLife: 0.4 + Math.random() * 0.6,
      size: 2 + Math.random() * 4,
      color: c,
      alpha: 1,
    });
  }
  return particles;
}

export function createTrailParticle(x: number, y: number): Particle {
  return {
    x: x + (Math.random() - 0.5) * 8,
    y: y + (Math.random() - 0.5) * 8,
    vx: (Math.random() - 0.5) * 20,
    vy: (Math.random() - 0.5) * 20,
    life: 1,
    maxLife: 0.3 + Math.random() * 0.4,
    size: 1 + Math.random() * 3,
    color: '#ffe8c0',
    alpha: 0.7,
  };
}

export function updateParticle(particle: Particle, dt: number): boolean {
  particle.x += particle.vx * dt;
  particle.y += particle.vy * dt;
  particle.vx *= 0.96;
  particle.vy *= 0.96;
  particle.life -= dt / particle.maxLife;
  particle.alpha = Math.max(0, particle.life);
  return particle.life > 0;
}

export function isPointOnPendulum(p: Pendulum, mx: number, my: number): boolean {
  const dx = mx - p.x;
  const dy = my - p.y;
  return Math.sqrt(dx * dx + dy * dy) < PENDULUM_RADIUS * 2;
}

export function startDrag(p: Pendulum, mx: number, my: number): void {
  p.isDragging = true;
  p.dragX = mx;
  p.dragY = my;
  p.isSwinging = false;
}

export function updateDrag(p: Pendulum, mx: number, my: number): void {
  if (p.isDragging) {
    p.dragX = mx;
    p.dragY = my;
  }
}

export function releaseDrag(p: Pendulum): void {
  if (!p.isDragging) return;
  p.isDragging = false;
  p.isSwinging = true;
}
