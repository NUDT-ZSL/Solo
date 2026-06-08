import {
  PlantConfig,
  EnemyConfig,
  Season,
  PLANTS,
  ENEMIES,
  WAVES,
  GRID_COLS,
  GRID_ROWS,
  PATH_WAYPOINTS,
  INTERACTIVE_POINTS,
  isPathCell,
} from './plants';

export type GamePhase = 'player' | 'attack' | 'enemy_move' | 'game_over' | 'victory';

export interface PlacedPlant {
  config: PlantConfig;
  col: number;
  row: number;
  cooldownTimer: number;
  shieldHp: number;
  pulsePhase: number;
}

export interface EnemyInstance {
  config: EnemyConfig;
  hp: number;
  maxHp: number;
  waypointIndex: number;
  progress: number;
  x: number;
  y: number;
  speed: number;
  slowed: boolean;
  slowTimer: number;
  frozen: boolean;
  frozenTimer: number;
  sliding: boolean;
  slideDir: number;
  alive: boolean;
  deathTimer: number;
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

export interface InteractivePointState {
  col: number;
  row: number;
  type: 'pond' | 'ice';
  frozen: boolean;
  freezeAnim: number;
}

export interface GameState {
  turn: number;
  wave: number;
  lives: number;
  score: number;
  energy: number;
  phase: GamePhase;
  plants: PlacedPlant[];
  enemies: EnemyInstance[];
  handCards: PlantConfig[];
  interactivePoints: InteractivePointState[];
  particles: Particle[];
  enemySpawnQueue: { config: EnemyConfig; spawnTimer: number }[];
  waveComplete: boolean;
  attackPhaseTimer: number;
  enemyMovePhaseTimer: number;
}

const MAX_PARTICLES = 200;
const HAND_SIZE = 3;

export function createInitialState(): GameState {
  return {
    turn: 1,
    wave: 0,
    lives: 10,
    score: 0,
    energy: 3,
    phase: 'player',
    plants: [],
    enemies: [],
    handCards: drawHand(3),
    interactivePoints: INTERACTIVE_POINTS.map((p) => ({
      col: p.col,
      row: p.row,
      type: p.type,
      frozen: false,
      freezeAnim: 0,
    })),
    particles: [],
    enemySpawnQueue: [],
    waveComplete: false,
    attackPhaseTimer: 0,
    enemyMovePhaseTimer: 0,
  };
}

export function drawHand(count: number): PlantConfig[] {
  const hand: PlantConfig[] = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * PLANTS.length);
    hand.push(PLANTS[idx]);
  }
  return hand;
}

export function canPlacePlant(state: GameState, col: number, row: number): boolean {
  if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return false;
  if (isPathCell(col, row)) return false;
  if (state.plants.some((p) => p.col === col && p.row === row)) return false;
  return true;
}

export function placePlant(state: GameState, config: PlantConfig, col: number, row: number): GameState {
  if (!canPlacePlant(state, col, row)) return state;
  if (state.energy < config.cost) return state;

  const plant: PlacedPlant = {
    config,
    col,
    row,
    cooldownTimer: 0,
    shieldHp: config.season === 'autumn' ? 30 : 0,
    pulsePhase: 0,
  };

  const newHand = state.handCards.filter((c) => c.id !== config.id).slice(0);
  const newHandWithDraw = [...newHand];
  if (newHandWithDraw.length < HAND_SIZE) {
    const idx = Math.floor(Math.random() * PLANTS.length);
    newHandWithDraw.push(PLANTS[idx]);
  }

  if (config.season === 'winter') {
    const newPoints = state.interactivePoints.map((p) => {
      const dist = Math.abs(p.col - col) + Math.abs(p.row - row);
      if (dist <= config.range && !p.frozen) {
        return { ...p, frozen: true, freezeAnim: 1, type: 'ice' as const };
      }
      return p;
    });
    return {
      ...state,
      plants: [...state.plants, plant],
      handCards: newHandWithDraw,
      energy: state.energy - config.cost,
      interactivePoints: newPoints,
    };
  }

  return {
    ...state,
    plants: [...state.plants, plant],
    handCards: newHandWithDraw,
    energy: state.energy - config.cost,
  };
}

function spawnParticles(
  particles: Particle[],
  x: number,
  y: number,
  color: string,
  count: number,
  speed: number,
  life: number,
  size: number
): Particle[] {
  const newParticles = [...particles];
  for (let i = 0; i < count; i++) {
    if (newParticles.length >= MAX_PARTICLES) break;
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const spd = speed * (0.5 + Math.random() * 0.5);
    newParticles.push({
      x,
      y,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd,
      life,
      maxLife: life,
      color,
      size: size * (0.5 + Math.random() * 0.5),
      alpha: 1,
    });
  }
  return newParticles;
}

