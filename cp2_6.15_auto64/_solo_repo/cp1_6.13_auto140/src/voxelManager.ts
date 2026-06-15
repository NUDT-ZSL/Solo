import * as THREE from 'three';

export interface VoxelData {
  x: number;
  y: number;
  z: number;
  color: string;
}

interface HistoryAction {
  type: 'place' | 'paint' | 'erase';
  voxel: VoxelData;
  previousColor?: string;
}

type VoxelMapKey = string;

export class VoxelManager {
  private scene: THREE.Scene;
  private voxelMap: Map<VoxelMapKey, { data: VoxelData; mesh: THREE.Mesh }> = new Map();
  private history: HistoryAction[] = [];
  private geometry: THREE.BoxGeometry;

  public readonly GRID_SIZE = 36;
  public readonly HALF_GRID = 18;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.geometry = new THREE.BoxGeometry(1, 1, 1);
  }

  private key(x: number, y: number, z: number): VoxelMapKey {
    return `${x},${y},${z}`;
  }

  private isInBounds(x: number, y: number, z: number): boolean {
    return (
      x >= -this.HALF_GRID && x < this.HALF_GRID &&
      y >= 0 && y < this.GRID_SIZE &&
      z >= -this.HALF_GRID && z < this.HALF_GRID
    );
  }

  private createMesh(color: string): THREE.Mesh {
    const material = new THREE.MeshLambertMaterial({ color });
    const mesh = new THREE.Mesh(this.geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  public getVoxelAt(x: number, y: number, z: number): VoxelData | null {
    const entry = this.voxelMap.get(this.key(x, y, z));
    return entry ? entry.data : null;
  }

  public getMeshAt(x: number, y: number, z: number): THREE.Mesh | null {
    const entry = this.voxelMap.get(this.key(x, y, z));
    return entry ? entry.mesh : null;
  }

  public getAllVoxels(): VoxelData[] {
    return Array.from(this.voxelMap.values()).map(v => v.data);
  }

  public placeVoxel(x: number, y: number, z: number, color: string): boolean {
    if (!this.isInBounds(x, y, z)) return false;
    if (this.voxelMap.has(this.key(x, y, z))) return false;

    const mesh = this.createMesh(color);
    mesh.position.set(x + 0.5, y + 0.5, z + 0.5);
    this.scene.add(mesh);

    const data: VoxelData = { x, y, z, color };
    this.voxelMap.set(this.key(x, y, z), { data, mesh });

    this.history.push({ type: 'place', voxel: data });
    return true;
  }

  public paintVoxel(x: number, y: number, z: number, color: string): boolean {
    const entry = this.voxelMap.get(this.key(x, y, z));
    if (!entry) return false;

    const previousColor = entry.data.color;
    if (previousColor === color) return false;

    entry.data.color = color;
    (entry.mesh.material as THREE.MeshLambertMaterial).color.set(color);

    this.history.push({ type: 'paint', voxel: { ...entry.data }, previousColor });
    return true;
  }

  public eraseVoxel(x: number, y: number, z: number): boolean {
    const entry = this.voxelMap.get(this.key(x, y, z));
    if (!entry) return false;

    const data = { ...entry.data };
    const mesh = entry.mesh;

    const startTime = performance.now();
    const duration = 150;

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const scale = 1 - progress;
      mesh.scale.setScalar(scale);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.scene.remove(mesh);
        (mesh.material as THREE.Material).dispose();
      }
    };
    animate();

    this.voxelMap.delete(this.key(x, y, z));
    this.history.push({ type: 'erase', voxel: data });
    return true;
  }

  public undo(): boolean {
    const action = this.history.pop();
    if (!action) return false;

    const { type, voxel, previousColor } = action;

    if (type === 'place') {
      const entry = this.voxelMap.get(this.key(voxel.x, voxel.y, voxel.z));
      if (entry) {
        this.scene.remove(entry.mesh);
        (entry.mesh.material as THREE.Material).dispose();
        this.voxelMap.delete(this.key(voxel.x, voxel.y, voxel.z));
      }
    } else if (type === 'erase') {
      const mesh = this.createMesh(voxel.color);
      mesh.position.set(voxel.x + 0.5, voxel.y + 0.5, voxel.z + 0.5);
      this.scene.add(mesh);
      this.voxelMap.set(this.key(voxel.x, voxel.y, voxel.z), { data: voxel, mesh });
    } else if (type === 'paint' && previousColor !== undefined) {
      const entry = this.voxelMap.get(this.key(voxel.x, voxel.y, voxel.z));
      if (entry) {
        entry.data.color = previousColor;
        (entry.mesh.material as THREE.MeshLambertMaterial).color.set(previousColor);
      }
    }

    return true;
  }

  public clear(): void {
    for (const [, entry] of this.voxelMap) {
      this.scene.remove(entry.mesh);
      (entry.mesh.material as THREE.Material).dispose();
    }
    this.voxelMap.clear();
    this.history = [];
  }

  public canUndo(): boolean {
    return this.history.length > 0;
  }

  public getVoxelCount(): number {
    return this.voxelMap.size;
  }
}
