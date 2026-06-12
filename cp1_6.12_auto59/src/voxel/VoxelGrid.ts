import type { Point3D, VoxelData, BoundingBox, CutPlaneState } from '@/types';

export class VoxelGrid {
  public resolution: number;
  public points: Point3D[] = [];
  public boundingBox: BoundingBox;
  public voxelSize: number = 0;
  public voxels: Map<number, VoxelData> = new Map();
  public minDensity: number = 0;
  public maxDensity: number = 0;
  public activeVoxelIndices: Set<number> = new Set();

  constructor(resolution: number = 32) {
    this.resolution = resolution;
    this.boundingBox = { minX: 0, maxX: 1, minY: 0, maxY: 1, minZ: 0, maxZ: 1 };
  }

  public setResolution(resolution: number): void {
    this.resolution = Math.max(8, Math.min(64, resolution));
    if (this.points.length > 0) {
      this.build(this.points);
    }
  }

  public build(points: Point3D[]): void {
    const startTime = performance.now();
    this.points = points;
    this.voxels.clear();
    this.activeVoxelIndices.clear();

    this.computeBoundingBox();
    this.voxelSize = Math.max(
      (this.boundingBox.maxX - this.boundingBox.minX) / this.resolution,
      (this.boundingBox.maxY - this.boundingBox.minY) / this.resolution,
      (this.boundingBox.maxZ - this.boundingBox.minZ) / this.resolution
    );

    const voxelSum: Map<number, { sum: number; count: number }> = new Map();

    for (const p of points) {
      const { i, j, k } = this.pointToVoxel(p.x, p.y, p.z);
      if (i < 0 || i >= this.resolution || j < 0 || j >= this.resolution || k < 0 || k >= this.resolution) {
        continue;
      }
      const idx = this.ijkToIndex(i, j, k);
      if (!voxelSum.has(idx)) {
        voxelSum.set(idx, { sum: 0, count: 0 });
      }
      const entry = voxelSum.get(idx)!;
      entry.sum += p.density;
      entry.count++;
    }

    let minD = Infinity;
    let maxD = -Infinity;

    for (const [idx, entry] of voxelSum) {
      const { i, j, k } = this.indexToIJK(idx);
      const avgDensity = entry.sum / entry.count;
      minD = Math.min(minD, avgDensity);
      maxD = Math.max(maxD, avgDensity);

      const centerX = this.boundingBox.minX + (i + 0.5) * this.voxelSize;
      const centerY = this.boundingBox.minY + (j + 0.5) * this.voxelSize;
      const centerZ = this.boundingBox.minZ + (k + 0.5) * this.voxelSize;

      this.voxels.set(idx, {
        index: idx,
        i, j, k,
        centerX, centerY, centerZ,
        density: avgDensity,
        pointCount: entry.count,
        neighbors: []
      });
      this.activeVoxelIndices.add(idx);
    }

    this.minDensity = minD === Infinity ? 0 : minD;
    this.maxDensity = maxD === -Infinity ? 1 : maxD;
    if (this.maxDensity === this.minDensity) {
      this.maxDensity = this.minDensity + 1;
    }

    for (const voxel of this.voxels.values()) {
      voxel.neighbors = this.computeNeighbors(voxel.i, voxel.j, voxel.k);
    }

    const elapsed = performance.now() - startTime;
    console.log(`[VoxelGrid] Built ${this.voxels.size} voxels in ${elapsed.toFixed(2)}ms`);
  }

  public getVoxel(i: number, j: number, k: number): VoxelData | undefined {
    if (i < 0 || i >= this.resolution || j < 0 || j >= this.resolution || k < 0 || k >= this.resolution) {
      return undefined;
    }
    return this.voxels.get(this.ijkToIndex(i, j, k));
  }

  public getActiveVoxels(): VoxelData[] {
    return Array.from(this.voxels.values()).filter(v => this.activeVoxelIndices.has(v.index));
  }

