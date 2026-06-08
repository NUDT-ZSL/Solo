import {
  Season,
  PlantConfig,
  EnemyConfig,
  PLANTS,
  ENEMIES,
  WAVES,
  GRID_COLS,
  GRID_ROWS,
  CELL_SIZE,
  ALL_PLANT_IDS,
} from './plants';

export interface Position {
  x: number;
  y: number;
}

export interface GridCell {
  col: number;
  row: number;
  isPath: boolean;
  isInteractive: boolean;
  interactiveType?: 'pond' | 'rock' | 'bush';
  frozen: boolean;
  plantId: string | null;
  shieldHp: number;
}

export interface PlacedPlant {
  id: string;
  config: PlantConfig;
  col: number;
  row: number;
  hp: number;
  shieldHp: number;
  lastAttackTime: number;
  animationPhase: number;
}

export interface EnemyInstance {
  id: string;
  config: EnemyConfig;
  hp: number;
  maxHp: number;
  speed: number;
  pathIndex: number;
  x: number;
  y: number;
  slowFactor: number;
  slowEndTime: number;
  frozen: boolean;
  frozenEndTime: number;
  alive: boolean;
  dissolving: boolean;
  dissolveAlpha: number;
  burning: boolean;
  burnEndTime: number;
  burnDamage: number;
  burnTickTime: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  alpha: number;
}

export interface AttackEffect {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  progress: number;
  color: string;
  season: Season;
  particleCount: number;
  particles: Particle[];
  duration: number;
  startTime: number;
}

export interface GameState {
  grid: GridCell[][];
  plants: PlacedPlant[];
  enemies: EnemyInstance[];
  effects: AttackEffect[];
  wave: number;
  turn: number;
  gold: number;
  lives: number;
  phase: 'planning' | 'combat' | 'gameover' | 'victory';
  hand: string[];
  selectedCard: string | null;
  score: number;
  spawnQueue: { enemyId: string; spawnTime: number }[];
  combatStartTime: number;
  hoveredCell: { col: number; row: number } | null;
  hoveredCard: string | null;
  lastTimestamp: number;
}

let enemyIdCounter = 0;

export function createEnemyInstance(enemyId: string, startX: number, startY: number): EnemyInstance | null {
  const config = ENEMIES[enemyId];
  if (!config) return null;
  enemyIdCounter++;
  return {
    id: `enemy_${enemyIdCounter}`,
    config,
    hp: config.hp,
    maxHp: config.hp,
    speed: config.speed,
    pathIndex: 0,
    x: startX,
    y: startY,
    slowFactor: 1,
    slowEndTime: 0,
    frozen: false,
    frozenEndTime: 0,
    alive: true,
    dissolving: false,
    dissolveAlpha: 1,
    burning: false,
    burnEndTime: 0,
    burnDamage: 0,
    burnTickTime: 0,
  };
}

export function buildPath(): Position[] {
  const path: Position[] = [];
  const offsetY = 0.5;
  const entryCol = -1;
  path.push({ x: entryCol * CELL_SIZE + CELL_SIZE / 2, y: 2 * CELL_SIZE + offsetY * CELL_SIZE });

  const waypoints: [number, number][] = [
    [0, 2],
    [2, 2],
    [2, 0],
    [4, 0],
    [4, 3],
    [6, 3],
    [6, 1],
    [8, 1],
    [8, 4],
    [9, 4],
  ];

  for (const [col, row] of waypoints) {
    path.push({ x: col * CELL_SIZE + CELL_SIZE / 2, y: row * CELL_SIZE + offsetY * CELL_SIZE });
  }

  path.push({ x: (GRID_COLS + 0.5) * CELL_SIZE, y: 4 * CELL_SIZE + offsetY * CELL_SIZE });
  return path;
}

export const PATH = buildPath();

