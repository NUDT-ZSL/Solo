export interface BrushPoint {
  x: number;
  y: number;
  pressure: number;
  speed: number;
  timestamp: number;
}

export interface BrushStroke {
  points: BrushPoint[];
  width: number;
  opacity: number;
  color: string;
}

export interface RenderCommand {
  type: 'stroke' | 'diffusion' | 'feibai';
  x: number;
  y: number;
  width: number;
  opacity: number;
  color: string;
  radius?: number;
  angle?: number;
  points?: { x: number; y: number }[];
  feibaiPoints?: { x: number; y: number; size: number; opacity: number }[];
}

export interface BrushConfig {
  baseSize: number;
  color: string;
  textureType: 'danxuan' | 'sajin' | 'yunlong';
}

export const MAX_SPEED = 2000;
export const MIN_WIDTH = 1;
export const MAX_BRUSH_WIDTH = 20;
export const DIFFUSION_DELAY = 200;
export const DIFFUSION_MIN_RADIUS = 3;
export const DIFFUSION_MAX_RADIUS = 8;
export const MAX_FEIBAI_COUNT = 15;

export class BrushEngine {
  private config: BrushConfig;
  private lastPoint: BrushPoint | null = null;
  private strokeStartTime: number = 0;

  constructor(config: BrushConfig) {
    this.config = config;
  }

  updateConfig(config: Partial<BrushConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): BrushConfig {
    return { ...this.config };
  }

  startStroke(x: number, y: number, pressure: number): void {
    this.lastPoint = null;
    this.strokeStartTime = performance.now();
    const speed = 0;
    const point: BrushPoint = { x, y, pressure, speed, timestamp: performance.now() };
    this.lastPoint = point;
  }

  moveStroke(x: number, y: number, pressure: number): RenderCommand[] {
    if (!this.lastPoint) {
      this.startStroke(x, y, pressure);
      return [];
    }

    const now = performance.now();
    const dx = x - this.lastPoint.x;
    const dy = y - this.lastPoint.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const dt = Math.max(now - this.lastPoint.timestamp, 1);
    const speed = (dist / dt) * 1000;

    const point: BrushPoint = { x, y, pressure, speed, timestamp: now };

    const strokeWidth = this.calculateWidth(speed);
    const strokeOpacity = this.calculateOpacity(pressure);

    const commands: RenderCommand[] = [];

    commands.push({
      type: 'stroke',
      x,
      y,
      width: strokeWidth,
      opacity: strokeOpacity,
      color: this.config.color,
      points: [
        { x: this.lastPoint.x, y: this.lastPoint.y },
        { x, y },
      ],
    });

    const pressureHold = now - this.strokeStartTime;
    if (pressureHold > DIFFUSION_DELAY) {
      const diffusionRadius = this.randomRange(DIFFUSION_MIN_RADIUS, DIFFUSION_MAX_RADIUS);
      const angle = Math.random() * Math.PI * 2;
      commands.push({
        type: 'diffusion',
        x: x + Math.cos(angle) * strokeWidth * 0.5,
        y: y + Math.sin(angle) * strokeWidth * 0.5,
        width: diffusionRadius * 2,
        opacity: strokeOpacity * 0.15,
        color: this.config.color,
        radius: diffusionRadius,
        angle,
      });
    }

    if (speed > MAX_SPEED * 0.4) {
      const feibaiCount = Math.min(
        Math.floor((speed / MAX_SPEED) * MAX_FEIBAI_COUNT),
        MAX_FEIBAI_COUNT
      );
      const feibaiPoints: { x: number; y: number; size: number; opacity: number }[] = [];
      for (let i = 0; i < feibaiCount; i++) {
        const spread = strokeWidth * 1.5;
        feibaiPoints.push({
          x: x + (Math.random() - 0.5) * spread,
          y: y + (Math.random() - 0.5) * spread,
          size: Math.max(0.5, Math.random() * 2),
          opacity: strokeOpacity * (0.2 + Math.random() * 0.3),
        });
      }
      if (feibaiPoints.length > 0) {
        commands.push({
          type: 'feibai',
          x,
          y,
          width: strokeWidth,
          opacity: strokeOpacity,
          color: this.config.color,
          feibaiPoints,
        });
      }
    }

    this.lastPoint = point;
    return commands;
  }

  endStroke(x: number, y: number): RenderCommand[] {
    const commands: RenderCommand[] = [];
    if (this.lastPoint) {
      const feibaiCount = Math.floor(Math.random() * 5) + 3;
      const feibaiPoints: { x: number; y: number; size: number; opacity: number }[] = [];
      const baseOpacity = this.calculateOpacity(this.lastPoint.pressure);
      for (let i = 0; i < feibaiCount; i++) {
        const dist = Math.random() * this.calculateWidth(this.lastPoint.speed) * 2;
        const angle = Math.random() * Math.PI * 2;
        feibaiPoints.push({
          x: x + Math.cos(angle) * dist,
          y: y + Math.sin(angle) * dist,
          size: Math.max(0.5, Math.random() * 1.5),
          opacity: baseOpacity * (0.1 + Math.random() * 0.2),
        });
      }
      if (feibaiPoints.length > 0) {
        commands.push({
          type: 'feibai',
          x,
          y,
          width: 2,
          opacity: baseOpacity * 0.3,
          color: this.config.color,
          feibaiPoints,
        });
      }
    }
    this.lastPoint = null;
    return commands;
  }

  private calculateWidth(speed: number): number {
    const speedRatio = Math.min(speed / MAX_SPEED, 1);
    const rawWidth = this.config.baseSize * (1 - speedRatio * 0.8);
    return Math.max(MIN_WIDTH, Math.min(rawWidth, MAX_BRUSH_WIDTH));
  }

  private calculateOpacity(pressure: number): number {
    return 0.3 + pressure * 0.7;
  }

  private randomRange(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }
}