  public applyCutPlanes(planes: CutPlaneState[]): void {
    this.activeVoxelIndices.clear();
    for (const voxel of this.voxels.values()) {
      let visible = true;
      for (const plane of planes) {
        if (!plane.enabled) continue;
        const pos = plane.axis === 'x' ? voxel.centerX : plane.axis === 'y' ? voxel.centerY : voxel.centerZ;
        const planeMin = plane.axis === 'x' ? this.boundingBox.minX : plane.axis === 'y' ? this.boundingBox.minY : this.boundingBox.minZ;
        const planeMax = plane.axis === 'x' ? this.boundingBox.maxX : plane.axis === 'y' ? this.boundingBox.maxY : this.boundingBox.maxZ;
        const planeWorldPos = planeMin + plane.position * (planeMax - planeMin);
        if (pos < planeWorldPos) {
          visible = false;
          break;
        }
      }
      if (visible) {
        this.activeVoxelIndices.add(voxel.index);
      }
    }
  }

  public resetCutPlanes(): void {
    this.activeVoxelIndices.clear();
    for (const idx of this.voxels.keys()) {
      this.activeVoxelIndices.add(idx);
    }
  }

  public querySphere(cx: number, cy: number, cz: number, radius: number): VoxelData[] {
    const results: VoxelData[] = [];
    const r2 = radius * radius;
    for (const voxel of this.voxels.values()) {
      const dx = voxel.centerX - cx;
      const dy = voxel.centerY - cy;
      const dz = voxel.centerZ - cz;
      if (dx * dx + dy * dy + dz * dz <= r2) {
        results.push(voxel);
      }
    }
    return results;
  }

  private computeBoundingBox(): void {
    if (this.points.length === 0) {
      this.boundingBox = { minX: 0, maxX: 1, minY: 0, maxY: 1, minZ: 0, maxZ: 1 };
      return;
    }
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (const p of this.points) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      minZ = Math.min(minZ, p.z);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
      maxZ = Math.max(maxZ, p.z);
    }
    const pad = 0.05;
    const rangeX = (maxX - minX) * pad || 1;
    const rangeY = (maxY - minY) * pad || 1;
    const rangeZ = (maxZ - minZ) * pad || 1;
    this.boundingBox = {
      minX: minX - rangeX,
      maxX: maxX + rangeX,
      minY: minY - rangeY,
      maxY: maxY + rangeY,
      minZ: minZ - rangeZ,
      maxZ: maxZ + rangeZ
    };
  }

  private pointToVoxel(x: number, y: number, z: number): { i: number; j: number; k: number } {
    const i = Math.floor((x - this.boundingBox.minX) / this.voxelSize);
    const j = Math.floor((y - this.boundingBox.minY) / this.voxelSize);
    const k = Math.floor((z - this.boundingBox.minZ) / this.voxelSize);
    return { i, j, k };
  }

  private ijkToIndex(i: number, j: number, k: number): number {
    return i + j * this.resolution + k * this.resolution * this.resolution;
  }

  private indexToIJK(idx: number): { i: number; j: number; k: number } {
    const i = idx % this.resolution;
    const j = Math.floor((idx / this.resolution) % this.resolution);
    const k = Math.floor(idx / (this.resolution * this.resolution));
    return { i, j, k };
  }

  private computeNeighbors(i: number, j: number, k: number): number[] {
    const neighbors: number[] = [];
    const dirs = [
      [1, 0, 0], [-1, 0, 0],
      [0, 1, 0], [0, -1, 0],
      [0, 0, 1], [0, 0, -1]
    ];
    for (const [di, dj, dk] of dirs) {
      const ni = i + di, nj = j + dj, nk = k + dk;
      if (ni >= 0 && ni < this.resolution && nj >= 0 && nj < this.resolution && nk >= 0 && nk < this.resolution) {
        const nIdx = this.ijkToIndex(ni, nj, nk);
        if (this.voxels.has(nIdx)) {
          neighbors.push(nIdx);
        }
      }
    }
    return neighbors;
  }
}
