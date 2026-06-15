export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  initialSize: number;
  color: string;
  alpha: number;
  age: number;
  maxAge: number;
  active: boolean;
}

export interface FlashRing {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  age: number;
  maxAge: number;
}

interface BulletLike {
  x: number;
  y: number;
  radius: number;
  color: string;
  isPlayer: boolean;
}

const PARTICLE_POOL_SIZE = 500;
const particlePool: Particle[] = [];
const particles: Particle[] = [];
const flashRings: FlashRing[] = [];

function initPool(): void {
  for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
    particlePool.push({
      x: 0, y: 0, vx: 0, vy: 0,
      size: 0, initialSize: 0, color: '#FFFFFF',
      alpha: 0, age: 0, maxAge: 0, active: false,
    });
  }
}
initPool();

export function getParticles(): Particle[] {
  return particles;
}

export function getFlashRings(): FlashRing[] {
  return flashRings;
}

function acquireParticle(): Particle | null {
  for (const p of particlePool) {
    if (!p.active) {
      p.active = true;
      return p;
    }
  }
  return null;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function mixColors(c1: string, c2: string): string {
  const [r1, g1, b1] = hexToRgb(c1);
  const [r2, g2, b2] = hexToRgb(c2);
  return rgbToHex((r1 + r2) / 2, (g1 + g2) / 2, (b1 + b2) / 2);
}

export function createExplosion(x: number, y: number, colorA: string, colorB: string): void {
  const count = 20 + Math.floor(Math.random() * 21);
  const baseColor = mixColors(colorA, colorB);
  const [br, bg, bb] = hexToRgb(baseColor);
  for (let i = 0; i < count; i++) {
    const p = acquireParticle();
    if (!p) break;
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 6;
    const size = 2 + Math.random() * 2;
    const variance = 30;
    p.x = x;
    p.y = y;
    p.vx = Math.cos(angle) * speed;
    p.vy = Math.sin(angle) * speed;
    p.size = size;
    p.initialSize = size;
    p.color = rgbToHex(
      br + (Math.random() - 0.5) * variance,
      bg + (Math.random() - 0.5) * variance,
      bb + (Math.random() - 0.5) * variance,
    );
    p.alpha = 1;
    p.age = 0;
    p.maxAge = 90;
    particles.push(p);
  }
  flashRings.push({
    x, y,
    radius: 5,
    alpha: 0.8,
    age: 0,
    maxAge: 18,
  });
}

export interface CollisionResult {
  playerBulletIndices: number[];
  enemyBulletIndices: number[];
}

export function checkCollisions(
  playerBullets: BulletLike[],
  enemyBullets: BulletLike[],
): CollisionResult {
  const result: CollisionResult = {
    playerBulletIndices: [],
    enemyBulletIndices: [],
  };
  const HIT_DIST = 12;
  const HIT_DIST_SQ = HIT_DIST * HIT_DIST;

  for (let i = 0; i < playerBullets.length; i++) {
    const pb = playerBullets[i];
    for (let j = 0; j < enemyBullets.length; j++) {
      if (result.playerBulletIndices.includes(i)) break;
      if (result.enemyBulletIndices.includes(j)) continue;
      const eb = enemyBullets[j];
      const dx = pb.x - eb.x;
      const dy = pb.y - eb.y;
      if (dx * dx + dy * dy <= HIT_DIST_SQ) {
        result.playerBulletIndices.push(i);
        result.enemyBulletIndices.push(j);
        createExplosion(
          (pb.x + eb.x) / 2,
          (pb.y + eb.y) / 2,
          pb.color,
          eb.color,
        );
      }
    }
  }
  return result;
}

export function updateParticles(): void {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.age++;
    if (p.age >= p.maxAge) {
      p.active = false;
      particles.splice(i, 1);
      continue;
    }
    const t = p.age / p.maxAge;
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.98;
    p.vy *= 0.98;
    p.alpha = 1 - t;
    p.size = p.initialSize * (1 - t);
  }
  for (let i = flashRings.length - 1; i >= 0; i--) {
    const r = flashRings[i];
    r.age++;
    if (r.age >= r.maxAge) {
      flashRings.splice(i, 1);
      continue;
    }
    const t = r.age / r.maxAge;
    r.radius = 5 + (30 - 5) * t;
    r.alpha = 0.8 * (1 - t);
  }
}

export function clearParticles(): void {
  for (const p of particles) p.active = false;
  particles.length = 0;
  flashRings.length = 0;
}
