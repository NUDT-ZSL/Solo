export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export interface PlantConfig {
  id: string;
  name: string;
  season: Season;
  skill: string;
  damage: number;
  range: number;
  cooldown: number;
  cost: number;
  color: string;
  glowColor: string;
  particleColor: string;
  animationParams: {
    pulseSpeed: number;
    particleCount: number;
    particleSpeed: number;
    particleLife: number;
    particleSize: number;
  };
}

export interface EnemyConfig {
  id: string;
  name: string;
  hp: number;
  speed: number;
  reward: number;
  color: string;
  shadowColor: string;
  size: number;
}

export interface WaveConfig {
  wave: number;
  enemies: { id: string; count: number; delay: number }[];
}

export const PLANTS: PlantConfig[] = [
  {
    id: 'spring_vine',
    name: '春日藤蔓',
    season: 'spring',
    skill: '缠绕减速',
    damage: 8,
    range: 2,
    cooldown: 2,
    cost: 1,
    color: '#5CB85C',
    glowColor: 'rgba(92,184,92,0.4)',
    particleColor: '#7BE07B',
    animationParams: {
      pulseSpeed: 1.2,
      particleCount: 8,
      particleSpeed: 1.5,
      particleLife: 40,
      particleSize: 4,
    },
  },
  {
    id: 'summer_spark',
    name: '夏日火花',
    season: 'summer',
    skill: '灼烧范围',
    damage: 15,
    range: 1,
    cooldown: 3,
    cost: 2,
    color: '#FF6B35',
    glowColor: 'rgba(255,107,53,0.4)',
    particleColor: '#FF9F1C',
    animationParams: {
      pulseSpeed: 1.8,
      particleCount: 12,
      particleSpeed: 3.0,
      particleLife: 30,
      particleSize: 5,
    },
  },
  {
    id: 'autumn_leaf',
    name: '秋日落叶',
    season: 'autumn',
    skill: '护盾吸收',
    damage: 0,
    range: 1,
    cooldown: 4,
    cost: 2,
    color: '#D4A843',
    glowColor: 'rgba(212,168,67,0.4)',
    particleColor: '#E8C547',
    animationParams: {
      pulseSpeed: 0.8,
      particleCount: 10,
      particleSpeed: 1.0,
      particleLife: 50,
      particleSize: 6,
    },
  },
  {
    id: 'winter_ice',
    name: '冬日冰晶',
    season: 'winter',
    skill: '冻结路径',
    damage: 5,
    range: 2,
    cooldown: 3,
    cost: 2,
    color: '#A8D8EA',
    glowColor: 'rgba(168,216,234,0.4)',
    particleColor: '#D0F0FF',
    animationParams: {
      pulseSpeed: 1.0,
      particleCount: 10,
      particleSpeed: 1.2,
      particleLife: 45,
      particleSize: 5,
    },
  },
];

export const ENEMIES: EnemyConfig[] = [
  {
    id: 'shadow_crawler',
    name: '暗影爬虫',
    hp: 30,
    speed: 1.0,
    reward: 10,
    color: '#2D1B4E',
    shadowColor: 'rgba(45,27,78,0.6)',
    size: 14,
  },
  {
    id: 'shadow_wolf',
    name: '暗影狼',
    hp: 50,
    speed: 1.5,
    reward: 20,
    color: '#3D2B5E',
    shadowColor: 'rgba(61,43,94,0.6)',
    size: 18,
  },
  {
    id: 'shadow_golem',
    name: '暗影石像',
    hp: 100,
    speed: 0.6,
    reward: 35,
    color: '#1D0B3E',
    shadowColor: 'rgba(29,11,62,0.6)',
    size: 24,
  },
];

export const WAVES: WaveConfig[] = [
  { wave: 1, enemies: [{ id: 'shadow_crawler', count: 5, delay: 30 }] },
  { wave: 2, enemies: [{ id: 'shadow_crawler', count: 6, delay: 25 }, { id: 'shadow_wolf', count: 2, delay: 40 }] },
  { wave: 3, enemies: [{ id: 'shadow_wolf', count: 4, delay: 25 }, { id: 'shadow_crawler', count: 4, delay: 20 }] },
  { wave: 4, enemies: [{ id: 'shadow_wolf', count: 5, delay: 20 }, { id: 'shadow_golem', count: 1, delay: 60 }] },
  { wave: 5, enemies: [{ id: 'shadow_golem', count: 3, delay: 40 }, { id: 'shadow_wolf', count: 5, delay: 20 }] },
];

export const GRID_COLS = 10;
export const GRID_ROWS = 6;
export const CELL_SIZE = 64;

export const PATH_WAYPOINTS: { col: number; row: number }[] = [
  { col: -1, row: 2 },
  { col: 1, row: 2 },
  { col: 2, row: 2 },
  { col: 3, row: 2 },
  { col: 3, row: 3 },
  { col: 3, row: 4 },
  { col: 4, row: 4 },
  { col: 5, row: 4 },
  { col: 5, row: 3 },
  { col: 5, row: 2 },
  { col: 6, row: 2 },
  { col: 7, row: 2 },
  { col: 7, row: 1 },
  { col: 8, row: 1 },
  { col: 9, row: 1 },
  { col: 10, row: 1 },
];

export const PATH_CELLS = new Set<string>();
for (let i = 1; i < PATH_WAYPOINTS.length; i++) {
  const prev = PATH_WAYPOINTS[i - 1];
  const curr = PATH_WAYPOINTS[i];
  if (prev.col === curr.col) {
    const minR = Math.min(prev.row, curr.row);
    const maxR = Math.max(prev.row, curr.row);
    for (let r = minR; r <= maxR; r++) {
      PATH_CELLS.add(`${curr.col},${r}`);
    }
  } else {
    const minC = Math.min(prev.col, curr.col);
    const maxC = Math.max(prev.col, curr.col);
    for (let c = minC; c <= maxC; c++) {
      PATH_CELLS.add(`${c},${curr.row}`);
    }
  }
}

export const INTERACTIVE_POINTS: { col: number; row: number; type: 'pond' | 'ice' }[] = [
  { col: 3, row: 3, type: 'pond' },
  { col: 7, row: 1, type: 'pond' },
];

export function isPathCell(col: number, row: number): boolean {
  return PATH_CELLS.has(`${col},${row}`);
}