export function getPathCells(): Set<string> {
  const cells = new Set<string>();
  for (let i = 0; i < PATH.length - 1; i++) {
    const from = PATH[i];
    const to = PATH[i + 1];
    const steps = Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y));
    const stepCount = Math.ceil(steps / (CELL_SIZE * 0.5));
    for (let s = 0; s <= stepCount; s++) {
      const t = s / stepCount;
      const px = from.x + (to.x - from.x) * t;
      const py = from.y + (to.y - from.y) * t;
      const col = Math.floor(px / CELL_SIZE);
      const row = Math.floor(py / CELL_SIZE);
      if (col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS) {
        cells.add(`${col},${row}`);
      }
    }
  }
  return cells;
}

const PATH_CELLS = getPathCells();

export function isPathCell(col: number, row: number): boolean {
  return PATH_CELLS.has(`${col},${row}`);
}

export function createGrid(): GridCell[][] {
  const grid: GridCell[][] = [];
  const interactiveCells: [number, number, 'pond' | 'rock' | 'bush'][] = [
    [1, 4, 'pond'],
    [3, 1, 'rock'],
    [5, 2, 'bush'],
    [7, 3, 'pond'],
    [7, 5, 'rock'],
  ];

  for (let row = 0; row < GRID_ROWS; row++) {
    grid[row] = [];
    for (let col = 0; col < GRID_COLS; col++) {
      const interactive = interactiveCells.find(([c, r]) => c === col && r === row);
      grid[row][col] = {
        col,
        row,
        isPath: isPathCell(col, row),
        isInteractive: !!interactive,
        interactiveType: interactive?.[2],
        frozen: false,
        plantId: null,
        shieldHp: 0,
      };
    }
  }
  return grid;
}

export function drawRandomHand(count: number): string[] {
  const hand: string[] = [];
  const pool = [...ALL_PLANT_IDS];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    hand.push(pool[idx]);
  }
  return hand;
}

export function canPlacePlant(grid: GridCell[][], col: number, row: number): boolean {
  if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return false;
  const cell = grid[row][col];
  if (cell.isPath) return false;
  if (cell.plantId) return false;
  return true;
}

export function placePlant(
  grid: GridCell[][],
  plants: PlacedPlant[],
  plantId: string,
  col: number,
  row: number,
  gold: number
): { grid: GridCell[][]; plants: PlantedPlant[]; gold: number; success: boolean } {
  const config = PLANTS[plantId];
  if (!config) return { grid, plants, gold, success: false };
  if (gold < config.cost) return { grid, plants, gold, success: false };
  if (!canPlacePlant(grid, col, row)) return { grid, plants, gold, success: false };

  const newGrid = grid.map(r => r.map(c => ({ ...c })));
  const newPlants = [...plants];

  newGrid[row][col].plantId = plantId;

  newPlants.push({
    id: `plant_${col}_${row}`,
    config,
    col,
    row,
    hp: config.hp,
    shieldHp: config.skillType === 'shield' ? (config.shieldHp ?? 0) : 0,
    lastAttackTime: 0,
    animationPhase: 0,
  });

  return { grid: newGrid, plants: newPlants, gold: gold - config.cost, success: true };
}

export function getPlantAtCell(plants: PlacedPlant[], col: number, row: number): PlacedPlant | undefined {
  return plants.find(p => p.col === col && p.row === row);
}

export function cellCenter(col: number, row: number): Position {
  return {
    x: col * CELL_SIZE + CELL_SIZE / 2,
    y: row * CELL_SIZE + CELL_SIZE / 2,
  };
}

export function distance(a: Position, b: Position): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function findTargetInRange(plant: PlacedPlant, enemies: EnemyInstance[]): EnemyInstance | null {
  const center = cellCenter(plant.col, plant.row);
  let closest: EnemyInstance | null = null;
  let closestDist = Infinity;

  for (const enemy of enemies) {
    if (!enemy.alive || enemy.dissolving) continue;
    const dist = distance(center, { x: enemy.x, y: enemy.y });
    if (dist <= plant.config.range && dist < closestDist) {
      closest = enemy;
      closestDist = dist;
    }
  }
  return closest;
}

