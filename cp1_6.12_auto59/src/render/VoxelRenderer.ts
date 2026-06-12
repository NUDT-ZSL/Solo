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
    const { voxelSizeX, voxelSizeY, voxelSizeZ } = this.voxelGrid;
    const geometry = this.instancedMesh.geometry as THREE.BufferGeometry;
    const colorAttr = geometry.getAttribute('instanceColor') as THREE.InstancedBufferAttribute;
    const alphaAttr = geometry.getAttribute('instanceAlpha') as THREE.InstancedBufferAttribute;

    let instanceIndex = 0;
    for (let i = 0; i < voxels.length; i++) {
      const voxel = voxels[i];
      const isActive = activeSet.has(voxel.index);
      const isHighlighted = this.highlightedIndices.has(voxel.index);

      if (!isActive && !isHighlighted) {
        this.dummy.position.set(voxel.centerX, voxel.centerY, voxel.centerZ);
        this.dummy.scale.set(0.0001, 0.0001, 0.0001);
      } else {
        this.dummy.position.set(voxel.centerX, voxel.centerY, voxel.centerZ);
        const gap = 0.92;
        this.dummy.scale.set(voxelSizeX * gap, voxelSizeY * gap, voxelSizeZ * gap);
      }
      this.dummy.updateMatrix();
      this.instancedMesh.setMatrixAt(instanceIndex, this.dummy.matrix);

      if (isHighlighted) {
        colorAttr.setXYZ(instanceIndex, 1, 1, 1);
        alphaAttr.setX(instanceIndex, 1.0);
      } else {
        const color = this.getDensityColor(voxel.density);
        const alpha = this.getDensityAlpha(voxel.density);
        colorAttr.setXYZ(instanceIndex, color.r, color.g, color.b);
        alphaAttr.setX(instanceIndex, isActive ? alpha : 0.0);
      }

      instanceIndex++;
    }

    this.instancedMesh.instanceMatrix.needsUpdate = true;
    colorAttr.needsUpdate = true;
    alphaAttr.needsUpdate = true;
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
      const avgSize = (this.voxelGrid.voxelSizeX + this.voxelGrid.voxelSizeY + this.voxelGrid.voxelSizeZ) / 3;
      const voxels = this.voxelGrid.querySphere(center.x, center.y, center.z, radius * avgSize);
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
      if (this.instancedMesh.geometry) {
        this.instancedMesh.geometry.dispose();
      }
      const mat = this.instancedMesh.material;
      if (Array.isArray(mat)) {
        mat.forEach(m => m.dispose());
      } else {
        (mat as THREE.Material).dispose();
      }
      if (this.instancedMesh.instanceColor) {
        this.instancedMesh.instanceColor = null as any;
      }
      this.instancedMesh = null;
    }
    if (this.probeMesh) {
      this.scene.remove(this.probeMesh);
      if (this.probeMesh.geometry) {
        this.probeMesh.geometry.dispose();
      }
      const probeMat = this.probeMesh.material;
      if (Array.isArray(probeMat)) {
        probeMat.forEach(m => m.dispose());
      } else {
        (probeMat as THREE.Material).dispose();
      }
      this.probeMesh = null;
    }
  }

  private buildMesh(): void {
    if (!this.voxelGrid) return;
    this.dispose();

    const voxelCount = this.voxelGrid.voxels.size;
    if (voxelCount === 0) return;

    const geometry = new THREE.BoxGeometry(1, 1, 1);

    const material = new THREE.ShaderMaterial({
      vertexShader: `
        attribute vec3 instanceColor;
        attribute float instanceAlpha;
        varying vec3 vColor;
        varying float vAlpha;
        varying vec3 vNormal;

        void main() {
          vColor = instanceColor;
          vAlpha = instanceAlpha;
          vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
          vNormal = normalize(normalMatrix * mat3(instanceMatrix) * normal);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 uLightDir;
        uniform vec3 uLightColor;
        uniform vec3 uAmbientColor;
        varying vec3 vColor;
        varying float vAlpha;
        varying vec3 vNormal;

        void main() {
          if (vAlpha < 0.001) discard;
          vec3 normal = normalize(vNormal);
          vec3 lightDir = normalize(uLightDir);
          float diff = max(dot(normal, lightDir), 0.0);
          vec3 diffuse = uLightColor * diff;
          vec3 ambient = uAmbientColor;
          vec3 finalColor = vColor * (ambient + diffuse);
          float rim = pow(1.0 - abs(dot(normal, vec3(0.0, 0.0, 1.0))), 2.0);
          finalColor += vColor * rim * 0.2;
          gl_FragColor = vec4(finalColor, vAlpha);
        }
      `,
      uniforms: {
        uLightDir: { value: new THREE.Vector3(0.5, 1.0, 0.7).normalize() },
        uLightColor: { value: new THREE.Color(0xffffff).multiplyScalar(0.9) },
        uAmbientColor: { value: new THREE.Color(0x6060a0).multiplyScalar(0.4) }
      },
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    this.instancedMesh = new THREE.InstancedMesh(geometry, material, voxelCount);
    this.instancedMesh.frustumCulled = false;

    const colorAttribute = new THREE.InstancedBufferAttribute(new Float32Array(voxelCount * 3), 3);
    geometry.setAttribute('instanceColor', colorAttribute);

    const alphaAttribute = new THREE.InstancedBufferAttribute(new Float32Array(voxelCount), 1);
    geometry.setAttribute('instanceAlpha', alphaAttribute);

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

    const avgSize = (this.voxelGrid.voxelSizeX + this.voxelGrid.voxelSizeY + this.voxelGrid.voxelSizeZ) / 3;
    const geometry = new THREE.SphereGeometry(this.probeRadius * avgSize, 32, 32);
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
