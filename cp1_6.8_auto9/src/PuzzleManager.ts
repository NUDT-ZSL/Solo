import { Dimension, Platform } from './GameEngine';

export interface FragmentConfig {
  id: string;
  x: number;
  y: number;
  dimension: Dimension | 'both';
  collected: boolean;
}

export interface PortalConfig {
  x: number;
  y: number;
  active: boolean;
}

export interface BossConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  maxHealth: number;
  weakPointX: number;
  weakPointY: number;
}

export interface LevelConfig {
  id: number;
  name: string;
  timeLimit: number;
  platforms: Platform[];
  objects: import('./GameEngine').GameObject[];
  fragments: FragmentConfig[];
  portal: PortalConfig;
  playerStart: { x: number; y: number };
  isBossLevel: boolean;
  bossConfig?: BossConfig;
  levelWidth?: number;
}

const LEVELS: LevelConfig[] = [
  {
    id: 1,
    name: '幽桥迷径',
    timeLimit: 90,
    levelWidth: 2000,
    playerStart: { x: 100, y: 500 },
    isBossLevel: false,
    platforms: [
      { x: 0, y: 600, width: 400, height: 120, dimension: 'both', type: 'ground' },
      { x: 450, y: 600, width: 150, height: 120, dimension: Dimension.Mirror, type: 'bridge' },
      { x: 650, y: 600, width: 350, height: 120, dimension: 'both', type: 'ground' },
      { x: 300, y: 460, width: 100, height: 20, dimension: 'both', type: 'floating' },
      { x: 550, y: 420, width: 100, height: 20, dimension: Dimension.Mirror, type: 'floating' },
      { x: 800, y: 480, width: 120, height: 20, dimension: 'both', type: 'floating' },
      { x: 1050, y: 600, width: 300, height: 120, dimension: 'both', type: 'ground' },
      { x: 1100, y: 450, width: 80, height: 20, dimension: Dimension.Reality, type: 'floating' },
      { x: 1400, y: 600, width: 200, height: 120, dimension: 'both', type: 'ground' },
      { x: 1300, y: 440, width: 100, height: 20, dimension: Dimension.Mirror, type: 'floating' },
      { x: 1650, y: 600, width: 350, height: 120, dimension: 'both', type: 'ground' },
    ],
    objects: [
      {
        id: 'chest1', x: 350, y: 440, width: 36, height: 30, type: 'chest',
        interactive: true, solid: false,
        realityForm: { color: '#8a6a40', label: '关闭的宝箱', state: 'closed' },
        mirrorForm: { color: '#5a8aaa', label: '打开的宝箱', state: 'open' },
      },
      {
        id: 'lantern1', x: 700, y: 400, width: 24, height: 32, type: 'lantern',
        interactive: false, solid: false,
        realityForm: { color: '#cc3333', label: '红灯笼', state: 'lit' },
        mirrorForm: { color: '#4a5a8a', label: '蓝灯笼', state: 'dim' },
      },
      {
        id: 'lantern2', x: 1150, y: 410, width: 24, height: 32, type: 'lantern',
        interactive: false, solid: false,
        realityForm: { color: '#cc3333', label: '红灯笼', state: 'lit' },
        mirrorForm: { color: '#4a5a8a', label: '蓝灯笼', state: 'dim' },
      },
    ],
    fragments: [
      { id: 'f1_1', x: 350, y: 420, dimension: Dimension.Reality, collected: false },
      { id: 'f1_2', x: 570, y: 380, dimension: Dimension.Mirror, collected: false },
      { id: 'f1_3', x: 1150, y: 400, dimension: 'both', collected: false },
      { id: 'f1_4', x: 1350, y: 400, dimension: Dimension.Mirror, collected: false },
    ],
    portal: { x: 1850, y: 560, active: false },
  },
  {
    id: 2,
    name: '密室镜影',
    timeLimit: 120,
    levelWidth: 2200,
    playerStart: { x: 100, y: 500 },
    isBossLevel: false,
    platforms: [
      { x: 0, y: 600, width: 300, height: 120, dimension: 'both', type: 'ground' },
      { x: 350, y: 560, width: 200, height: 160, dimension: 'both', type: 'ground' },
      { x: 350, y: 440, width: 80, height: 120, dimension: Dimension.Mirror, type: 'ground' },
      { x: 600, y: 600, width: 250, height: 120, dimension: 'both', type: 'ground' },
      { x: 500, y: 460, width: 80, height: 20, dimension: 'both', type: 'floating' },
      { x: 700, y: 400, width: 100, height: 20, dimension: Dimension.Mirror, type: 'floating' },
      { x: 900, y: 600, width: 300, height: 120, dimension: 'both', type: 'ground' },
      { x: 950, y: 450, width: 80, height: 20, dimension: Dimension.Reality, type: 'floating' },
      { x: 1100, y: 380, width: 100, height: 20, dimension: 'both', type: 'floating' },
      { x: 1250, y: 600, width: 250, height: 120, dimension: 'both', type: 'ground' },
      { x: 1550, y: 600, width: 200, height: 120, dimension: 'both', type: 'ground' },
      { x: 1500, y: 460, width: 100, height: 20, dimension: Dimension.Mirror, type: 'floating' },
      { x: 1800, y: 600, width: 400, height: 120, dimension: 'both', type: 'ground' },
      { x: 1750, y: 430, width: 80, height: 20, dimension: 'both', type: 'floating' },
    ],
    objects: [
      {
        id: 'chest2', x: 400, y: 420, width: 36, height: 30, type: 'chest',
        interactive: true, solid: false,
        realityForm: { color: '#8a6a40', label: '关闭的宝箱', state: 'closed' },
        mirrorForm: { color: '#5a8aaa', label: '打开的宝箱', state: 'open' },
      },
      {
        id: 'door1', x: 350, y: 480, width: 40, height: 60, type: 'door',
        interactive: true, solid: true,
        realityForm: { color: '#6a5a4a', label: '锁闭的石门', state: 'locked' },
        mirrorForm: { color: '#4a6a8a', label: '开启的石门', state: 'open' },
      },
      {
        id: 'lantern3', x: 950, y: 420, width: 24, height: 32, type: 'lantern',
        interactive: false, solid: false,
        realityForm: { color: '#cc3333', label: '红灯笼', state: 'lit' },
        mirrorForm: { color: '#4a5a8a', label: '蓝灯笼', state: 'dim' },
      },
      {
        id: 'lantern4', x: 1600, y: 420, width: 24, height: 32, type: 'lantern',
        interactive: false, solid: false,
        realityForm: { color: '#cc3333', label: '红灯笼', state: 'lit' },
        mirrorForm: { color: '#4a5a8a', label: '蓝灯笼', state: 'dim' },
      },
    ],
    fragments: [
      { id: 'f2_1', x: 400, y: 400, dimension: Dimension.Mirror, collected: false },
      { id: 'f2_2', x: 530, y: 420, dimension: Dimension.Reality, collected: false },
      { id: 'f2_3', x: 730, y: 360, dimension: Dimension.Mirror, collected: false },
      { id: 'f2_4', x: 1000, y: 400, dimension: 'both', collected: false },
      { id: 'f2_5', x: 1550, y: 420, dimension: Dimension.Mirror, collected: false },
    ],
    portal: { x: 2050, y: 560, active: false },
  },
  {
    id: 3,
    name: '镜魔之战',
    timeLimit: 180,
    levelWidth: 1280,
    playerStart: { x: 200, y: 500 },
    isBossLevel: true,
    bossConfig: {
      x: 850, y: 300, width: 120, height: 240,
      maxHealth: 3,
      weakPointX: 910, weakPointY: 400,
    },
    platforms: [
      { x: 0, y: 600, width: 1280, height: 120, dimension: 'both', type: 'ground' },
      { x: 200, y: 460, width: 120, height: 20, dimension: 'both', type: 'floating' },
      { x: 500, y: 400, width: 120, height: 20, dimension: 'both', type: 'floating' },
      { x: 800, y: 460, width: 120, height: 20, dimension: 'both', type: 'floating' },
      { x: 350, y: 320, width: 100, height: 20, dimension: 'both', type: 'floating' },
      { x: 650, y: 300, width: 100, height: 20, dimension: 'both', type: 'floating' },
      { x: 950, y: 350, width: 100, height: 20, dimension: 'both', type: 'floating' },
    ],
    objects: [
      {
        id: 'lantern_b1', x: 300, y: 440, width: 24, height: 32, type: 'lantern',
        interactive: false, solid: false,
        realityForm: { color: '#cc3333', label: '红灯笼', state: 'lit' },
        mirrorForm: { color: '#4a5a8a', label: '蓝灯笼', state: 'dim' },
      },
      {
        id: 'lantern_b2', x: 900, y: 440, width: 24, height: 32, type: 'lantern',
        interactive: false, solid: false,
        realityForm: { color: '#cc3333', label: '红灯笼', state: 'lit' },
        mirrorForm: { color: '#4a5a8a', label: '蓝灯笼', state: 'dim' },
      },
    ],
    fragments: [
      { id: 'f3_1', x: 400, y: 290, dimension: 'both', collected: false },
      { id: 'f3_2', x: 700, y: 270, dimension: 'both', collected: false },
      { id: 'f3_3', x: 1000, y: 320, dimension: 'both', collected: false },
    ],
    portal: { x: 1100, y: 560, active: false },
  },
];