export function findTargetsInAoe(plant: PlacedPlant, target: EnemyInstance, enemies: EnemyInstance[]): EnemyInstance[] {
  if (!plant.config.aoeRadius) return [target];
  return enemies.filter(e => {
    if (!e.alive || e.dissolving) return false;
    return distance({ x: target.x, y: target.y }, { x: e.x, y: e.y }) <= (plant.config.aoeRadius ?? 0);
  });
}

export function applyPlantAttack(
  plant: PlacedPlant,
  enemies: EnemyInstance[],
  currentTime: number
): { enemies: EnemyInstance[]; effects: AttackEffect[] } {
  if (plant.config.skillType === 'shield') return { enemies, effects: [] };
  if (currentTime - plant.lastAttackTime < plant.config.attackInterval) return { enemies, effects: [] };

  const target = findTargetInRange(plant, enemies);
  if (!target) return { enemies, effects: [] };

  const newEnemies = enemies.map(e => ({ ...e }));
  const fromPos = cellCenter(plant.col, plant.row);
  const effects: AttackEffect[] = [];

  const updatedPlant = { ...plant, lastAttackTime: currentTime };

  if (plant.config.skillType === 'aoe') {
    const targets = findTargetsInAoe(updatedPlant, target, newEnemies);
    for (const t of targets) {
      const idx = newEnemies.findIndex(e => e.id === t.id);
      if (idx >= 0) {
        newEnemies[idx] = { ...newEnemies[idx], hp: newEnemies[idx].hp - plant.config.damage };
        if (newEnemies[idx].hp <= 0) {
          newEnemies[idx] = { ...newEnemies[idx], alive: false, dissolving: true };
        }
      }
    }
  } else if (plant.config.skillType === 'slow') {
    const idx = newEnemies.findIndex(e => e.id === target.id);
    if (idx >= 0) {
      newEnemies[idx] = {
        ...newEnemies[idx],
        hp: newEnemies[idx].hp - plant.config.damage,
        slowFactor: plant.config.slowFactor ?? 1,
        slowEndTime: currentTime + (plant.config.slowDuration ?? 0),
      };
      if (newEnemies[idx].hp <= 0) {
        newEnemies[idx] = { ...newEnemies[idx], alive: false, dissolving: true };
      }
    }
  } else if (plant.config.skillType === 'freeze') {
    const idx = newEnemies.findIndex(e => e.id === target.id);
    if (idx >= 0) {
      newEnemies[idx] = {
        ...newEnemies[idx],
        hp: newEnemies[idx].hp - plant.config.damage,
        frozen: true,
        frozenEndTime: currentTime + (plant.config.freezeDuration ?? 0),
      };
      if (newEnemies[idx].hp <= 0) {
        newEnemies[idx] = { ...newEnemies[idx], alive: false, dissolving: true };
      }
    }
  }

  effects.push({
    fromX: fromPos.x,
    fromY: fromPos.y,
    toX: target.x,
    toY: target.y,
    progress: 0,
    color: plant.config.particleColor,
    season: plant.config.season,
    particleCount: plant.config.particleCount,
    particles: [],
    duration: 400,
    startTime: currentTime,
  });

  const plantIdx = enemies.findIndex;
  return { enemies: newEnemies, effects };
}

