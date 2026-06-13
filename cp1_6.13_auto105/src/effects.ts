import * as THREE from 'three';

export interface ExplosionEvent {
  position: THREE.Vector3;
}

type ExplosionCallback = (event: ExplosionEvent) => void;

const explosionCallbacks: ExplosionCallback[] = [];
let scene: THREE.Scene | null = null;

interface ActiveExplosion {
  particles: THREE.Points;
  velocities: Float32Array;
  startTime: number;
  duration: number;
  particleCount: number;
}

const activeExplosions: ActiveExplosion[] = [];

let starField: THREE.Points | null = null;

const PERM: number[] = new Array(512);
const GRAD3: number[][] = [
  [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
  [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
  [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1],
];

function initPermutationTable(): void {
  const p: number[] = [];
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) PERM[i] = p[i & 255];
}

initPermutationTable();

function dot3(g: number[], x: number, y: number, z: number): number {
  return g[0] * x + g[1] * y + g[2] * z;
}

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a);
}

function perlinNoise3D(x: number, y: number, z: number): number {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  const Z = Math.floor(z) & 255;

  x -= Math.floor(x);
  y -= Math.floor(y);
  z -= Math.floor(z);

  const u = fade(x);
  const v = fade(y);
  const w = fade(z);

  const A  = PERM[X] + Y;
  const AA = PERM[A] + Z;
  const AB = PERM[A + 1] + Z;
  const B  = PERM[X + 1] + Y;
  const BA = PERM[B] + Z;
  const BB = PERM[B + 1] + Z;

  return lerp(
    lerp(
      lerp(dot3(GRAD3[PERM[AA] % 12], x, y, z),
           dot3(GRAD3[PERM[BA] % 12], x - 1, y, z), u),
      lerp(dot3(GRAD3[PERM[AB] % 12], x, y - 1, z),
           dot3(GRAD3[PERM[BB] % 12], x - 1, y - 1, z), u),
      v),
    lerp(
      lerp(dot3(GRAD3[PERM[AA + 1] % 12], x, y, z - 1),
           dot3(GRAD3[PERM[BA + 1] % 12], x - 1, y, z - 1), u),
      lerp(dot3(GRAD3[PERM[AB + 1] % 12], x, y - 1, z - 1),
           dot3(GRAD3[PERM[BB + 1] % 12], x - 1, y - 1, z - 1), u),
      v),
    w);
}

export function generateAsteroidDisplacement(
  radius: number,
  segments: number,
  displacementScale: number
): Float32Array {
  const geo = new THREE.SphereGeometry(radius, segments, segments);
  const pos = geo.attributes.position;
  const displaced = new Float32Array(pos.count * 3);

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);

    const dir = new THREE.Vector3(x, y, z).normalize();

    const noise1 = perlinNoise3D(dir.x * 3.0, dir.y * 3.0, dir.z * 3.0);
    const noise2 = perlinNoise3D(dir.x * 6.0 + 10.0, dir.y * 6.0 + 10.0, dir.z * 6.0 + 10.0) * 0.5;
    const displacement = 1.0 + (noise1 + noise2) * displacementScale;

    displaced[i * 3]     = dir.x * radius * displacement;
    displaced[i * 3 + 1] = dir.y * radius * displacement;
    displaced[i * 3 + 2] = dir.z * radius * displacement;
  }

  geo.dispose();
  return displaced;
}

function createExplosionTexture(): THREE.Texture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
  gradient.addColorStop(0.2, 'rgba(255, 220, 150, 0.9)');
  gradient.addColorStop(0.5, 'rgba(255, 120, 60, 0.5)');
  gradient.addColorStop(1, 'rgba(255, 50, 20, 0.0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

let explosionTexture: THREE.Texture | null = null;

function getExplosionTexture(): THREE.Texture {
  if (!explosionTexture) {
    explosionTexture = createExplosionTexture();
  }
  return explosionTexture;
}

export function init(scn: THREE.Scene): void {
  scene = scn;
}

export function onExplosion(cb: ExplosionCallback): void {
  explosionCallbacks.push(cb);
}

export function triggerExplosion(position: THREE.Vector3): void {
  if (!scene) return;

  const PARTICLE_COUNT = 200;
  const PARTICLE_MIN_SIZE = 0.1;
  const PARTICLE_MAX_SIZE = 0.4;
  const PARTICLE_MIN_SPEED = 2.0;
  const PARTICLE_MAX_SPEED = 6.0;
  const EXPLOSION_DURATION = 1500;

  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const colors = new Float32Array(PARTICLE_COUNT * 3);
  const sizes = new Float32Array(PARTICLE_COUNT);
  const velocities = new Float32Array(PARTICLE_COUNT * 3);

  const startColor = new THREE.Color('#f97316');
  const endColor = new THREE.Color('#dc2626');

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    positions[i * 3]     = position.x;
    positions[i * 3 + 1] = position.y;
    positions[i * 3 + 2] = position.z;

    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const speed = PARTICLE_MIN_SPEED + Math.random() * (PARTICLE_MAX_SPEED - PARTICLE_MIN_SPEED);

    velocities[i * 3]     = Math.sin(phi) * Math.cos(theta) * speed;
    velocities[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * speed;
    velocities[i * 3 + 2] = Math.cos(phi) * speed;

    const t = Math.random();
    const color = startColor.clone().lerp(endColor, t);
    colors[i * 3]     = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;

    sizes[i] = PARTICLE_MIN_SIZE + Math.random() * (PARTICLE_MAX_SIZE - PARTICLE_MIN_SIZE);
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.3,
    map: getExplosionTexture(),
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
    sizeAttenuation: true,
  });

  const particles = new THREE.Points(geometry, material);
  scene.add(particles);

  activeExplosions.push({
    particles,
    velocities,
    startTime: performance.now(),
    duration: EXPLOSION_DURATION,
    particleCount: PARTICLE_COUNT,
  });

  for (const cb of explosionCallbacks) {
    cb({ position: position.clone() });
  }
}

