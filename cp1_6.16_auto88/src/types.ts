export interface FreqData {
  low: number;
  mid: number;
  high: number;
  spectrum: Uint8Array;
  amplitude: number;
}

export type Mode = 'geometric' | 'particle';

export interface PresetTrack {
  id: string;
  name: string;
  url?: string;
}

export interface CubeState {
  basePositionY: number;
  targetPositionY: number;
  currentRotationSpeed: number;
  targetRotationSpeed: number;
  baseEmissiveIntensity: number;
  targetEmissiveIntensity: number;
  baseColor: string;
  targetColor: string;
  bouncePhase: number;
  region: 'outer' | 'middle' | 'center';
}
