import type {
  FractalParams,
  VoxelData,
  SphereHole,
  SliceConfig,
  Julia3DParams,
} from './types';
import { DEFAULT_JULIA_PARAMS } from './types';

interface ColorRGB {
  r: number;
  g: number;
  b: number;
}

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

const clamp = (v: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, v));

const densityToColor = (density: number): ColorRGB => {
  const d = clamp(density, 0, 1);
  if (d < 0.25) {
    const t = d / 0.25;
    return { r: 0, g: lerp(0.02, 0.5, t), b: lerp(0.3, 1, t) };
  } else if (d < 0.5) {
    const t = (d - 0.25) / 0.25;
    return { r: 0, g: lerp(0.5, 1, t), b: lerp(1, 0.6, t) };
  } else if (d < 0.75) {
    const t = (d - 0.5) / 0.25;
    return { r: lerp(0, 0.95, t), g: 1, b: lerp(0.6, 0, t) };
  } else {
    const t = (d - 0.75) / 0.25;
    return { r: lerp(0.95, 0.92, t), g: lerp(1, 0.27, t), b: 0 };
  }
};

export class FractalEngine {
  private juliaParams: Julia3DParams = { ...DEFAULT_JULIA_PARAMS };

  setJuliaParams(params: Partial<Julia3DParams>): void {
    this.juliaParams = { ...this.juliaParams, ...params };
  }

  getJuliaParams(): Julia3DParams {
    return { ...this.juliaParams };
  }

