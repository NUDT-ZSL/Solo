import { TimeEffectType } from '../utils/TimeManager';

export interface ObstacleConfig {
  x: number;
  y: number;
  type: 'vine' | 'wall' | 'gear_gate';
  width: number;
  height: number;
  growthRate?: number;
  maxGrowth?: number;
  initialGrowth?: number;
  requiresTimeEffect?: TimeEffectType;
}

export interface MachineConfig {
  x: number;
  y: number;
  type: 'lever' | 'button' | 'valve';
  activationDuration: number;
  requiresTimeEffect: TimeEffectType;
  targetId: string;
  activated: boolean;
}

export interface PlatformConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  speed: number;
  period: number;
}

export interface MachineTargetConfig {
  id: string;
  type: 'door' | 'bridge' | 'elevator';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LevelConfig {
  id: number;
  name: string;
  width: number;
  height: number;
  playerStart: { x: number; y: number };
  goalPosition: { x: number; y: number };
  obstacles: ObstacleConfig[];
  machines: MachineConfig[];
  platforms: PlatformConfig[];
  targets: MachineTargetConfig[];
  maxStamps: number;
  timeLimit?: number;
}

export class Level {
  private configs: LevelConfig[] = [];
  private currentIndex: number = 0;

  constructor() {
    this.initLevels();
  }

