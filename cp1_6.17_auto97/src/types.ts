export type PresetType = 'spiral' | 'elliptical' | 'irregular';

export interface NebulaParams {
  density: number;
  hueOffset: number;
  sizeScale: number;
  rotationSpeed: number;
  brightness: number;
  opacityBase: number;
  primaryColor: string;
  preset: PresetType;
}

export interface ParticleData {
  position: { x: number; y: number; z: number };
  color: { r: number; g: number; b: number };
  size: number;
  opacity: number;
}

export interface NebulaState extends NebulaParams {
  setDensity: (value: number) => void;
  setHueOffset: (value: number) => void;
  setSizeScale: (value: number) => void;
  setRotationSpeed: (value: number) => void;
  setBrightness: (value: number) => void;
  setOpacityBase: (value: number) => void;
  setPrimaryColor: (value: string) => void;
  setPreset: (preset: PresetType) => void;
}
