export type RoofType = 'flat' | 'slant' | 'dome' | 'traditional';

export interface Building {
  id: string;
  position: [number, number, number];
  width: number;
  depth: number;
  height: number;
  color: string;
  roofType: RoofType;
}

export interface Tree {
  id: string;
  position: [number, number, number];
  scale: number;
}

export interface StreetLight {
  id: string;
  position: [number, number, number];
  height: number;
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
}

export interface BuildingDiff {
  id: string;
  position?: [number, number, number];
  width?: number;
  depth?: number;
  height?: number;
  color?: string;
  roofType?: RoofType;
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
