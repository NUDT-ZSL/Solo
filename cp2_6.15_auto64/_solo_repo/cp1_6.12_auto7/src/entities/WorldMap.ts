import { TimePhase, TimeState, WeatherType, WeatherState, CameraState } from '../types.js';

interface Tree {
  x: number;
  y: number;
  size: number;
  seed: number;
}

const TILE_SIZE = 32;

const GROUND_COLORS: Record<TimePhase, string> = {
  [TimePhase.DAWN]: '#9db060',
  [TimePhase.NOON]: '#6b8e4e',
  [TimePhase.DUSK]: '#a08040',
  [TimePhase.NIGHT]: '#1a2540',
};

const GROUND_WEATHER_MOD: Record<WeatherType, { r: number; g: number; b: number; darken: number }> = {
  [WeatherType.SUNNY]: { r: 0, g: 0, b: 0, darken: 1.0 },
  [WeatherType.CLOUDY]: { r: -10, g: -10, b: 5, darken: 0.85 },
  [WeatherType.RAINY]: { r: -25, g: 5, b: -15, darken: 0.65 },
  [WeatherType.SNOWY]: { r: 60, g: 60, b: 70, darken: 0.95 },
};

const TREE_LEAF_COLORS: Record<TimePhase, string> = {
  [TimePhase.DAWN]: '#5a9b4f',
  [TimePhase.NOON]: '#3d8b37',
  [TimePhase.DUSK]: '#4a6b3a',
  [TimePhase.NIGHT]: '#1a2a25',
};

const TREE_WEATHER_MOD: Record<WeatherType, { r: number; g: number; b: number }> = {
  [WeatherType.SUNNY]: { r: 0, g: 0, b: 0 },
  [WeatherType.CLOUDY]: { r: -10, g: -5, b: 0 },
  [WeatherType.RAINY]: { r: -30, g: -5, b: 0 },
  [WeatherType.SNOWY]: { r: 100, g: 100, b: 110 },
};

const EXTREME_WEATHER_MOD = {
  [WeatherType.RAINY]: { r: -10, g: 0, b: +15 },
  [WeatherType.SNOWY]: { r: +30, g: +30, b: +40 },
};

export class WorldMap {
  private cols: number;
  private rows: number;
  private trees: Tree[];

  constructor(cols: number, rows: number) {
    this.cols = cols;
    this.rows = rows;
    this.trees = this.generateTrees(80);
  }

  private generateTrees(count: number): Tree[] {
    const trees: Tree[] = [];
    const mapW = this.cols * TILE_SIZE;
    const mapH = this.rows * TILE_SIZE;

    for (let i = 0; i < count; i++) {
      let x: number, y: number;
      let tries = 0;
      do {
        x = TILE_SIZE * 3 + Math.random() * (mapW - TILE_SIZE * 6);
        y = TILE_SIZE * 3 + Math.random() * (mapH - TILE_SIZE * 6);
        tries++;
      } while (this.isTooCloseToPlayer(x, y) && tries < 10);

      trees.push({
        x,
        y,
        size: 0.7 + Math.random() * 0.6,
        seed: Math.random(),
      });
    }
    return trees;
  }

  private isTooCloseToPlayer(x: number, y: number): boolean {
    const px = (this.cols / 2) * TILE_SIZE;
    const py = (this.rows / 2) * TILE_SIZE;
    return Math.hypot(x - px, y - py) < TILE_SIZE * 4;
  }

  public getTileSize(): number {
    return TILE_SIZE;
  }

  public getWidth(): number {
    return this.cols * TILE_SIZE;
  }

  public getHeight(): number {
    return this.rows * TILE_SIZE;
  }

  public isInside(x: number, y: number): boolean {
    return x >= 0 && x <= this.getWidth() && y >= 0 && y <= this.getHeight();
  }

  public clampPosition(x: number, y: number, radius: number): { x: number; y: number } {
    return {
      x: Math.max(radius, Math.min(this.getWidth() - radius, x)),
      y: Math.max(radius, Math.min(this.getHeight() - radius, y)),
    };
  }

  public update(_deltaTime: number, _timeState: TimeState, _weatherState: WeatherState): void {
  }

