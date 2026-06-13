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
  private interpolatorU: d3.ScaleLinear<number, number> | null = null;
  private interpolatorV: d3.ScaleLinear<number, number> | null = null;
  private interpolatorW: d3.ScaleLinear<number, number> | null = null;
  private scale: d3.ScaleLinear<number, number> | null = null;

  public async loadWindData(): Promise<WindData> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const data = this.generateTyphoonData();
        this.windData = data;
        this.setupInterpolators();
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

          const angle = Math.atan2(dy, dx);
          const rotationAngle = angle + Math.PI / 2 + (Math.random() - 0.5