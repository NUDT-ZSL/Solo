export interface PathKeyframe {
  time: number;
  rotation: [number, number, number];
}

export interface PlateData {
  id: string;
  name: string;
  color: string;
  vertices: [number, number, number][];
  path: PathKeyframe[];
}

export interface TimeStamp {
  time: number;
  note: string;
}

export interface EventData {
  id: string;
  name: string;
  description: string;
  duration: number;
  timeStamps: TimeStamp[];
  highlightedPlates?: string[];
  collisionPairs?: [string, string][];
  separationPairs?: [string, string][];
  subductionPairs?: [string, string][];
}

export interface MountainData {
  id: string;
  plateA: string;
  plateB: string;
  position: [number, number, number];
  height: number;
  width: number;
  startTime: number;
  peakTime: number;
  vertexCount: number;
}

export interface SeparationData {
  id: string;
  plateA: string;
  plateB: string;
  position: [number, number, number];
  startTime: number;
  peakTime: number;
}

export interface Statistics {
  collisionCount: number;
  totalMountainArea: number;
  averageVelocity: number;
}

export const PLATE_COLORS = [
  '#ff6b6b',
  '#48dbfb',
  '#feca57',
  '#a29bfe',
  '#55efc4',
  '#fd79a8',
];

export const SPHERE_RADIUS = 5;
export const MAX_TIME = 300;
export const MOUNTAIN_MAX_VERTICES = 5000;
