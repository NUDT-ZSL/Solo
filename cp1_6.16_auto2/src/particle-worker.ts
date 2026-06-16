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

const CYCLE_DURATION = 8;
const COLLISION_BRIGHTNESS_DURATION = 0.2;
const COLLISION_RADIUS = 0.15;
const COLLISION_PUSH = 0.02;
const DAMPING = 0.98;

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
}

function buildSpatialGrid(positions: Float32Array, count: number): Map<number, number[]> {
  const cellSize = COLLISION_RADIUS * 4;
  const grid = new Map<number, number[]>();

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const cx = Math.floor(positions[i3] / cellSize);
    const cy = Math.floor(positions[i3 + 1] / cellSize);
    const cz = Math.floor(positions[i3 + 2] / cellSize);

    const key = (cx * 73856093) ^ (cy * 19349663) ^ (cz * 83492791);
    let cell = grid.get(key);
    if (!cell) {
      cell = [];
      grid.set(key, cell);
    }
    cell.push(i);
  }

  return grid;
}

function handleCollisions(): void {
  if (!data) return;
  const { positions, velocities, collisionBrightness, count } = data;

  const grid = buildSpatialGrid(positions, count);
  const cellSize = COLLISION_RADIUS * 4;

  const checked = new Set<number>();

  grid.forEach((cell, key) => {
    const neighbors: number[] = [];
    for (const [nKey] of grid) {
      if (nKey === key) continue;
      const cell2 = grid.get(nKey);
      if (cell2 && cell2.length > 0) {
        neighbors.push(...cell2);
      }
    }

    for (let ci = 0; ci < cell.length; ci++) {
      const i = cell[ci];
      const i3 = i * 3;

      for (let cj = ci + 1; cj < cell.length; cj++) {
        const j = cell[cj];
        const pairKey = i * count + j;
        if (checked.has(pairKey)) continue;
        checked.add(pairKey);

        const j3 = j * 3;
        const dx = positions[j3] - positions[i3];
        const dy = positions[j3 + 1] - positions[i3 + 1];
        const dz = positions[j3 + 2] - positions[i3 + 2];
        const distSq = dx * dx + dy * dy + dz * dz;

        if (distSq < COLLISION_RADIUS * COLLISION_RADIUS && distSq > 0.0001) {
          const dist = Math.sqrt(distSq);
          const nx = dx / dist;
          const ny = dy / dist;
          const nz = dz / dist;

          const pushX = nx * COLLISION_PUSH;
          const pushY = ny * COLLISION_PUSH;
          const pushZ = nz * COLLISION_PUSH;

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
  });
}

function updateParticles(time: number, dt: number): void {
  if (!data) return;

  const { positions, prevPositions, velocities, basePositions, collisionBrightness, count } = data;
  const { speed, radius } = params;

  const cycleTime = (time % CYCLE_DURATION) / CYCLE_DURATION;
  const expandFactor = Math.sin(cycleTime * Math.PI * 2) * 0.5 + 0.5;
  const targetScale = 0.3 + expandFactor * 0.7;

  const maxCollisionChecks = Math.min(count, 2000);
  const step = Math.max(1, Math.floor(count / maxCollisionChecks));

  if (time % 0.1 < dt) {
    handleCollisions();
  }

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;

    const targetX = basePositions[i3] * targetScale * (radius / 5);
    const targetY = basePositions[i3 + 1] * targetScale * (radius / 5);
    const targetZ = basePositions[i3 + 2] * targetScale * (radius / 5);

    const verletX = 2 * positions[i3] - prevPositions[i3];
    const verletY = 2 * positions[i3 + 1] - prevPositions[i3 + 1];
    const verletZ = 2 * positions[i3 + 2] - prevPositions[i3 + 2];

    prevPositions[i3] = positions[i3];
    prevPositions[i3 + 1] = positions[i3 + 1];
    prevPositions[i3 + 2] = positions[i3 + 2];

    const springK = 0.5 * speed;
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
      ctx.postMessage(
        {
          type: 'updated',
          positions: data.positions.buffer,
          collisionBrightness: data.collisionBrightness.buffer,
          count: data.count,
        },
        [data.positions.buffer, data.collisionBrightness.buffer] as any
      );

      data.positions = new Float32Array(data.count * 3);
      data.collisionBrightness = new Float32Array(data.count);
    }
  }
};
