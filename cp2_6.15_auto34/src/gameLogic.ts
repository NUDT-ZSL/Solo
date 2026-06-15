export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Asteroid {
  id: string;
  position: Vector3;
  velocity: Vector3;
  radius: number;
  color: string;
  rotation: Vector3;
  angularVelocity: Vector3;
  seed: number;
}

export interface Laser {
  id: string;
  position: Vector3;
  direction: Vector3;
  speed: number;
  life: number;
}

export interface Particle {
  id: string;
  active: boolean;
  position: Vector3;
  velocity: Vector3;
  life: number;
  maxLife: number;
  startColor: string;
  endColor: string;
  startSize: number;
  endSize: number;
  type: 'tail' | 'explosion';
}

export interface ExplosionEvent {
  position: Vector3;
  count: number;
}

const v3 = {
  add: (a: Vector3, b: Vector3): Vector3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }),
  sub: (a: Vector3, b: Vector3): Vector3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }),
  scale: (v: Vector3, s: number): Vector3 => ({ x: v.x * s, y: v.y * s, z: v.z * s }),
  length: (v: Vector3): number => Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z),
  normalize: (v: Vector3): Vector3 => {
    const len = v3.length(v) || 1;
    return { x: v.x / len, y: v.y / len, z: v.z / len };
  },
  distSq: (a: Vector3, b: Vector3): number => {
    const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
    return dx * dx + dy * dy + dz * dz;
  },
};

export const ZERO: Vector3 = { x: 0, y: 0, z: 0 };

let idCounter = 0;
export const generateId = (): string => `${Date.now()}-${idCounter++}`;

function randRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function lerpColor(color1: string, color2: string, t: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  const r = Math.round(c1.r + (c2.r - c1.r) * t);
  const g = Math.round(c1.g + (c2.g - c1.g) * t);
  const b = Math.round(c1.b + (c2.b - c1.b) * t);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

export function checkSphereCollision(
  p1: Vector3, r1: number,
  p2: Vector3, r2: number,
): boolean {
  return v3.distSq(p1, p2) < (r1 + r2) * (r1 + r2);
}

export function createAsteroid(center: Vector3, minDist: number, maxDist: number, radius?: number): Asteroid {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  const dist = randRange(minDist, maxDist);

  const position: Vector3 = {
    x: center.x + dist * Math.sin(phi) * Math.cos(theta),
    y: center.y + dist * Math.sin(phi) * Math.sin(theta),
    z: center.z - dist * Math.cos(phi),
  };

  const dir = v3.normalize({
    x: Math.random() - 0.5,
    y: Math.random() - 0.5,
    z: Math.random() - 0.5,
  });
  const speed = randRange(0.02, 0.05);

  const r = radius ?? randRange(0.5, 2);
  const colorT = Math.random();
  const color = lerpColor('#8B7355', '#A0522D', colorT);

  return {
    id: generateId(),
    position,
    velocity: v3.scale(dir, speed),
    radius: r,
    color,
    rotation: { x: Math.random() * Math.PI * 2, y: Math.random() * Math.PI * 2, z: Math.random() * Math.PI * 2 },
    angularVelocity: {
      x: randRange(-0.01, 0.01),
      y: randRange(-0.01, 0.01),
      z: randRange(-0.01, 0.01),
    },
    seed: Math.random() * 10000,
  };
}

export function generateInitialAsteroids(center: Vector3, count: number): Asteroid[] {
  const asteroids: Asteroid[] = [];
  for (let i = 0; i < count; i++) {
    asteroids.push(createAsteroid(center, 10, 50));
  }
  return asteroids;
}

export function updateAsteroids(asteroids: Asteroid[], shipPosition: Vector3): Asteroid[] {
  const MAX_DIST = 70;
  const MIN_COUNT = 30;
  const MAX_COUNT = 50;

  let updated = asteroids.map(a => ({
    ...a,
    position: v3.add(a.position, a.velocity),
    rotation: {
      x: a.rotation.x + a.angularVelocity.x,
      y: a.rotation.y + a.angularVelocity.y,
      z: a.rotation.z + a.angularVelocity.z,
    },
  }));

  updated = updated.filter(a => {
    const dSq = v3.distSq(a.position, shipPosition);
    return dSq < MAX_DIST * MAX_DIST;
  });

  while (updated.length < MIN_COUNT) {
    updated.push(createAsteroid(shipPosition, 20, 55));
  }
  if (updated.length > MAX_COUNT) {
    updated = updated.slice(0, MAX_COUNT);
  }

  return updated;
}

export function splitAsteroid(asteroid: Asteroid): Asteroid[] {
  const newRadius = asteroid.radius * 0.5;
  if (newRadius < 0.3) return [];

  const result: Asteroid[] = [];
  for (let i = 0; i < 2; i++) {
    const offset: Vector3 = {
      x: randRange(-asteroid.radius * 0.5, asteroid.radius * 0.5),
      y: randRange(-asteroid.radius * 0.5, asteroid.radius * 0.5),
      z: randRange(-asteroid.radius * 0.5, asteroid.radius * 0.5),
    };
    const dir = v3.normalize({
      x: Math.random() - 0.5,
      y: Math.random() - 0.5,
      z: Math.random() - 0.5,
    });
    const speed = randRange(0.03, 0.06);
    result.push({
      id: generateId(),
      position: v3.add(asteroid.position, offset),
      velocity: v3.scale(dir, speed),
      radius: newRadius,
      color: asteroid.color,
      rotation: { ...asteroid.rotation },
      angularVelocity: {
        x: randRange(-0.02, 0.02),
        y: randRange(-0.02, 0.02),
        z: randRange(-0.02, 0.02),
      },
      seed: Math.random() * 10000,
    });
  }
  return result;
}

export function updateLasers(lasers: Laser[], delta: number): Laser[] {
  return lasers
    .map(l => ({
      ...l,
      position: v3.add(l.position, v3.scale(l.direction, l.speed * delta * 60)),
      life: l.life - delta,
    }))
    .filter(l => l.life > 0);
}

export function createExplosionParticles(
  position: Vector3,
  count: number,
  particlePool: Particle[],
): Particle[] {
  const pool = [...particlePool];
  let assigned = 0;
  const now = Date.now();

  for (let i = 0; i < pool.length && assigned < count; i++) {
    if (!pool[i].active) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = randRange(0.1, 0.3);
      const life = randRange(0.2, 0.5);
      pool[i] = {
        ...pool[i],
        id: `${now}-${assigned}`,
        active: true,
        position: { ...position },
        velocity: {
          x: speed * Math.sin(phi) * Math.cos(theta),
          y: speed * Math.sin(phi) * Math.sin(theta),
          z: speed * Math.cos(phi),
        },
        life,
        maxLife: life,
        startColor: '#ff4400',
        endColor: '#ffaa00',
        startSize: 4,
        endSize: 0,
        type: 'explosion',
      };
      assigned++;
    }
  }

  if (assigned < count) {
    for (let j = assigned; j < count; j++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = randRange(0.1, 0.3);
      const life = randRange(0.2, 0.5);
      pool.push({
        id: `${now}-${j}`,
        active: true,
        position: { ...position },
        velocity: {
          x: speed * Math.sin(phi) * Math.cos(theta),
          y: speed * Math.sin(phi) * Math.sin(theta),
          z: speed * Math.cos(phi),
        },
        life,
        maxLife: life,
        startColor: '#ff4400',
        endColor: '#ffaa00',
        startSize: 4,
        endSize: 0,
        type: 'explosion',
      });
    }
  }

  return pool;
}