export function moveEnemyAlongPath(enemy: EnemyInstance, dt: number, currentTime: number): EnemyInstance {
  if (!enemy.alive) return enemy;

  let effectiveSpeed = enemy.speed;
  if (enemy.frozen && currentTime < enemy.frozenEndTime) {
    effectiveSpeed = 0;
  } else {
    if (enemy.slowFactor < 1 && currentTime < enemy.slowEndTime) {
      effectiveSpeed *= enemy.slowFactor;
    }
  }

  if (effectiveSpeed === 0) return enemy;

  const moveAmount = effectiveSpeed * dt * 0.06;

  let newX = enemy.x;
  let newY = enemy.y;
  let pathIdx = enemy.pathIndex;

  if (pathIdx >= PATH.length - 1) {
    return { ...enemy, alive: false };
  }

  const target = PATH[pathIdx + 1];
  const dx = target.x - newX;
  const dy = target.y - newY;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (moveAmount >= dist) {
    newX = target.x;
    newY = target.y;
    pathIdx++;
    let remaining = moveAmount - dist;

    while (remaining > 0 && pathIdx < PATH.length - 1) {
      const next = PATH[pathIdx + 1];
      const ndx = next.x - newX;
      const ndy = next.y - newY;
      const ndist = Math.sqrt(ndx * ndx + ndy * ndy);
      if (remaining >= ndist) {
        newX = next.x;
        newY = next.y;
        pathIdx++;
        remaining -= ndist;
      } else {
        const ratio = remaining / ndist;
        newX += ndx * ratio;
        newY += ndy * ratio;
        remaining = 0;
      }
    }
  } else {
    const ratio = moveAmount / dist;
    newX += dx * ratio;
    newY += dy * ratio;
  }

  const reachedEnd = pathIdx >= PATH.length - 1;
  return {
    ...enemy,
    x: newX,
    y: newY,
    pathIndex: pathIdx,
    alive: !reachedEnd,
  };
}

export function updateEnemyStatus(enemy: EnemyInstance, currentTime: number): EnemyInstance {
  let updated = { ...enemy };

  if (updated.frozen && currentTime >= updated.frozenEndTime) {
    updated.frozen = false;
  }

  if (updated.slowFactor < 1 && currentTime >= updated.slowEndTime) {
    updated.slowFactor = 1;
  }

  if (updated.dissolving) {
    updated.dissolveAlpha -= updated.config.dissolveSpeed;
    if (updated.dissolveAlpha <= 0) {
      updated.dissolveAlpha = 0;
      updated.dissolving = false;
    }
  }

  return updated;
}

