import * as THREE from 'three';
import type { VoxelGrid } from '@voxel/VoxelGrid';
import type { DensityMappingMode, VoxelData } from '@/types';

export class VoxelRenderer {
  public scene: THREE.Scene;
  public voxelGrid: VoxelGrid | null = null;
  public instancedMesh: THREE.InstancedMesh | null = null;
  public probeMesh: THREE.Mesh | null = null;
  public highlightedIndices: Set<number> = new Set();
  public mappingMode: DensityMappingMode = 'linear';
  public probeRadius: number = 1;
  public probeCenter: THREE.Vector3 | null = null;

  private dummy: THREE.Object3D = new THREE.Object3D();
  private colorStops: { t: number; color: THREE.Color }[] = [
    { t: 0.0, color: new THREE.Color(0x2a4a8a) },
    { t: 0.33, color: new THREE.Color(0x2abaff) },
    { t: 0.66, color: new THREE.Color(0xffdd44) },
    { t: 1.0, color: new THREE.Color(0xff4422) }
  ];
  private probePulseTime: number = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public setVoxelGrid(grid: VoxelGrid): void {
    this.voxelGrid = grid;
    this.buildMesh();
  }

  public update(): void {
    if (!this.instancedMesh || !this.voxelGrid) return;
    this.updateInstances();
    this.updateProbeAnimation();
  }

  public updateInstances(): void {
    if (!this.instancedMesh || !this.voxelGrid) return;

    const voxels = Array.from(this.voxelGrid.voxels.values());
    const activeSet = this.voxelGrid.activeVoxelIndices;
    const voxelSize = this.voxelGrid.voxelSize;

    let instanceIndex = 0;
    for (let i = 0; i < voxels.length; i++) {
      const voxel = voxels[i];
      const isActive = activeSet.has(voxel.index);
      const isHighlighted = this.highlightedIndices.has(voxel.index);

      if (!isActive && !isHighlighted) {
        this.dummy.position.set(0, -10000, 0);
        this.dummy.scale.set(0.001, 0.001, 0.001);
      } else {
        this.dummy.position.set(voxel.centerX, voxel.centerY, voxel.centerZ);
        const s = voxelSize * 0.92;
        this.dummy.scale.set(s, s, s);
      }
      this.dummy.updateMatrix();
      this.instancedMesh.setMatrixAt(instanceIndex, this.dummy.matrix);

      if (isHighlighted) {
        const pulseColor = new THREE.Color(0xffffff);
        this.instancedMesh.setColorAt(instanceIndex, pulseColor);
      } else {
        const color = this.getDensityColor(voxel.density);
        this.instancedMesh.setColorAt(instanceIndex, color);
      }

      const material = this.instancedMesh.material as THREE.MeshPhysicalMaterial;
      if (Array.isArray(material) === false) {
        const mat = material as THREE.MeshPhysicalMaterial;
        const alpha = this.getDensityAlpha(voxel.density);
        mat.opacity = isActive ? alpha : alpha * 0.3;
        mat.transparent = true;
      }

      instanceIndex++;
    }

    this.instancedMesh.instanceMatrix.needsUpdate = true;
    if (this.instancedMesh.instanceColor) {
      this.instancedMesh.instanceColor.needsUpdate = true;
    }
  }

  public rebuildMesh(): void {
    this.dispose();
    this.buildMesh();
  }

  public setMappingMode(mode: DensityMappingMode): void {
    this.mappingMode = mode;
    this.updateInstances();
  }

  public setProbe(center: THREE.Vector3 | null, radius: number): void {
    this.probeCenter = center;
    this.probeRadius = radius;
    this.highlightedIndices.clear();

    if (center && this.voxelGrid) {
      const voxels = this.voxelGrid.querySphere(center.x, center.y, center.z, radius * this.voxelGrid.voxelSize);
      for (const v of voxels) {
        this.highlightedIndices.add(v.index);
      }
    }

    this.updateProbeMesh();
    this.updateInstances();
  }

