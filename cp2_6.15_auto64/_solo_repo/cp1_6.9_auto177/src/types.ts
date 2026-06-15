export interface ControlPoint {
  x: number;
  y: number;
}

export interface HSLParams {
  hue: number;
  saturation: number;
  lightness: number;
}

export interface SceneParams {
  hsl: HSLParams;
  tiltCurve: ControlPoint[];
  rotationCurve: ControlPoint[];
}

export interface PrismData {
  row: number;
  col: number;
  basePosition: [number, number, number];
  currentHeight: number;
  targetHeight: number;
  currentTiltX: number;
  currentTiltZ: number;
  targetTiltX: number;
  targetTiltZ: number;
  rotationSpeed: number;
  currentRotation: number;
  clickAnimation: number;
  neighborTilt: number;
}

export type CurveType = 'tilt' | 'rotation';
