import { BallColor, Wall, SlotData, COLOR_MAP, GLOW_COLOR_MAP } from './scene';

const FRICTION = 0.985;
const BOUNCE_DAMPING = 0.65;
const SLOT_CAPTURE_RADIUS_FACTOR = 1.2;

export interface RuneBall {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: BallColor;
  isSlotted: boolean;
  glowIntensity: number;
  runePhase: number;
}

export interface Slot {
  x: number;
  y: number;
  radius: number;
  color: BallColor;
  isFilled: boolean;
  glowPulse: number;
  runeFlash: number;
}

export function createBall(data: { x: number; y: number; radius: number; color: BallColor }): RuneBall {
  return {
    x: data.x,
    y: data.y,
    vx: 0,
    vy: 0,
    radius: data.radius,
    color: data.color,
    isSlotted: false,
    glowIntensity: 0,
    runePhase: Math.random() * Math.PI * 2,
  };
}

export function createSlot(data: SlotData): Slot {
  return {
    x: data.x,
    y: data.y,
    radius: data.radius,
    color: data.color,
    isFilled: false,
    glowPulse: 0,
    runeFlash: 0,
  };
}

export function updateBall(ball: RuneBall, dt: number): void {
  if (ball.isSlotted) return;

  ball.vx *= FRICTION;
  ball.vy *= FRICTION;

  const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
  if (speed < 0.1) {
    ball.vx = 0;
    ball.vy = 0;
  }

  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  ball.runePhase += dt * 2;
  ball.glowIntensity = Math.min(1, speed / 200) * 0.6 + 0.4;
}

export function collideBallWithWalls(ball: RuneBall, walls: Wall[]): void {
  if (ball.isSlotted) return;

  for (const wall of walls) {
    const closestX = Math.max(wall.x, Math.min(ball.x, wall.x + wall.w));
    const closestY = Math.max(wall.y, Math.min(ball.y, wall.y + wall.h));
    const dx = ball.x - closestX;
    const dy = ball.y - closestY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < ball.radius) {
      const overlap = ball.radius - dist;
      const nx = dist > 0 ? dx / dist : 0;
      const ny = dist > 0 ? dy / dist : 1;

      ball.x += nx * overlap;
      ball.y += ny * overlap;

      const dot = ball.vx * nx + ball.vy * ny;
      ball.vx -= 2 * dot * nx;
      ball.vy -= 2 * dot * ny;
      ball.vx *= BOUNCE_DAMPING;
      ball.vy *= BOUNCE_DAMPING;
    }
  }
}

export function collideBalls(a: RuneBall, b: RuneBall): void {
  if (a.isSlotted || b.isSlotted) return;

  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const minDist = a.radius + b.radius;

  if (dist < minDist && dist > 0) {
    const nx = dx / dist;
    const ny = dy / dist;
    const overlap = minDist - dist;

    a.x -= nx * overlap * 0.5;
    a.y -= ny * overlap * 0.5;
    b.x += nx * overlap * 0.5;
    b.y += ny * overlap * 0.5;

    const dvx = a.vx - b.vx;
    const dvy = a.vy - b.vy;
    const dot = dvx * nx + dvy * ny;

    a.vx -= dot * nx * BOUNCE_DAMPING;
    a.vy -= dot * ny * BOUNCE_DAMPING;
    b.vx += dot * nx * BOUNCE_DAMPING;
    b.vy += dot * ny * BOUNCE_DAMPING;
  }
}

export function checkSlotCapture(ball: RuneBall, slot: Slot): boolean {
  if (ball.isSlotted || slot.isFilled) return false;
  if (ball.color !== slot.color) return false;

  const dx = ball.x - slot.x;
  const dy = ball.y - slot.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);

  if (dist < slot.radius * SLOT_CAPTURE_RADIUS_FACTOR && speed < 120) {
    ball.isSlotted = true;
    ball.x = slot.x;
    ball.y = slot.y;
    ball.vx = 0;
    ball.vy = 0;
    slot.isFilled = true;
    slot.runeFlash = 1.0;
    return true;
  }

  return false;
}

export function updateSlot(slot: Slot, dt: number): void {
  if (slot.isFilled) {
    slot.glowPulse = Math.min(1, slot.glowPulse + dt * 2);
    slot.runeFlash = Math.max(0, slot.runeFlash - dt * 0.8);
  } else {
    slot.glowPulse = (Math.sin(Date.now() * 0.003 + slot.x) * 0.5 + 0.5) * 0.3;
  }
}