export function createStarField(): THREE.Points {
  const STAR_COUNT = 300;
  const STAR_MIN_SIZE = 0.5;
  const STAR_MAX_SIZE = 2.0;
  const STAR_FIELD_SIZE = 200;

  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(STAR_COUNT * 3);
  const colors = new Float32Array(STAR_COUNT * 3);
  const baseSizes = new Float32Array(STAR_COUNT);

  for (let i = 0; i < STAR_COUNT; i++) {
    positions[i * 3]     = (Math.random() - 0.5) * STAR_FIELD_SIZE;
    positions[i * 3 + 1] = (Math.random() - 0.5) * STAR_FIELD_SIZE;
    positions[i * 3 + 2] = (Math.random() - 0.5) * STAR_FIELD_SIZE;

    const alpha = 0.3 + Math.random() * 0.5;
    colors[i * 3]     = 1.0;
    colors[i * 3 + 1] = 1.0;
    colors[i * 3 + 2] = 1.0;

    baseSizes[i] = STAR_MIN_SIZE + Math.random() * (STAR_MAX_SIZE - STAR_MIN_SIZE);
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 1.5,
    vertexColors: true,
    transparent: true,
    opacity: 0.6,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  starField = new THREE.Points(geometry, material);
  return starField;
}

export function updateStarField(delta: number): void {
  if (!starField) return;

  const positions = starField.geometry.attributes.position;
  const drift = delta * 0.5;

  for (let i = 0; i < positions.count; i++) {
    let z = positions.getZ(i);
    z -= drift;
    if (z < -100) {
      z = 100;
      positions.setX(i, (Math.random() - 0.5) * 200);
      positions.setY(i, (Math.random() - 0.5) * 200);
    }
    positions.setZ(i, z);
  }

  positions.needsUpdate = true;
}

export function updateExplosions(): void {
  const now = performance.now();

  for (let i = activeExplosions.length - 1; i >= 0; i--) {
    const explosion = activeExplosions[i];
    const elapsed = now - explosion.startTime;
    const progress = Math.min(elapsed / explosion.duration, 1.0);

    if (progress >= 1.0) {
      if (scene) scene.remove(explosion.particles);
      explosion.particles.geometry.dispose();
      (explosion.particles.material as THREE.Material).dispose();
      activeExplosions.splice(i, 1);
      continue;
    }

    const positions = explosion.particles.geometry.attributes.position as THREE.BufferAttribute;
    const colors = explosion.particles.geometry.attributes.color as THREE.BufferAttribute;

    const startColor = new THREE.Color('#f97316');
    const endColor = new THREE.Color('#dc2626');
    const fadeColor = new THREE.Color('#1a0500');

    const dt = 0.016;

    for (let j = 0; j < explosion.particleCount; j++) {
      const px = positions.getX(j) + explosion.velocities[j * 3]     * dt;
      const py = positions.getY(j) + explosion.velocities[j * 3 + 1] * dt;
      const pz = positions.getZ(j) + explosion.velocities[j * 3 + 2] * dt;

      positions.setX(j, px);
      positions.setY(j, py);
      positions.setZ(j, pz);

      explosion.velocities[j * 3]     *= 0.97;
      explosion.velocities[j * 3 + 1] *= 0.97;
      explosion.velocities[j * 3 + 2] *= 0.97;

      const currentColor = startColor.clone().lerp(endColor, progress).lerp(fadeColor, progress * progress);
      colors.setX(j, currentColor.r);
      colors.setY(j, currentColor.g);
      colors.setZ(j, currentColor.b);
    }

    positions.needsUpdate = true;
    colors.needsUpdate = true;

    (explosion.particles.material as THREE.PointsMaterial).opacity = 1.0 - progress * progress;
  }
}
