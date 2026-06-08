export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export interface PlantConfig {
  id: string;
  name: string;
  season: Season;
  cost: number;
  hp: number;
  range: number;
  attackInterval: number;
  damage: number;
  color: string;
  glowColor: string;
  description: string;
  radius: number;
  skillType: 'slow' | 'aoe' | 'shield' | 'freeze';
  aoeRadius?: number;
  slowFactor?: number;
  slowDuration?: number;
  freezeDuration?: number;
  shieldHp?: number;
  particleColor: string;
  particleCount: number;
}

export interface EnemyConfig {
  id: string;
  name: string;
  hp: number;
  speed: number;
  damage: number;
  reward: number;
  color: string;
  glowColor: string;
  size: number;
  isElite: boolean;
  description: string;
  dissolveSpeed: number;
}

export interface WaveConfig {
  wave: number;
  enemies: { enemyId: string; count: number; interval: number }[];
}

export const PLANTS: Record<string, PlantConfig> = {
  spring_vine: {
    id: 'spring_vine',
    name: '春日藤蔓',
    season: 'spring',
    cost: 50,
    hp: 80,
    range: 120,
    attackInterval: 1500,
    damage: 8,
    color: '#7ecf7e',
    glowColor: 'rgba(126, 207, 126, 0.6)',
    description: '缠绕减速敌人',
    radius: 22,
    skillType: 'slow',
    slowFactor: 0.4,
    slowDuration: 2000,
    particleColor: '#a8f0a8',
    particleCount: 6,
  },
  summer_spark: {
    id: 'summer_spark',
    name: '夏日火花',
    season: 'summer',
    cost: 80,
    hp: 60,
    range: 100,
    attackInterval: 2000,
    damage: 25,
    color: '#ff8c42',
    glowColor: 'rgba(255, 140, 66, 0.6)',
    description: '灼烧范围伤害',
    radius: 20,
    skillType: 'aoe',
    aoeRadius: 60,
    particleColor: '#ffcc00',
    particleCount: 12,
  },
  autumn_leaf: {
    id: 'autumn_leaf',
    name: '秋日落叶',
    season: 'autumn',
    cost: 60,
    hp: 100,
    range: 0,
    attackInterval: 0,
    damage: 0,
    color: '#d4a24e',
    glowColor: 'rgba(212, 162, 78, 0.6)',
    description: '护盾吸收伤害',
    radius: 24,
    skillType: 'shield',
    shieldHp: 60,
    particleColor: '#e8c06a',
    particleCount: 8,
  },
  winter_ice: {
    id: 'winter_ice',
    name: '冬日冰晶',
    season: 'winter',
    cost: 70,
    hp: 70,
    range: 90,
    attackInterval: 2500,
    damage: 12,
    color: '#7ec8e3',
    glowColor: 'rgba(126, 200, 227, 0.6)',
    description: '冻结路径与敌人',
    radius: 21,
    skillType: 'freeze',
    freezeDuration: 1500,
    particleColor: '#b8e8f8',
    particleCount: 10,
  },
};

export const ENEMIES: Record<string, EnemyConfig> = {
  shadow_drone: {
    id: 'shadow_drone',
    name: '暗影游荡者',
    hp: 40,
    speed: 1.2,
    damage: 10,
    reward: 15,
    color: '#3a2255',
    glowColor: 'rgba(80, 40, 120, 0.7)',
    size: 14,
    isElite: false,
    description: '基础的暗影生物',
    dissolveSpeed: 0.03,
  },
  shadow_brute: {
    id: 'shadow_brute',
    name: '暗影巨兽',
    hp: 120,
    speed: 0.6,
    damage: 25,
    reward: 40,
    color: '#5a2277',
    glowColor: 'rgba(110, 40, 150, 0.7)',
    size: 22,
    isElite: true,
    description: '高血量精英暗影',
    dissolveSpeed: 0.015,
  },
  shadow_scout: {
    id: 'shadow_scout',
    name: '暗影侦察兵',
    hp: 25,
    speed: 2.0,
    damage: 5,
    reward: 10,
    color: '#2a1555',
    glowColor: 'rgba(60, 30, 100, 0.7)',
    size: 11,
    isElite: false,
    description: '快速移动的暗影',
    dissolveSpeed: 0.04,
  },
};

export const WAVES: WaveConfig[] = [
  { wave: 1, enemies: [{ enemyId: 'shadow_drone', count: 5, interval: 1200 }] },
  { wave: 2, enemies: [{ enemyId: 'shadow_drone', count: 6, interval: 1000 }, { enemyId: 'shadow_scout', count: 2, interval: 800 }] },
  { wave: 3, enemies: [{ enemyId: 'shadow_drone', count: 5, interval: 900 }, { enemyId: 'shadow_scout', count: 4, interval: 700 }] },
  { wave: 4, enemies: [{ enemyId: 'shadow_drone', count: 4, interval: 800 }, { enemyId: 'shadow_brute', count: 1, interval: 2000 }] },
  { wave: 5, enemies: [{ enemyId: 'shadow_drone', count: 8, interval: 700 }, { enemyId: 'shadow_scout', count: 5, interval: 600 }, { enemyId: 'shadow_brute', count: 2, interval: 1500 }] },
];

export const GRID_COLS = 10;
export const GRID_ROWS = 6;
export const CELL_SIZE = 72;

export const SEASON_COLORS: Record<Season, { primary: string; secondary: string; bg: string }> = {
  spring: { primary: '#7ecf7e', secondary: '#a8f0a8', bg: '#2a4a2a' },
  summer: { primary: '#ff8c42', secondary: '#ffcc00', bg: '#4a3a1a' },
  autumn: { primary: '#d4a24e', secondary: '#e8c06a', bg: '#3a2e1a' },
  winter: { primary: '#7ec8e3', secondary: '#b8e8f8', bg: '#1a2a3a' },
};

export const ALL_PLANT_IDS = Object.keys(PLANTS);

export function getPlantConfig(id: string): PlantConfig | undefined {
  return PLANTS[id];
}

export function getEnemyConfig(id: string): EnemyConfig | undefined {
  return ENEMIES[id];
}
