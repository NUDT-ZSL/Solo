import { ModuleType } from './PaperEngine';

export interface FoldLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface FoldAnimation {
  moduleId: string;
  startAngle: number;
  endAngle: number;
  progress: number;
  foldLine: FoldLine;
  duration: number;
  startTime: number;
}

export interface CollisionResult {
  colliding: boolean;
  overlapArea: number;
  intersectionPoints: { x: number; y: number }[];
}

export class FoldingSimulator {
  private activeAnimations: Map<string, FoldAnimation> = new Map();

  generateFoldLines(
    vertices: { x: number; y: number }[],
    type: ModuleType
  ): FoldLine[] {
    const cx =
      vertices.reduce((sum, v) => sum + v.x, 0) / vertices.length;
    const cy =
      vertices.reduce((sum, v) => sum + v.y, 0) / vertices.length;

    const lines: FoldLine[] = [];

    switch (type) {
      case 'square': {
        lines.push({
          x1: vertices[0].x,
          y1: vertices[0].y,
          x2: vertices[2].x,
          y2: vertices[2].y,
        });
        lines.push({
          x1: vertices[1].x,
          y1: vertices[1].y,
          x2: vertices[3].x,
          y2: vertices[3].y,
        });
        const mid01 = {
          x: (vertices[0].x + vertices[1].x) / 2,
          y: (vertices[0].y + vertices[1].y) / 2,
        };
        const mid23 = {
          x: (vertices[2].x + vertices[3].x) / 2,
          y: (vertices[2].y + vertices[3].y) / 2,
        };
        lines.push({ x1: mid01.x, y1: mid01.y, x2: mid23.x, y2: mid23.y });
        const mid12 = {
          x: (vertices[1].x + vertices[2].x) / 2,
          y: (vertices[1].y + vertices[2].y) / 2,
        };
        const mid30 = {
          x: (vertices[3].x + vertices[0].x) / 2,
          y: (vertices[3].y + vertices[0].y) / 2,
        };
        lines.push({ x1: mid12.x, y1: mid12.y, x2: mid30.x, y2: mid30.y });
        break;
      }
      case 'triangle': {
        vertices.forEach((v) => {
          lines.push({ x1: cx, y1: cy, x2: v.x, y2: v.y });
        });
        break;
      }
      case 'diamond': {
        lines.push({
          x1: vertices[0].x,
          y1: vertices[0].y,
          x2: vertices[2].x,
          y2: vertices[2].y,
        });
        lines.push({
          x1: vertices[1].x,
          y1: vertices[1].y,
          x2: vertices[3].x,
          y2: vertices[3].y,
        });
        break;
      }
    }

    return lines;
  }

  startFoldAnimation(
    moduleId: string,
    foldLine: FoldLine,
    foldAngle: number = 180,
    duration: number = 800
  ): FoldAnimation {
    const animation: FoldAnimation = {
      moduleId,
      startAngle: 0,
      endAngle: foldAngle,
      progress: 0,
      foldLine,
      duration,
      startTime: performance.now(),
    };
    this.activeAnimations.set(moduleId, animation);
    return animation;
  }

  updateAnimations(currentTime: number): Map<string, number> {
    const angles = new Map<string, number>();

    this.activeAnimations.forEach((anim, moduleId) => {
      const elapsed = currentTime - anim.startTime;
      anim.progress = Math.min(elapsed / anim.duration, 1);

      const eased = this.easeInOutCubic(anim.progress);
      const currentAngle =
        anim.startAngle + (anim.endAngle - anim.startAngle) * eased;
      angles.set(moduleId, currentAngle);

      if (anim.progress >= 1) {
        this.activeAnimations.delete(moduleId);
      }
    });

    return angles;
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  hasActiveAnimation(moduleId: string): boolean {
    return this.activeAnimations.has(moduleId);
  }

  cancelAnimation(moduleId: string) {
    this.activeAnimations.delete(moduleId);
  }

  detectCollision(
    polyA: { x: number; y: number }[],
    polyB: { x: number; y: number }[]
  ): CollisionResult {
    const intersectionPoints = this.findIntersectionPoints(polyA, polyB);

    const pointInPolyA = polyB.some((p) => this.isPointInPolygon(p, polyA));
    const pointInPolyB = polyA.some((p) => this.isPointInPolygon(p, polyB));

    const colliding =
      intersectionPoints.length > 0 || pointInPolyA || pointInPolyB;

    return {
      colliding,
      overlapArea: colliding ? this.estimateOverlapArea(polyA, polyB) : 0,
      intersectionPoints,
    };
  }

  private isPointInPolygon(
    point: { x: number; y: number },
    polygon: { x: number; y: number }[]
  ): boolean {
    let inside = false;
    const n = polygon.length;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = polygon[i].x,
        yi = polygon[i].y;
      const xj = polygon[j].x,
        yj = polygon[j].y;
      const intersect =
        yi > point.y !== yj > point.y &&
        point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  private findIntersectionPoints(
    polyA: { x: number; y: number }[],
    polyB: { x: number; y: number }[]
  ): { x: number; y: number }[] {
    const points: { x: number; y: number }[] = [];

    for (let i = 0; i < polyA.length; i++) {
      const a1 = polyA[i];
      const a2 = polyA[(i + 1) % polyA.length];

      for (let j = 0; j < polyB.length; j++) {
        const b1 = polyB[j];
        const b2 = polyB[(j + 1) % polyB.length];

        const intersection = this.lineSegmentIntersection(a1, a2, b1, b2);
        if (intersection) {
          points.push(intersection);
        }
      }
    }

    return points;
  }

  private lineSegmentIntersection(
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    p3: { x: number; y: number },
    p4: { x: number; y: number }
  ): { x: number; y: number } | null {
    const d1x = p2.x - p1.x;
    const d1y = p2.y - p1.y;
    const d2x = p4.x - p3.x;
    const d2y = p4.y - p3.y;

    const cross = d1x * d2y - d1y * d2x;
    if (Math.abs(cross) < 1e-10) return null;

    const t = ((p3.x - p1.x) * d2y - (p3.y - p1.y) * d2x) / cross;
    const u = ((p3.x - p1.x) * d1y - (p3.y - p1.y) * d1x) / cross;

    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      return {
        x: p1.x + t * d1x,
        y: p1.y + t * d1y,
      };
    }

    return null;
  }

  private estimateOverlapArea(
    polyA: { x: number; y: number }[],
    polyB: { x: number; y: number }[]
  ): number {
    const areaA = this.polygonArea(polyA);
    const areaB = this.polygonArea(polyB);
    const minArea = Math.min(areaA, areaB);

    const centerA = this.polygonCenter(polyA);
    const centerB = this.polygonCenter(polyB);
    const dist = Math.hypot(centerA.x - centerB.x, centerA.y - centerB.y);
    const maxDist = Math.sqrt(areaA + areaB);

    if (dist >= maxDist) return 0;

    const ratio = 1 - dist / maxDist;
    return minArea * ratio * ratio * 0.5;
  }

  private polygonArea(poly: { x: number; y: number }[]): number {
    let area = 0;
    const n = poly.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += poly[i].x * poly[j].y;
      area -= poly[j].x * poly[i].y;
    }
    return Math.abs(area) / 2;
  }

  private polygonCenter(poly: { x: number; y: number }[]): {
    x: number;
    y: number;
  } {
    const cx = poly.reduce((s, p) => s + p.x, 0) / poly.length;
    const cy = poly.reduce((s, p) => s + p.y, 0) / poly.length;
    return { x: cx, y: cy };
  }
}