export function processAttacks(state: GameState): GameState {
  let newState = { ...state };
  let particles = [...state.particles];
  let enemies = state.enemies.map((e) => ({ ...e }));
  let plants = state.plants.map((p) => ({ ...p, cooldownTimer: Math.max(0, p.cooldownTimer - 1) }));

  for (const plant of plants) {
    if (plant.cooldownTimer > 0) continue;

    const px = plant.col * 64 + 32;
    const py = plant.row * 64 + 32;
    const rangePx = plant.config.range * 64;

    const targetsInRange = enemies.filter((e) => {
      if (!e.alive) return false;
      const dx = e.x - px;
      const dy = e.y - py;
      return Math.sqrt(dx * dx + dy * dy) <= rangePx;
    });

    if (targetsInRange.length === 0) continue;

    const ap = plant.config.animationParams;
    particles = spawnParticles(
      particles,
      px,
      py,
      plant.config.particleColor,
      ap.particleCount,
      ap.particleSpeed,
      ap.particleLife,
      ap.particleSize
    );

    switch (plant.config.season) {
      case 'spring': {
        const target = targetsInRange[0];
        const idx = enemies.indexOf(target);
        if (idx >= 0) {
          enemies[idx] = {
            ...enemies[idx],
            hp: enemies[idx].hp - plant.config.damage,
            slowed: true,
            slowTimer: 60,
          };
          if (enemies[idx].hp <= 0) {
            enemies[idx] = { ...enemies[idx], alive: false, deathTimer: 30 };
          }
        }
        break;
      }
      case 'summer': {
        for (const target of targetsInRange) {
          const idx = enemies.indexOf(target);
          if (idx >= 0) {
            enemies[idx] = { ...enemies[idx], hp: enemies[idx].hp - plant.config.damage };
            if (enemies[idx].hp <= 0) {
              enemies[idx] = { ...enemies[idx], alive: false, deathTimer: 30 };
            }
          }
        }
        break;
      }
      case 'autumn': {
        for (const otherPlant of plants) {
          const dx = otherPlant.col - plant.col;
          const dy = otherPlant.row - plant.row;
          if (Math.abs(dx) + Math.abs(dy) <= plant.config.range) {
            otherPlant.shieldHp = Math.min(otherPlant.shieldHp + 15, 50);
          }
        }
        break;
      }
      case 'winter': {
        for (const target of targetsInRange) {
          const idx = enemies.indexOf(target);
          if (idx >= 0) {
            enemies[idx] = {
              ...enemies[idx],
              hp: enemies[idx].hp - plant.config.damage,
              frozen: true,
              frozenTimer: 45,
            };
            if (enemies[idx].hp <= 0) {
              enemies[idx] = { ...enemies[idx], alive: false, deathTimer: 30 };
            }
          }
        }
        break;
      }
    }

    plant.cooldownTimer = plant.config.cooldown * 30;
  }

  return {
    ...newState,
    plants,
    enemies,
    particles,
  };
}

export function moveEnemies(state: GameState): GameState {
  let enemies = state.enemies.map((e) => ({ ...e }));
  let lives = state.lives;
  let score = state.score;
  let particles = [...state.particles];

  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    if (!e.alive) {
      e.deathTimer -= 1;
      if (e.deathTimer <= 0) {
        particles = spawnParticles(particles, e.x, e.y, 'rgba(45,27,78,0.8)', 6, 1.5, 20, 4);
      }
      continue;
    }

    if (e.frozen && e.frozenTimer > 0) {
      e.frozenTimer -= 1;
      if (e.frozenTimer <= 0) e.frozen = false;
      continue;
    }

    if (e.slowed && e.slowTimer > 0) {
      e.slowTimer -= 1;
      if (e.slowTimer <= 0) e.slowed = false;
    }

    let speed = e.speed;
    if (e.slowed) speed *= 0.5;

    const isOnIce = state.interactivePoints.some(
      (p) => p.frozen && p.col === Math.floor(e.x / 64) && p.row === Math.floor(e.y / 64)
    );
    if (isOnIce) {
      speed *= 1.5;
      e.sliding = true;
    } else {
      e.sliding = false;
    }

    if (e.waypointIndex >= PATH_WAYPOINTS.length - 1) {
      e.alive = false;
      lives -= 1;
      continue;
    }

    const target = PATH_WAYPOINTS[e.waypointIndex + 1];
    const tx = target.col * 64 + 32;
    const ty = target.row * 64 + 32;
    const dx = tx - e.x;
    const dy = ty - e.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < speed * 2) {
      e.x = tx;
      e.y = ty;
      e.waypointIndex += 1;
      if (e.waypointIndex >= PATH_WAYPOINTS.length - 1) {
        e.alive = false;
        lives -= 1;
      }
    } else {
      e.x += (dx / dist) * speed;
      e.y += (dy / dist) * speed;
    }

    e.progress = e.waypointIndex + (1 - dist / 64);
  }

  enemies = enemies.filter((e) => e.alive || e.deathTimer > 0);

  const deadEnemies = state.enemies.filter((e) => e.alive && !enemies.find((ne) => ne === e));
  for (const de of deadEnemies) {
    score += de.config.reward;
  }

  return {
    ...state,
    enemies,
    lives,
    score,
    particles,
  };
}

