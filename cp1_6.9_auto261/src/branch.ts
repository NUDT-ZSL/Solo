import { v4 as uuidv4 } from 'uuid';
import { Point, Theme, Flower } from './flower.js';

export interface BranchRenderInfo {
  flower: Flower | null;
}

export class Branch {
  public id: string;
  public pathPoints: Point[];
  public totalLength: number = 0;
  public cumulativeDistances: number[] = [];
  public growthProgress: number = 0;
  public level: number;
  public baseThickness: number;
  public children: Branch[] = [];
  public flower: Flower | null = null;
  public lastSpawnDistance: number = 0;
  public rootPoint: Point;
  public hasSpawnedFlower: boolean = false;

  private _baseThicknessStart: number = 2;
  private _baseThicknessEnd: number = 8;
  private _growthSpeed: number = 50;
  private _maxLevel: number = 3;

  constructor(
    pathPoints: Point[],
    level: number = 0,
    baseThickness?: number
  ) {
    this.id = uuidv4();
    this.pathPoints = pathPoints.length >= 2 ? pathPoints : [
      { x: pathPoints[0].x, y: pathPoints[0].y },
      { x: pathPoints[0].x + 1, y: pathPoints[0].y }
    ];
    this.level = level;
    this.rootPoint = { ...this.pathPoints[0] };
    this._precomputeDistances();

    if (baseThickness !== undefined) {
      this._baseThicknessStart = baseThickness;
      this._baseThicknessEnd = baseThickness * 1.1;
      this.baseThickness = baseThickness;
    } else {
      const ratio = Math.min(1, this.totalLength / 500);
      this._baseThicknessStart = 2 + ratio * 2;
      this._baseThicknessEnd = 8 + ratio * 4;
      this.baseThickness = this._baseThicknessStart;
    }
  }

  public update(dt: number, wind: number, hoveredFlowerId: string | null): void {
    const wasGrowing = this.growthProgress < this.totalLength;
    this.growthProgress = Math.min(
      this.totalLength,
      this.growthProgress + this._growthSpeed * dt
    );

    const thicknessRatio = this.totalLength > 0 ? this.growthProgress / this.totalLength : 0;
    this.baseThickness = this._lerp(this._baseThicknessStart, this._baseThicknessEnd, thicknessRatio);

    if (wasGrowing && this.level < this._maxLevel) {
      this._checkAndSpawnChildren();
    }

    if (this.level >= 1 && !this.hasSpawnedFlower && this.growthProgress >= this.totalLength) {
      const tip = this.getPointAtDistance(this.totalLength);
      if (tip) {
        this.flower = new Flower(tip);
        this.hasSpawnedFlower = true;
      }
    }

    for (const child of this.children) {
      child.update(dt, wind, hoveredFlowerId);
    }

    if (this.flower) {
      this.flower.isHovered = (hoveredFlowerId === this.id);
      const tip = this.getPointAtDistance(this.totalLength);
      if (tip) {
        this.flower.position = { ...tip };
      }
      this.flower.update(dt);
    }
  }

  public render(ctx: CanvasRenderingContext2D, theme: Theme, wind: number, elapsed: number): void {
    const points: Point[] = [];
    const maxDist = Math.min(this.growthProgress, this.totalLength);
    const steps = Math.max(2, Math.ceil(maxDist / 4));
    for (let i = 0; i <= steps; i++) {
      const d = (i / steps) * maxDist;
      const p = this.getPointAtDistance(d);
      if (p) {
        const distRatio = this.totalLength > 0 ? d / this.totalLength : 0;
        const sway = (1 - this.level * 0.15) * distRatio;
        const windOffset = Math.sin(elapsed * (Math.PI * 2 / 3) + this.level * 0.7) * 0.3 * sway;
        const angle = windOffset * wind;
        const dx = p.x - this.rootPoint.x;
        const dy = p.y - this.rootPoint.y;
        points.push({
          x: this.rootPoint.x + dx * Math.cos(angle) - dy * Math.sin(angle),
          y: this.rootPoint.y + dx * Math.sin(angle) + dy * Math.cos(angle)
        });
      }
    }

    if (points.length >= 2) {
      const segments = points.length - 1;
      for (let i = 0; i < segments; i++) {
        const p0 = points[i];
        const p1 = points[i + 1];
        const segRatio = i / segments;
        const t = this.totalLength > 0 ? (this.growthProgress * segRatio) / this.totalLength : 0;
        const thickness = this._lerp(this._baseThicknessStart, this._baseThicknessEnd, t) *
          (1 - this.level * 0.2);

        const colorT = this.level >= 1 ? 1 : Math.min(1, t + this.level * 0.3);
        const strokeColor = this._interpolateColor(
          ['#4a2810', '#6b4423'],
          ['#2d5a27', '#5a8f3c'],
          colorT
        );

        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = Math.max(1, thickness);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
      }
    }

    for (const child of this.children) {
      child.render(ctx, theme, wind, elapsed);
    }

    if (this.flower) {
      this.flower.render(ctx, theme);
    }
  }

  public getAllFlowers(): { id: string; flower: Flower }[] {
    const result: { id: string; flower: Flower }[] = [];
    if (this.flower) {
      result.push({ id: this.id, flower: this.flower });
    }
    for (const child of this.children) {
      result.push(...child.getAllFlowers());
    }
    return result;
  }

