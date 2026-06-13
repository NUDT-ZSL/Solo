import * as d3 from 'd3';

export interface WindData {
  gridSize: { x: number; y: number; z: number };
  bounds: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number };
  u: Float32Array;
  v: Float32Array;
  w: Float32Array;
  speed: Float32Array;
  normalizedSpeed: Float32Array;
  maxSpeed: number;
  minSpeed: number;
}

export interface WindSample {
  u: number;
  v: number;
  w: number;
  speed: number;
  normalizedSpeed: number;
}

const GRID_X = 50;
const GRID_Y = 50;
const GRID_Z = 10;
const BOUNDS = {
  minX: -180,
  maxX: 180,
  minY: -180,
  maxY: 180,
  minZ: 0,
  maxZ: 100
};

class DataLoader {
  private windData: WindData | null = null;
  private gridToWorld: d3.ScaleLinear<number, number>[] = [];

  public async loadWindData(): Promise<WindData> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const data = this.generateTyphoonData();
        this.windData = data;
        this.setupScales();
        resolve(data);
      }, 100);
    });
  }

  private generateTyphoonData(): WindData {
    const totalPoints = GRID_X * GRID_Y * GRID_Z;
    const u = new Float32Array(totalPoints);
    const v = new Float32Array(totalPoints);
    const w = new Float32Array(totalPoints);
    const speed = new Float32Array(totalPoints);
    const normalizedSpeed = new Float32Array(totalPoints);

    const centerX = 0;
    const centerY = 0;
    const eyeRadius = 25;
    const maxWindSpeed = 50;

    let minSpeed = Infinity;
    let maxSpeed = -Infinity;

    for (let z = 0; z < GRID_Z; z++) {
      for (let y = 0; y < GRID_Y; y++) {
        for (let x = 0; x < GRID_X; x++) {
          const idx = z * GRID_X * GRID_Y + y * GRID_X + x;

          const worldX = BOUNDS.minX + (x / (GRID_X - 1)) * (BOUNDS.maxX - BOUNDS.minX);
          const worldY = BOUNDS.minY + (y / (GRID_Y - 1)) * (BOUNDS.maxY - BOUNDS.minY);
          const worldZ = BOUNDS.minZ + (z / (GRID_Z - 1)) * (BOUNDS.maxZ - BOUNDS.minZ);

          const dx = worldX - centerX;
          const dy = worldY - centerY;
          const distance = Math.sqrt(dx * dx + dy * dy);

          const heightFactor = 1 - (worldZ / BOUNDS.maxZ) * 0.4;

          let windSpeed: number;
          if (distance < eyeRadius) {
            windSpeed = (distance / eyeRadius) * maxWindSpeed * 0.3;
          } else {
            const decayFactor = Math.exp(-(distance - eyeRadius) / 80);
            windSpeed = maxWindSpeed * decayFactor * heightFactor;
          }

          windSpeed += (Math.random() - 0.5) * 3;
          windSpeed = Math.max(0, windSpeed);

          const angle = Math.atan2(dy, dx);
          const rotationAngle = angle + Math.PI / 2 + (Math.random() - 0.5) * 0.3;

          u[idx] = Math.cos(rotationAngle) * windSpeed;
          v[idx] = Math.sin(rotationAngle) * windSpeed;

          const eyeWallFactor = Math.exp(-Math.pow((distance - eyeRadius) / 15, 2));
          w[idx] = (Math.sin(distance * 0.05 + worldZ * 0.1) * 2) + eyeWallFactor * 5 * (Math.random() - 0.3);

          const spd = Math.sqrt(u[idx] * u[idx] + v[idx] * v[idx] + w[idx] * w[idx]);
          speed[idx] = spd;

          if (spd < minSpeed) minSpeed = spd;
          if (spd > maxSpeed) maxSpeed = spd;
        }
      }
    }

    const speedRange = maxSpeed - minSpeed || 1;
    for (let i = 0; i < totalPoints; i++) {
      normalizedSpeed[i] = (speed[i] - minSpeed) / speedRange;
    }

    return {
      gridSize: { x: GRID_X, y: GRID_Y, z: GRID_Z },
      bounds: BOUNDS,
      u,
      v,
      w,
      speed,
      normalizedSpeed,
      maxSpeed,
      minSpeed
    };
  }

  private setupScales(): void {
    this.gridToWorld = [
      d3.scaleLinear().domain([0, GRID_X - 1]).range([BOUNDS.minX, BOUNDS.maxX]),
      d3.scaleLinear().domain([0, GRID_Y - 1]).range([BOUNDS.minY, BOUNDS.maxY]),
      d3.scaleLinear().domain([0, GRID_Z - 1]).range([BOUNDS.minZ, BOUNDS.maxZ])
    ];
  }

  private getGridIndex(gx: number, gy: number, gz: number): number {
    const cx = Math.max(0, Math.min(GRID_X - 1, gx));
    const cy = Math.max(0, Math.min(GRID_Y - 1, gy));
    const cz = Math.max(0, Math.min(GRID_Z - 1, gz));
    return cz * GRID_X * GRID_Y + cy * GRID_X + cx;
  }

  private worldToGrid(x: number, y: number, z: number): { gx: number; gy: number; gz: number } {
    const gx = ((x - BOUNDS.minX) / (BOUNDS.maxX - BOUNDS.minX)) * (GRID_X - 1);
    const gy = ((y - BOUNDS.minY) / (BOUNDS.maxY - BOUNDS.minY)) * (GRID_Y - 1);
    const gz = ((z - BOUNDS.minZ) / (BOUNDS.maxZ - BOUNDS.minZ)) * (GRID_Z - 1);
    return { gx, gy, gz };
  }

  public sampleAt(x: number, y: number, z: number): WindSample {
    if (!this.windData) {
      return { u: 0, v: 0, w: 0, speed: 0, normalizedSpeed: 0 };
    }

    const { gx, gy, gz } = this.worldToGrid(x, y, z);

    const gx0 = Math.floor(gx);
    const gy0 = Math.floor(gy);
    const gz0 = Math.floor(gz);
    const gx1 = gx0 + 1;
    const gy1 = gy0 + 1;
    const gz1 = gz0 + 1;

    const tx = gx - gx0;
    const ty = gy - gy0;
    const tz = gz - gz0;

    const interpolate = (field: Float32Array): number => {
      const c000 = field[this.getGridIndex(gx0, gy0, gz0)];
      const c100 = field[this.getGridIndex(gx1, gy0, gz0)];
      const c010 = field[this.getGridIndex(gx0, gy1, gz0)];
      const c110 = field[this.getGridIndex(gx1, gy1, gz0)];
      const c001 = field[this.getGridIndex(gx0, gy0, gz1)];
      const c101 = field[this.getGridIndex(gx1, gy0, gz1)];
      const c011 = field[this.getGridIndex(gx0, gy1, gz1)];
      const c111 = field[this.getGridIndex(gx1, gy1, gz1)];

      const c00 = c000 * (1 - tx) + c100 * tx;
      const c10 = c010 * (1 - tx) + c110 * tx;
      const c01 = c001 * (1 - tx) + c101 * tx;
      const c11 = c011 * (1 - tx) + c111 * tx;

      const c0 = c00 * (1 - ty) + c10 * ty;
      const c1 = c01 * (1 - ty) + c11 * ty;

      return c0 * (1 - tz) + c1 * tz;
    };

    const u = interpolate(this.windData.u);
    const v = interpolate(this.windData.v);
    const w = interpolate(this.windData.w);
    const speed = interpolate(this.windData.speed);
    const normalizedSpeed = interpolate(this.windData.normalizedSpeed);

    return { u, v, w, speed, normalizedSpeed };
  }

  public getWindData(): WindData | null {
    return this.windData;
  }

  public getBounds(): typeof BOUNDS {
    return BOUNDS;
  }
}

export const dataLoader = new DataLoader();
