export interface BuildingConfig {
  density: number;
  minHeight: number;
  maxHeight: number;
  randomness: number;
}

export interface TimeConfig {
  hour: number;
  autoRotate: boolean;
}

export interface BuildingData {
  id: string;
  position: { x: number; z: number };
  dimensions: { width: number; depth: number; height: number };
  rotation: number;
  roofStyle: 'flat' | 'slope' | 'spire' | 'dome';
  color: number;
}

export type EventCallback = (data: any) => void;

export interface AppEvents {
  'config:building': BuildingConfig;
  'config:time': TimeConfig;
  'config:autoRotate': boolean;
  'action:export': void;
  'buildings:updated': BuildingData[];
  'time:updated': TimeConfig;
}
