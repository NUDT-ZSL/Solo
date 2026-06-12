export interface EpicycleConfig {
  id: string;
  radius: number;
  angularVelocity: number;
  phase: number;
  color: string;
}

export interface TracePoint {
  x: number;
  y: number;
  time: number;
  arcLength: number;
}

export interface EpicycleState {
  x: number;
  y: number;
  angle: number;
}

export type PlaybackSpeed = 0.5 | 1 | 2;

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  drawTime: number;
}

export interface EpicycleSystemAPI {
  setConfig(configs: EpicycleConfig[]): void;
  getConfig(): EpicycleConfig[];
  addTracePoint(point: TracePoint): void;
  clearTrace(): void;
  togglePlay(): void;
  setPlaybackSpeed(speed: PlaybackSpeed): void;
  getPlaybackSpeed(): PlaybackSpeed;
  getIsPlaying(): boolean;
  resetView(): void;
  getZoom(): number;
  getEpicycleStates(): EpicycleState[];
  getTracePoints(): TracePoint[];
  getPerformanceMetrics(): PerformanceMetrics;
  exportSVG(): string;
  start(): void;
  stop(): void;
  onZoomChange(callback: (zoom: number) => void): void;
}
