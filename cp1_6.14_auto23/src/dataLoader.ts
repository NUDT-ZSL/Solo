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
  private worldToGridX: d3.ScaleLinear<number, number>;
  private worldToGridY: d3.ScaleLinear<number, number>;
  private worldToGridZ: d3.ScaleLinear<number, number>;
  private gridToWorldX: d3.ScaleLinear<number, number>;
  private gridToWorldY: d3.ScaleLinear<number, number>;
  private gridToWorldZ: d3.ScaleLinear<number, number>;
  private speedNormalizer: d3.ScaleLinear<number, number>;
  private trilinearInterpolator: ((x: number, y: number, z: number) => WindSample) | null = null;

  constructor() {
    this.worldToGridX = d3.scaleLinear()
      .domain([BOUNDS.minX, BOUNDS.maxX])
      .range([0, GRID_X - 1])
      .clamp(true);

    this.worldToGridY = d3.scaleLinear()
      .domain([BOUNDS.minY, BOUNDS.maxY])
      .range([0, GRID_Y - 1])
      .clamp(true);

    this.worldToGridZ = d3.scaleLinear()
      .domain([BOUNDS.minZ, BOUNDS.maxZ])
      .range([0, GRID_Z - 1])
      .clamp(true);

    this.gridToWorldX = d3.scaleLinear()
      .domain([0, GRID_X - 1])
      .range([BOUNDS.minX, BOUNDS.maxX]);

    this.gridToWorldY = d3.scaleLinear()
      .domain([0, GRID_Y - 1])
      .range([BOUNDS.minY, BOUNDS.maxY]);

    this.gridToWorldZ = d3.scaleLinear()
      .domain([0, GRID_Z - 1])
      .range([BOUNDS.minZ, BOUNDS.maxZ]);

    this.speedNormalizer = d3.scaleLinear()
      .domain([0, 50])
      .range([0, 1])
      .clamp(true);
  }

  public async loadWindData(): Promise<WindData> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const data = this.generateTyphoonData();
        this.windData = data;

        this.speedNormalizer = d3.scaleLinear()
          .domain([data.minSpeed, data.maxSpeed])
          .range([0, 1])
          .clamp(true);

        this.buildInterpolator();
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

    const angleInterpolator = d3.interpolateNumber(-Math.PI, Math.PI);
    const radialInterpolator = d3.interpolateBasis([0, 0.3, 0.9, 1.0, 0.9, 0.5, 0.2]);
    const heightInterpolator = d3.interpolateNumber(1, 0.6);

    let minSpeed = Infinity;
    let maxSpeed = -Infinity;

    for (let z = 0; z < GRID_Z; z++) {
      for (let y = 0; y < GRID_Y; y++) {
        for (let x = 0; x < GRID_X; x++) {
          const idx = z * GRID_X * GRID_Y + y * GRID_X + x;

          const worldX = this.gridToWorldX(x);
          const worldY = this.gridToWorldY(y);
          const worldZ = this.gridToWorldZ(z);

          const dx = worldX - centerX;
          const dy = worldY - centerY;
          const distance = Math.sqrt(dx * dx + dy * dy);

          const normalizedDist = Math.min(1, distance / 180);
          const normalizedHeight = worldZ / BOUNDS.maxZ;

          const heightFactor = heightInterpolator(normalizedHeight);

          let radialFactor: number;
          if (distance < eyeRadius) {
            radialFactor = (distance / eyeRadius) * 0.3;
          } else {
            const eyeWallT = Math.min(1, (distance - eyeRadius) / 150);
            radialFactor = radialInterpolator(eyeWallT);
          }

          const baseAngle = Math.atan2(dy, dx);
          const swirlOffset = d3.interpolateNumber(Math.PI / 2, Math.PI / 2.5)(normalizedHeight);
          const noiseAngle = (Math.sin(x * 0.3 + y * 0.2 + z * 0.5) * 0.15 +
            Math.cos(x * 0.15 - y * 0.25) * 0.1);
          const rotationAngle = angleInterpolator(
            ((baseAngle + swirlOffset + noiseAngle + Math.PI) / (2 * Math.PI)) % 1
          );

          const windSpeed = maxWindSpeed * radialFactor * heightFactor;

          u[idx] = Math.cos(rotationAngle) * windSpeed;
          v[idx] = Math.sin(rotationAngle) * windSpeed;

          const eyeWallT = Math.exp(-Math.pow((distance - eyeRadius) / 15, 2));
          const verticalOscillation = Math.sin(distance * 0.05 + worldZ * 0.1) * 2;
          const verticalNoise = d3.interpolateNumber(-1, 1)(
            (Math.sin(x * 0.2 + z * 0.3) + Math.cos(y * 0.25 - z * 0.15)) / 2 + 0.5
          );
          w[idx] = verticalOscillation + eyeWallT * 5 * verticalNoise;

          const spd = Math.sqrt(u[idx] * u[idx] + v[idx] * v[idx] + w[idx] * w[idx]);
          speed[idx] = spd;

          if (spd < minSpeed) minSpeed = spd;
          if (spd > maxSpeed) maxSpeed = spd;
        }
      }
    }

    for (let i = 0; i < totalPoints; i++) {
      normalizedSpeed[i] = this.speedNormalizer(speed[i]);
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

  private buildInterpolator(): void {
    if (!this.windData) return;

    const getGridValue = (field: Float32Array, gx: number, gy: number, gz: number): number => {
      const cx = Math.max(0, Math.min(GRID_X - 1, Math.round(gx)));
      const cy = Math.max(0, Math.min(GRID_Y - 1, Math.round(gy)));
      const cz = Math.max(0, Math.min(GRID_Z - 1, Math.round(gz)));
      return field[cz * GRID_X * GRID_Y + cy * GRID_X + cx];
    };

    this.trilinearInterpolator = (worldX: number, worldY: number, worldZ: number): WindSample => {
      const gx = this.worldToGridX(worldX);
      const gy = this.worldToGridY(worldY);
      const gz = this.worldToGridZ(worldZ);

      const gx0 = Math.floor(gx);
      const gy0 = Math.floor(gy);
      const gz0 = Math.floor(gz);
      const gx1 = Math.min(GRID_X - 1, gx0 + 1);
      const gy1 = Math.min(GRID_Y - 1, gy0 + 1);
      const gz1 = Math.min(GRID_Z - 1, gz0 + 1);

      const tx = d3.interpolateNumber(0, 1)(gx - gx0);
      const ty = d3.interpolateNumber(0, 1)(gy - gy0);
      const tz = d3.interpolateNumber(0, 1)(gz - gz0);

      const interpolateField = (field: Float32Array): number => {
        const c000 = getGridValue(field, gx0, gy0, gz0);
        const c100 = getGridValue(field, gx1, gy0, gz0);
        const c010 = getGridValue(field, gx0, gy1, gz0);
        const c110 = getGridValue(field, gx1, gy1, gz0);
        const c001 = getGridValue(field, gx0, gy0, gz1);
        const c101 = getGridValue(field, gx1, gy0, gz1);
        const c011 = getGridValue(field, gx0, gy1, gz1);
        const c111 = getGridValue(field, gx1, gy1, gz1);

        const xInterp = d3.interpolateNumber;

        const c00 = xInterp(c000, c100)(tx);
        const c10 = xInterp(c010, c110)(tx);
        const c01 = xInterp(c001, c101)(tx);
        const c11 = xInterp(c011, c111)(tx);

        const c0 = xInterp(c00, c10)(ty);
        const c1 = xInterp(c01, c11)(ty);

        return xInterp(c0, c1)(tz);
      };

      const data = this.windData!;
      const uVal = interpolateField(data.u);
      const vVal = interpolateField(data.v);
      const wVal = interpolateField(data.w);
      const speedVal = interpolateField(data.speed);
      const normalizedVal = this.speedNormalizer(speedVal);

      return {
        u: uVal,
        v: vVal,
        w: wVal,
        speed: speedVal,
        normalizedSpeed: normalizedVal
      };
    };
  }

  public sampleAt(x: number, y: number, z: number): WindSample {
    if (!this.windData || !this.trilinearInterpolator) {
      return { u: 0, v: 0, w: 0, speed: 0, normalizedSpeed: 0 };
    }
    return this.trilinearInterpolator(x, y, z);
  }

  public getWindData(): WindData | null {
    return this.windData;
  }

  public getBounds(): typeof BOUNDS {
    return BOUNDS;
  }

  public getSpeedNormalizer(): d3.ScaleLinear<number, number> {
    return this.speedNormalizer;
  }
}

export const dataLoader = new DataLoader();
