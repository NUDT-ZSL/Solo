export type EnemyType = 'mummy' | 'skeleton' | 'scarab' | 'pharaoh';

export interface EnemyConfig {
  type: EnemyType;
  name: string;
  hp: number;
  speed: number;
  reward: number;
  color: string;
  size: number;
  description: string;
}

export interface EnemyInstance {
  id: string;
  type: EnemyType;
  hp: number;
  maxHp: number;
  x: number;
  y: number;
  speed: number;
  baseSpeed: number;
  reward: number;
  color: string;
  size: number;
  pathIndex: number;
  slowTimer: number;
  alive: boolean;
}

export const EnemyConfigs: EnemyConfig[] = [
  {
    type: 'mummy',
    name: '普通木乃伊',
    hp: 100,
    speed: 40,
    reward: 15,
    color: '#c9a86c',
    size: 16,
    description: '缓慢移动的普通敌人',
  },
  {
    type: 'skeleton',
    name: '快速骷髅兵',
    hp: 60,
    speed: 80,
    reward: 12,
    color: '#ecf0f1',
    size: 14,
    description: '移动迅速但血量较低',
  },
  {
    type: 'scarab',
    name: '重装甲圣甲虫',
    hp: 250,
    speed: 30,
    reward: 30,
    color: '#27ae60',
    size: 20,
    description: '高血量移动缓慢',
  },
  {
    type: 'pharaoh',
    name: 'Boss法老',
    hp: 800,
    speed: 35,
    reward: 150,
    color: '#f39c12',
    size: 28,
    description: 'Boss级敌人，血量极高',
  },
];

export function getEnemyConfig(type: EnemyType): EnemyConfig {
  const config = EnemyConfigs.find((e) => e.type === type);
  if (!config) throw new Error(`未知敌人类型: ${type}`);
  return config;
}

export function createEnemy(
  id: string,
  type: EnemyType,
  pathPoints: { x: number; y: number }[]
): EnemyInstance {
  const config = getEnemyConfig(type);
  const start = pathPoints[0];
  return {
    id,
    type,
    hp: config.hp,
    maxHp: config.hp,
    x: start.x,
    y: start.y,
    speed: config.speed,
    baseSpeed: config.speed,
    reward: config.reward,
    color: config.color,
    size: config.size,
    pathIndex: 0,
    slowTimer: 0,
    alive: true,
  };
}

export interface PathPoint {
  x: number;
  y: number;
}

export function generatePath(
  cols: number,
  rows: number,
  cellSize: number,
  pathRows: number[]
): PathPoint[] {
  const points: PathPoint[] = [];
  const midRow = pathRows[Math.floor(pathRows.length / 2)];
  const startY = midRow * cellSize + cellSize / 2;

  points.push({ x: -cellSize / 2, y: startY });

  for (let col = 0; col <= cols; col++) {
    const x = col * cellSize + cellSize / 2;
    points.push({ x, y: startY });
  }

  points.push({ x: cols * cellSize + cellSize / 2, y: startY });

  return points;
}