  public dispose(): void {
    if (this.instancedMesh) {
      this.scene.remove(this.instancedMesh);
      this.instancedMesh.geometry.dispose();
      const mat = this.instancedMesh.material;
      if (Array.isArray(mat)) {
        mat.forEach(m => m.dispose());
      } else {
        (mat as THREE.Material).dispose();
      }
      this.instancedMesh = null;
    }
    if (this.probeMesh) {
      this.scene.remove(this.probeMesh);
      this.probeMesh.geometry.dispose();
      (this.probeMesh.material as THREE.Material).dispose();
      this.probeMesh = null;
    }
  }

  private buildMesh(): void {
    if (!this.voxelGrid) return;
    this.dispose();

    const voxelCount = this.voxelGrid.voxels.size;
    if (voxelCount === 0) return;

    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshPhysicalMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      roughness: 0.6,
      metalness: 0.1,
      clearcoat: 0.3,
      clearcoatRoughness: 0.5,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    this.instancedMesh = new THREE.InstancedMesh(geometry, material, voxelCount);
    this.instancedMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(voxelCount * 3), 3);
    this.instancedMesh.frustumCulled = false;
    this.scene.add(this.instancedMesh);

    this.updateInstances();
    this.updateProbeMesh();
  }

  private updateProbeMesh(): void {
    if (this.probeMesh) {
      this.scene.remove(this.probeMesh);
      this.probeMesh.geometry.dispose();
      (this.probeMesh.material as THREE.Material).dispose();
      this.probeMesh = null;
    }

    if (!this.probeCenter || !this.voxelGrid) return;

    const geometry = new THREE.SphereGeometry(this.probeRadius * this.voxelGrid.voxelSize, 32, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.2,
      wireframe: true
    });
    this.probeMesh = new THREE.Mesh(geometry, material);
    this.probeMesh.position.copy(this.probeCenter);
    this.scene.add(this.probeMesh);
    this.probePulseTime = 0;
  }

  private updateProbeAnimation(): void {
    if (!this.probeMesh) return;
    this.probePulseTime += 0.016;
    const pulse = 0.5 + 0.5 * Math.sin((this.probePulseTime / 1.5) * Math.PI * 2);
    const mat = this.probeMesh.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.1 + 0.3 * pulse;
    const scale = 1 + 0.1 * pulse;
    this.probeMesh.scale.set(scale, scale, scale);
  }

  private getDensityColor(density: number): THREE.Color {
    if (!this.voxelGrid) return new THREE.Color(0x888888);
    const t = this.mapDensity(density);
    return this.interpolateColor(t);
  }

  private getDensityAlpha(density: number): number {
    const t = this.mapDensity(density);
    return 0.15 + t * 0.75;
  }

  private mapDensity(density: number): number {
    if (!this.voxelGrid) return 0;
    const { minDensity, maxDensity } = this.voxelGrid;
    if (maxDensity === minDensity) return 0.5;
    let t = (density - minDensity) / (maxDensity - minDensity);
    t = Math.max(0, Math.min(1, t));

    switch (this.mappingMode) {
      case 'log':
        t = Math.log10(1 + 9 * t);
        break;
      case 'exponential':
        t = (Math.pow(10, t) - 1) / 9;
        break;
      case 'linear':
      default:
        break;
    }
    return t;
  }

  private interpolateColor(t: number): THREE.Color {
    if (t <= this.colorStops[0].t) return this.colorStops[0].color.clone();
    if (t >= this.colorStops[this.colorStops.length - 1].t) return this.colorStops[this.colorStops.length - 1].color.clone();

    for (let i = 0; i < this.colorStops.length - 1; i++) {
      const s1 = this.colorStops[i];
      const s2 = this.colorStops[i + 1];
      if (t >= s1.t && t <= s2.t) {
        const localT = (t - s1.t) / (s2.t - s1.t);
        return s1.color.clone().lerp(s2.color, localT);
      }
    }
    return this.colorStops[0].color.clone();
  }
}
