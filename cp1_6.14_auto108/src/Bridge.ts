import { GameEngine } from './GameEngine';
import type {
  GameSnapshot,
  UIState,
  UICommand,
  BuildingType,
  Listener,
  Building,
} from './types';

export class Bridge {
  private engine: GameEngine;
  private listeners: Set<Listener<UIState>> = new Set();
  private currentSnapshot: GameSnapshot;
  private cellSize: number = 30;
  private gridSize: number = 20;
  private unsubscribeEngine: () => void;

  constructor(engine: GameEngine) {
    this.engine = engine;
    this.currentSnapshot = engine.getSnapshot();
    this.gridSize = this.currentSnapshot.gridSize;

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

  getUIState(): UIState {
    return {
      tick: this.currentSnapshot.tick,
      isPaused: this.currentSnapshot.isPaused,
      resources: this.currentSnapshot.resources,
      buildings: this.currentSnapshot.buildings,
      gridSize: this.gridSize,
      cellSize: this.cellSize,
      selectedBuildingType: this.currentSnapshot.selectedBuildingType,
      selectedBuildingId: this.currentSnapshot.selectedBuildingId,
      buildingConfigs: this.engine.getBuildingConfigs(),
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

  getUpgradeCost(building: Building): Partial<Record<string, number>> {
    return this.engine.getUpgradeCost(building);
  }

  getCellSize(): number {
    return this.cellSize;
  }

  getGridSize(): number {
    return this.gridSize;
  }
}
