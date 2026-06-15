export interface LightSource {
  x: number;
  y: number;
  radius: number;
  intensity: number;
  color: string;
  flickerSpeed: number;
  flickerPhase: number;
}

export interface LightMap {
  width: number;
  height: number;
  cells: Float32Array;
}

export interface VisibilityResult {
  visible: boolean;
  detectionChance: number;
}

const CELL_SIZE = 48;
const SHADOW_ENERGY_DRAIN = 18;
const SHADOW_ENERGY_REGEN = 8;
const SHADOW_MOVE_PENALTY = 0.5;

export function createLightMap(width: number, height: number): LightMap {
  return {
    width,
    height,
    cells: new Float32Array(width * height),
  };
}

export function getLightLevel(map: LightMap, x: number, y: number): number {
  if (x < 0 || x >= map.width || y < 0 || y >= map.height) return 0;
  return map.cells[y * map.width + x];
}

export function setLightLevel(map: LightMap, x: number, y: number, value: number): void {
  if (x < 0 || x >= map.width || y < 0 || y >= map.height) return;
  map.cells[y * map.width + x] = Math.min(1, Math.max(0, value));
}

export function computeLightMap(
  grid: number[][],
  lights: LightSource[],
  time: number
): LightMap {
  const height = grid.length;
  const width = grid[0].length;
  const map = createLightMap(width, height);

  for (const light of lights) {
    const flicker = 1 + Math.sin(time * light.flickerSpeed + light.flickerPhase) * 0.08;
    const effectiveRadius = light.radius * flicker;
    const effectiveIntensity = light.intensity * flicker;

    const minX = Math.max(0, Math.floor(light.x - effectiveRadius));
    const maxX = Math.min(width - 1, Math.ceil(light.x + effectiveRadius));
    const minY = Math.max(0, Math.floor(light.y - effectiveRadius));
    const maxY = Math.min(height - 1, Math.ceil(light.y + effectiveRadius));

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const dx = x - light.x;
        const dy = y - light.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= effectiveRadius) {
          if (!isWall(grid, x, y) && hasLineOfSight(grid, light.x, light.y, x, y)) {
            const falloff = 1 - dist / effectiveRadius;
            const smoothFalloff = falloff * falloff * (3 - 2 * falloff);
            const contribution = effectiveIntensity * smoothFalloff;
            const current = getLightLevel(map, x, y);
            setLightLevel(map, x, y, Math.min(1, current + contribution));
          }
        }
      }
    }
  }

  return map;
}

export function isWall(grid: number[][], x: number, y: number): boolean {
  if (y < 0 || y >= grid.length || x < 0 || x >= grid[0].length) return true;
  return grid[y][x] === 1;
}

export function hasLineOfSight(
  grid: number[][],
  x0: number,
  y0: number,
  x1: number,
  y1: number
): boolean {
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let cx = x0;
  let cy = y0;

  while (cx !== x1 || cy !== y1) {
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      cx += sx;
    }
    if (e2 < dx) {
      err += dx;
      cy += sy;
    }
    if (cx === x1 && cy === y1) return true;
    if (isWall(grid, cx, cy)) return false;
  }

  return true;
}

export function isCellInShadow(lightMap: LightMap, x: number, y: number): boolean {
  return getLightLevel(lightMap, x, y) < 0.25;
}

export function checkPlayerVisibility(
  lightMap: LightMap,
  playerX: number,
  playerY: number,
  playerInShadow: boolean,
  enemyX: number,
  enemyY: number,
  enemyVisionRadius: number,
  grid: number[][]
): VisibilityResult {
  const dx = playerX - enemyX;
  const dy = playerY - enemyY;
  const dist = Math.sqrt(dx * dx + dy * dy);

  let effectiveRadius = enemyVisionRadius;
  if (playerInShadow) {
    const inShadowCell = isCellInShadow(lightMap, playerX, playerY);
    if (inShadowCell) {
      effectiveRadius = 0;
      return { visible: false, detectionChance: 0 };
    } else {
      effectiveRadius *= 0.5;
    }
  }

  if (dist > effectiveRadius) {
    return { visible: false, detectionChance: 0 };
  }

  if (!hasLineOfSight(grid, enemyX, enemyY, playerX, playerY)) {
    return { visible: false, detectionChance: 0 };
  }

  const lightLevel = getLightLevel(lightMap, playerX, playerY);
  const distFactor = 1 - dist / effectiveRadius;
  const detectionChance = distFactor * lightLevel;

  return {
    visible: detectionChance > 0.3,
    detectionChance,
  };
}

export function updateEnergy(
  currentEnergy: number,
  maxEnergy: number,
  inShadowMode: boolean,
  isMoving: boolean,
  dt: number
): number {
  let energy = currentEnergy;

  if (inShadowMode && currentEnergy > 0) {
    let drain = SHADOW_ENERGY_DRAIN * dt;
    if (isMoving) {
      drain *= 1.4;
    }
    energy -= drain;
    if (energy <= 0) {
      energy = 0;
    }
  } else if (!inShadowMode) {
    energy += SHADOW_ENERGY_REGEN * dt;
    if (energy > maxEnergy) {
      energy = maxEnergy;
    }
  }

  return energy;
}

export function getShadowMovePenalty(): number {
  return SHADOW_MOVE_PENALTY;
}

export function getCellSize(): number {
  return CELL_SIZE;
}

export { SHADOW_ENERGY_DRAIN, SHADOW_ENERGY_REGEN };
