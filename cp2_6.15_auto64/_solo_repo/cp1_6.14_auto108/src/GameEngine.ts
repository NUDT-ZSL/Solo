import type {
  ResourceType,
  ResourceState,
  BuildingType,
  BuildingConfig,
  Building,
  GameSnapshot,
  Listener,
  UICommand,
} from './types';
import { RESOURCE_TYPES } from './types';

const BUILDING_CONFIGS: Record<BuildingType, BuildingConfig> = {
  solarPanel: {
    type: 'solarPanel' as BuildingType,
    name: '太阳能板',
    icon: '☀️',
    color: '#ffd54f',
    baseCost: { ore: 20 },
    baseProduction: { energy: 5 },
    baseConsumption: {},
    upgradeCostMultiplier: 1.8,
    efficiencyMultiplier: 1.6,
  },
  miner: {
    type: 'miner' as BuildingType,
    name: '采矿机',
    icon: '⛏️',
    color: '#b0bec5',
    baseCost: { energy: 30, ore: 10 },
    baseProduction: { ore: 3 },
    baseConsumption: { energy: 2 },
    upgradeCostMultiplier: 1.8,
    efficiencyMultiplier: 1.5,
  },
  greenhouse: {
    type: 'greenhouse' as BuildingType,
    name: '温室',
    icon: '🌱',
    color: '#81c784',
    baseCost: { energy: 25, ore: 15 },
    baseProduction: { food: 4 },
    baseConsumption: { energy: 1.5 },
    upgradeCostMultiplier: 1.8,
    efficiencyMultiplier: 1.5,
  },
};

const INITIAL_RESOURCES: Record<ResourceType, ResourceState> = {
  energy: {
    type: 'energy' as ResourceType,
    amount: 100,
    production: 0,
    consumption: 0,
    label: '能量',
    color: '#ffd54f',
    icon: '⚡',
  },
  ore: {
    type: 'ore' as ResourceType,
    amount: 80,
    production: 0,
    consumption: 0,
    label: '矿石',
    color: '#b0bec5',
    icon: '💎',
  },
  food: {
    type: 'food' as ResourceType,
    amount: 50,
    production: 0,
    consumption: 0,
    label: '食物',
    color: '#81c784',
    icon: '🍞',
  },
};

const CANVAS_RENDER_THRESHOLD = 100;

export class GameEngine {
  private tickCount = 0;
  private isPaused = false;
  private resources: Record<ResourceType, ResourceState>;
  private buildings: Building[] = [];
  private gridSize = 20;
  private selectedBuildingType: BuildingType | null = null;
  private selectedBuildingId: string | null = null;
  private rafId: number | null = null;
  private lastTickTime = 0;
  private accumulatedTime = 0;
  private readonly TICK_INTERVAL = 1000;
  private listeners: Set<Listener<GameSnapshot>> = new Set();
  private buildingIdCounter = 0;

  constructor() {
    this.resources = JSON.parse(JSON.stringify(INITIAL_RESOURCES));
  }

  start(): void {
    if (this.rafId !== null) return;
    this.lastTickTime = performance.now();
    this.accumulatedTime = 0;
    this.loop();
  }

  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private loop = (): void => {
    const now = performance.now();
    const delta = now - this.lastTickTime;
    this.lastTickTime = now;

    if (!this.isPaused) {
      this.accumulatedTime += delta;

      while (this.accumulatedTime >= this.TICK_INTERVAL) {
        this.accumulatedTime -= this.TICK_INTERVAL;
        this.tick();
      }
    } else {
      this.lastTickTime = now;
    }

    this.rafId = requestAnimationFrame(this.loop);
  };

