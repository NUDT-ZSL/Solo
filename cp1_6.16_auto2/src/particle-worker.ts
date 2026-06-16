const ctx = self as unknown as Worker;

interface ParticleData {
  positions: Float32Array;
  prevPositions: Float32Array;
  velocities: Float32Array;
  basePositions: Float32Array;
  collisionBrightness: Float32Array;
  count: number;
}

interface WorkerParams {
  count: number;
  speed: number;
  radius: number;
  colorStartHue: number;
  colorEndHue: number;
}

let data: ParticleData | null = null;
let params: WorkerParams = {
  count: 4000,
  speed: 1.0,
  radius: 5,
  colorStartHue: 0,
  colorEndHue: 0.5,
};

const BASE_CYCLE_DURATION = 8;
const COLLISION_BRIGHTNESS_DURATION = 0.2;
const COLLISION_RADIUS = 0.15;
const COLLISION_PUSH = 0.02;
const DAMPING = 0.98;

let scaledTime = 0;
let collisionAccumulator = 0;

function initParticles(count: number, radius: number): void {
  const positions = new Float32Array(count * 3);
  const prevPositions = new Float32Array(count * 3);
  const velocities = new Float32Array(count * 3);
  const basePositions = new Float32Array(count * 3);
  const collisionBrightness = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const phi = Math.acos(2 * Math.random() - 1);
    const theta = Math.random() * Math.PI * 2;
    const r = Math.cbrt(Math.random()) * radius * 0.6;

    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);

    const i3 = i * 3;
    positions[i3] = x;
    positions[i3 + 1] = y;
    positions[i3 + 2] = z;
    prevPositions[i3] = x;
    prevPositions[i3 + 1] = y;
    prevPositions[i3 + 2] = z;
    basePositions[i3] = x;
    basePositions[i3 + 1] = y;
    basePositions[i3 + 2] = z;
    velocities[i3] = 0;
    velocities[i3 + 1] = 0;
    velocities[i3 + 2] = 0;
    collisionBrightness[i] = 0;
  }

  data = { positions, prevPositions, velocities, basePositions, collisionBrightness, count };
  scaledTime = 0;
  collisionAccumulator = 0;
}

function hashCell(cx: number, cy: number, cz: number): number {
  return (cx * 73856093) ^ (cy * 19349663) ^ (cz * 83492791);
}

function buildSpatialGrid(positions: Float32Array, count: number): Map<number, number[]> {
  const cellSize = COLLISION_RADIUS * 2;
  const grid = new Map<number, number[]>();

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const cx = Math.floor(positions[i3] / cellSize);
    const cy = Math.floor(positions[i3 + 1] / cellSize);
    const cz = Math.floor(positions[i3 + 2] / cellSize);

    const key = hashCell(cx, cy, cz);
    let cell = grid.get(key);
    if (!cell) {
      cell = [];
      grid.set(key, cell);
    }
    cell.push(i);
  }

  return grid;
}

function getCellParticles(grid: Map<number, number[]>, cx: number, cy: number, cz: number): number[] | undefined {
  const key = hashCell(cx, cy, cz);
  return grid.get(key);
}

function checkPairs(listA: number[], listB: number[] | undefined, positions: Float32Array, velocities: Float32Array, collisionBrightness: Float32Array): void {
  if (!listB) return;
  const collRadiusSq = COLLISION_RADIUS * COLLISION_RADIUS;

  for (let ai = 0; ai < listA.length; ai++) {
    const i = listA[ai];
    const i3 = i * 3;
    for (let bj = 0; bj < listB.length; bj++) {
      const j = listB[bj];
      if (i >= j) continue;
      const j3 = j * 3;
      const dx = positions[j3] - positions[i3];
      const dy = positions[j3 + 1] - positions[i3 + 1];
      const dz = positions[j3 + 2] - positions[i3 + 2];
      const distSq = dx * dx + dy * dy + dz * dz;

      if (distSq < collRadiusSq && distSq > 0.0001) {
        const dist = Math.sqrt(distSq);
        const nx = dx / dist;
        const ny = dy / dist;
        const nz = dz / dist;

        const overlap = COLLISION_RADIUS - dist;
        const pushX = nx * (overlap * 0.5 + COLLISION_PUSH);
        const pushY = ny * (overlap * 0.5 + COLLISION_PUSH);
        const pushZ = nz * (overlap * 0.5 + COLLISION_PUSH);

        velocities[i3] -= pushX;
        velocities[i3 + 1] -= pushY;
        velocities[i3 + 2] -= pushZ;
        velocities[j3] += pushX;
        velocities[j3 + 1] += pushY;
        velocities[j3 + 2] += pushZ;

        collisionBrightness[i] = 1.0;
        collisionBrightness[j] = 1.0;
      }
    }
  }
}

