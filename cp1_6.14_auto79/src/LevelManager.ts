import { LevelData, Platform, Reflector, Prism, Receiver, LightSource, Portal } from './types';
import { eventBus } from './EventBus';

const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 600;

const createLevel1 = (): LevelData => {
  const lightSources: LightSource[] = [
    { id: 'src-1', position: { x: 100, y: 300 }, angle: -Math.PI / 6 }
  ];

  const platforms: Platform[] = [
    { id: 'plat-1', position: { x: 500, y: 150 }, angle: Math.PI / 4, length: 80, width: 12, color: '#546e7a' },
    { id: 'plat-2', position: { x: 700, y: 400 }, angle: -Math.PI / 4, length: 80, width: 12, color: '#546e7a' },
    { id: 'plat-wall-top', position: { x: 500, y: 6 }, angle: 0, length: CANVAS_WIDTH - 20, width: 12, color: '#37474f' },
    { id: 'plat-wall-bot', position: { x: 500, y: CANVAS_HEIGHT - 6 }, angle: 0, length: CANVAS_WIDTH - 20, width: 12, color: '#37474f' },
    { id: 'plat-wall-left', position: { x: 6, y: 300 }, angle: Math.PI / 2, length: CANVAS_HEIGHT - 20, width: 12, color: '#37474f' },
    { id: 'plat-wall-right', position: { x: CANVAS_WIDTH - 6, y: 300 }, angle: Math.PI / 2, length: CANVAS_HEIGHT - 20, width: 12, color: '#37474f' }
  ];

  const reflectors: Reflector[] = [
    { id: 'mirror-1', position: { x: 350, y: 300 }, rotation: -Math.PI / 4, efficiency: 0.95, type: 'mirror' }
  ];

  const receivers: Receiver[] = [
    { id: 'recv-1', position: { x: 850, y: 200 }, radius: 12, color: '#00e676', activated: false, activationProgress: 0, requiredDuration: 2 }
  ];

  const portal: Portal = {
    id: 'portal-1',
    position: { x: 920, y: 500 },
    radius: 30,
    targetLevelId: 'level-2',
    active: false,
    requiredReceivers: ['recv-1']
  };

  return {
    id: 'level-1',
    name: '初遇光径',
    lightSources,
    platforms,
    reflectors,
    prisms: [],
    receivers,
    portal,
    bounds: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT }
  };
};

const createLevel2 = (): LevelData => {
  const lightSources: LightSource[] = [
    { id: 'src-1', position: { x: 80, y: 500 }, angle: -Math.PI / 3 }
  ];

  const platforms: Platform[] = [
    { id: 'plat-wall-top', position: { x: 500, y: 6 }, angle: 0, length: CANVAS_WIDTH - 20, width: 12, color: '#37474f' },
    { id: 'plat-wall-bot', position: { x: 500, y: CANVAS_HEIGHT - 6 }, angle: 0, length: CANVAS_WIDTH - 20, width: 12, color: '#37474f' },
    { id: 'plat-wall-left', position: { x: 6, y: 300 }, angle: Math.PI / 2, length: CANVAS_HEIGHT - 20, width: 12, color: '#37474f' },
    { id: 'plat-wall-right', position: { x: CANVAS_WIDTH - 6, y: 300 }, angle: Math.PI / 2, length: CANVAS_HEIGHT - 20, width: 12, color: '#37474f' },
    { id: 'plat-obstacle-1', position: { x: 400, y: 300 }, angle: 0, length: 120, width: 12, color: '#455a64' },
    { id: 'plat-obstacle-2', position: { x: 600, y: 450 }, angle: Math.PI / 6, length: 100, width: 12, color: '#455a64' }
  ];

  const reflectors: Reflector[] = [
    { id: 'mirror-1', position: { x: 250, y: 200 }, rotation: -Math.PI / 6, efficiency: 0.95, type: 'mirror' },
    { id: 'mirror-2', position: { x: 500, y: 120 }, rotation: Math.PI / 4, efficiency: 0.95, type: 'mirror' },
    { id: 'mirror-3', position: { x: 800, y: 250 }, rotation: Math.PI / 3, efficiency: 0.95, type: 'mirror' }
  ];

  const receivers: Receiver[] = [
    { id: 'recv-1', position: { x: 850, y: 500 }, radius: 12, color: '#00e676', activated: false, activationProgress: 0, requiredDuration: 2 }
  ];

  const portal: Portal = {
    id: 'portal-1',
    position: { x: 920, y: 80 },
    radius: 30,
    targetLevelId: 'level-3',
    active: false,
    requiredReceivers: ['recv-1']
  };

  return {
    id: 'level-2',
    name: '折转迷宫',
    lightSources,
    platforms,
    reflectors,
    prisms: [],
    receivers,
    portal,
    bounds: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT }
  };
};

