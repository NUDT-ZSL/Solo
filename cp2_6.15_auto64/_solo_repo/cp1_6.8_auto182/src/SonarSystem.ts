export type Frequency = 'low' | 'mid' | 'high';

export interface SonarReflection {
  originX: number;
  originY: number;
  currentRadius: number;
  maxRadius: number;
  intensityFactor: number;
  opacity: number;
  age: number;
  active: boolean;
  noiseOffset: number;
}

export interface SonarWave {
  id: number;
  originX: number;
  originY: number;
  currentRadius: number;
  maxRadius: number;
  frequency: Frequency;
  intensity: number;
  opacity: number;
  speed: number;
  reflections: SonarReflection[];
  active: boolean;
  hitCells: Set<string>;
  age: number;
}

export interface CellInfo {
  type: number;
  revealed: boolean;
  hitCount: number;
}

export interface InteractionResult {
  row: number;
  col: number;
  type: 'treasure_hit' | 'reef_hit' | 'obstacle_reflect' | 'exit_hit';
}

const MAX_WAVES = 25;
const MAX_REFLECTIONS_PER_WAVE = 5;

export class SonarSystem {
  private waves: SonarWave[] = [];
  private nextWaveId = 0;
  private minReflRadius = 20;

  emitPulse(
    originX: number,
    originY: number,
    frequency: Frequency,
    intensity: number,
    maxDimension: number
  ): SonarWave {
    if (this.waves.length >= MAX_WAVES) {
      const idx = this.waves.findIndex(w => !w.active);
      if (idx >= 0) {
        this.waves.splice(idx, 1);
      } else {
        this.waves.shift();
      }
    }

    const maxRadius = this.calcMaxRadius(frequency, intensity, maxDimension);
    const speed = this.calcSpeed(frequency);

    const wave: SonarWave = {
      id: this.nextWaveId++,
      originX,
      originY,
      currentRadius: 0,
      maxRadius,
      frequency,
      intensity,
      opacity: 1.0,
      speed,
      reflections: [],
      active: true,
      hitCells: new Set(),
      age: 0,
    };

    this.waves.push(wave);
    return wave;
  }

  update(
    dt: number,
    grid: CellInfo[][],
    mapSize: number,
    cellSize: number,
    offsetX: number,
    offsetY: number
  ): InteractionResult[] {
    const results: InteractionResult[] = [];
    this.minReflRadius = cellSize * 0.5;

    for (const wave of this.waves) {
      if (!wave.active) continue;

      wave.age += dt;
      wave.currentRadius += wave.speed * dt;

      const progress = wave.currentRadius / wave.maxRadius;
      wave.opacity = Math.max(0, 1.0 - progress * progress);

      if (wave.currentRadius >= wave.maxRadius || wave.opacity <= 0.01) {
        wave.active = false;
        continue;
      }

      this.detectInteractions(wave, grid, mapSize, cellSize, offsetX, offsetY, results);

      for (const refl of wave.reflections) {
        if (!refl.active) continue;
        refl.age += dt;
        refl.currentRadius += wave.speed * 0.65 * dt;
        const rProgress = refl.currentRadius / refl.maxRadius;
        refl.opacity = Math.max(0, refl.intensityFactor * (1.0 - rProgress * rProgress));
        if (refl.currentRadius >= refl.maxRadius || refl.opacity <= 0.01) {
          refl.active = false;
        }
      }
    }

    this.waves = this.waves.filter(
      w => w.active || w.reflections.some(r => r.active)
    );

    return results;
  }

  getWaves(): SonarWave[] {
    return this.waves;
  }

  clear(): void {
    this.waves = [];
    this.nextWaveId = 0;
  }

  private detectInteractions(
    wave: SonarWave,
    grid: CellInfo[][],
    mapSize: number,
    cellSize: number,
    offsetX: number,
    offsetY: number,
    results: InteractionResult[]
  ): void {
    const tolerance = cellSize * 0.75;
    const rMin = wave.currentRadius - tolerance;
    const rMax = wave.currentRadius + tolerance;

    const minCol = Math.max(0, Math.floor((wave.originX - rMax - offsetX) / cellSize));
    const maxCol = Math.min(mapSize - 1, Math.ceil((wave.originX + rMax - offsetX) / cellSize));
    const minRow = Math.max(0, Math.floor((wave.originY - rMax - offsetY) / cellSize));
    const maxRow = Math.min(mapSize - 1, Math.ceil((wave.originY + rMax - offsetY) / cellSize));

    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        const key = `${row},${col}`;
        if (wave.hitCells.has(key)) continue;

        const cx = offsetX + col * cellSize + cellSize / 2;
        const cy = offsetY + row * cellSize + cellSize / 2;
        const dist = Math.hypot(cx - wave.originX, cy - wave.originY);

        if (dist >= rMin && dist <= rMax) {
          const cell = grid[row][col];
          if (cell.type === 0) continue;

          wave.hitCells.add(key);

          switch (cell.type) {
            case 1:
              this.createReflection(wave, cx, cy, false);
              results.push({ row, col, type: 'obstacle_reflect' });
              break;
            case 2:
              results.push({ row, col, type: 'treasure_hit' });
              break;
            case 3:
              this.createReflection(wave, cx, cy, true);
              results.push({ row, col, type: 'reef_hit' });
              break;
            case 4:
              results.push({ row, col, type: 'exit_hit' });
              break;
          }
        }
      }
    }
  }

  private createReflection(
    wave: SonarWave,
    hitX: number,
    hitY: number,
    isReef: boolean
  ): void {
    if (wave.reflections.length >= MAX_REFLECTIONS_PER_WAVE) return;

    const attenuation = isReef ? 0.2 : 0.35;
    const intensityFactor = attenuation * wave.opacity;
    if (intensityFactor < 0.04) return;

    const remaining = (wave.maxRadius - wave.currentRadius) * (isReef ? 0.25 : 0.4);
    if (remaining < this.minReflRadius) return;

    const noiseOffset = isReef ? (Math.random() - 0.5) * 30 : 0;

    wave.reflections.push({
      originX: hitX + noiseOffset,
      originY: hitY + noiseOffset,
      currentRadius: 0,
      maxRadius: remaining,
      intensityFactor,
      opacity: intensityFactor,
      age: 0,
      active: true,
      noiseOffset,
    });
  }

  private calcMaxRadius(frequency: Frequency, intensity: number, maxDim: number): number {
    const baseRange = maxDim * 0.42;
    const freqMult = frequency === 'low' ? 1.35 : frequency === 'mid' ? 1.0 : 0.72;
    const intMult = 0.45 + (intensity / 100) * 0.55;
    return baseRange * freqMult * intMult;
  }

  private calcSpeed(frequency: Frequency): number {
    return frequency === 'low' ? 190 : frequency === 'mid' ? 270 : 360;
  }
}
