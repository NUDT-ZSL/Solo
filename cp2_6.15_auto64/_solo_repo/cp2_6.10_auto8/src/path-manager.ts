export interface PathPoint {
  x: number;
  y: number;
  speed: number;
  timestamp: number;
}

const COLOR_START_H = 24;
const COLOR_START_S = 100;
const COLOR_START_L = 63;
const COLOR_END_H = 272;
const COLOR_END_S = 67;
const COLOR_END_L = 58;

export class PathManager {
  public points: PathPoint[] = [];
  private cachedLength: number = 0;
  private lengthDirty: boolean = true;
  private cumulativeDistances: number[] = [];

  public addPoint(x: number, y: number, speed: number): void {
    const point: PathPoint = {
      x,
      y,
      speed,
      timestamp: performance.now(),
    };
    this.points.push(point);
    this.lengthDirty = true;
  }

  public clear(): void {
    this.points.length = 0;
    this.cachedLength = 0;
    this.cumulativeDistances.length = 0;
    this.lengthDirty = true;
  }

  public isEmpty(): boolean {
    return this.points.length < 2;
  }

  public getLength(): number {
    if (!this.lengthDirty) return this.cachedLength;
    this._computeDistances();
    return this.cachedLength;
  }

  private _computeDistances(): void {
    this.cumulativeDistances.length = 0;
    this.cumulativeDistances.push(0);
    let total = 0;
    for (let i = 1; i < this.points.length; i++) {
      const dx = this.points[i].x - this.points[i - 1].x;
      const dy = this.points[i].y - this.points[i - 1].y;
      total += Math.sqrt(dx * dx + dy * dy);
      this.cumulativeDistances.push(total);
    }
    this.cachedLength = total;
    this.lengthDirty = false;
  }

  public getPointAt(t: number): { x: number; y: number } {
    if (this.points.length === 0) return { x: 0, y: 0 };
    if (this.points.length === 1) return { x: this.points[0].x, y: this.points[0].y };
    if (t <= 0) return { x: this.points[0].x, y: this.points[0].y };
    if (t >= 1) {
      const last = this.points[this.points.length - 1];
      return { x: last.x, y: last.y };
    }
    this.getLength();
    const targetDist = t * this.cachedLength;
    let idx = 1;
    while (idx < this.cumulativeDistances.length && this.cumulativeDistances[idx] < targetDist) {
      idx++;
    }
    if (idx >= this.cumulativeDistances.length) {
      const last = this.points[this.points.length - 1];
      return { x: last.x, y: last.y };
    }
    const segStart = this.cumulativeDistances[idx - 1];
    const segEnd = this.cumulativeDistances[idx];
    const segLen = segEnd - segStart || 1;
    const localT = (targetDist - segStart) / segLen;
    const p0 = this.points[idx - 1];
    const p1 = this.points[idx];
    return {
      x: p0.x + (p1.x - p0.x) * localT,
      y: p0.y + (p1.y - p0.y) * localT,
    };
  }

  public getTangentAngle(t: number): number {
    const eps = 0.005;
    const t1 = Math.max(0, t - eps);
    const t2 = Math.min(1, t + eps);
    const p1 = this.getPointAt(t1);
    const p2 = this.getPointAt(t2);
    return Math.atan2(p2.y - p1.y, p2.x - p1.x);
  }

  public getCurvature(): number {
    if (this.points.length < 3) return 0;
    this.getLength();
    if (this.cachedLength < 1) return 0;
    let totalAngle = 0;
    for (let i = 2; i < this.points.length; i++) {
      const a = this.points[i - 2];
      const b = this.points[i - 1];
      const c = this.points[i];
      const ang1 = Math.atan2(b.y - a.y, b.x - a.x);
      const ang2 = Math.atan2(c.y - b.y, c.x - b.x);
      let diff = ang2 - ang1;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      totalAngle += Math.abs(diff);
    }
    return totalAngle / this.cachedLength;
  }

  public getVerticalOffset(): number {
    if (this.points.length < 2) return 0;
    const start = this.points[0];
    const end = this.points[this.points.length - 1];
    return Math.abs(end.y - start.y);
  }

  public getColorAt(t: number): string {
    const h = COLOR_START_H + (COLOR_END_H - COLOR_START_H) * t;
    const s = COLOR_START_S + (COLOR_END_S - COLOR_START_S) * t;
    const l = COLOR_START_L + (COLOR_END_L - COLOR_START_L) * t;
    return `hsl(${h.toFixed(1)}, ${s.toFixed(1)}%, ${l.toFixed(1)}%)`;
  }

  public getEndColor(): string {
    return this.getColorAt(1);
  }

  public getStartColor(): string {
    return this.getColorAt(0);
  }
}

export function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h /= 360;
  s /= 100;
  l /= 100;
  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 255, g: 255, b: 255 };
}
