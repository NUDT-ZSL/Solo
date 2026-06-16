export interface SequenceParams {
  TR: number;
  TE: number;
  flipAngle: number;
}

export interface KspacePoint {
  x: number;
  y: number;
  value: number;
  phase: number;
}

export interface ImageData {
  width: number;
  height: number;
  pixels: Uint8ClampedArray;
}

export interface ProtonData {
  x: number;
  y: number;
  z: number;
  phase: number;
  frequency: number;
  color: string;
}