export function createTailParticle(
  shipPosition: Vector3,
  shipBackward: Vector3,
  particlePool: Particle[],
): Particle[] {
  const pool = [...particlePool];
  let idx = -1;
  for (let i = 0; i < pool.length; i++) {
    if (!pool[i].active) {
      idx = i;
      break;
    }
  }

  const offset: Vector3 = {
    x: randRange(-0.1, 0.1),
    y: randRange(-0.1, 0.1),
    z: randRange(-0.1, 0.1),
  };
  const pos = v3.add(v3.add(shipPosition, v3.scale(shipBackward, 1.2)), offset);
  const life = randRange(0.5, 1);
  const vel = v3.add(
    v3.scale(shipBackward, randRange(0.05, 0.1)),
    { x: randRange(-0.02, 0.02), y: randRange(-0.02, 0.02), z: randRange(-0.02, 0.02) },
  );

  const particle: Particle = {
    id: `tail-${Date.now()}-${Math.random()}`,
    active: true,
    position: pos,
    velocity: vel,
    life,
    maxLife: life,
    startColor: '#ff8800',
    endColor: '#ffcc00',
    startSize: 3,
    endSize: 0,
    type: 'tail',
  };

  if (idx >= 0) {
    pool[idx] = particle;
  } else if (pool.length < 200) {
    pool.push(particle);
  }

  return pool;
}

export function updateParticles(particles: Particle[], delta: number): Particle[] {
  return particles.map(p => {
    if (!p.active) return p;
    const newLife = p.life - delta;
    return {
      ...p,
      position: v3.add(p.position, v3.scale(p.velocity, delta * 60)),
      life: newLife,
      active: newLife > 0,
    };
  });
}

export function getParticleRenderState(p: Particle): { color: string; size: number } {
  const t = 1 - p.life / p.maxLife;
  return {
    color: lerpColor(p.startColor, p.endColor, t),
    size: p.startSize + (p.endSize - p.startSize) * t,
  };
}

export { v3 };
