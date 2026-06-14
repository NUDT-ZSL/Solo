import { GameEngine } from './GameEngine';
import type {
  GameSnapshot,
  UIState,
  UIResourceState,
  ResourceState,
  ResourceType,
  BuildingType,
  Listener,
  Building,
} from './types';
import { RESOURCE_TYPES } from './types';

export class Bridge {
  private engine: GameEngine;
  private listeners: Set<Listener<UIState>> = new Set();
  private currentSnapshot: GameSnapshot;
  private cellSize: number = 30;
  private gridSize: number = 20;
  private unsubscribeEngine: () => void;
  private previousAmounts: Record<ResourceType, number>;

  constructor(engine: GameEngine) {
    this.engine = engine;
    this.currentSnapshot = engine.getSnapshot();
    this.gridSize = this.currentSnapshot.gridSize;
    this.previousAmounts = this.initPreviousAmounts();

    this.unsubscribeEngine = engine.subscribe((snapshot) => {
      this.currentSnapshot = snapshot;
      this.gridSize = snapshot.gridSize;
      this.notifyListeners();
    });

    this.checkViewport();
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this.handleResize);
    }
  }

  private initPreviousAmounts(): Record<ResourceType, number> {
    const amounts: Record<string, number> = {};
    RESOURCE_TYPES.forEach((type) => {
      amounts[type] = this.currentSnapshot.resources[type].amount;
    });
    return amounts as Record<ResourceType, number>;
  }

  private handleResize = (): void => {
    this.checkViewport();
    this.notifyListeners();
  };

  private checkViewport(): void {
    if (typeof window === 'undefined') return;
    if (window.innerWidth < 800) {
      this.gridSize = 15;
      this.cellSize = 24;
    } else {
      this.gridSize = 20;
      this.cellSize = 30;
    }
  }

  destroy(): void {
    this.unsubscribeEngine();
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.handleResize);
    }
  }

  subscribe(listener: Listener<UIState>): () => void {
    this.listeners.add(listener);
    listener(this.getUIState());
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const state = this.getUIState();
    this.listeners.forEach((listener) => listener(state));
  }

  private transformResource(resource: ResourceState): UIResourceState {
    const netRate = resource.production - resource.consumption;
    const rateClass: 'positive' | 'negative' | 'neutral' =
      netRate > 0 ? 'positive' : netRate < 0 ? 'negative' : 'neutral';
    const rateText = netRate >= 0 ? `+${netRate.toFixed(1)}/s` : `${netRate.toFixed(1)}/s`;

    return {
      ...resource,
      netRate,
      rateText,
      rateClass,
    };
  }

  getUIState(): UIState {
    const resources: Record<string, UIResourceState> = {};
    RESOURCE_TYPES.forEach((type) => {
      resources[type] = this.transformResource(this.currentSnapshot.resources[type]);
    });

    const buildingCount = this.currentSnapshot.buildings.length;
    const useCanvasRender = buildingCount >= this.engine.getCanvasRenderThreshold();

    return {
      tick: this.currentSnapshot.tick,
      isPaused: this.currentSnapshot.isPaused,
      resources: resources as Record<ResourceType, UIResourceState>,
      buildings: this.currentSnapshot.buildings,
      gridSize: this.gridSize,
      cellSize: this.cellSize,
      selectedBuildingType: this.currentSnapshot.selectedBuildingType,
      selectedBuildingId: this.currentSnapshot.selectedBuildingId,
      buildingConfigs: this.engine.getBuildingConfigs(),
      buildingCount,
      useCanvasRender,
    };
  }

  selectBuildingType(buildingType: BuildingType | null): void {
    const command: UICommand = { type: 'SELECT_BUILDING_TYPE', buildingType };
    this.engine.executeCommand(command);
  }

  placeBuilding(x: number, y: number): void {
    const command: UICommand = { type: 'PLACE_BUILDING', x, y };
    this.engine.executeCommand(command);
  }

  selectBuilding(buildingId: string | null): void {
    const command: UICommand = { type: 'SELECT_BUILDING', buildingId };
    this.engine.executeCommand(command);
  }

  upgradeBuilding(buildingId: string): void {
    const command: UICommand = { type: 'UPGRADE_BUILDING', buildingId };
    this.engine.executeCommand(command);
  }

  demolishBuilding(buildingId: string): void {
    const command: UICommand = { type: 'DEMOLISH_BUILDING', buildingId };
    this.engine.executeCommand(command);
  }

  togglePause(): void {
    const command: UICommand = { type: 'TOGGLE_PAUSE' };
    this.engine.executeCommand(command);
  }

  getBuildingAt(x: number, y: number): Building | undefined {
    return this.engine.getBuildingAt(x, y);
  }

  getUpgradeCost(building: Building): Partial<Record<ResourceType, number>> {
    return this.engine.getUpgradeCost(building);
  }

  getCellSize(): number {
    return this.cellSize;
  }

  getGridSize(): number {
    return this.gridSize;
  }
}
