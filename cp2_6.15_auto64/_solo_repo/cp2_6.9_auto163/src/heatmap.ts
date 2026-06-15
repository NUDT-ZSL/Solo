export interface HeatPoint {
  x: number;
  y: number;
  concentration: number;
  targetX: number;
  targetY: number;
  alpha: number;
  targetAlpha: number;
}

export interface ViewState {
  offsetX: number;
  offsetY: number;
  zoom: number;
}

const GRID_BASE = 12;
const MAX_CONCENTRATION = 500;

class PerlinNoise {
  private permutation: number[];

  constructor(seed: number = Math.random() * 10000) {
    this.permutation = this.generatePermutation(seed);
  }

  private generatePermutation(seed: number): number[] {
    const p: number[] = [];
    for (let i = 0; i < 256; i++) {
      p[i] = i;
    }
    let s = seed;
    for (let i = 255; i > 0; i--) {
      s = (s * 16807) % 2147483647;
      const j = Math.floor((s / 2147483647) * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    return [...p, ...p];
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
  }

  private grad(hash: number, x: number, y: number): number {
    const h = hash & 3;
    const u = h < 2 ? x : y;
    const v = h < 2 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  noise(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    const u = this.fade(x);
    const v = this.fade(y);
    const A = this.permutation[X] + Y;
    const B = this.permutation[X + 1] + Y;
    return this.lerp(
      this.lerp(this.grad(this.permutation[A], x, y), this.grad(this.permutation[B], x - 1, y), u),
      this.lerp(this.grad(this.permutation[A + 1], x, y - 1), this.grad(this.permutation[B + 1], x - 1, y - 1), u),
      v
    );
  }

  octaveNoise(x: number, y: number, octaves: number = 4, persistence: number = 0.5): number {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;
    for (let i = 0; i < octaves; i++) {
      total += this.noise(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= 2;
    }
    return total / maxValue;
  }
}

export class Heatmap {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private noise: PerlinNoise;
  private points: HeatPoint[] = [];
  private lastSampleTime = 0;
  private sampleInterval = 500;
  private fadeDuration = 300;
  private timeOfDay = 12;
  private targetTimeOfDay = 12;
  private timeTransitionStart = 0;
  private timeTransitionDuration = 500;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.width = canvas.width;
    this.height = canvas.height;
    this.noise = new PerlinNoise(42);
    this.generatePoints();
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  setTimeOfDay(hour: number): void {
    if (hour !== this.timeOfDay) {
      this.targetTimeOfDay = hour;
      this.timeTransitionStart = performance.now();
    }
  }

  private getGridSize(): number {
    return GRID_BASE;
  }

  private getBaseConcentration(normX: number, normY: number): number {
    const industrialX = 0.15;
    const industrialY = 0.15;
    const distIndustrial = Math.sqrt(
      Math.pow(normX - industrialX, 2) + Math.pow(normY - industrialY, 2)
    );
    const industrialValue = Math.max(0, 1 - distIndustrial * 3) * 500;

    const residentialX = 0.5;
    const residentialY = 0.5;
    const distResidential = Math.sqrt(
      Math.pow(normX - residentialX, 2) + Math.pow(normY - residentialY, 2)
    );
    const residentialValue = Math.max(0, 1 - distResidential * 2.5) * 200;

    const parkX = 0.85;
    const parkY = 0.85;
    const distPark = Math.sqrt(
      Math.pow(normX - parkX, 2) + Math.pow(normY - parkY, 2)
    );
    const parkValue = Math.max(0, 1 - distPark * 3) * 50;

    const noiseValue = (this.noise.octaveNoise(normX * 3, normY * 3, 4) + 1) * 0.5;
    const baseNoise = noiseValue * 80;

    let concentration = industrialValue * 0.6 + residentialValue * 0.5 + parkValue * 0.3 + baseNoise;
    concentration = Math.max(0, Math.min(MAX_CONCENTRATION, concentration));

    return concentration;
  }

  private generatePoints(): void {
    const gridSize = this.getGridSize();
    const cellWidth = this.width / gridSize;
    const cellHeight = this.height / gridSize;

    this.points = [];

    for (let gy = 0; gy < gridSize; gy++) {
      for (let gx = 0; gx < gridSize; gx++) {
        const centerX = (gx + 0.5) * cellWidth;
        const centerY = (gy + 0.5) * cellHeight;
        const normX = centerX / this.width;
        const normY = centerY / this.height;

        const offsetX = (Math.random() - 0.5) * cellWidth * 0.6;
        const offsetY = (Math.random() - 0.5) * cellHeight * 0.6;

        const x = centerX + offsetX;
        const y = centerY + offsetY;

        this.points.push({
          x,
          y,
          targetX: x,
          targetY: y,
          concentration: this.getBaseConcentration(normX, normY),
          alpha: 0,
          targetAlpha: 1
        });
      }
    }
  }

  private resamplePoints(): void {
    const gridSize = this.getGridSize();
    const cellWidth = this.width / gridSize;
    const cellHeight = this.height / gridSize;

    let idx = 0;
    for (let gy = 0; gy < gridSize; gy++) {
      for (let gx = 0; gx < gridSize; gx++) {
        const centerX = (gx + 0.5) * cellWidth;
        const centerY = (gy + 0.5) * cellHeight;
        const normX = centerX / this.width;
        const normY = centerY / this.height;

        const offsetX = (Math.random() - 0.5) * cellWidth * 0.6;
        const offsetY = (Math.random() - 0.5) * cellHeight * 0.6;

        const point = this.points[idx];
        point.targetX = centerX + offsetX;
        point.targetY = centerY + offsetY;
        point.concentration = this.getBaseConcentration(normX, normY);
        point.alpha = 0;
        point.targetAlpha = 1;
        idx++;
      }
    }
  }

  private getTimeAdjustedColor(concentration: number, timeHour: number): { r: number; g: number; b: number } {
    const t = Math.min(1, concentration / MAX_CONCENTRATION);

    let r = Math.round(0 + t * 255);
    let g = Math.round(255 - t * 204);
    let b = Math.round(136 - t * 136);

    const timeT = timeHour / 24;
    if (timeHour >= 11 && timeHour <= 14) {
      const noonT = 1 - Math.abs(timeHour - 12.5) / 1.5;
      r = Math.min(255, r + 30 * noonT);
      g = Math.min(255, g + 30 * noonT);
      b = Math.min(255, b + 30 * noonT);
    } else if (timeHour >= 17 && timeHour <= 20) {
      const eveningT = 1 - Math.abs(timeHour - 18.5) / 1.5;
      r = Math.min(255, r + 50 * eveningT);
      g = Math.max(0, g - 20 * eveningT);
      b = Math.max(0, b - 60 * eveningT);
    } else if (timeHour <= 5 || timeHour >= 22) {
      const nightT = timeHour <= 5 ? 1 - timeHour / 5 : (timeHour - 22) / 2;
      r = Math.max(0, r - 40 * nightT);
      g = Math.max(0, g - 30 * nightT);
      b = Math.min(255, b + 60 * nightT);
    }

    return { r, g, b };
  }

  getConcentrationAt(x: number, y: number, view: ViewState): number {
    const mapX = (x - view.offsetX) / view.zoom;
    const mapY = (y - view.offsetY) / view.zoom;

    if (mapX < 0 || mapX > this.width || mapY < 0 || mapY > this.height) {
      return 0;
    }

    const normX = mapX / this.width;
    const normY = mapY / this.height;

    return Math.round(this.getBaseConcentration(normX, normY));
  }

  update(deltaTime: number, now: number): void {
    if (now - this.timeTransitionStart < this.timeTransitionDuration) {
      const t = (now - this.timeTransitionStart) / this.timeTransitionDuration;
      this.timeOfDay = this.timeOfDay + (this.targetTimeOfDay - this.timeOfDay) * t;
    } else {
      this.timeOfDay = this.targetTimeOfDay;
    }

    if (now - this.lastSampleTime >= this.sampleInterval) {
      this.resamplePoints();
      this.lastSampleTime = now;
    }

    for (const point of this.points) {
      point.x += (point.targetX - point.x) * 0.1;
      point.y += (point.targetY - point.y) * 0.1;
      if (point.alpha < point.targetAlpha) {
        point.alpha = Math.min(point.targetAlpha, point.alpha + deltaTime / this.fadeDuration);
      }
    }
  }

  render(ctx: CanvasRenderingContext2D, view: ViewState): void {
    ctx.save();
    ctx.translate(view.offsetX, view.offsetY);
    ctx.scale(view.zoom, view.zoom);

    for (const point of this.points) {
      const color = this.getTimeAdjustedColor(point.concentration, this.timeOfDay);
      const alpha = Math.min(1, point.concentration / MAX_CONCENTRATION) * point.alpha * 0.85;

      const radius = 30 + (point.concentration / MAX_CONCENTRATION) * 50;

      const gradient = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, radius);
      gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`);
      gradient.addColorStop(0.5, `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha * 0.5})`);
      gradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  getTimeOfDay(): number {
    return this.timeOfDay;
  }
}
