export interface TerrainCell {
  height: number;
  targetHeight: number;
  baseHeight: number;
}

export interface ColorStop {
  height: number;
  color: { r: number; g: number; b: number };
}

export type TerrainUpdateCallback = () => void;

const GRID_SIZE = 20;
const CELL_SIZE = 0.5;
const INITIAL_MIN_HEIGHT = -0.3;
const INITIAL_MAX_HEIGHT = 0.3;

export class TerrainGenerator {
  private gridSize: number;
  private cellSize: number;
  private cells: TerrainCell[][] = [];
  private updateCallback: TerrainUpdateCallback | null = null;
  private animationFrameId: number | null = null;
  private lastUpdateTime: number = 0;
  private updateInterval: number = 1000 / 30;
  private bumpDecay: number = 0.6;
  private colorBlendIntensity: number = 70;
  private terrainScale: number = 1.0;
  private activeBumps: BumpAnimation[] = [];

  readonly colorStops: ColorStop[] = [
    { height: -1.5, color: { r: 0.1, g: 0.14, b: 0.49 } },
    { height: -0.5, color: { r: 0.0, g: 0.41, b: 0.36 } },
    { height: 0, color: { r: 0.18, g: 0.49, b: 0.2 } },
    { height: 0.5, color: { r: 0.51, g: 0.47, b: 0.09 } },
    { height: 1, color: { r: 0.75, g: 0.21, b: 0.05 } },
    { height: 2.5, color: { r: 0.9, g: 0.3, b: 0.05 } },
  ];

  constructor(gridSize: number = GRID_SIZE, cellSize: number = CELL_SIZE) {
    this.gridSize = gridSize;
    this.cellSize = cellSize;
    this.initializeTerrain();
  }

  private initializeTerrain(): void {
    this.cells = [];
    for (let z = 0; z < this.gridSize; z++) {
      const row: TerrainCell[] = [];
      for (let x = 0; x < this.gridSize; x++) {
        const height = INITIAL_MIN_HEIGHT + Math.random() * (INITIAL_MAX_HEIGHT - INITIAL_MIN_HEIGHT);
        row.push({
          height,
          targetHeight: height,
          baseHeight: height,
        });
      }
      this.cells.push(row);
    }
  }

  setUpdateCallback(callback: TerrainUpdateCallback): void {
    this.updateCallback = callback;
  }

  setBumpDecay(decay: number): void {
    this.bumpDecay = decay;
  }

  setColorBlendIntensity(intensity: number): void {
    this.colorBlendIntensity = intensity;
  }

  setTerrainScale(scale: number): void {
    this.terrainScale = scale;
  }

  getGridSize(): number {
    return this.gridSize;
  }

  getCellSize(): number {
    return this.cellSize;
  }

  getCells(): TerrainCell[][] {
    return this.cells;
  }

  getHeightAt(x: number, z: number): number {
    const gridX = Math.floor((x / this.cellSize) + this.gridSize / 2);
    const gridZ = Math.floor((z / this.cellSize) + this.gridSize / 2);

    if (gridX < 0 || gridX >= this.gridSize || gridZ < 0 || gridZ >= this.gridSize) {
      return 0;
    }

    return this.cells[gridZ][gridX].height * this.terrainScale;
  }

  raiseTerrain(centerX: number, centerZ: number, radius: number = 1.5, maxHeight: number = 2.0): void {
    this.addBumpAnimation(centerX, centerZ, radius, maxHeight, 'raise');
  }

  lowerTerrain(centerX: number, centerZ: number, radius: number = 1.5, maxDepth: number = 1.5): void {
    this.addBumpAnimation(centerX, centerZ, radius, maxDepth, 'lower');
  }

  private addBumpAnimation(
    centerX: number,
    centerZ: number,
    radius: number,
    magnitude: number,
    type: 'raise' | 'lower'
  ): void {
    const duration = 1200;
    const startTime = performance.now();

    this.activeBumps.push({
      centerX,
      centerZ,
      radius: radius / this.terrainScale,
      magnitude: type === 'raise' ? magnitude : -magnitude,
      startTime,
      duration,
      type,
    });

    this.startAnimationLoop();
  }

