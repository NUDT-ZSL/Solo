import * as THREE from 'three';

export type SilhouetteShapeType = 'humanoid' | 'bird' | 'geometric';

export type ColorPalette = 'bluePurple' | 'pinkPurple' | 'goldOrange';

export const COLOR_PALETTES: Record<ColorPalette, THREE.Color[]> = {
  bluePurple: [
    new THREE.Color(0x6366f1),
    new THREE.Color(0x818cf8),
    new THREE.Color(0x4f46e5),
    new THREE.Color(0x7c3aed),
  ],
  pinkPurple: [
    new THREE.Color(0xc084fc),
    new THREE.Color(0xe879f9),
    new THREE.Color(0xa855f7),
    new THREE.Color(0xd946ef),
  ],
  goldOrange: [
    new THREE.Color(0xf59e0b),
    new THREE.Color(0xfbbf24),
    new THREE.Color(0xf97316),
    new THREE.Color(0xfb923c),
  ],
};

export const ALL_PALETTE_KEYS: ColorPalette[] = ['bluePurple', 'pinkPurple', 'goldOrange'];

export interface SilhouetteState {
  id: string;
  shapeType: SilhouetteShapeType;
  vertices: THREE.Vector2[];
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: number;
  baseColor: THREE.Color;
  glowColor: THREE.Color;
  palette: ColorPalette;
  isHovered: boolean;
  isExpanded: boolean;
  expandProgress: number;
  rotationSpeed: number;
  particleSpreadSpeed: number;
}

export interface ParticleData {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  size: number;
  opacity: number;
  life: number;
  maxLife: number;
  originPosition: THREE.Vector3;
}

export interface BackgroundStar {
  position: THREE.Vector3;
  baseY: number;
  size: number;
  opacity: number;
  phase: number;
  speed: number;
}

export interface GlobalSettings {
  rotationSpeedMultiplier: number;
  particleSpreadMultiplier: number;
}