export function processCombatFrame(
  plants: PlacedPlant[],
  enemies: EnemyInstance[],
  effects: AttackEffect[],
  currentTime: number,
  dt: number
): { plants: PlacedPlant[]; enemies: EnemyInstance[]; effects: AttackEffect[]; livesLost: number; goldGained: number } {
  let currentEnemies = [...enemies];
  let currentEffects = [...effects];
  let livesLost = 0;
  let goldGained = 0;
  let updatedPlants = plants.map(p => ({ ...p }));

  for (const plant of updatedPlants) {
    if (plant.config.skillType === 'shield') continue;
    if (currentTime - plant.lastAttackTime < plant.config.attackInterval) continue;

    const target = findTargetInRange(plant, currentEnemies);
    if (!target) continue;

    plant.lastAttackTime = currentTime;
    const fromPos = cellCenter(plant.col, plant.row);

    if (plant.config.skillType === 'aoe') {
      const targets = findTargetsInAoe(plant, target, currentEnemies);
      for (const t of targets) {
        const idx = currentEnemies.findIndex(e => e.id === t.id);
        if (idx >= 0) {
          currentEnemies[idx] = { ...currentEnemies[idx], hp: currentEnemies[idx].hp - plant.config.damage };
          if (currentEnemies[idx].hp <= 0 && currentEnemies[idx].alive) {
            currentEnemies[idx] = { ...currentEnemies[idx], alive: false, dissolving: true };
            goldGained += currentEnemies[idx].config.reward;
          }
        }
      }
    } else if (plant.config.skillType === 'slow') {
      const idx = currentEnemies.findIndex(e => e.id === target.id);
      if (idx >= 0) {
        currentEnemies[idx] = {
          ...currentEnemies[idx],
          hp: currentEnemies[idx].hp - plant.config.damage,
          slowFactor: plant.config.slowFactor ?? 1,
          slowEndTime: currentTime + (plant.config.slowDuration ?? 0),
        };
        if (currentEnemies[idx].hp <= 0 && currentEnemies[idx].alive) {
          currentEnemies[idx] = { ...currentEnemies[idx], alive: false, dissolving: true };
          goldGained += currentEnemies[idx].config.reward;
        }
      }
    } else if (plant.config.skillType === 'freeze') {
      const idx = currentEnemies.findIndex(e => e.id === target.id);
      if (idx >= 0) {
        currentEnemies[idx] = {
          ...currentEnemies[idx],
          hp: currentEnemies[idx].hp - plant.config.damage,
          frozen: true,
          frozenEndTime: currentTime + (plant.config.freezeDuration ?? 0),
        };
        if (currentEnemies[idx].hp <= 0 && currentEnemies[idx].alive) {
          currentEnemies[idx] = { ...currentEnemies[idx], alive: false, dissolving: true };
          goldGained += currentEnemies[idx].config.reward;
        }
      }
    }

    currentEffects.push({
      fromX: fromPos.x,
      fromY: fromPos.y,
      toX: target.x,
      toY: target.y,
      progress: 0,
      color: plant.config.particleColor,
      season: plant.config.season,
      particleCount: plant.config.particleCount,
      particles: [],
      duration: 400,
      startTime: currentTime,
    });
  }

  for (let i = 0; i < currentEnemies.length; i++) {
    if (!currentEnemies[i].alive && !currentEnemies[i].dissolving) continue;

    if (currentEnemies[i].alive) {
      currentEnemies[i] = moveEnemyAlongPath(currentEnemies[i], dt, currentTime);

      if (!currentEnemies[i].alive) {
        livesLost++;
        currentEnemies[i] = { ...currentEnemies[i], dissolving: true };
      }
    }

    currentEnemies[i] = updateEnemyStatus(currentEnemies[i], currentTime);
  }

  currentEffects = currentEffects
    .map(e => {
      const elapsed = currentTime - e.startTime;
      const progress = Math.min(1, elapsed / e.duration);
      return { ...e, progress };
    })
    .filter(e => e.progress < 1);

  currentEnemies = currentEnemies.filter(e => e.alive || e.dissolving);

  return {
    plants: updatedPlants,
    enemies: currentEnemies,
    effects: currentEffects,
    livesLost,
    goldGained,
  };
}

export function buildSpawnQueue(waveIndex: number): { enemyId: string; spawnTime: number }[] {
  const waveConfig = WAVES[waveIndex];
  if (!waveConfig) return [];

  const queue: { enemyId: string; spawnTime: number }[] = [];
  let time = 0;

  for (const group of waveConfig.enemies) {
    for (let i = 0; i < group.count; i++) {
      queue.push({ enemyId: group.enemyId, spawnTime: time });
      time += group.interval;
    }
  }

  queue.sort((a, b) => a.spawnTime - b.spawnTime);
  return queue;
}

export function isWaveComplete(enemies: EnemyInstance[], spawnQueue: { enemyId: string; spawnTime: number }[]): boolean {
  const activeEnemies = enemies.filter(e => e.alive || e.dissolving);
  return activeEnemies.length === 0 && spawnQueue.length === 0;
}

export function initGameState(): GameState {
  const grid = createGrid();
  return {
    grid,
    plants: [],
    enemies: [],
    effects: [],
    wave: 0,
    turn: 1,
    gold: 200,
    lives: 10,
    phase: 'planning',
    hand: drawRandomHand(4),
    selectedCard: null,
    score: 0,
    spawnQueue: [],
    combatStartTime: 0,
    hoveredCell: null,
    hoveredCard: null,
    lastTimestamp: 0,
  };
}

export type PlacedPlant = PlacedPlant;
