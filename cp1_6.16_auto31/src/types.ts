import * as THREE from 'three';

export interface BuildingMetadata {
  id: number;
  width: number;
  depth: number;
  height: number;
  position: { x: number; z: number };
  floors: number;
  windowsCount: number;
  litWindows: number;
  baseColor: THREE.Color;
}

export interface BuildingMesh extends THREE.Mesh {
  userData: {
    buildingId: number;
    metadata: BuildingMetadata;
    isBuilding: boolean;
  };
}

export interface EnvironmentState {
  colorTemperature: number;
  isNight: boolean;
}

export interface BuildingSelectedEvent {
  buildingId: number;
  metadata: BuildingMetadata;
}

export type EventCallback = (data?: unknown) => void;

export interface IEventEmitter {
  on(event: string, callback: EventCallback): void;
  off(event: string, callback: EventCallback): void;
  emit(event: string, data?: unknown): void;
}
