export interface PathPoint {
  x: number;
  y: number;
  gridX: number;
  gridY: number;
  createdAt: number;
  lifespan: number;
  fadeDuration: number;
}

export interface FadeInfo {
  opacity: number;
  expired: boolean;
  hue: number;
}

export class PathManager {
  private pathPoints: PathPoint[] = [];
  private maxPoints: number = 150;
  private defaultLifespan: number = 8000;
  private defaultFadeDuration: number = 1000;

  public addPoint(x: number, y: number, gridX: number, gridY: number, now: number): void {
    const point: PathPoint = {
      x,
      y,
      gridX,
      gridY,
      createdAt: now,
      lifespan: this.defaultLifespan,
      fadeDuration: this.defaultFadeDuration
    };

    this.pathPoints.push(point);

    while (this.pathPoints.length > this.maxPoints) {
      this.pathPoints.shift();
    }
  }

  public update(now: number): { expiredCount: number } {
    let expiredCount = 0;
    const expireThreshold = now - (this.defaultLifespan + this.defaultFadeDuration);

    while (this.pathPoints.length > 0 && this.pathPoints[0].createdAt < expireThreshold) {
      this.pathPoints.shift();
      expiredCount++;
    }

    return { expiredCount };
  }

  public getVisiblePoints(now: number): (PathPoint & FadeInfo)[] {
    const result: (PathPoint & FadeInfo)[] = [];
    const total = this.pathPoints.length;

    for (let i = 0; i < total; i++) {
      const point = this.pathPoints[i];
      const age = now - point.createdAt;

      if (age > point.lifespan + point.fadeDuration) continue;

      let opacity: number;
      if (age <= point.lifespan) {
        opacity = 0.9;
      } else {
        const fadeProgress = (age - point.lifespan) / point.fadeDuration;
        opacity = 0.9 * (1 - fadeProgress);
      }

      const hue = 180 + (i / Math.max(total - 1, 1)) * 120;

      result.push({
        ...point,
        opacity,
        expired: age > point.lifespan + point.fadeDuration,
        hue
      });
    }

    return result;
  }

  public getGridCellsCovered(): Set<string> {
    const covered = new Set<string>();
    for (const point of this.pathPoints) {
      covered.add(`${point.gridX},${point.gridY}`);
    }
    return covered;
  }

  public removePointAt(gridX: number, gridY: number): boolean {
    const idx = this.pathPoints.findIndex(
      (p) => p.gridX === gridX && p.gridY === gridY
    );
    if (idx !== -1) {
      this.pathPoints.splice(idx, 1);
      return true;
    }
    return false;
  }

  public getClosestVisiblePoint(
    x: number,
    y: number,
    now: number
  ): (PathPoint & FadeInfo) | null {
    const visible = this.getVisiblePoints(now);
    if (visible.length === 0) return null;

    let closest: (PathPoint & FadeInfo) | null = null;
    let minDist = Infinity;

    for (const point of visible) {
      if (point.opacity <= 0.1) continue;
      const dx = point.x - x;
      const dy = point.y - y;
      const dist = dx * dx + dy * dy;
      if (dist < minDist) {
        minDist = dist;
        closest = point;
      }
    }

    return closest;
  }

  public clear(): void {
    this.pathPoints = [];
  }

  public getCount(): number {
    return this.pathPoints.length;
  }

  public isEmpty(): boolean {
    return this.pathPoints.length === 0;
  }

  public getPoints(): PathPoint[] {
    return [...this.pathPoints];
  }
}