  subscribe(listener: Listener<GameSnapshot>): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const snapshot = this.getSnapshot();
    this.listeners.forEach((listener) => listener(snapshot));
  }

  getSnapshot(): GameSnapshot {
    return {
      tick: this.tickCount,
      isPaused: this.isPaused,
      resources: JSON.parse(JSON.stringify(this.resources)),
      buildings: this.buildings.map((b) => ({ ...b })),
      gridSize: this.gridSize,
      selectedBuildingType: this.selectedBuildingType,
      selectedBuildingId: this.selectedBuildingId,
    };
  }

  getBuildingConfigs(): Record<BuildingType, BuildingConfig> {
    return BUILDING_CONFIGS;
  }

  getCanvasRenderThreshold(): number {
    return CANVAS_RENDER_THRESHOLD;
  }

  executeCommand(command: UICommand): void {
    switch (command.type) {
      case 'SELECT_BUILDING_TYPE':
        this.selectedBuildingType = command.buildingType;
        this.selectedBuildingId = null;
        this.notify();
        break;
      case 'PLACE_BUILDING':
        this.placeBuilding(command.x, command.y);
        break;
      case 'SELECT_BUILDING':
        this.selectedBuildingId = command.buildingId;
        this.selectedBuildingType = null;
        this.notify();
        break;
      case 'UPGRADE_BUILDING':
        this.upgradeBuilding(command.buildingId);
        break;
      case 'DEMOLISH_BUILDING':
        this.demolishBuilding(command.buildingId);
        break;
      case 'TOGGLE_PAUSE':
        this.togglePause();
        break;
    }
  }

  private tick(): void {
    this.tickCount++;

    this.recalculateRates();

    RESOURCE_TYPES.forEach((type) => {
      const res = this.resources[type];
      const net = res.production - res.consumption;
      res.amount = Math.max(0, res.amount + net);
    });

    this.notify();
  }

  private recalculateRates(): void {
    const totals: Record<ResourceType, { production: number; consumption: number }> = {
      energy: { production: 0, consumption: 0 },
      ore: { production: 0, consumption: 0 },
      food: { production: 0, consumption: 0 },
    };

    this.buildings.forEach((building) => {
      const config = BUILDING_CONFIGS[building.type];
      const levelMultiplier = Math.pow(config.efficiencyMultiplier, building.level - 1);

      RESOURCE_TYPES.forEach((type) => {
        const prod = config.baseProduction[type] || 0;
        if (prod > 0) {
          totals[type].production += prod * levelMultiplier;
        }
        const cons = config.baseConsumption[type] || 0;
        if (cons > 0) {
          totals[type].consumption += cons * levelMultiplier;
        }
      });
    });

    RESOURCE_TYPES.forEach((type) => {
      this.resources[type].production = totals[type].production;
      this.resources[type].consumption = totals[type].consumption;
    });
  }

  private placeBuilding(x: number, y: number): void {
    if (!this.selectedBuildingType) return;
    if (x < 0 || x >= this.gridSize || y < 0 || y >= this.gridSize) return;

    const existing = this.buildings.find((b) => b.x === x && b.y === y);
    if (existing) return;

    const config = BUILDING_CONFIGS[this.selectedBuildingType];

    if (!this.canAfford(config.baseCost)) return;

    this.spendResources(config.baseCost);

    this.buildingIdCounter++;
    const building: Building = {
      id: `building-${this.buildingIdCounter}`,
      type: this.selectedBuildingType,
      x,
      y,
      level: 1,
      createdAt: this.tickCount,
    };

    this.buildings.push(building);
    this.recalculateRates();
    this.notify();
  }

  private upgradeBuilding(buildingId: string): void {
    const building = this.buildings.find((b) => b.id === buildingId);
    if (!building) return;

    const upgradeCost = this.getUpgradeCost(building);

    if (!this.canAfford(upgradeCost)) return;

    this.spendResources(upgradeCost);
    building.level++;
    this.recalculateRates();
    this.notify();
  }

  getUpgradeCost(building: Building): Partial<Record<ResourceType, number>> {
    const config = BUILDING_CONFIGS[building.type];
    const multiplier = Math.pow(config.upgradeCostMultiplier, building.level);
    const cost: Partial<Record<ResourceType, number>> = {};

    RESOURCE_TYPES.forEach((type) => {
      const base = config.baseCost[type] || 0;
      if (base > 0) {
        cost[type] = Math.ceil(base * multiplier);
      }
    });

    return cost;
  }

  private demolishBuilding(buildingId: string): void {
    const index = this.buildings.findIndex((b) => b.id === buildingId);
    if (index === -1) return;

    const building = this.buildings[index];
    const config = BUILDING_CONFIGS[building.type];

    RESOURCE_TYPES.forEach((type) => {
      const baseCost = config.baseCost[type] || 0;
      if (baseCost > 0) {
        let totalSpent = baseCost;
        for (let i = 1; i < building.level; i++) {
          totalSpent += Math.ceil(baseCost * Math.pow(config.upgradeCostMultiplier, i));
        }
        this.resources[type].amount += Math.floor(totalSpent * 0.5);
      }
    });

    this.buildings.splice(index, 1);

    if (this.selectedBuildingId === buildingId) {
      this.selectedBuildingId = null;
    }

    this.recalculateRates();
    this.notify();
  }

  private togglePause(): void {
    this.isPaused = !this.isPaused;
    if (!this.isPaused) {
      this.lastTickTime = performance.now();
    }
    this.notify();
  }

  private canAfford(cost: Partial<Record<ResourceType, number>>): boolean {
    return RESOURCE_TYPES.every((type) => {
      const required = cost[type] || 0;
      return required === 0 || this.resources[type].amount >= required;
    });
  }

  private spendResources(cost: Partial<Record<ResourceType, number>>): void {
    RESOURCE_TYPES.forEach((type) => {
      const amount = cost[type] || 0;
      if (amount > 0) {
        this.resources[type].amount -= amount;
      }
    });
  }

  getBuildingAt(x: number, y: number): Building | undefined {
    return this.buildings.find((b) => b.x === x && b.y === y);
  }
}