  async generateVoxels(params: FractalParams): Promise<VoxelData> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(this.generateVoxelsSync(params));
      }, 0);
    });
  }

  private generateVoxelsSync(params: FractalParams): VoxelData {
    const { algorithm, iterations, power, escapeRadius, resolution } = params;
    const step = 2.0 / resolution;
    const halfStep = step * 0.5;
    const maxVoxels = resolution * resolution * resolution;
    const positions = new Float32Array(maxVoxels * 3);
    const colors = new Float32Array(maxVoxels * 3);
    const densities = new Float32Array(maxVoxels);
    let count = 0;

    let minX = Infinity,
      maxX = -Infinity;
    let minY = Infinity,
      maxY = -Infinity;
    let minZ = Infinity,
      maxZ = -Infinity;

    const chunkSize = Math.max(1, Math.floor(resolution / 8));

    for (let ix = 0; ix < resolution; ix++) {
      const x = -1.0 + ix * step + halfStep;
      for (let iy = 0; iy < resolution; iy++) {
        const y = -1.0 + iy * step + halfStep;
        for (let iz = 0; iz < resolution; iz += chunkSize) {
          const izEnd = Math.min(resolution, iz + chunkSize);
          for (let izz = iz; izz < izEnd; izz++) {
            const z = -1.0 + izz * step + halfStep;

            let iterResult: { escaped: boolean; iterRatio: number };
            if (algorithm === 'mandelbulb') {
              iterResult = this.iterateMandelbulb(x, y, z, iterations, power, escapeRadius);
            } else {
              iterResult = this.iterateJulia3D(x, y, z, iterations, power, escapeRadius);
            }

            if (!iterResult.escaped) {
              const pi = count * 3;
              positions[pi] = x;
              positions[pi + 1] = y;
              positions[pi + 2] = z;

              const density = iterResult.iterRatio;
              densities[count] = density;
              const col = densityToColor(density);
              colors[pi] = col.r;
              colors[pi + 1] = col.g;
              colors[pi + 2] = col.b;

              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
              if (z < minZ) minZ = z;
              if (z > maxZ) maxZ = z;

              count++;
            }
          }
        }
      }
    }

    return {
      positions: positions.subarray(0, count * 3),
      colors: colors.subarray(0, count * 3),
      densities: densities.subarray(0, count),
      count,
      bounds: {
        minX: Number.isFinite(minX) ? minX : -1,
        maxX: Number.isFinite(maxX) ? maxX : 1,
        minY: Number.isFinite(minY) ? minY : -1,
        maxY: Number.isFinite(maxY) ? maxY : 1,
        minZ: Number.isFinite(minZ) ? minZ : -1,
        maxZ: Number.isFinite(maxZ) ? maxZ : 1,
      },
    };
  }

  private iterateMandelbulb(
    x: number,
    y: number,
    z: number,
    iterations: number,
    power: number,
    escapeRadius: number,
  ): { escaped: boolean; iterRatio: number } {
    let zx = x;
    let zy = y;
    let zz = z;
    let dr = 1;
    let r = 0;

    for (let i = 0; i < iterations; i++) {
      r = Math.sqrt(zx * zx + zy * zy + zz * zz);
      if (r > escapeRadius) {
        return { escaped: true, iterRatio: i / iterations };
      }

      const theta = Math.acos(zz / r);
      const phi = Math.atan2(zy, zx);
      const zr = Math.pow(r, power);
      dr = Math.pow(r, power - 1) * power * dr + 1;

      const sinTheta = Math.sin(theta * power);
      zx = zr * sinTheta * Math.cos(phi * power);
      zy = zr * sinTheta * Math.sin(phi * power);
      zz = zr * Math.cos(theta * power);

      zx += x;
      zy += y;
      zz += z;
    }

    const dist = 0.5 * Math.log(r) * r / dr;
    const iterRatio = clamp(1.0 - dist * 8, 0, 1);
    return { escaped: false, iterRatio };
  }

  private iterateJulia3D(
    x: number,
    y: number,
    z: number,
    iterations: number,
    power: number,
    escapeRadius: number,
  ): { escaped: boolean; iterRatio: number } {
    let zx = x;
    let zy = y;
    let zz = z;
    const { cX, cY, cZ, cW } = this.juliaParams;

    for (let i = 0; i < iterations; i++) {
      const r2 = zx * zx + zy * zy + zz * zz;
      if (r2 > escapeRadius * escapeRadius) {
        return { escaped: true, iterRatio: i / iterations };
      }

      const r = Math.sqrt(r2);
      const theta = Math.acos(zz / Math.max(r, 1e-8));
      const phi = Math.atan2(zy, zx);

      const rp = Math.pow(r, power);
      const sinThetaPow = Math.sin(theta * power);
      const newX = rp * sinThetaPow * Math.cos(phi * power) + cX;
      const newY = rp * sinThetaPow * Math.sin(phi * power) + cY;
      const newZ = rp * Math.cos(theta * power) + cZ + cW;

      zx = newX;
      zy = newY;
      zz = newZ;
    }

    const r = Math.sqrt(zx * zx + zy * zy + zz * zz);
    const iterRatio = clamp(0.3 + 0.7 * (1 - r / 2), 0, 1);
    return { escaped: false, iterRatio };
  }

  applySphereHoles(data: VoxelData, holes: SphereHole[]): VoxelData {
    if (holes.length === 0 || data.count === 0) {
      return { ...data };
    }

    const positions = new Float32Array(data.positions.length);
    const colors = new Float32Array(data.colors.length);
    const densities = new Float32Array(data.densities.length);
    let count = 0;

    let minX = Infinity,
      maxX = -Infinity;
    let minY = Infinity,
      maxY = -Infinity;
    let minZ = Infinity,
      maxZ = -Infinity;

    for (let i = 0; i < data.count; i++) {
      const i3 = i * 3;
      const x = data.positions[i3];
      const y = data.positions[i3 + 1];
      const z = data.positions[i3 + 2];

      let inHole = false;
      for (const hole of holes) {
        const dx = x - hole.center.x;
        const dy = y - hole.center.y;
        const dz = z - hole.center.z;
        if (dx * dx + dy * dy + dz * dz < hole.radius * hole.radius) {
          inHole = true;
          break;
        }
      }

      if (!inHole) {
        const ci = count * 3;
        positions[ci] = x;
        positions[ci + 1] = y;
        positions[ci + 2] = z;
        colors[ci] = data.colors[i3];
        colors[ci + 1] = data.colors[i3 + 1];
        colors[ci + 2] = data.colors[i3 + 2];
        densities[count] = data.densities[i];

        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        if (z < minZ) minZ = z;
        if (z > maxZ) maxZ = z;

        count++;
      }
    }

    return {
      positions: positions.subarray(0, count * 3),
      colors: colors.subarray(0, count * 3),
      densities: densities.subarray(0, count),
      count,
      bounds: {
        minX: Number.isFinite(minX) ? minX : -1,
        maxX: Number.isFinite(maxX) ? maxX : 1,
        minY: Number.isFinite(minY) ? minY : -1,
        maxY: Number.isFinite(maxY) ? maxY : 1,
        minZ: Number.isFinite(minZ) ? minZ : -1,
        maxZ: Number.isFinite(maxZ) ? maxZ : 1,
      },
    };
  }

  computeSliceDensity(
    data: VoxelData,
    config: SliceConfig,
  ): {
    positions: Float32Array;
    colors: Float32Array;
    vertexCount: number;
    planeSize: { width: number; height: number };
    planeCenter: { x: number; y: number; z: number };
  } {
    const resolution = 100;
    const cellCount = resolution * resolution;
    const positions = new Float32Array(cellCount * 3 * 6);
    const colors = new Float32Array(cellCount * 3 * 6);
    const { axis, position } = config;

    const slicePos = position;
    const sliceTolerance = 0.02;

    const range = 2.0;
    const cellSize = range / resolution;

    const { minX, maxX, minY, maxY, minZ, maxZ } = data.bounds;
    const planeWidth = range;
    const planeHeight = range;

    const planeCenter = { x: 0, y: 0, z: 0 };

    switch (axis) {
      case 'x':
        planeCenter.x = slicePos;
        break;
      case 'y':
        planeCenter.y = slicePos;
        break;
      case 'z':
        planeCenter.z = slicePos;
        break;
    }

    let vertexCount = 0;

    for (let u = 0; u < resolution; u++) {
      const uStart = -1.0 + u * cellSize;
      const uCenter = uStart + cellSize * 0.5;
      for (let v = 0; v < resolution; v++) {
        const vStart = -1.0 + v * cellSize;
        const vCenter = vStart + cellSize * 0.5;

        let x = 0,
          y = 0,
          z = 0;
        switch (axis) {
          case 'x':
            x = slicePos;
            y = uCenter;
            z = vCenter;
            break;
          case 'y':
            x = uCenter;
            y = slicePos;
            z = vCenter;
            break;
          case 'z':
            x = uCenter;
            y = vCenter;
            z = slicePos;
            break;
        }

        let density = 0;
        let countNearby = 0;

        for (let i = 0; i < data.count && countNearby < 50; i++) {
          const i3 = i * 3;
          const dx = data.positions[i3] - x;
          const dy = data.positions[i3 + 1] - y;
          const dz = data.positions[i3 + 2] - z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          let axisDist: number;
          switch (axis) {
            case 'x':
              axisDist = Math.abs(dx);
              break;
            case 'y':
              axisDist = Math.abs(dy);
              break;
            case 'z':
              axisDist = Math.abs(dz);
              break;
          }

          if (axisDist < sliceTolerance && dist < cellSize * 1.5) {
            const weight = 1 - dist / (cellSize * 1.5);
            density += data.densities[i] * weight;
            countNearby++;
          }
        }

        if (countNearby > 0) {
          density /= countNearby;
        }

        if (countNearby > 0 || density > 0.05) {
          const col = densityToColor(density);
          col.r = col.r * 0.9 + 0.1;
          col.g = col.g * 0.9 + 0.1;
          col.b = col.b * 0.9 + 0.1;

          let x1 = 0,
            y1 = 0,
            z1 = 0,
            x2 = 0,
            y2 = 0,
            z2 = 0;
          let x3 = 0,
            y3 = 0,
            z3 = 0,
            x4 = 0,
            y4 = 0,
            z4 = 0;

          switch (axis) {
            case 'x':
              x1 = x2 = x3 = x4 = slicePos;
              y1 = uStart;
              z1 = vStart;
              y2 = uStart + cellSize;
              z2 = vStart;
              y3 = uStart + cellSize;
              z3 = vStart + cellSize;
              y4 = uStart;
              z4 = vStart + cellSize;
              break;
            case 'y':
              y1 = y2 = y3 = y4 = slicePos;
              x1 = uStart;
              z1 = vStart;
              x2 = uStart + cellSize;
              z2 = vStart;
              x3 = uStart + cellSize;
              z3 = vStart + cellSize;
              x4 = uStart;
              z4 = vStart + cellSize;
              break;
            case 'z':
              z1 = z2 = z3 = z4 = slicePos;
              x1 = uStart;
              y1 = vStart;
              x2 = uStart + cellSize;
              y2 = vStart;
              x3 = uStart + cellSize;
              y3 = vStart + cellSize;
              x4 = uStart;
              y4 = vStart + cellSize;
              break;
          }

          const addTriangle = (
            ax: number,
            ay: number,
            az: number,
            bx: number,
            by: number,
            bz: number,
            cx: number,
            cy: number,
            cz: number,
          ) => {
            const vi = vertexCount * 3;
            positions[vi] = ax;
            positions[vi + 1] = ay;
            positions[vi + 2] = az;
            colors[vi] = col.r;
            colors[vi + 1] = col.g;
            colors[vi + 2] = col.b;

            positions[vi + 3] = bx;
            positions[vi + 4] = by;
            positions[vi + 5] = bz;
            colors[vi + 3] = col.r;
            colors[vi + 4] = col.g;
            colors[vi + 5] = col.b;

            positions[vi + 6] = cx;
            positions[vi + 7] = cy;
            positions[vi + 8] = cz;
            colors[vi + 6] = col.r;
            colors[vi + 7] = col.g;
            colors[vi + 8] = col.b;
            vertexCount += 3;
          };

          addTriangle(x1, y1, z1, x2, y2, z2, x3, y3, z3);
          addTriangle(x1, y1, z1, x3, y3, z3, x4, y4, z4);
        }
      }
    }

    return {
      positions: positions.subarray(0, vertexCount * 3),
      colors: colors.subarray(0, vertexCount * 3),
      vertexCount,
      planeSize: { width: planeWidth, height: planeHeight },
      planeCenter,
    };
  }
}
