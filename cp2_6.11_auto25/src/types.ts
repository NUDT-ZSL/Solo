export type ToneStyle = 'soft' | 'bright' | 'dark';

export interface Particle {
  char: string;
  x: number;
  baseY: number;
  offsetY: number;
  fontSize: number;
  colorIndex: number;
  colorPhase: number;
  colorSpeed: number;
  opacity: number;
  scale: number;
  weight: number;
  phase: number;
  frequency: number;
}

export interface AudioData {
  bpm: number;
  bassAmplitude: number;
  midAmplitude: number;
  highAmplitude: number;
  spectrum: Float32Array;
  isPlaying: boolean;
}

export interface ControlParams {
  speed: number;
  particleSize: number;
  toneStyle: ToneStyle;
  isPlaying: boolean;
  hueOffset: number;
}

export interface Star {
  x: number;
  y: number;
  size: number;
  opacity: number;
  twinkleSpeed: number;
  twinklePhase: number;
}

export interface PerfMetrics {
  fps: number;
  frameTime: number;
  minFps: number;
  avgFrameTime: number;
}
