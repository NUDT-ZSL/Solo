import * as THREE from 'three';

export interface HeatDataPoint {
  id: number;
  position: THREE.Vector3;
  heatValue: number;
  regionName: string;
}

export interface BuildingMesh extends THREE.Mesh {
  userData: {
    heatData: HeatDataPoint;
    originalEmissiveIntensity: number;
    isHovered: boolean;
    isSelected: boolean;
    isBlinking: boolean;
    blinkPhase: number;
    labelElement?: HTMLElement;
  };
}

export interface Particle {
  mesh: THREE.Mesh;
  active: boolean;
  life: number;
  maxLife: number;
  velocity: THREE.Vector3;
}
