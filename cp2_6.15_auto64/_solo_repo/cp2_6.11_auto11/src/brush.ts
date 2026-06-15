export interface BrushSettings {
  baseSize: number;
  color: string;
  minOpacity: number;
  maxOpacity: number;
}

export interface BrushPoint {
  x: number;
  y: number;
  width: number;
  opacity: number;
  speed: number;
  timestamp: number;
  pressure: number;
}

export interface StrokePath {
  points: BrushPoint[];
  color: string;
  isComplete: boolean;
}

export interface DryStrokeParticle {
  x: number;
  y: number;
  size: number;
  opacity: number;
}

export interface DiffusionPoint {
  x: number;
  y: number;
  radius: number;
  opacity: number;
  startTime: number;
  duration: number;
}

export interface RenderData {
  stroke: StrokePath;
  dryParticles: DryStrokeParticle[];
  diffusions: DiffusionPoint[];
}

const MIN_WIDTH = 1;
const MAX_WIDTH = 20;
const MIN_OPACITY = 0.3;
const MAX_OPACITY = 1.0;
const SPEED_SMOOTHING = 0.3;
const DIFFUSION_DELAY = 200;
const DIFFUSION_MIN_RADIUS = 3;
const DIFFUSION_MAX_RADIUS = 8;
const DRY_PARTICLE_MAX = 15;

export class BrushEngine {
  private settings: BrushSettings;
  private currentStroke: StrokePath | null = null;
  private lastPoint: BrushPoint | null = null;
  private smoothedSpeed: number = 0;
  private pressStartTime: number = 0;
  private renderCallback: ((data: RenderData) => void) | null = null;

  constructor(settings: Partial<BrushSettings> = {}) {
    this.settings = {
      baseSize: settings.baseSize ?? 10,
      color: settings.color ?? '#1A1A1A',
      minOpacity: settings.minOpacity ?? MIN_OPACITY,
      maxOpacity: settings.maxOpacity ?? MAX_OPACITY
    };
  }

  setSettings(settings: Partial<BrushSettings>): void {
    if (settings.baseSize !== undefined) {
      this.settings.baseSize = Math.max(1, Math.min(50, settings.baseSize));
    }
    if (settings.color !== undefined) {
      this.settings.color = settings.color;
    }
    if (settings.minOpacity !== undefined) {
      this.settings.minOpacity = settings.minOpacity;
    }
    if (settings.maxOpacity !== undefined) {
      this.settings.maxOpacity = settings.maxOpacity;
    }
  }

  getSettings(): BrushSettings {
    return { ...this.settings };
  }

  onRender(callback: (data: RenderData) => void): void {
    this.renderCallback = callback;
  }

  startStroke(x: number, y: number, pressure: number = 0.5): void {
    this.pressStartTime = performance.now();
    this.smoothedSpeed = 0;

    const point = this.createPoint(x, y, pressure, 0);
    this.currentStroke = {
      points: [point],
      color: this.settings.color,
      isComplete: false
    };
    this.lastPoint = point;

    this.emitRender([]);
  }

  moveStroke(x: number, y: number, pressure: number = 0.5): void {
    if (!this.currentStroke || !this.lastPoint) return;

    const now = performance.now();
    const dt = Math.max(1, now - this.lastPoint.timestamp);
    const dx = x - this.lastPoint.x;
    const dy = y - this.lastPoint.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const rawSpeed = distance / dt;

    this.smoothedSpeed = this.smoothedSpeed * (1 - SPEED_SMOOTHING) + rawSpeed * SPEED_SMOOTHING;

    const point = this.createPoint(x, y, pressure, this.smoothedSpeed);
    this.currentStroke.points.push(point);
    this.lastPoint = point;

    const dryParticles = this.generateDryParticles(point, dx, dy);
    this.emitRender(dryParticles);
  }

  endStroke(x: number, y: number, pressure: number = 0.5): StrokePath | null {
    if (!this.currentStroke) return null;

    const point = this.createPoint(x, y, pressure, 0);
    this.currentStroke.points.push(point);
    this.currentStroke.isComplete = true;

    const dryParticles = this.generateDryParticles(point, 0, 0);
    const diffusions = this.generateDiffusions(this.currentStroke);

    const completedStroke = { ...this.currentStroke };
    this.emitRender(dryParticles, diffusions);

    this.currentStroke = null;
    this.lastPoint = null;

    return completedStroke;
  }

