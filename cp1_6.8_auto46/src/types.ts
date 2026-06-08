export type TowerType = 'arrow' | 'cannon' | 'magic';
export type EnemyType = 'normal' | 'elite' | 'boss';

export interface Point {
  x: number;
  y: number;
}

export interface Tower {
  id: string;
  type: TowerType;
  gridX: number;
  gridY: number;
  level: number;
  attackCooldown: number;
  lastAttackTime: number;
  targetId: string | null;
  placeAnimProgress: number;
  upgradeAnimProgress: number;
  attackAnimProgress: number;
  attackTargetPos: Point | null;
}

export interface Enemy {
  id: string;
  type: EnemyType;
  hp: number;
  maxHp: number;
  speed: number;
  baseSpeed: number;
  armor: number;
  pathProgress: number;
  position: Point;
  slowTimer: number;
  slowFactor: number;
  flashTimer: number;
  shakeTimer: number;
  isDead: boolean;
  bossSummonTimer: number;
}

export interface Projectile {
  id: string;
  type: TowerType;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  progress: number;
  speed: number;
  damage: number;
  splashRadius: number;
  slowFactor: number;
  slowDuration: number;
  targetEnemyId: string | null;
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
  type: 'death' | 'splash' | 'magic' | 'upgrade';
}

export interface RuneEffect {
  x: number;
  y: number;
  rotation: number;
  life: number;
  maxLife: number;
  radius: number;
}

export interface WaveConfig {
  enemies: { type: EnemyType; count: number; interval: number }[];
}

export interface TowerStats {
  cost: number;
  range: number;
  damage: number;
  attackInterval: number;
  splashRadius: number;
  slowFactor: number;
  slowDuration: number;
}

export const GRID_COLS = 16;
export const GRID_ROWS = 10;
export const CELL_SIZE = 60;

export const CANVAS_WIDTH = GRID_COLS * CELL_SIZE;
export const CANVAS_HEIGHT = GRID_ROWS * CELL_SIZE;

export const MAX_PARTICLES = 200;
export const MAX_WAVES = 10;

export const TOWER_STATS: Record<TowerType, TowerStats[]> = {
  arrow: [
    { cost: 50, range: 150, damage: 15, attackInterval: 800, splashRadius: 0, slowFactor: 0, slowDuration: 0 },
    { cost: 80, range: 170, damage: 25, attackInterval: 700, splashRadius: 0, slowFactor: 0, slowDuration: 0 },
    { cost: 120, range: 200, damage: 40, attackInterval: 500, splashRadius: 0, slowFactor: 0, slowDuration: 0 },
  ],
  cannon: [
    { cost: 100, range: 120, damage: 40, attackInterval: 1500, splashRadius: 60, slowFactor: 0, slowDuration: 0 },
    { cost: 150, range: 140, damage: 70, attackInterval: 1300, splashRadius: 75, slowFactor: 0, slowDuration: 0 },
    { cost: 200, range: 160, damage: 110, attackInterval: 1000, splashRadius: 90, slowFactor: 0, slowDuration: 0 },
  ],
  magic: [
    { cost: 75, range: 180, damage: 10, attackInterval: 1200, splashRadius: 0, slowFactor: 0.3, slowDuration: 2000 },
    { cost: 120, range: 200, damage: 18, attackInterval: 1000, splashRadius: 0, slowFactor: 0.4, slowDuration: 2500 },
    { cost: 180, range: 230, damage: 30, attackInterval: 800, splashRadius: 0, slowFactor: 0.5, slowDuration: 3000 },
  ],
};

export const TOWER_NAMES: Record<TowerType, string> = {
  arrow: '箭塔',
  cannon: '炮塔',
  magic: '魔法塔',
};

export const ENEMY_STATS: Record<EnemyType, { hp: number; speed: number; armor: number; immuneToSlow: boolean; gold: number; summonInterval: number; summonCount: number }> = {
  normal: { hp: 60, speed: 1.2, armor: 0, immuneToSlow: false, gold: 10, summonInterval: 0, summonCount: 0 },
  elite: { hp: 200, speed: 0.9, armor: 5, immuneToSlow: false, gold: 30, summonInterval: 0, summonCount: 0 },
  boss: { hp: 800, speed: 0.6, armor: 10, immuneToSlow: true, gold: 100, summonInterval: 10000, summonCount: 2 },
};

