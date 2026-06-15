export const COLORS = [
  '#00f0ff',
  '#ff6b9d',
  '#ffd93d',
  '#6bcb77',
  '#6a4c93',
  '#fca311',
] as const;

export const BG_COLORS = [
  '#0a0e1a',
  '#1a1a2e',
  '#2d2d2d',
  '#ffffff',
] as const;

export interface ParticleConfig {
  count: number;
  colors: string[];
  sizeMin: number;
  sizeMax: number;
  speed: number;
  pathRefreshFrames: number;
  boundsX: [number, number];
  boundsY: [number, number];
  boundsZ: [number, number];
  centerDensityRatio: number;
  centerRange: number;
}

export interface ConnectionConfig {
  maxDistance: number;
  opacityMin: number;
  opacityMax: number;
  maxConnections: number;
  glowEnabled: boolean;
  lineWidth: number;
}

export interface BackgroundConfig {
  mode: 'solid' | 'gradient' | 'stars';
  solidColor: string;
  gradientTop: string;
  gradientBottom: string;
  starCount: number;
}

export interface CameraConfig {
  initialPosition: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  minZoom: number;
  maxZoom: number;
  rotateSpeed: number;
}

export interface StoreState {
  particleConfig: ParticleConfig;
  connectionConfig: ConnectionConfig;
  backgroundConfig: BackgroundConfig;
  setParticleConfig: (config: Partial<ParticleConfig>) => void;
  setConnectionConfig: (config: Partial<ConnectionConfig>) => void;
  setBackgroundConfig: (config: Partial<BackgroundConfig>) => void;
  resetAll: () => void;
}