  public getPointAtDistance(distance: number): Point | null {
    if (this.pathPoints.length < 2) return this.pathPoints[0] || null;
    if (distance <= 0) return { ...this.pathPoints[0] };
    if (distance >= this.totalLength) return { ...this.pathPoints[this.pathPoints.length - 1] };

    let idx = 1;
    while (idx < this.cumulativeDistances.length && this.cumulativeDistances[idx] < distance) {
      idx++;
    }
    const prevDist = this.cumulativeDistances[idx - 1];
    const segDist = this.cumulativeDistances[idx] - prevDist;
    const t = segDist > 0 ? (distance - prevDist) / segDist : 0;
    const p0 = this.pathPoints[idx - 1];
    const p1 = this.pathPoints[idx];
    return {
      x: p0.x + (p1.x - p0.x) * t,
      y: p0.y + (p1.y - p0.y) * t
    };
  }

  public getTangentAtDistance(distance: number): { x: number; y: number } {
    const eps = 2;
    const p1 = this.getPointAtDistance(Math.max(0, distance - eps));
    const p2 = this.getPointAtDistance(Math.min(this.totalLength, distance + eps));
    if (!p1 || !p2) return { x: 0, y: -1 };
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    return { x: dx / len, y: dy / len };
  }

  private _precomputeDistances(): void {
    this.cumulativeDistances = [0];
    let total = 0;
    for (let i = 1; i < this.pathPoints.length; i++) {
      const a = this.pathPoints[i - 1];
      const b = this.pathPoints[i];
      total += Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
      this.cumulativeDistances.push(total);
    }
    this.totalLength = total;
  }

  private _checkAndSpawnChildren(): void {
    while (
      this.growthProgress - this.lastSpawnDistance >= 30 &&
      this.level < this._maxLevel
    ) {
      this.lastSpawnDistance += 30;
      const spawnD = this.lastSpawnDistance;
      if (spawnD > this.growthProgress) break;
      if (this.totalLength - spawnD < 40) continue;

      const basePoint = this.getPointAtDistance(spawnD);
      const tangent = this.getTangentAtDistance(spawnD);
      if (!basePoint) continue;

      for (const side of [-1, 1]) {
        const angleOffset = side * (Math.PI / 3 + Math.random() * (Math.PI / 6));
        const tanAngle = Math.atan2(tangent.y, tangent.x);
        const dirAngle = tanAngle + angleOffset;
        const remaining = this.totalLength - spawnD;
        const branchLen = remaining * (0.3 + Math.random() * 0.2);
        const cp1Dist = branchLen * (0.3 + Math.random() * 0.2);
        const cp2Dist = branchLen * (0.6 + Math.random() * 0.2);
        const cp1 = {
          x: basePoint.x + Math.cos(dirAngle + (Math.random() - 0.5) * 0.4) * cp1Dist,
          y: basePoint.y + Math.sin(dirAngle + (Math.random() - 0.5) * 0.4) * cp1Dist
        };
        const cp2 = {
          x: basePoint.x + Math.cos(dirAngle - (Math.random() - 0.5) * 0.6) * cp2Dist,
          y: basePoint.y + Math.sin(dirAngle - (Math.random() - 0.5) * 0.6) * cp2Dist
        };
        const endPoint = {
          x: basePoint.x + Math.cos(dirAngle) * branchLen,
          y: basePoint.y + Math.sin(dirAngle) * branchLen
        };

        const steps = 12;
        const childPath: Point[] = [];
        for (let s = 0; s <= steps; s++) {
          const t = s / steps;
          const mt = 1 - t;
          childPath.push({
            x: mt ** 3 * basePoint.x + 3 * mt ** 2 * t * cp1.x + 3 * mt * t ** 2 * cp2.x + t ** 3 * endPoint.x,
            y: mt ** 3 * basePoint.y + 3 * mt ** 2 * t * cp1.y + 3 * mt * t ** 2 * cp2.y + t ** 3 * endPoint.y
          });
        }

        const childThickness = this.baseThickness * 0.6;
        this.children.push(new Branch(childPath, this.level + 1, childThickness));
      }
    }
  }

  private _lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private _interpolateColor(
    fromPair: [string, string],
    toPair: [string, string],
    t: number
  ): string {
    const start = this._hexToRgb(this._lerpColor(fromPair[0], fromPair[1], t));
    const end = this._hexToRgb(this._lerpColor(toPair[0], toPair[1], t));
    const r = Math.round(this._lerp(start.r, end.r, t));
    const g = Math.round(this._lerp(start.g, end.g, t));
    const b = Math.round(this._lerp(start.b, end.b, t));
    return `rgb(${r},${g},${b})`;
  }

  private _lerpColor(hex1: string, hex2: string, t: number): string {
    const c1 = this._hexToRgb(hex1);
    const c2 = this._hexToRgb(hex2);
    const r = Math.round(this._lerp(c1.r, c2.r, t));
    const g = Math.round(this._lerp(c1.g, c2.g, t));
    const b = Math.round(this._lerp(c1.b, c2.b, t));
    return `#${this._componentToHex(r)}${this._componentToHex(g)}${this._componentToHex(b)}`;
  }

  private _hexToRgb(hex: string): { r: number; g: number; b: number } {
    const m = hex.replace('#', '');
    return {
      r: parseInt(m.substring(0, 2), 16),
      g: parseInt(m.substring(2, 4), 16),
      b: parseInt(m.substring(4, 6), 16)
    };
  }

  private _componentToHex(c: number): string {
    const h = Math.max(0, Math.min(255, c)).toString(16);
    return h.length === 1 ? '0' + h : h;
  }
}
