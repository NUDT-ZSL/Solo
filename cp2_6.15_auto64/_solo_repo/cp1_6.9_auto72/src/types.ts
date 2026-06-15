export interface ClimateData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  light: number;
}

export interface Branch {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  thickness: number;
  depth: number;
}

export interface Leaf {
  x: number;
  y: number;
  radius: number;
  color: string;
}

export interface TreeStructure {
  trunkThickness: number;
  branchAngle: number;
  leafCount: number;
  leafColor: string;
  avgLeafColor: string;
  branches: Branch[];
  leaves: Leaf[];
}

export interface TreeRecord {
  date: string;
  climate: ClimateData;
  tree: TreeStructure;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}