export function startNextWave(state: GameState): GameState {
  const nextWave = state.wave;
  if (nextWave >= WAVES.length) {
    return { ...state, phase: 'victory' };
  }

  const waveConfig = WAVES[nextWave];
  const spawnQueue: { config: EnemyConfig; spawnTimer: number }[] = [];

  for (const entry of waveConfig.enemies) {
    const config = ENEMIES.find((e) => e.id === entry.id)!;
    for (let i = 0; i < entry.count; i++) {
      spawnQueue.push({
        config,
        spawnTimer: i * entry.delay,
      });
    }
  }

  return {
    ...state,
    wave: nextWave + 1,
    enemySpawnQueue: spawnQueue,
    waveComplete: false,
  };
}

export function processSpawns(state: GameState): GameState {
  let queue = [...state.enemySpawnQueue];
  let enemies = [...state.enemies];

  for (let i = 0; i < queue.length; i++) {
    queue[i] = { ...queue[i], spawnTimer: queue[i].spawnTimer - 1 };
    if (queue[i].spawnTimer <= 0) {
      const start = PATH_WAYPOINTS[0];
      enemies.push({
        config: queue[i].config,
        hp: queue[i].config.hp,
        maxHp: queue[i].config.hp,
        waypointIndex: 0,
        progress: 0,
        x: start.col * 64 + 32,
        y: start.row * 64 + 32,
        speed: queue[i].config.speed,
        slowed: false,
        slowTimer: 0,
        frozen: false,
        frozenTimer: 0,
        sliding: false,
        slideDir: 0,
        alive: true,
        deathTimer: 30,
      });
    }
  }

  queue = queue.filter((q) => q.spawnTimer > 0);

  return {
    ...state,
    enemies,
    enemySpawnQueue: queue,
  };
}

export function updateParticles(particles: Particle[]): Particle[] {
  return particles
    .map((p) => ({
      ...p,
      x: p.x + p.vx,
      y: p.y + p.vy,
      life: p.life - 1,
      alpha: Math.max(0, p.life / p.maxLife),
      vx: p.vx * 0.98,
      vy: p.vy * 0.98,
    }))
    .filter((p) => p.life > 0);
}

export function checkWinLose(state: GameState): GameState {
  if (state.lives <= 0) {
    return { ...state, phase: 'game_over' };
  }

  const allEnemiesDead = state.enemies.every((e) => !e.alive);
  const queueEmpty = state.enemySpawnQueue.length === 0;
  const allWavesDone = state.wave >= WAVES.length;

  if (allWavesDone && allEnemiesDead && queueEmpty) {
    return { ...state, phase: 'victory' };
  }

  return state;
}

export function endPlayerTurn(state: GameState): GameState {
  let newState = startNextWave(state);
  newState = { ...newState, phase: 'attack', attackPhaseTimer: 60 };
  return newState;
}

export function getCellFromMouse(
  mouseX: number,
  mouseY: number,
  canvasWidth: number,
  canvasHeight: number
): { col: number; row: number } | null {
  const boardPixelWidth = GRID_COLS * 64;
  const boardPixelHeight = GRID_ROWS * 64;
  const offsetX = (canvasWidth - boardPixelWidth) / 2;
  const offsetY = (canvasHeight - boardPixelHeight) / 2;

  const col = Math.floor((mouseX - offsetX) / 64);
  const row = Math.floor((mouseY - offsetY) / 64);

  if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return null;
  return { col, row };
}

export function getEnergyForTurn(turn: number): number {
  return Math.min(3 + Math.floor(turn / 3), 8);
}
