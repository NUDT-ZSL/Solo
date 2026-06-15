export enum ResourceType {
  ENERGY = 'energy',
  ORE = 'ore',
  FOOD = 'food',
}

export const RESOURCE_TYPES: ResourceType[] = [
  ResourceType.ENERGY,
  ResourceType.ORE,
  ResourceType.FOOD,
];

export enum BuildingType {
  SOLAR_PANEL = 'solarPanel',
  MINER = 'miner',
  GREENHOUSE = 'greenhouse',
}

export const BUILDING_TYPES: BuildingType[] = [
  BuildingType.SOLAR_PANEL,
  BuildingType.MINER,
  BuildingType.GREENHOUSE,
];

export interface ResourceState {
  type: ResourceType;
  amount: number;
  production: number;
  consumption: number;
  label: string;
  color: string;
  icon: string;
}

export interface UIResourceState extends ResourceState {
  netRate: number;
  rateText: string;
  rateClass: 'positive' | 'negative' | 'neutral';
}

export interface BuildingConfig {
  type: BuildingType;
  name: string;
  icon: string;
  color: string;
  baseCost: Partial<Record<ResourceType, number>>;
  baseProduction: Partial<Record<ResourceType, number>>;
  baseConsumption: Partial<Record<ResourceType, number>>;
  upgradeCostMultiplier: number;
  efficiencyMultiplier: number;
}

export interface Building {
  id: string;
  type: BuildingType;
  x: number;
  y: number;
  level: number;
  createdAt: number;
}

export interface GameSnapshot {
  tick: number;
  isPaused: boolean;
  resources: Record<ResourceType, ResourceState>;
  buildings: Building[];
  gridSize: number;
  selectedBuildingType: BuildingType | null;
  selectedBuildingId: string | null;
}

export type UICommand =
  | { type: 'SELECT_BUILDING_TYPE'; buildingType: BuildingType | null }
  | { type: 'PLACE_BUILDING'; x: number; y: number }
  | { type: 'SELECT_BUILDING'; buildingId: string | null }
  | { type: 'UPGRADE_BUILDING'; buildingId: string }
  | { type: 'DEMOLISH_BUILDING'; buildingId: string }
  | { type: 'TOGGLE_PAUSE' };

export interface UIState {
  tick: number;
  isPaused: boolean;
  resources: Record<ResourceType, UIResourceState>;
  buildings: Building[];
  gridSize: number;
  cellSize: number;
  selectedBuildingType: BuildingType | null;
  selectedBuildingId: string | null;
  buildingConfigs: Record<BuildingType, BuildingConfig>;
  buildingCount: number;
  useCanvasRender: boolean;
}

export type Listener<T> = (state: T) => void;
