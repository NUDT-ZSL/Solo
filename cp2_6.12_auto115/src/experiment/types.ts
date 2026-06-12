export type RoofType = 'flat' | 'slant' | 'dome' | 'traditional';

export interface Building {
  id: string;
  position: [number, number, number];
  width: number;
  depth: number;
  height: number;
  color: string;
  roofType: RoofType;
  roofColor?: string;
  windowCount?: number;
}

export interface Tree {
  id: string;
  position: [number, number, number];
  scale: number;
  trunkColor?: string;
  foliageColor?: string;
}

export interface StreetLight {
  id: string;
  position: [number, number, number];
  height: number;
  intensity?: number;
  color?: string;
}

export interface StreetData {
  id: string;
  name: string;
  description: string;
  buildings: Building[];
  trees: Tree[];
  streetLights: StreetLight[];
  groundColor: string;
  streetWidth: number;
  streetLength: number;
  greeneryDensity: number;
  lightAngle: number;
  skyColor: string;
  ambientIntensity: number;
}

export interface BuildingDiff {
  id: string;
  position?: [number, number, number];
  width?: number;
  depth?: number;
  height?: number;
  color?: string;
  roofType?: RoofType;
  roofColor?: string;
  windowCount?: number;
}

export interface StreetDiff {
  id: string;
  name: string;
  buildings: BuildingDiff[];
  addedBuildings: Building[];
  removedBuildingIds: string[];
  addedTrees: Tree[];
  removedTreeIds: string[];
  addedStreetLights: StreetLight[];
  removedStreetLightIds: string[];
  groundColor?: string;
  greeneryDensityDelta?: number;
  lightAngleDelta?: number;
  skyColor?: string;
  ambientIntensityDelta?: number;
}

export interface StreetListItem {
  id: string;
  name: string;
  description: string;
}

export interface UpdateParams {
  buildingColor?: string;
  greeneryDensity?: number;
  lightAngle?: number;
}

export type SplitMode = 'horizontal' | 'vertical' | 'overlay';

export interface SceneState {
  buildingColor: string;
  greeneryDensity: number;
  lightAngle: number;
  splitMode: SplitMode;
  splitPosition: number;
  animationProgress: number;
}

export const COLOR_PRESETS: { name: string; value: string }[] = [
  { name: '复古棕', value: '#8B4513' },
  { name: '砖红色', value: '#B22222' },
  { name: '石灰白', value: '#F5F5DC' },
  { name: '青瓦灰', value: '#708090' },
  { name: '暖黄', value: '#FFD700' },
];

export const GREENERY_DENSITY_RANGE = { min: 0, max: 100, step: 1 };
export const LIGHT_ANGLE_RANGE = { min: -90, max: 90, step: 1 };
export const ANIMATION_PROGRESS_RANGE = { min: 0, max: 100, step: 1 };
