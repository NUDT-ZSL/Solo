import type {
  BaseEntity,
  BoatEntity,
  IslandEntity,
  VortexEntity,
  StardustEntity,
  BossEntity,
} from '../types/gameTypes';

export function generateId(): string {
  return Math.random().toString(36).slice(2, 11);
}

export function randRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function randInt(min: number, max: number): number {
  return Math.floor(randRange(min, max + 1));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function distance(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

export function circleCollision(
  ax: number, ay: number, ar: number,
  bx: number, by: number, br: number
): boolean {
  return distance(ax, ay, bx, by) < ar + br;
}

export function circleRectCollision(
  cx: number, cy: number, cr: number,
  rx: number, ry: number, rw: number, rh: number
): boolean {
  const closestX = clamp(cx, rx - rw / 2, rx + rw / 2);
  const closestY = clamp(cy, ry - rh / 2, ry + rh / 2);
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy < cr * cr;
}

export function getEntityRadius(entity: BaseEntity): number {
  switch (entity.type) {
    case 'boat': return 10;
    case 'island': {
      const is = entity as IslandEntity;
      return Math.max(is.width, is.height) / 2;
    }
    case 'vortex': return (entity as VortexEntity).radius;
    case 'stardust': return (entity as StardustEntity).radius;
    case 'boss': return (entity as BossEntity).radius;
    default: return 0;
  }
}

export function getBoatWorldY(boatY: number, cameraY: number): number {
  return boatY + cameraY;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