export const WAVE_CONFIGS: WaveConfig[] = [
  { enemies: [{ type: 'normal', count: 5, interval: 1500 }] },
  { enemies: [{ type: 'normal', count: 8, interval: 1200 }] },
  { enemies: [{ type: 'normal', count: 6, interval: 1000 }, { type: 'elite', count: 2, interval: 2000 }] },
  { enemies: [{ type: 'normal', count: 8, interval: 900 }, { type: 'elite', count: 3, interval: 1500 }] },
  { enemies: [{ type: 'elite', count: 5, interval: 1200 }, { type: 'normal', count: 5, interval: 800 }] },
  { enemies: [{ type: 'normal', count: 10, interval: 700 }, { type: 'elite', count: 4, interval: 1200 }] },
  { enemies: [{ type: 'elite', count: 6, interval: 1000 }, { type: 'boss', count: 1, interval: 0 }] },
  { enemies: [{ type: 'normal', count: 12, interval: 600 }, { type: 'elite', count: 5, interval: 900 }] },
  { enemies: [{ type: 'elite', count: 8, interval: 800 }, { type: 'boss', count: 1, interval: 0 }] },
  { enemies: [{ type: 'normal', count: 15, interval: 500 }, { type: 'elite', count: 8, interval: 700 }, { type: 'boss', count: 2, interval: 5000 }] },
];

export const PATH_WAYPOINTS: Point[] = [
  { x: 0, y: 2.5 * CELL_SIZE },
  { x: 3 * CELL_SIZE, y: 2.5 * CELL_SIZE },
  { x: 3 * CELL_SIZE, y: 7.5 * CELL_SIZE },
  { x: 7 * CELL_SIZE, y: 7.5 * CELL_SIZE },
  { x: 7 * CELL_SIZE, y: 1.5 * CELL_SIZE },
  { x: 11 * CELL_SIZE, y: 1.5 * CELL_SIZE },
  { x: 11 * CELL_SIZE, y: 7.5 * CELL_SIZE },
  { x: 15 * CELL_SIZE, y: 7.5 * CELL_SIZE },
  { x: 15 * CELL_SIZE, y: 4.5 * CELL_SIZE },
  { x: CANVAS_WIDTH, y: 4.5 * CELL_SIZE },
];

export const GRID_WALKABLE: boolean[][] = (() => {
  const grid: boolean[][] = [];
  for (let r = 0; r < GRID_ROWS; r++) {
    grid[r] = [];
    for (let c = 0; c < GRID_COLS; c++) {
      grid[r][c] = true;
    }
  }
  const pathCells = new Set<string>();
  for (let i = 0; i < PATH_WAYPOINTS.length - 1; i++) {
    const a = PATH_WAYPOINTS[i];
    const b = PATH_WAYPOINTS[i + 1];
    const steps = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y));
    for (let s = 0; s <= steps; s += CELL_SIZE / 4) {
      const t = s / steps;
      const px = a.x + (b.x - a.x) * t;
      const py = a.y + (b.y - a.y) * t;
      const gc = Math.floor(px / CELL_SIZE);
      const gr = Math.floor(py / CELL_SIZE);
      if (gc >= 0 && gc < GRID_COLS && gr >= 0 && gr < GRID_ROWS) {
        pathCells.add(`${gr},${gc}`);
      }
    }
  }
  for (const key of pathCells) {
    const [r, c] = key.split(',').map(Number);
    grid[r][c] = false;
  }
  for (let c = 0; c < 3; c++) {
    for (let r = 0; r < GRID_ROWS; r++) {
      if (c < 2) grid[r][c] = false;
    }
  }
  grid[0][2] = false;
  grid[2][2] = false;
  grid[3][2] = false;
  grid[4][2] = false;
  grid[5][2] = false;
  grid[6][2] = false;
  grid[7][2] = false;
  for (let c = 13; c < GRID_COLS; c++) {
    for (let r = 0; r < GRID_ROWS; r++) {
      if (c > 14) grid[r][c] = false;
    }
  }
  return grid;
})();

export function getTowerCenter(gx: number, gy: number): Point {
  return {
    x: gx * CELL_SIZE + CELL_SIZE / 2,
    y: gy * CELL_SIZE + CELL_SIZE / 2,
  };
}

export function dist(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

let _idCounter = 0;
export function genId(): string {
  return `e${++_idCounter}`;
}
