export type EmotionType = 'positive' | 'negative' | 'neutral';

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface ParticleData {
  id: string;
  position: Vector3;
  velocity: Vector3;
  baseColor: string;
  size: number;
  clusterId: string;
  brightness: number;
  targetBrightness: number;
  brightnessTransition: number;
}

export interface ClusterData {
  id: string;
  word: string;
  emotion: EmotionType;
  position: Vector3;
  particleIds: string[];
  createdAt: number;
  index: number;
}

export interface ConnectionData {
  id: string;
  fromClusterId: string;
  toClusterId: string;
  strength: number;
  opacity: number;
  targetOpacity: number;
  lineWidth: number;
  targetLineWidth: number;
}

export interface NebulaState {
  text: string;
  clusters: ClusterData[];
  particles: ParticleData[];
  connections: ConnectionData[];
  camera: {
    position: Vector3;
    rotation: { x: number; y: number };
  };
  createdAt: number;
}

export interface CameraState {
  targetRotationX: number;
  targetRotationY: number;
  rotationX: number;
  rotationY: number;
  targetDistance: number;
  distance: number;
  targetPanX: number;
  targetPanY: number;
  panX: number;
  panY: number;
}

export interface HoverInfo {
  type: 'particle' | 'connection' | null;
  clusterId: string | null;
  word: string | null;
  connectionWords: string | null;
  screenX: number;
  screenY: number;
}
