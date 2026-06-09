import * as THREE from 'three';
import {
  FurnitureId,
  FurnitureState,
  MaterialConfig,
  StyleId,
  STYLE_PRESETS,
  ROOM_SIZE,
  GRID_SIZE,
} from '../types';

export interface MaterialAnimation {
  mesh: THREE.Mesh;
  fromColor: THREE.Color;
  toColor: THREE.Color;
  fromMetalness: number;
  toMetalness: number;
  fromRoughness: number;
  toRoughness: number;
  startTime: number;
  duration: number;
}

class FurnitureController {
  private furnitureStates: Map<FurnitureId, FurnitureState> = new Map();
  private materialAnimations: MaterialAnimation[] = [];
  private styleTransitionDuration = 800;

  constructor() {
    this.initializeFurniture();
  }

  private initializeFurniture(): void {
    const initialStyle = STYLE_PRESETS[0];

    const defaultPositions: Record<FurnitureId, { position: [number, number, number]; baseY: number }> = {
      sofa: { position: [0, 0.4, -1.2], baseY: 0.4 },
      coffeeTable: { position: [0, 0.2, 0.2], baseY: 0.2 },
      floorLamp: { position: [2.0, 0, -2.0], baseY: 0 },
      shelf: { position: [-2.2, 0, 0], baseY: 0 },
      carpet: { position: [0, 0.005, -0.2], baseY: 0.005 },
    };

    (Object.keys(defaultPositions) as FurnitureId[]).forEach((id) => {
      const { position, baseY } = defaultPositions[id];
      this.furnitureStates.set(id, {
        id,
        position,
        rotation: [0, 0, 0],
        material: initialStyle.furniture[id],
        baseY,
      });
    });
  }

  getAllStates(): FurnitureState[] {
    return Array.from(this.furnitureStates.values());
  }

  getState(id: FurnitureId): FurnitureState | undefined {
    return this.furnitureStates.get(id);
  }

  setFurnitureStyle(styleId: StyleId): void {
    const preset = STYLE_PRESETS.find((s) => s.id === styleId);
    if (!preset) return;

    this.furnitureStates.forEach((state, id) => {
      state.material = { ...preset.furniture[id] };
    });
  }

  queueMaterialAnimation(
    mesh: THREE.Mesh | THREE.Mesh[],
    targetMaterial: MaterialConfig,
  ): void {
    const meshes = Array.isArray(mesh) ? mesh : [mesh];
    const now = performance.now();

    meshes.forEach((m) => {
      const mat = m.material as THREE.MeshStandardMaterial;
      if (!mat || !mat.color) return;

      this.materialAnimations.push({
        mesh: m,
        fromColor: mat.color.clone(),
        toColor: new THREE.Color(targetMaterial.color),
        fromMetalness: mat.metalness ?? 0,
        toMetalness: targetMaterial.metalness,
        fromRoughness: mat.roughness ?? 1,
        toRoughness: targetMaterial.roughness,
        startTime: now,
        duration: this.styleTransitionDuration,
      });
    });
  }

  updateAnimations(): void {
    const now = performance.now();
    this.materialAnimations = this.materialAnimations.filter((anim) => {
      const elapsed = now - anim.startTime;
      const progress = Math.min(elapsed / anim.duration, 1);
      const t = this.easeInOutCubic(progress);

      const mat = anim.mesh.material as THREE.MeshStandardMaterial;
      if (mat && mat.color) {
        mat.color.lerpColors(anim.fromColor, anim.toColor, t);
        if (typeof mat.metalness === 'number') {
          mat.metalness = anim.fromMetalness + (anim.toMetalness - anim.fromMetalness) * t;
        }
        if (typeof mat.roughness === 'number') {
          mat.roughness = anim.fromRoughness + (anim.toRoughness - anim.fromRoughness) * t;
        }
        mat.needsUpdate = true;
      }
      return progress < 1;
    });
  }

  updateFurniturePosition(
    id: FurnitureId,
    x: number,
    z: number,
    snap = false,
  ): [number, number] {
    const state = this.furnitureStates.get(id);
    if (!state) return [x, z];

    const halfW = ROOM_SIZE.width / 2 - 0.3;
    const halfD = ROOM_SIZE.depth / 2 - 0.3;
    let newX = Math.max(-halfW, Math.min(halfW, x));
    let newZ = Math.max(-halfD, Math.min(halfD, z));

    if (snap) {
      newX = Math.round(newX / GRID_SIZE) * GRID_SIZE;
      newZ = Math.round(newZ / GRID_SIZE) * GRID_SIZE;
    }

    state.position[0] = newX;
    state.position[2] = newZ;

    return [newX, newZ];
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  clearAnimations(): void {
    this.materialAnimations = [];
  }
}

export const furnitureController = new FurnitureController();