  getCurrentStroke(): StrokePath | null {
    return this.currentStroke;
  }

  private createPoint(x: number, y: number, pressure: number, speed: number): BrushPoint {
    const pressDuration = performance.now() - this.pressStartTime;
    const pressureFactor = this.calculatePressureFactor(pressure, pressDuration);
    const speedFactor = this.calculateSpeedFactor(speed);

    const dynamicWidth = this.calculateWidth(speedFactor, pressureFactor);
    const opacity = this.calculateOpacity(pressureFactor, speedFactor);

    return {
      x,
      y,
      width: dynamicWidth,
      opacity,
      speed,
      timestamp: performance.now(),
      pressure
    };
  }

  private calculateSpeedFactor(speed: number): number {
    const normalizedSpeed = Math.min(1, speed / 2.5);
    return normalizedSpeed;
  }

  private calculatePressureFactor(pressure: number, duration: number): number {
    const timeFactor = Math.min(1, duration / 500);
    return pressure * 0.5 + timeFactor * 0.5;
  }

  private calculateWidth(speedFactor: number, pressureFactor: number): number {
    const baseSize = this.settings.baseSize;
    const minW = Math.max(MIN_WIDTH, baseSize * 0.2);
    const maxW = Math.min(MAX_WIDTH, baseSize);

    const speedInfluence = 1 - speedFactor;
    const pressureInfluence = pressureFactor;

    const t = speedInfluence * 0.6 + pressureInfluence * 0.4;
    return minW + (maxW - minW) * t;
  }

  private calculateOpacity(pressureFactor: number, speedFactor: number): number {
    const t = pressureFactor * 0.7 + (1 - speedFactor) * 0.3;
    return this.settings.minOpacity + (this.settings.maxOpacity - this.settings.minOpacity) * t;
  }

  private generateDryParticles(point: BrushPoint, dx: number, dy: number): DryStrokeParticle[] {
    const particles: DryStrokeParticle[] = [];

    const speedThreshold = 0.3;
    if (point.speed < speedThreshold) return particles;

    const particleCount = Math.min(
      DRY_PARTICLE_MAX,
      Math.floor(point.speed * 15)
    );

    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;

    for (let i = 0; i < particleCount; i++) {
      const offsetAngle = (Math.random() - 0.5) * Math.PI;
      const cosA = Math.cos(offsetAngle);
      const sinA = Math.sin(offsetAngle);
      const perpX = nx * cosA - (dx / len) * sinA;
      const perpY = ny * cosA + (dx / len) * sinA;

      const distance = Math.random() * point.width * 0.8;
      particles.push({
        x: point.x + perpX * distance,
        y: point.y + perpY * distance,
        size: Math.random() * Math.max(1, point.width * 0.15) + 0.5,
        opacity: point.opacity * (0.2 + Math.random() * 0.4)
      });
    }

    return particles;
  }

  private generateDiffusions(stroke: StrokePath): DiffusionPoint[] {
    const diffusions: DiffusionPoint[] = [];
    const points = stroke.points;

    if (points.length < 2) return diffusions;

    const step = Math.max(1, Math.floor(points.length / 20));

    for (let i = 0; i < points.length; i += step) {
      const point = points[i];
      const count = Math.max(1, Math.floor(point.width / 4));

      for (let j = 0; j < count; j++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = point.width * (0.3 + Math.random() * 0.5);

        diffusions.push({
          x: point.x + Math.cos(angle) * dist,
          y: point.y + Math.sin(angle) * dist,
          radius: DIFFUSION_MIN_RADIUS + Math.random() * (DIFFUSION_MAX_RADIUS - DIFFUSION_MIN_RADIUS),
          opacity: point.opacity * (0.05 + Math.random() * 0.1),
          startTime: performance.now() + DIFFUSION_DELAY + Math.random() * 100,
          duration: 300 + Math.random() * 200
        });
      }
    }

    return diffusions;
  }

  private emitRender(dryParticles: DryStrokeParticle[], diffusions: DiffusionPoint[] = []): void {
    if (!this.currentStroke || !this.renderCallback) return;

    this.renderCallback({
      stroke: { ...this.currentStroke },
      dryParticles,
      diffusions
    });
  }

  static hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        }
      : { r: 26, g: 26, b: 26 };
  }
}