function handleCollisions(): void {
  if (!data) return;
  const { positions, velocities, collisionBrightness, count } = data;

  const cellSize = COLLISION_RADIUS * 2;
  const grid = buildSpatialGrid(positions, count);

  grid.forEach((cell, _key) => {
    checkPairs(cell, cell, positions, velocities, collisionBrightness);

    const sampleIdx = cell[0];
    const si3 = sampleIdx * 3;
    const bcx = Math.floor(positions[si3] / cellSize);
    const bcy = Math.floor(positions[si3 + 1] / cellSize);
    const bcz = Math.floor(positions[si3 + 2] / cellSize);

    for (let dx = 0; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          if (dx === 0 && dy === 0 && dz === 0) continue;
          if (dx === 0 && dy < 0) continue;
          if (dx === 0 && dy === 0 && dz < 0) continue;
          const other = getCellParticles(grid, bcx + dx, bcy + dy, bcz + dz);
          if (other) {
            checkPairs(cell, other, positions, velocities, collisionBrightness);
          }
        }
      }
    }
  });
}

function updateParticles(_time: number, dt: number): void {
  if (!data) return;

  const { positions, prevPositions, velocities, basePositions, collisionBrightness, count } = data;
  const { speed, radius } = params;

  scaledTime += dt * speed;

  const cycleDuration = BASE_CYCLE_DURATION / speed;
  const cycleTime = (scaledTime % cycleDuration) / cycleDuration;
  const expandFactor = Math.sin(cycleTime * Math.PI * 2) * 0.5 + 0.5;
  const targetScale = 0.3 + expandFactor * 0.7;

  collisionAccumulator += dt;
  if (collisionAccumulator >= 0.05) {
    collisionAccumulator = 0;
    handleCollisions();
  }

  const radiusRatio = radius / 5;

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;

    const targetX = basePositions[i3] * targetScale * radiusRatio;
    const targetY = basePositions[i3 + 1] * targetScale * radiusRatio;
    const targetZ = basePositions[i3 + 2] * targetScale * radiusRatio;

    const verletX = 2 * positions[i3] - prevPositions[i3];
    const verletY = 2 * positions[i3 + 1] - prevPositions[i3 + 1];
    const verletZ = 2 * positions[i3 + 2] - prevPositions[i3 + 2];

    prevPositions[i3] = positions[i3];
    prevPositions[i3 + 1] = positions[i3 + 1];
    prevPositions[i3 + 2] = positions[i3 + 2];

    const springK = 2.5 * speed;
    positions[i3] = verletX + (targetX - verletX) * springK * dt + velocities[i3];
    positions[i3 + 1] = verletY + (targetY - verletY) * springK * dt + velocities[i3 + 1];
    positions[i3 + 2] = verletZ + (targetZ - verletZ) * springK * dt + velocities[i3 + 2];

    velocities[i3] *= DAMPING;
    velocities[i3 + 1] *= DAMPING;
    velocities[i3 + 2] *= DAMPING;

    collisionBrightness[i] = Math.max(0, collisionBrightness[i] - dt / COLLISION_BRIGHTNESS_DURATION);
  }
}

ctx.onmessage = (e: MessageEvent) => {
  const msg = e.data;

  if (msg.type === 'init') {
    params = { ...msg.params };
    initParticles(params.count, params.radius);
  } else if (msg.type === 'updateParams') {
    const oldCount = params.count;
    params = { ...msg.params };

    if (params.count !== oldCount || !data) {
      initParticles(params.count, params.radius);
    }
  } else if (msg.type === 'update') {
    const time: number = msg.time;
    const dt: number = msg.dt;

    updateParticles(time, dt);

    if (data) {
      const posCopy = new Float32Array(data.positions);
      const brightCopy = new Float32Array(data.collisionBrightness);

      ctx.postMessage({
        type: 'updated',
        positions: posCopy.buffer,
        collisionBrightness: brightCopy.buffer,
        count: data.count,
      });
    }
  }
};
