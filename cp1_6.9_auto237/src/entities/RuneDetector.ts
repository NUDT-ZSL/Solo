export type SpellType = 'fireball' | 'iceShard' | 'lightning';

export interface Point {
  x: number;
  y: number;
}

export interface RuneResult {
  spellType: SpellType | null;
  direction: Point;
  confidence: number;
}

export class RuneDetector {
  private static readonly MIN_POINTS = 10;
  private static readonly MIN_LENGTH_THRESHOLD = 150;
  private static readonly CIRCLE_RATIO_MIN = 0.7;
  private static readonly CIRCLE_RATIO_MAX = 1.4;
  private static readonly TRIANGLE_ANGLE_TOLERANCE = 0.5;

  public static detect(points: Point[]): RuneResult {
    const defaultResult: RuneResult = {
      spellType: null,
      direction: { x: 1, y: 0 },
      confidence: 0
    };

    if (points.length < this.MIN_POINTS) {
      return defaultResult;
    }

    const totalLength = this.calculatePathLength(points);
    if (totalLength < this.MIN_LENGTH_THRESHOLD) {
      return defaultResult;
    }

    const centroid = this.calculateCentroid(points);
    const startPoint = points[0];
    const endPoint = points[points.length - 1];
    const displacement = Math.sqrt(
      Math.pow(endPoint.x - startPoint.x, 2) +
      Math.pow(endPoint.y - startPoint.y, 2)
    );

    const isClosed = displacement < totalLength * 0.3;

    if (isClosed) {
      const circleConfidence = this.evaluateCircle(points, centroid);
      const triangleConfidence = this.evaluateTriangle(points, centroid);

      if (circleConfidence > 0.6 && circleConfidence > triangleConfidence) {
        const dir = this.calculateDirectionFromCentroid(points, centroid);
        return {
          spellType: 'iceShard',
          direction: dir,
          confidence: circleConfidence
        };
      }

      if (triangleConfidence > 0.6) {
        const dir = this.calculateDirectionFromCentroid(points, centroid);
        return {
          spellType: 'lightning',
          direction: dir,
          confidence: triangleConfidence
        };
      }
    }

    const straightConfidence = this.evaluateStraightLine(points);

    if (straightConfidence > 0.6) {
      const dir = this.normalizeDirection(endPoint.x - startPoint.x, endPoint.y - startPoint.y);
      return {
        spellType: 'fireball',
        direction: dir,
        confidence: straightConfidence
      };
    }

    return defaultResult;
  }

  private static calculatePathLength(points: Point[]): number {
    let length = 0;
    for (let i = 1; i < points.length; i++) {
      length += Math.sqrt(
        Math.pow(points[i].x - points[i - 1].x, 2) +
        Math.pow(points[i].y - points[i - 1].y, 2)
      );
    }
    return length;
  }

  private static calculateCentroid(points: Point[]): Point {
    let sumX = 0;
    let sumY = 0;
    for (const p of points) {
      sumX += p.x;
      sumY += p.y;
    }
    return {
      x: sumX / points.length,
      y: sumY / points.length
    };
  }

  private static evaluateCircle(points: Point[], centroid: Point): number {
    const distances = points.map(p =>
      Math.sqrt(Math.pow(p.x - centroid.x, 2) + Math.pow(p.y - centroid.y, 2))
    );
    const avgRadius = distances.reduce((a, b) => a + b, 0) / distances.length;
    const variance = distances.reduce((a, d) => a + Math.pow(d - avgRadius, 2), 0) / distances.length;
    const stdDev = Math.sqrt(variance);

    const startEnd = Math.sqrt(
      Math.pow(points[0].x - points[points.length - 1].x, 2) +
      Math.pow(points[0].y - points[points.length - 1].y, 2)
    );
    const closureRatio = startEnd / avgRadius;

    const uniformityScore = Math.max(0, 1 - (stdDev / avgRadius));
    const closureScore = Math.max(0, 1 - closureRatio);
    return (uniformityScore * 0.6) + (closureScore * 0.4);
  }

  private static evaluateTriangle(points: Point[], centroid: Point): number {
    const simplified = this.simplifyPath(points, 5);
    if (simplified.length < 5) {
      return 0;
    }

    const corners = this.findCorners(simplified);
    if (corners.length < 3) {
      return 0;
    }

    const angles: number[] = [];
    for (let i = 0; i < corners.length - 2; i++) {
      const a = corners[i];
      const b = corners[i + 1];
      const c = corners[i + 2];
      angles.push(this.getAngle(a, b, c));
    }

    const targetSum = angles.reduce((a, b) => a + Math.abs(b - (Math.PI * 2 / 3)), 0) / angles.length;

    return Math.max(0, 1 - (targetSum / Math.PI));
  }

  private static evaluateStraightLine(points: Point[]): number {
    const startPoint = points[0];
    const endPoint = points[points.length - 1];
    const dx = endPoint.x - startPoint.x;
    const dy = endPoint.y - startPoint.y;
    const totalLength = Math.sqrt(dx * dx + dy * dy);
    const pathLength = this.calculatePathLength(points);

    if (pathLength === 0) return 0;
    return totalLength / pathLength;
  }

  private static findCorners(points: Point[]): Point[] {
    const corners: Point[] = [];
    const step = Math.max(1, Math.floor(points.length / 20));
    for (let i = step; i < points.length - step; i++) {
      const prev = points[i - step];
      const curr = points[i];
      const next = points[i + step];
      const angle = this.getAngle(prev, curr, next);
      if (angle < Math.PI * 0.6) {
        if (corners.length === 0 || this.distance(corners[corners.length - 1], curr) > 30) {
          corners.push(curr);
        }
      }
    }
    return corners;
  }

  private static getAngle(a: Point, b: Point, c: Point): number {
    const ab = { x: a.x - b.x, y: a.y - b.y };
    const cb = { x: c.x - b.x, y: c.y - b.y };
    const dot = ab.x * cb.x + ab.y * cb.y;
    const magAB = Math.sqrt(ab.x * ab.x + ab.y * ab.y);
    const magCB = Math.sqrt(cb.x * cb.x + cb.y * cb.y);
    if (magAB === 0 || magCB === 0) return 0;
    const cosAngle = dot / (magAB * magCB);
    return Math.acos(Math.max(-1, Math.min(1, cosAngle)));
  }

  private static simplifyPath(points: Point[], tolerance: number): Point[] {
    if (points.length <= 2) return points.slice();
    const result: Point[] = [];
    const step = Math.max(1, Math.floor(points.length / 50));
    for (let i = 0; i < points.length; i += step) {
      result.push(points[i]);
    }
    if (result[result.length - 1] !== points[points.length - 1]) {
      result.push(points[points.length - 1]);
    }
    return result;
  }

  private static distance(a: Point, b: Point): number {
    return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
  }

  private static normalizeDirection(dx: number, dy: number): Point {
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) {
      return { x: 1, y: 0 };
    }
    return { x: dx / len, y: dy / len };
  }

  private static calculateDirectionFromCentroid(points: Point[], centroid: Point): Point {
    const endPoint = points[points.length - 1];
    return this.normalizeDirection(
      endPoint.x - centroid.x,
      endPoint.y - centroid.y
    );
  }
}