  private initLevels(): void {
    this.configs.push({
      id: 1,
      name: '齿轮初动',
      width: 1200,
      height: 800,
      playerStart: { x: 100, y: 600 },
      goalPosition: { x: 1100, y: 150 },
      maxStamps: 5,
      obstacles: [
        { x: 400, y: 500, type: 'vine', width: 60, height: 80, growthRate: 0.5, maxGrowth: 3, initialGrowth: 1, requiresTimeEffect: 'reverse' },
        { x: 700, y: 300, type: 'wall', width: 40, height: 200 },
        { x: 900, y: 200, type: 'gear_gate', width: 80, height: 80, requiresTimeEffect: 'accelerate' },
      ],
      machines: [
        { x: 300, y: 550, type: 'lever', activationDuration: 3000, requiresTimeEffect: 'accelerate', targetId: 'door_1', activated: false },
        { x: 800, y: 250, type: 'valve', activationDuration: 2000, requiresTimeEffect: 'decelerate', targetId: 'bridge_1', activated: false },
      ],
      platforms: [
        { x: 500, y: 400, width: 120, height: 20, startX: 500, startY: 400, endX: 500, endY: 200, speed: 0.5, period: 4000 },
        { x: 900, y: 350, width: 100, height: 20, startX: 900, startY: 350, endX: 1050, endY: 350, speed: 0.8, period: 3000 },
      ],
      targets: [
        { id: 'door_1', type: 'door', x: 700, y: 300, width: 40, height: 200 },
        { id: 'bridge_1', type: 'bridge', x: 1000, y: 250, width: 100, height: 20 },
      ],
    });

    this.configs.push({
      id: 2,
      name: '时间裂隙',
      width: 1400,
      height: 900,
      playerStart: { x: 100, y: 700 },
      goalPosition: { x: 1300, y: 100 },
      maxStamps: 7,
      timeLimit: 120000,
      obstacles: [
        { x: 350, y: 500, type: 'vine', width: 80, height: 100, growthRate: 0.8, maxGrowth: 4, initialGrowth: 0.5, requiresTimeEffect: 'reverse' },
        { x: 600, y: 200, type: 'wall', width: 30, height: 300 },
        { x: 900, y: 400, type: 'vine', width: 70, height: 90, growthRate: 0.6, maxGrowth: 3, initialGrowth: 2, requiresTimeEffect: 'reverse' },
        { x: 1100, y: 150, type: 'gear_gate', width: 100, height: 80, requiresTimeEffect: 'accelerate' },
      ],
      machines: [
        { x: 250, y: 650, type: 'button', activationDuration: 2500, requiresTimeEffect: 'decelerate', targetId: 'elevator_1', activated: false },
        { x: 750, y: 350, type: 'lever', activationDuration: 4000, requiresTimeEffect: 'accelerate', targetId: 'door_2', activated: false },
        { x: 1050, y: 300, type: 'valve', activationDuration: 3000, requiresTimeEffect: 'reverse', targetId: 'bridge_2', activated: false },
      ],
      platforms: [
        { x: 450, y: 550, width: 100, height: 20, startX: 450, startY: 550, endX: 450, endY: 250, speed: 0.6, period: 5000 },
        { x: 800, y: 400, width: 130, height: 20, startX: 800, startY: 400, endX: 1000, endY: 400, speed: 1.0, period: 3500 },
        { x: 1150, y: 300, width: 80, height: 20, startX: 1150, startY: 300, endX: 1150, endY: 100, speed: 0.4, period: 6000 },
      ],
      targets: [
        { id: 'elevator_1', type: 'elevator', x: 500, y: 400, width: 80, height: 20 },
        { id: 'door_2', type: 'door', x: 600, y: 200, width: 30, height: 300 },
        { id: 'bridge_2', type: 'bridge', x: 1200, y: 200, width: 120, height: 20 },
      ],
    });

    this.configs.push({
      id: 3,
      name: '永动悖论',
      width: 1600,
      height: 1000,
      playerStart: { x: 80, y: 800 },
      goalPosition: { x: 1500, y: 80 },
      maxStamps: 10,
      timeLimit: 180000,
      obstacles: [
        { x: 300, y: 600, type: 'vine', width: 100, height: 120, growthRate: 1.0, maxGrowth: 5, initialGrowth: 0, requiresTimeEffect: 'reverse' },
        { x: 550, y: 300, type: 'wall', width: 25, height: 400 },
        { x: 800, y: 500, type: 'vine', width: 90, height: 110, growthRate: 0.7, maxGrowth: 4, initialGrowth: 1, requiresTimeEffect: 'reverse' },
        { x: 1000, y: 200, type: 'gear_gate', width: 120, height: 90, requiresTimeEffect: 'accelerate' },
        { x: 1250, y: 350, type: 'wall', width: 25, height: 350 },
        { x: 1400, y: 100, type: 'gear_gate', width: 100, height: 80, requiresTimeEffect: 'decelerate' },
      ],
      machines: [
        { x: 200, y: 750, type: 'lever', activationDuration: 3500, requiresTimeEffect: 'accelerate', targetId: 'bridge_3a', activated: false },
        { x: 650, y: 500, type: 'button', activationDuration: 3000, requiresTimeEffect: 'reverse', targetId: 'elevator_3', activated: false },
        { x: 950, y: 400, type: 'valve', activationDuration: 4500, requiresTimeEffect: 'decelerate', targetId: 'door_3', activated: false },
        { x: 1200, y: 250, type: 'lever', activationDuration: 2000, requiresTimeEffect: 'accelerate', targetId: 'bridge_3b', activated: false },
      ],
      platforms: [
        { x: 400, y: 600, width: 110, height: 20, startX: 400, startY: 600, endX: 400, endY: 300, speed: 0.5, period: 5500 },
        { x: 700, y: 450, width: 140, height: 20, startX: 700, startY: 450, endX: 900, endY: 450, speed: 0.9, period: 4000 },
        { x: 1100, y: 350, width: 90, height: 20, startX: 1100, startY: 350, endX: 1100, endY: 150, speed: 0.6, period: 5000 },
        { x: 1350, y: 200, width: 100, height: 20, startX: 1350, startY: 200, endX: 1500, endY: 100, speed: 0.7, period: 4500 },
      ],
      targets: [
        { id: 'bridge_3a', type: 'bridge', x: 500, y: 400, width: 80, height: 20 },
        { id: 'elevator_3', type: 'elevator', x: 700, y: 300, width: 90, height: 20 },
        { id: 'door_3', type: 'door', x: 1250, y: 350, width: 25, height: 350 },
        { id: 'bridge_3b', type: 'bridge', x: 1400, y: 150, width: 100, height: 20 },
      ],
    });
  }

  getCurrent(): LevelConfig {
    return this.configs[this.currentIndex];
  }

  getByIndex(index: number): LevelConfig | null {
    if (index >= 0 && index < this.configs.length) {
      return this.configs[index];
    }
    return null;
  }

  get totalCount(): number {
    return this.configs.length;
  }

  get current(): number {
    return this.currentIndex;
  }

  advance(): LevelConfig | null {
    this.currentIndex++;
    if (this.currentIndex < this.configs.length) {
      return this.configs[this.currentIndex];
    }
    return null;
  }

  reset(): void {
    this.currentIndex = 0;
  }

  isFirst(): boolean {
    return this.currentIndex === 0;
  }

  isLast(): boolean {
    return this.currentIndex === this.configs.length - 1;
  }
}