const createLevel3 = (): LevelData => {
  const lightSources: LightSource[] = [
    { id: 'src-1', position: { x: 100, y: 100 }, angle: Math.PI / 6 }
  ];

  const platforms: Platform[] = [
    { id: 'plat-wall-top', position: { x: 500, y: 6 }, angle: 0, length: CANVAS_WIDTH - 20, width: 12, color: '#37474f' },
    { id: 'plat-wall-bot', position: { x: 500, y: CANVAS_HEIGHT - 6 }, angle: 0, length: CANVAS_WIDTH - 20, width: 12, color: '#37474f' },
    { id: 'plat-wall-left', position: { x: 6, y: 300 }, angle: Math.PI / 2, length: CANVAS_HEIGHT - 20, width: 12, color: '#37474f' },
    { id: 'plat-wall-right', position: { x: CANVAS_WIDTH - 6, y: 300 }, angle: Math.PI / 2, length: CANVAS_HEIGHT - 20, width: 12, color: '#37474f' }
  ];

  const reflectors: Reflector[] = [
    { id: 'mirror-1', position: { x: 700, y: 400 }, rotation: -Math.PI / 3, efficiency: 0.95, type: 'mirror' }
  ];

  const prisms: Prism[] = [
    { id: 'prism-1', position: { x: 380, y: 280 }, rotation: 0, sideLength: 60, refractiveIndex: 1.5 }
  ];

  const receivers: Receiver[] = [
    { id: 'recv-1', position: { x: 850, y: 150 }, radius: 12, color: '#00e676', activated: false, activationProgress: 0, requiredDuration: 2 },
    { id: 'recv-2', position: { x: 500, y: 520 }, radius: 12, color: '#00bcd4', activated: false, activationProgress: 0, requiredDuration: 2 }
  ];

  const portal: Portal = {
    id: 'portal-1',
    position: { x: 920, y: 300 },
    radius: 30,
    targetLevelId: 'level-4',
    active: false,
    requiredReceivers: ['recv-1', 'recv-2']
  };

  return {
    id: 'level-3',
    name: '棱镜分光',
    lightSources,
    platforms,
    reflectors,
    prisms,
    receivers,
    portal,
    bounds: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT }
  };
};

const createLevel4 = (): LevelData => {
  const lightSources: LightSource[] = [
    { id: 'src-1', position: { x: 80, y: 300 }, angle: 0 }
  ];

  const platforms: Platform[] = [
    { id: 'plat-wall-top', position: { x: 500, y: 6 }, angle: 0, length: CANVAS_WIDTH - 20, width: 12, color: '#37474f' },
    { id: 'plat-wall-bot', position: { x: 500, y: CANVAS_HEIGHT - 6 }, angle: 0, length: CANVAS_WIDTH - 20, width: 12, color: '#37474f' },
    { id: 'plat-wall-left', position: { x: 6, y: 300 }, angle: Math.PI / 2, length: CANVAS_HEIGHT - 20, width: 12, color: '#37474f' },
    { id: 'plat-wall-right', position: { x: CANVAS_WIDTH - 6, y: 300 }, angle: Math.PI / 2, length: CANVAS_HEIGHT - 20, width: 12, color: '#37474f' },
    {
      id: 'plat-move-1',
      position: { x: 600, y: 300 },
      angle: Math.PI / 2,
      length: 120,
      width: 12,
      color: '#00e676',
      movable: true,
      moveDirection: { x: 0, y: 1 },
      moveDistance: 150,
      currentOffset: 0,
      linkedReceiverId: 'recv-1',
      isMoving: false
    }
  ];

  const reflectors: Reflector[] = [
    { id: 'mirror-1', position: { x: 400, y: 300 }, rotation: -Math.PI / 4, efficiency: 0.95, type: 'mirror' },
    { id: 'mirror-2', position: { x: 400, y: 100 }, rotation: Math.PI / 4, efficiency: 0.95, type: 'mirror' },
    { id: 'mirror-3', position: { x: 820, y: 100 }, rotation: -Math.PI / 4, efficiency: 0.95, type: 'mirror' }
  ];

  const receivers: Receiver[] = [
    { id: 'recv-1', position: { x: 200, y: 150 }, radius: 12, color: '#00e676', activated: false, activationProgress: 0, requiredDuration: 2, linkedPlatformId: 'plat-move-1' }
  ];

  const portal: Portal = {
    id: 'portal-1',
    position: { x: 820, y: 420 },
    radius: 30,
    targetLevelId: 'level-5',
    active: false,
    requiredReceivers: ['recv-1']
  };

  return {
    id: 'level-4',
    name: '移动之道',
    lightSources,
    platforms,
    reflectors,
    prisms: [],
    receivers,
    portal,
    bounds: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT }
  };
};

