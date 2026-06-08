import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';

export class TerrainGenerator {
  private mesh: THREE.Mesh;
  private geometry: THREE.PlaneGeometry;
  private heightScale: number;
  private terrainSize: number;
  private segments: number;
  private noise2D: (x: number, y: number) => number;
  private heightData: Float32Array;

  constructor(size: number = 80, segments: number = 100, heightScale: number = 2) {
    this.terrainSize = size;
    this.segments = segments;
    this.heightScale = heightScale;
    this.noise2D = createNoise2D();

    this.geometry = new THREE.PlaneGeometry(size, size, segments, segments);
    this.geometry.rotateX(-Math.PI / 2);

    const vertexCount = (segments + 1) * (segments + 1);
    this.heightData = new Float32Array(vertexCount);

    this.generateHeightMap();
    this.applyHeightMap();
    this.applyVertexColors();

    const material = new THREE.MeshLambertMaterial({
      vertexColors: true,
      flatShading: true,
    });

    this.mesh = new THREE.Mesh(this.geometry, material);
    this.mesh.receiveShadow = true;
    this.mesh.castShadow = true;
  }

  private generateHeightMap(): void {
    const positions = this.geometry.attributes.position;
    const count = positions.count;

    for (let i = 0; i < count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);

      const nx = x / this.terrainSize;
      const nz = z / this.terrainSize;

      let height = 0;
      height += this.noise2D(nx * 4, nz * 4) * 0.5;
      height += this.noise2D(nx * 8, nz * 8) * 0.25;
      height += this.noise2D(nx * 16, nz * 16) * 0.125;

      height *= this.heightScale;

      this.heightData[i] = height;
    }
  }

  private applyHeightMap(): void {
    const positions = this.geometry.attributes.position;

    for (let i = 0; i < positions.count; i++) {
      positions.setY(i, this.heightData[i]);
    }

    positions.needsUpdate = true;
    this.geometry.computeVertexNormals();
  }

  private applyVertexColors(): void {
    const positions = this.geometry.attributes.position;
    const count = positions.count;
    const colors = new Float32Array(count * 3);

    const colorLow = new THREE.Color('#4CAF50');
    const colorMid = new THREE.Color('#8BC34A');
    const colorHigh = new THREE.Color('#F5F5F5');

    for (let i = 0; i < count; i++) {
      const y = positions.getY(i);
      const normalizedHeight = (y + this.heightScale) / (this.heightScale * 2);
      const t = THREE.MathUtils.clamp(normalizedHeight, 0, 1);

      const color = new THREE.Color();
      if (t < 0.4) {
        color.lerpColors(colorLow, colorMid, t / 0.4);
      } else {
        color.lerpColors(colorMid, colorHigh, (t - 0.4) / 0.6);
      }

      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  }

  deform(worldPos: THREE.Vector3, radius: number, strength: number, mode: 'raise' | 'flatten'): void {
    const positions = this.geometry.attributes.position;
    const meshWorldPos = new THREE.Vector3();
    this.mesh.getWorldPosition(meshWorldPos);

    const localX = worldPos.x - meshWorldPos.x;
    const localZ = worldPos.z - meshWorldPos.z;

    let avgHeight = 0;
    let affectedCount = 0;

    if (mode === 'flatten') {
      for (let i = 0; i < positions.count; i++) {
        const px = positions.getX(i);
        const pz = positions.getZ(i);
        const dist = Math.sqrt((px - localX) ** 2 + (pz - localZ) ** 2);
        if (dist < radius) {
          avgHeight += positions.getY(i);
          affectedCount++;
        }
      }
      if (affectedCount > 0) avgHeight /= affectedCount;
    }

    for (let i = 0; i < positions.count; i++) {
      const px = positions.getX(i);
      const pz = positions.getZ(i);
      const dist = Math.sqrt((px - localX) ** 2 + (pz - localZ) ** 2);

      if (dist < radius) {
        const falloff = 1 - (dist / radius);
        const smoothFalloff = falloff * falloff * (3 - 2 * falloff);

        if (mode === 'raise') {
          const newHeight = positions.getY(i) + strength * smoothFalloff;
          positions.setY(i, newHeight);
          this.heightData[i] = newHeight;
        } else {
          const currentHeight = positions.getY(i);
          const diff = avgHeight - currentHeight;
          const newHeight = currentHeight + diff * smoothFalloff * strength * 0.3;
          positions.setY(i, newHeight);
          this.heightData[i] = newHeight;
        }
      }
    }

    positions.needsUpdate = true;
    this.geometry.computeVertexNormals();
    this.applyVertexColors();
  }

  getHeightAt(worldX: number, worldZ: number): number {
    const positions = this.geometry.attributes.position;
    const meshWorldPos = new THREE.Vector3();
    this.mesh.getWorldPosition(meshWorldPos);

    const localX = worldX - meshWorldPos.x;
    const localZ = worldZ - meshWorldPos.z;

    const halfSize = this.terrainSize / 2;
    const stepSize = this.terrainSize / this.segments;

    const col = Math.round((localX + halfSize) / stepSize);
    const row = Math.round((localZ + halfSize) / stepSize);

    if (col < 0 || col > this.segments || row < 0 || row > this.segments) {
      return 0;
    }

    const idx = row * (this.segments + 1) + col;
    if (idx >= 0 && idx < positions.count) {
      return positions.getY(idx);
    }
    return 0;
  }

  setHeightScale(scale: number): void {
    this.heightScale = scale;
    this.generateHeightMap();
    this.applyHeightMap();
    this.applyVertexColors();
  }

  getMesh(): THREE.Mesh {
    return this.mesh;
  }

  getTerrainSize(): number {
    return this.terrainSize;
  }
}