  public render(
    ctx: CanvasRenderingContext2D,
    camera: CameraState,
    timeState: TimeState,
    weatherState: WeatherState
  ): void {
    const groundColor = this.getInterpolatedGroundColor(timeState, weatherState);
    const treeColor = this.getInterpolatedTreeColor(timeState, weatherState);

    this.renderGround(ctx, camera, groundColor);
    this.renderGrid(ctx, camera);
    this.renderTrees(ctx, camera, treeColor, timeState, weatherState);
  }

  private renderGround(
    ctx: CanvasRenderingContext2D,
    camera: CameraState,
    color: string
  ): void {
    const startCol = Math.max(0, Math.floor(camera.x / TILE_SIZE) - 1);
    const endCol = Math.min(this.cols - 1, Math.ceil((camera.x + window.innerWidth) / TILE_SIZE) + 1);
    const startRow = Math.max(0, Math.floor(camera.y / TILE_SIZE) - 1);
    const endRow = Math.min(this.rows - 1, Math.ceil((camera.y + window.innerHeight) / TILE_SIZE) + 1);

    ctx.fillStyle = color;
    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const x = col * TILE_SIZE - camera.x;
        const y = row * TILE_SIZE - camera.y;
        const checker = (row + col) % 2 === 0;
        if (checker) {
          ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        } else {
          ctx.fillStyle = this.shiftColor(color, -5);
          ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
          ctx.fillStyle = color;
        }
      }
    }
  }

  private renderGrid(
    ctx: CanvasRenderingContext2D,
    camera: CameraState
  ): void {
    const startCol = Math.max(0, Math.floor(camera.x / TILE_SIZE));
    const endCol = Math.min(this.cols, Math.ceil((camera.x + window.innerWidth) / TILE_SIZE));
    const startRow = Math.max(0, Math.floor(camera.y / TILE_SIZE));
    const endRow = Math.min(this.rows, Math.ceil((camera.y + window.innerHeight) / TILE_SIZE));

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();

    for (let col = startCol; col <= endCol; col++) {
      const x = col * TILE_SIZE - camera.x;
      ctx.moveTo(x, -camera.y);
      ctx.lineTo(x, this.getHeight() - camera.y);
    }
    for (let row = startRow; row <= endRow; row++) {
      const y = row * TILE_SIZE - camera.y;
      ctx.moveTo(-camera.x, y);
      ctx.lineTo(this.getWidth() - camera.x, y);
    }
    ctx.stroke();
  }

  private renderTrees(
    ctx: CanvasRenderingContext2D,
    camera: CameraState,
    baseLeafColor: string,
    timeState: TimeState,
    weatherState: WeatherState
  ): void {
    const sortedTrees = [...this.trees].sort((a, b) => a.y - b.y);

    for (const tree of sortedTrees) {
      const x = tree.x - camera.x;
      const y = tree.y - camera.y;

      if (x < -100 || x > window.innerWidth + 100) continue;
      if (y < -100 || y > window.innerHeight + 100) continue;

      const trunkW = 8 * tree.size;
      const trunkH = 24 * tree.size;
      const crownR = 20 * tree.size;

      ctx.fillStyle = '#5a3d2b';
      ctx.fillRect(x - trunkW / 2, y - trunkH, trunkW, trunkH);

      const phaseWeights = this.calculatePhaseWeights(timeState);
      const weatherWeights = this.calculateWeatherWeights(weatherState);

      let displayLeaf = baseLeafColor;

      displayLeaf = this.applyPhaseInfluence(displayLeaf, timeState, phaseWeights);
      displayLeaf = this.applyWeatherInfluence(displayLeaf, weatherState, weatherWeights);

      if (timeState.phase === TimePhase.NIGHT && weatherState.type === WeatherType.SNOWY) {
        const nightSnowDim = Math.max(0.6, 1 - weatherWeights.snowy * 0.3);
        const rgb = this.hexToRgb(displayLeaf);
        displayLeaf = `rgb(${Math.floor(rgb.r * nightSnowDim)}, ${Math.floor(rgb.g * nightSnowDim)}, ${Math.floor(rgb.b * nightSnowDim)})`;
      }

      if (weatherState.type === WeatherType.SNOWY && weatherWeights.snowy > 0.7) {
        const extremeMod = EXTREME_WEATHER_MOD[WeatherType.SNOWY];
        const intensity = (weatherWeights.snowy - 0.7) / 0.3;
        const rgb = this.hexToRgb(displayLeaf);
        displayLeaf = `rgb(${Math.max(0, Math.min(255, rgb.r + extremeMod.r * intensity))}, ${Math.max(0, Math.min(255, rgb.g + extremeMod.g * intensity))}, ${Math.max(0, Math.min(255, rgb.b + extremeMod.b * intensity))})`;
      }

      if (weatherState.type === WeatherType.RAINY && weatherWeights.rainy > 0.7) {
        const extremeMod = EXTREME_WEATHER_MOD[WeatherType.RAINY];
        const intensity = (weatherWeights.rainy - 0.7) / 0.3;
        const rgb = this.hexToRgb(displayLeaf);
        displayLeaf = `rgb(${Math.max(0, Math.min(255, rgb.r + extremeMod.r * intensity))}, ${Math.max(0, Math.min(255, rgb.g + extremeMod.g * intensity))}, ${Math.max(0, Math.min(255, rgb.b + extremeMod.b * intensity))})`;
      }

      ctx.fillStyle = displayLeaf;
      ctx.beginPath();
      ctx.arc(x, y - trunkH - crownR * 0.3, crownR, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = this.shiftColor(displayLeaf, -10);
      ctx.beginPath();
      ctx.arc(x - crownR * 0.4, y - trunkH - crownR * 0.1, crownR * 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + crownR * 0.4, y - trunkH - crownR * 0.1, crownR * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private calculatePhaseWeights(timeState: TimeState): Record<TimePhase, number> {
    const timeOrder = [TimePhase.DAWN, TimePhase.NOON, TimePhase.DUSK, TimePhase.NIGHT];
    const currentIdx = timeOrder.indexOf(timeState.phase);
    const prevIdx = (currentIdx - 1 + 4) % 4;
    const nextIdx = (currentIdx + 1) % 4;

    const weights: Record<TimePhase, number> = {
      [TimePhase.DAWN]: 0,
      [TimePhase.NOON]: 0,
      [TimePhase.DUSK]: 0,
      [TimePhase.NIGHT]: 0,
    };

    const p = timeState.phaseProgress;
    weights[timeOrder[currentIdx]] = 0.8 + 0.2 * (1 - Math.abs(p - 0.5) * 2);
    if (p < 0.3) {
      weights[timeOrder[prevIdx]] = (0.3 - p) / 0.3 * 0.2;
    }
    if (p > 0.7) {
      weights[timeOrder[nextIdx]] = (p - 0.7) / 0.3 * 0.2;
    }

    return weights;
  }

  private calculateWeatherWeights(weatherState: WeatherState): Record<string, number> {
    const t = weatherState.transitionProgress;
    return {
      sunny: (weatherState.previousType === WeatherType.SUNNY ? (1 - t) : 0) + (weatherState.type === WeatherType.SUNNY ? t : 0),
      cloudy: (weatherState.previousType === WeatherType.CLOUDY ? (1 - t) : 0) + (weatherState.type === WeatherType.CLOUDY ? t : 0),
      rainy: (weatherState.previousType === WeatherType.RAINY ? (1 - t) : 0) + (weatherState.type === WeatherType.RAINY ? t : 0),
      snowy: (weatherState.previousType === WeatherType.SNOWY ? (1 - t) : 0) + (weatherState.type === WeatherType.SNOWY ? t : 0),
    };
  }

  private applyPhaseInfluence(
    color: string,
    timeState: TimeState,
    weights: Record<TimePhase, number>
  ): string {
    let result = color;

    if (weights[TimePhase.DUSK] > 0) {
      result = this.mixColor(result, '#3d2040', weights[TimePhase.DUSK] * 0.35);
    }
    if (weights[TimePhase.NIGHT] > 0) {
      result = this.mixColor(result, '#0a0a1a', weights[TimePhase.NIGHT] * 0.55);
    }
    if (weights[TimePhase.DAWN] > 0) {
      result = this.mixColor(result, '#5a3a2a', weights[TimePhase.DAWN] * 0.25);
    }

    return result;
  }

  private applyWeatherInfluence(
    color: string,
    weatherState: WeatherState,
    weights: Record<string, number>
  ): string {
    let result = color;

    if (weights.rainy > 0) {
      result = this.mixColor(result, '#1a4a2a', weights.rainy * 0.35);
    }
    if (weights.snowy > 0) {
      result = this.mixColor(result, '#d5dbe0', weights.snowy * 0.5);
    }
    if (weights.cloudy > 0) {
      result = this.mixColor(result, '#3a5a40', weights.cloudy * 0.15);
    }

    return result;
  }

  private getInterpolatedGroundColor(
    timeState: TimeState,
    weatherState: WeatherState
  ): string {
    const timeOrder = [TimePhase.DAWN, TimePhase.NOON, TimePhase.DUSK, TimePhase.NIGHT];
    const currentIdx = timeOrder.indexOf(timeState.phase);
    const nextIdx = (currentIdx + 1) % timeOrder.length;
    const currColor = GROUND_COLORS[timeOrder[currentIdx]];
    const nextColor = GROUND_COLORS[timeOrder[nextIdx]];
    const timeBlended = this.mixColor(currColor, nextColor, timeState.phaseProgress * 0.5);

    const prevMod = GROUND_WEATHER_MOD[weatherState.previousType];
    const currMod = GROUND_WEATHER_MOD[weatherState.type];
    const t = weatherState.transitionProgress;
    const blendMod = {
      r: prevMod.r + (currMod.r - prevMod.r) * t,
      g: prevMod.g + (currMod.g - prevMod.g) * t,
      b: prevMod.b + (currMod.b - prevMod.b) * t,
      darken: prevMod.darken + (currMod.darken - prevMod.darken) * t,
    };

    return this.applyWeatherMod(timeBlended, blendMod);
  }

  private getInterpolatedTreeColor(
    timeState: TimeState,
    weatherState: WeatherState
  ): string {
    const timeOrder = [TimePhase.DAWN, TimePhase.NOON, TimePhase.DUSK, TimePhase.NIGHT];
    const currentIdx = timeOrder.indexOf(timeState.phase);
    const nextIdx = (currentIdx + 1) % timeOrder.length;
    const currColor = TREE_LEAF_COLORS[timeOrder[currentIdx]];
    const nextColor = TREE_LEAF_COLORS[timeOrder[nextIdx]];
    const timeBlended = this.mixColor(currColor, nextColor, timeState.phaseProgress * 0.5);

    const prevMod = TREE_WEATHER_MOD[weatherState.previousType];
    const currMod = TREE_WEATHER_MOD[weatherState.type];
    const t = weatherState.transitionProgress;
    const blendMod = {
      r: prevMod.r + (currMod.r - prevMod.r) * t,
      g: prevMod.g + (currMod.g - prevMod.g) * t,
      b: prevMod.b + (currMod.b - prevMod.b) * t,
    };

    const rgb = this.hexToRgb(timeBlended);
    return `rgb(${Math.max(0, Math.min(255, rgb.r + blendMod.r))}, ${Math.max(0, Math.min(255, rgb.g + blendMod.g))}, ${Math.max(0, Math.min(255, rgb.b + blendMod.b))})`;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    if (hex.startsWith('rgb')) {
      const match = hex.match(/\d+/g);
      if (match) {
        return { r: +match[0], g: +match[1], b: +match[2] };
      }
    }
    const h = hex.replace('#', '');
    return {
      r: parseInt(h.substring(0, 2), 16),
      g: parseInt(h.substring(2, 4), 16),
      b: parseInt(h.substring(4, 6), 16),
    };
  }

  private mixColor(color1: string, color2: string, ratio: number): string {
    const c1 = this.hexToRgb(color1);
    const c2 = this.hexToRgb(color2);
    const r = Math.round(c1.r + (c2.r - c1.r) * ratio);
    const g = Math.round(c1.g + (c2.g - c1.g) * ratio);
    const b = Math.round(c1.b + (c2.b - c1.b) * ratio);
    return `rgb(${r}, ${g}, ${b})`;
  }

  private shiftColor(color: string, amount: number): string {
    const c = this.hexToRgb(color);
    return `rgb(${Math.max(0, Math.min(255, c.r + amount))}, ${Math.max(0, Math.min(255, c.g + amount))}, ${Math.max(0, Math.min(255, c.b + amount))})`;
  }

  private applyWeatherMod(
    color: string,
    mod: { r: number; g: number; b: number; darken: number }
  ): string {
    const c = this.hexToRgb(color);
    let r = c.r * mod.darken + mod.r;
    let g = c.g * mod.darken + mod.g;
    let b = c.b * mod.darken + mod.b;
    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));
    return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
  }
}
