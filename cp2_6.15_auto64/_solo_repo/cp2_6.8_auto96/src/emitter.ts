export type TrajectoryMode = 'linear' | 'sine' | 'spiral' | 'mixed';

export interface Emitter {
  id: number;
  x: number;
  y: number;
  color: string;
  frequency: number;
  speed: number;
  mode: TrajectoryMode;
  lastShotTime: number;
  isDragging: boolean;
  spiralAngle: number;
}

export interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  isPlayer: boolean;
  age: number;
  maxAge: number;
  baseAngle: number;
  originX: number;
  originY: number;
  sineAmplitude: number;
  sineFrequency: number;
  spiralRadius: number;
  spiralSpeed: number;
  speed: number;
}

const emitters: Emitter[] = [];
const enemyBullets: Bullet[] = [];
let nextEmitterId = 1;

const CANVAS_W = 1100;
const CANVAS_H = 600;

export function getEmitters(): Emitter[] {
  return emitters;
}

export function getEnemyBullets(): Bullet[] {
  return enemyBullets;
}

export function getEmitterCount(): number {
  return emitters.length;
}

export function createEmitter(mode: TrajectoryMode): Emitter | null {
  if (emitters.length >= 4) return null;
  const cols = [275, 550, 825, 400];
  const rows = [200, 200, 200, 380];
  const idx = emitters.length;
  const emitter: Emitter = {
    id: nextEmitterId++,
    x: cols[idx],
    y: rows[idx],
    color: '#FF4444',
    frequency: 0.5,
    speed: 5,
    mode,
    lastShotTime: 0,
    isDragging: false,
    spiralAngle: 0,
  };
  emitters.push(emitter);
  return emitter;
}

export function removeEmitter(id: number): void {
  const idx = emitters.findIndex(e => e.id === id);
  if (idx >= 0) emitters.splice(idx, 1);
}

export function clearEmitters(): void {
  emitters.length = 0;
  enemyBullets.length = 0;
}

export function findEmitterAt(x: number, y: number): Emitter | null {
  for (let i = emitters.length - 1; i >= 0; i--) {
    const e = emitters[i];
    const dx = x - e.x;
    const dy = y - e.y;
    if (dx * dx + dy * dy <= 14 * 14) {
      return e;
    }
  }
  return null;
}

function spawnBullet(emitter: Emitter, _now: number): void {
  const angle = Math.PI / 2;
  const b: Bullet = {
    x: emitter.x,
    y: emitter.y,
    vx: 0,
    vy: emitter.speed,
    radius: 5,
    color: emitter.color,
    isPlayer: false,
    age: 0,
    maxAge: 600,
    baseAngle: angle,
    originX: emitter.x,
    originY: emitter.y,
    sineAmplitude: 40,
    sineFrequency: 0.08,
    spiralRadius: 0,
    spiralSpeed: 0,
    speed: emitter.speed,
  };

  if (emitter.mode === 'linear') {
    b.vx = Math.cos(angle) * emitter.speed;
    b.vy = Math.sin(angle) * emitter.speed;
  } else if (emitter.mode === 'sine') {
    b.vx = Math.cos(angle) * emitter.speed;
    b.vy = Math.sin(angle) * emitter.speed;
    b.sineAmplitude = 50;
    b.sineFrequency = 0.1;
  } else if (emitter.mode === 'spiral') {
    emitter.spiralAngle += 0.35;
    const a = emitter.spiralAngle;
    b.vx = Math.cos(a) * emitter.speed;
    b.vy = Math.sin(a) * emitter.speed;
    b.baseAngle = a;
    b.spiralSpeed = 0.05;
  } else if (emitter.mode === 'mixed') {
    const patterns = 3;
    for (let i = 0; i < patterns; i++) {
      const spread = (i - 1) * 0.35;
      const a = angle + spread;
      const nb: Bullet = {
        ...b,
        vx: Math.cos(a) * emitter.speed,
        vy: Math.sin(a) * emitter.speed,
        baseAngle: a,
        sineAmplitude: 30 + i * 10,
        sineFrequency: 0.08 + i * 0.02,
      };
      enemyBullets.push(nb);
    }
    return;
  }
  enemyBullets.push(b);
}

export function updateEmitters(now: number, dt: number): void {
  for (const emitter of emitters) {
    if (now - emitter.lastShotTime >= emitter.frequency * 1000) {
      emitter.lastShotTime = now;
      spawnBullet(emitter, now);
    }
  }
  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    const b = enemyBullets[i];
    b.age++;
    if (b.age > b.maxAge || b.x < -20 || b.x > CANVAS_W + 20 || b.y < -20 || b.y > CANVAS_H + 20) {
      enemyBullets.splice(i, 1);
      continue;
    }
    if (emitterModeOf(b) === 'sine') {
      const baseX = b.originX + Math.cos(b.baseAngle) * b.speed * b.age;
      const baseY = b.originY + Math.sin(b.baseAngle) * b.speed * b.age;
      const perpX = -Math.sin(b.baseAngle);
      const perpY = Math.cos(b.baseAngle);
      const offset = Math.sin(b.age * b.sineFrequency) * b.sineAmplitude;
      b.x = baseX + perpX * offset;
      b.y = baseY + perpY * offset;
    } else if (emitterModeOf(b) === 'spiral') {
      b.baseAngle += 0.05;
      b.x += Math.cos(b.baseAngle) * b.vx * 0.1 + b.vx * 0.5;
      b.y += Math.sin(b.baseAngle) * b.vy * 0.1 + b.vy * 0.5;
    } else {
      b.x += b.vx;
      b.y += b.vy;
    }
  }
  void dt;
}

function emitterModeOf(_b: Bullet): TrajectoryMode {
  if (_b.spiralSpeed > 0) return 'spiral';
  if (_b.sineAmplitude > 0 && _b.sineFrequency > 0 && _b.spiralSpeed === 0) {
    const hasSine = _b.sineFrequency >= 0.05;
    return hasSine ? 'sine' : 'linear';
  }
  return 'linear';
}