export class PuzzleManager {
  private currentLevel: number = 0;
  private fragments: FragmentConfig[] = [];
  private portalActive: boolean = false;
  private collectedCount: number = 0;
  private totalFragments: number = 0;

  getTotalLevels(): number {
    return LEVELS.length;
  }

  getLevelConfig(levelNum: number): LevelConfig | null {
    const config = LEVELS.find(l => l.id === levelNum);
    if (!config) return null;
    return JSON.parse(JSON.stringify(config));
  }

  initLevel(levelNum: number) {
    const config = this.getLevelConfig(levelNum);
    if (!config) return;
    this.currentLevel = levelNum;
    this.fragments = config.fragments.map(f => ({ ...f, collected: false }));
    this.totalFragments = this.fragments.length;
    this.collectedCount = 0;
    this.portalActive = false;
  }

  getFragments(): FragmentConfig[] {
    return this.fragments;
  }

  collectFragment(id: string): boolean {
    const frag = this.fragments.find(f => f.id === id);
    if (!frag || frag.collected) return false;
    frag.collected = true;
    this.collectedCount++;
    if (this.collectedCount >= this.totalFragments) {
      this.portalActive = true;
    }
    return true;
  }

  getCollectedCount(): number {
    return this.collectedCount;
  }

  getTotalCount(): number {
    return this.totalFragments;
  }

  isPortalActive(): boolean {
    return this.portalActive;
  }

  onDimensionSwitch(dimension: Dimension) {
    // Dimension switch notification - can trigger dimension-specific puzzle logic
  }

  checkPuzzleTrigger(triggerId: string): boolean {
    return true;
  }

  getProgress(): number {
    if (this.totalFragments === 0) return 0;
    return this.collectedCount / this.totalFragments;
  }
}