const createLevel5 = (): LevelData => {
  const lightSources: LightSource[] = [
    { id: 'src-1', position: { x: 80, y: 150 }, angle: 0 },
    { id: 'src-2', position: { x: 80, y: 450 }, angle: 0 }
  ];

  const platforms: Platform[] = [
    { id: 'plat-wall-top', position: { x: 500, y: 6 }, angle: 0, length: CANVAS_WIDTH - 20, width: 12, color: '#37474f' },
    { id: 'plat-wall-bot', position: { x: 500, y: CANVAS_HEIGHT - 6 }, angle: 0, length: CANVAS_WIDTH - 20, width: 12, color: '#37474f' },
    { id: 'plat-wall-left', position: { x: 6, y: 300 }, angle: Math.PI / 2, length: CANVAS_HEIGHT - 20, width: 12, color: '#37474f' },
    { id: 'plat-wall-right', position: { x: CANVAS_WIDTH - 6, y: 300 }, angle: Math.PI / 2, length: CANVAS_HEIGHT - 20, width: 12, color: '#37474f' },
    { id: 'plat-divider', position: { x: 500, y: 300 }, angle: Math.PI / 2, length: 300, width: 10, color: '#455a64' }
  ];

  const reflectors: Reflector[] = [
    { id: 'mirror-1', position: { x: 350, y: 150 }, rotation: -Math.PI / 4, efficiency: 0.95, type: 'mirror' },
    { id: 'mirror-2', position: { x: 350, y: 450 }, rotation: Math.PI / 4, efficiency: 0.95, type: 'mirror' },
    { id: 'mirror-3', position: { x: 700, y: 80 }, rotation: Math.PI / 4, efficiency: 0.95, type: 'mirror' },
    { id: 'mirror-4', position: { x: 700, y: 520 }, rotation: -Math.PI / 4, efficiency: 0.95, type: 'mirror' }
  ];

  const receivers: Receiver[] = [
    { id: 'recv-1', position: { x: 900, y: 250 }, radius: 12, color: '#00e676', activated: false, activationProgress: 0, requiredDuration: 2 },
    { id: 'recv-2', position: { x: 900, y: 350 }, radius: 12, color: '#ff9800', activated: false, activationProgress: 0, requiredDuration: 2 }
  ];

  const portal: Portal = {
    id: 'portal-1',
    position: { x: 500, y: 300 },
    radius: 35,
    targetLevelId: 'level-1',
    active: false,
    requiredReceivers: ['recv-1', 'recv-2']
  };

  return {
    id: 'level-5',
    name: '光之协奏',
    lightSources,
    platforms,
    reflectors,
    prisms: [],
    receivers,
    portal,
    bounds: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT }
  };
};

export class LevelManager {
  private static instance: LevelManager;
  private levels: Map<string, () => LevelData> = new Map();
  private unlockedLevels: Set<string> = new Set(['level-1']);
  private completedLevels: Set<string> = new Set();
  private currentLevelId: string = 'level-1';

  private constructor() {
    this.levels.set('level-1', createLevel1);
    this.levels.set('level-2', createLevel2);
    this.levels.set('level-3', createLevel3);
    this.levels.set('level-4', createLevel4);
    this.levels.set('level-5', createLevel5);
  }

  public static getInstance(): LevelManager {
    if (!LevelManager.instance) {
      LevelManager.instance = new LevelManager();
    }
    return LevelManager.instance;
  }

  public getLevelOrder(): string[] {
    return ['level-1', 'level-2', 'level-3', 'level-4', 'level-5'];
  }

  public getLevelName(levelId: string): string {
    const names: Record<string, string> = {
      'level-1': '初遇光径',
      'level-2': '折转迷宫',
      'level-3': '棱镜分光',
      'level-4': '移动之道',
      'level-5': '光之协奏'
    };
    return names[levelId] || '未知关卡';
  }

  public loadLevel(levelId: string): LevelData | null {
    const factory = this.levels.get(levelId);
    if (!factory) return null;
    if (!this.unlockedLevels.has(levelId)) return null;
    this.currentLevelId = levelId;
    const level = factory();
    return JSON.parse(JSON.stringify(level));
  }

  public getCurrentLevelId(): string {
    return this.currentLevelId;
  }

  public completeLevel(levelId: string): void {
    this.completedLevels.add(levelId);
    const order = this.getLevelOrder();
    const idx = order.indexOf(levelId);
    if (idx >= 0 && idx + 1 < order.length) {
      this.unlockedLevels.add(order[idx + 1]);
    }
  }

  public isLevelUnlocked(levelId: string): boolean {
    return this.unlockedLevels.has(levelId);
  }

  public isLevelCompleted(levelId: string): boolean {
    return this.completedLevels.has(levelId);
  }

  public resetLevel(levelId: string): LevelData | null {
    return this.loadLevel(levelId);
  }

  public getTotalLevels(): number {
    return this.levels.size;
  }
}

export const levelManager = LevelManager.getInstance();
