export interface Point {
  x: number;
  y: number;
  pressure: number;
  timestamp: number;
}

export interface StrokeSegment {
  x: number;
  y: number;
  width: number;
  opacity: number;
}

export interface Stroke {
  id: string;
  segments: StrokeSegment[];
}

export interface BrushConfig {
  minWidth: number;
  maxWidth: number;
  startOpacity: number;
  endOpacity: number;
  smoothing: number;
}

export class BrushEngine {
  private config: BrushConfig;
  private lastPoint: Point | null = null;
  private strokeStartPoint: Point | null = null;
  private totalDistance: number = 0;
  private currentStroke: StrokeSegment[] = [];

  constructor(config: Partial<BrushConfig> = {}) {
    this.config = {
      minWidth: 2,
      maxWidth: 5,
      startOpacity: 0.9,
      endOpacity: 0.3,
      smoothing: 0.5,
      ...config,
    };
  }

  public setConfig(config: Partial<BrushConfig>): void {
    this.config = { ...this.config, ...config };
  }

  public getConfig(): BrushConfig {
    return { ...this.config };
  }

  public startStroke(point: Point): void {
    this.lastPoint = point;
    this.strokeStartPoint = point;
    this.totalDistance = 0;
    this.currentStroke = [];

    const width = this.calculateWidth(point, point, 0);
    const opacity = this.config.startOpacity;

    this.currentStroke.push({
      x: point.x,
      y: point.y,
      width,
      opacity,
    });
  }

  public continueStroke(point: Point): StrokeSegment[] {
    if (!this.lastPoint || !this.strokeStartPoint) {
      return [];
    }

    const dx = point.x - this.lastPoint.x;
    const dy = point.y - this.lastPoint.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 1) {
      return [];
    }

    this.totalDistance += distance;

    const smoothedPoint = this.smoothPoint(point);
    const width = this.calculateWidth(this.lastPoint, smoothedPoint, this.totalDistance);
    const opacity = this.calculateOpacity(this.totalDistance);

    const segment: StrokeSegment = {
      x: smoothedPoint.x,
      y: smoothedPoint.y,
      width,
      opacity,
    };

    this.currentStroke.push(segment);
    this.lastPoint = smoothedPoint;

    return this.currentStroke.slice(-2);
  }

  public endStroke(point: Point): Stroke {
    if (this.lastPoint) {
      const width = this.calculateWidth(this.lastPoint, point, this.totalDistance);
      const opacity = this.config.endOpacity;

      this.currentStroke.push({
        x: point.x,
        y: point.y,
        width,
        opacity,
      });
    }

    const stroke: Stroke = {
      id: this.generateId(),
      segments: [...this.currentStroke],
    };

    this.lastPoint = null;
    this.strokeStartPoint = null;
    this.currentStroke = [];
    this.totalDistance = 0;

    return stroke;
  }

  public interpolateBezier(points: Point[], segmentsPerCurve: number = 10): StrokeSegment[] {
    if (points.length < 2) return [];

    const result: StrokeSegment[] = [];
    const totalDistance = this.calculateTotalPathDistance(points);
    let accumulatedDistance = 0;

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i - 1] || points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      for (let t = 0; t <= 1; t += 1 / segmentsPerCurve) {
        const mt = 1 - t;
        const x = mt * mt * mt * p1.x + 3 * mt * mt * t * cp1x + 3 * mt * t * t * cp2x + t * t * t * p2.x;
        const y = mt * mt * mt * p1.y + 3 * mt * mt * t * cp1y + 3 * mt * t * t * cp2y + t * t * t * p2.y;

        if (i > 0 || t > 0) {
          const lastSegment = result[result.length - 1];
          if (lastSegment) {
            const segDist = Math.sqrt((x - lastSegment.x) ** 2 + (y - lastSegment.y) ** 2);
            accumulatedDistance += segDist;
          }
        }

        const progress = totalDistance > 0 ? accumulatedDistance / totalDistance : 0;
        const width = this.config.maxWidth - (this.config.maxWidth - this.config.minWidth) * progress;
        const opacity = this.config.startOpacity - (this.config.startOpacity - this.config.endOpacity) * progress;

        result.push({ x, y, width, opacity });
      }
    }

    return result;
  }

  public simulateInkSpread(ctx: CanvasRenderingContext2D, segment: StrokeSegment): void {
    const { x, y, width, opacity } = segment;

    const spreadWidth = width * 1.15;
    const spreadOpacity = opacity * 0.15;

    ctx.globalAlpha = spreadOpacity;
    ctx.fillStyle = 'rgba(0, 0, 0, 1)';
    ctx.beginPath();
    ctx.arc(x, y, spreadWidth, 0, Math.PI * 2);
    ctx.fill();

    const noise1 = (Math.random() - 0.5) * width * 0.3;
    const noise2 = (Math.random() - 0.5) * width * 0.3;
    const noiseOpacity = opacity * 0.1;

    ctx.globalAlpha = noiseOpacity;
    ctx.beginPath();
    ctx.arc(x + noise1, y + noise2, width * 0.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;
  }

  private smoothPoint(point: Point): Point {
    if (!this.lastPoint) return point;

    const s = this.config.smoothing;
    return {
      x: this.lastPoint.x * s + point.x * (1 - s),
      y: this.lastPoint.y * s + point.y * (1 - s),
      pressure: this.lastPoint.pressure * s + point.pressure * (1 - s),
      timestamp: point.timestamp,
    };
  }

  private calculateSpeed(p1: Point, p2: Point): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const time = Math.max(1, p2.timestamp - p1.timestamp);
    return distance / time;
  }

  private calculateWidth(p1: Point, p2: Point, _totalDistance: number): number {
    const speed = this.calculateSpeed(p1, p2);
    const normalizedSpeed = Math.min(1, speed / 3);

    const { minWidth, maxWidth } = this.config;
    const width = maxWidth - (maxWidth - minWidth) * normalizedSpeed;

    const pressureFactor = p2.pressure > 0 ? p2.pressure : 0.7;
    return width * (0.7 + 0.3 * pressureFactor);
  }

  private calculateOpacity(totalDistance: number): number {
    const { startOpacity, endOpacity } = this.config;
    const fadeDistance = 150;
    const progress = Math.min(1, totalDistance / fadeDistance);
    return startOpacity - (startOpacity - endOpacity) * progress;
  }

  private calculateTotalPathDistance(points: Point[]): number {
    let total = 0;
    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i - 1].x;
      const dy = points[i].y - points[i - 1].y;
      total += Math.sqrt(dx * dx + dy * dy);
    }
    return total;
  }

  private generateId(): string {
    return `stroke_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