  private startAnimationLoop(): void {
    if (this.animationFrameId !== null) return;

    const animate = (time: number) => {
      if (time - this.lastUpdateTime >= this.updateInterval) {
        this.lastUpdateTime = time;
        this.updateTerrainAnimation(time);

        if (this.updateCallback) {
          this.updateCallback();
        }
      }

      if (this.activeBumps.length > 0) {
        this.animationFrameId = requestAnimationFrame(animate);
      } else {
        this.animationFrameId = null;
      }
    };

    this.animationFrameId = requestAnimationFrame(animate);
  }

  private updateTerrainAnimation(currentTime: number): void {
    const completedBumps: number[] = [];

    for (let i = 0; i < this.activeBumps.length; i++) {
      const bump = this.activeBumps[i];
      const elapsed = currentTime - bump.startTime;
      const progress = Math.min(elapsed / bump.duration, 1);

      const easeOutProgress = 1 - Math.pow(1 - progress, 3);

      if (progress >= 1) {
        completedBumps.push(i);
      }

      this.applyBump(bump, easeOutProgress);
    }

    for (let i = completedBumps.length - 1; i >= 0; i--) {
      this.activeBumps.splice(completedBumps[i], 1);
    }
  }

  private applyBump(bump: BumpAnimation, progress: number): void {
    const halfGrid = this.gridSize / 2;
    const centerGridX = (bump.centerX / this.cellSize) + halfGrid;
    const centerGridZ = (bump.centerZ / this.cellSize) + halfGrid;
    const radiusCells = bump.radius / this.cellSize;

    const minX = Math.max(0, Math.floor(centerGridX - radiusCells));
    const maxX = Math.min(this.gridSize - 1, Math.ceil(centerGridX + radiusCells));
    const minZ = Math.max(0, Math.floor(centerGridZ - radiusCells));
    const maxZ = Math.min(this.gridSize - 1, Math.ceil(centerGridZ + radiusCells));

    for (let z = minZ; z <= maxZ; z++) {
      for (let x = minX; x <= maxX; x++) {
        const dx = x - centerGridX;
        const dz = z - centerGridZ;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist <= radiusCells) {
          const normalizedDist = dist / radiusCells;
          const falloff = Math.pow(1 - normalizedDist, 2);
          const decayFactor = Math.pow(falloff, 1 / this.bumpDecay);
          const heightDelta = bump.magnitude * decayFactor * progress;

          const cell = this.cells[z][x];
          cell.height = cell.baseHeight + heightDelta;
        }
      }
    }
  }

  getColorAtHeight(height: number): { r: number; g: number; b: number } {
    const scaledHeight = height * this.terrainScale;

    for (let i = 0; i < this.colorStops.length - 1; i++) {
      const stop1 = this.colorStops[i];
      const stop2 = this.colorStops[i + 1];

      if (scaledHeight >= stop1.height && scaledHeight <= stop2.height) {
        const t = (scaledHeight - stop1.height) / (stop2.height - stop1.height);
        return this.lerpColor(stop1.color, stop2.color, t);
      }
    }

    if (scaledHeight < this.colorStops[0].height) {
      return this.colorStops[0].color;
    }

    return this.colorStops[this.colorStops.length - 1].color;
  }

  private lerpColor(
    c1: { r: number; g: number; b: number },
    c2: { r: number; g: number; b: number },
    t: number
  ): { r: number; g: number; b: number } {
    const blendFactor = this.colorBlendIntensity / 100;
    const adjustedT = t * blendFactor + (1 - blendFactor) * 0.5;
    return {
      r: c1.r + (c2.r - c1.r) * adjustedT,
      g: c1.g + (c2.g - c1.g) * adjustedT,
      b: c1.b + (c2.b - c1.b) * adjustedT,
    };
  }

  reset(): void {
    this.activeBumps = [];
    this.initializeTerrain();
    if (this.updateCallback) {
      this.updateCallback();
    }
  }

  getTerrainSize(): number {
    return this.gridSize * this.cellSize;
  }
}

interface BumpAnimation {
  centerX: number;
  centerZ: number;
  radius: number;
  magnitude: number;
  startTime: number;
  duration: number;
  type: 'raise' | 'lower';
}
