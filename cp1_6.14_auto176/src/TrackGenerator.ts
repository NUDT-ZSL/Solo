export interface Point {
  x: number;
  y: number;
}

export interface TrackSegment {
  start: Point;
  control1: Point;
  control2: Point;
  end: Point;
  isCurve: boolean;
}

export interface Obstacle {
  x: number;
  y: number;
  rotation: number;
}

export interface EnergyOrb {
  x: number;
  y: number;
  collected: boolean;
}

export interface TrackData {
  trackPoints: Point[];
  segments: TrackSegment[];
  obstacles: Obstacle[];
  energyOrbs: EnergyOrb[];
  finishLine: { start: Point; end: Point };
  totalLength: number;
}

class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  nextRange(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
}

export class TrackGenerator {
  private random: SeededRandom;
  private _difficulty: number;

  constructor(difficulty: number = 1, seed?: number) {
    this._difficulty = difficulty;
    this.random = new SeededRandom(seed ?? Date.now());
  }

  generate(): TrackData {
    const startTime = performance.now();
    
    const difficultyFactor = Math.max(0.5, Math.min(2, this._difficulty));
    const minCurves = Math.max(6, Math.floor(6 * difficultyFactor));
    const maxCurves = Math.min(10, Math.floor(10 * difficultyFactor)) + 1;
    const numCurves = Math.floor(this.random.nextRange(minCurves, maxCurves));
    const centerX = 1000;
    const centerY = 1000;
    const baseRadius = 320;
    
    const controlPoints: Point[] = [];
    for (let i = 0; i < numCurves; i++) {
      const angle = (i / numCurves) * Math.PI * 2;
      const radiusVariation = this.random.nextRange(-80, 80);
      const radius = baseRadius + radiusVariation;
      controlPoints.push({
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius
      });
    }

    const segments: TrackSegment[] = [];
    for (let i = 0; i < numCurves; i++) {
      const p0 = controlPoints[i];
      const p3 = controlPoints[(i + 1) % numCurves];
      const prevP = controlPoints[(i - 1 + numCurves) % numCurves];
      const nextP = controlPoints[(i + 2) % numCurves];

      const tension = 0.4;
      const cp1 = this.calculateControlPoint(prevP, p0, p3, tension, true);
      const cp2 = this.calculateControlPoint(p0, p3, nextP, tension, false);

      segments.push({
        start: p0,
        control1: cp1,
        control2: cp2,
        end: p3,
        isCurve: true
      });
    }

    const trackPoints: Point[] = [];
    const pointsPerSegment = 40;
    for (const segment of segments) {
      for (let t = 0; t < 1; t += 1 / pointsPerSegment) {
        trackPoints.push(this.bezier(segment.start, segment.control1, segment.control2, segment.end, t));
      }
    }

    const totalLength = this.calculateTrackLength(trackPoints);
    
    const obstacles = this.generateObstacles(trackPoints, segments, numCurves);
    const energyOrbs = this.generateEnergyOrbs(trackPoints, segments, centerX, centerY);
    
    const finishLine = this.calculateFinishLine(trackPoints);

    const endTime = performance.now();
    if (endTime - startTime > 10) {
      console.warn(`Track generation took ${endTime - startTime}ms, exceeded 10ms limit`);
    }

    return {
      trackPoints,
      segments,
      obstacles,
      energyOrbs,
      finishLine,
      totalLength
    };
  }

  private calculateControlPoint(p0: Point, p1: Point, p2: Point, tension: number, isFirst: boolean): Point {
    const d01 = Math.sqrt((p1.x - p0.x) ** 2 + (p1.y - p0.y) ** 2);
    const d12 = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
    const fa = tension * d01 / (d01 + d12);
    const fb = tension * d12 / (d01 + d12);

    if (isFirst) {
      return {
        x: p1.x + fa * (p2.x - p0.x),
        y: p1.y + fa * (p2.y - p0.y)
      };
    } else {
      return {
        x: p1.x - fb * (p2.x - p0.x),
        y: p1.y - fb * (p2.y - p0.y)
      };
    }
  }

  private bezier(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;
    const t2 = t * t;
    const t3 = t2 * t;

    return {
      x: mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
      y: mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y
    };
  }

  private calculateTrackLength(points: Point[]): number {
    let length = 0;
    for (let i = 0; i < points.length; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % points.length];
      length += Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
    }
    return length;
  }

  private getNormalAtPoint(points: Point[], index: number, centerX: number, centerY: number): Point {
    const p0 = points[(index - 1 + points.length) % points.length];
    const p1 = points[index];
    const p2 = points[(index + 1) % points.length];
    
    const tangent = {
      x: p2.x - p0.x,
      y: p2.y - p0.y
    };
    
    const len = Math.sqrt(tangent.x ** 2 + tangent.y ** 2);
    const normTangent = { x: tangent.x / len, y: tangent.y / len };
    
    const toCenter = { x: centerX - p1.x, y: centerY - p1.y };
    const dot = normTangent.x * toCenter.x + normTangent.y * toCenter.y;
    const perp = { x: toCenter.x - dot * normTangent.x, y: toCenter.y - dot * normTangent.y };
    const perpLen = Math.sqrt(perp.x ** 2 + perp.y ** 2);
    
    return { x: perp.x / perpLen, y: perp.y / perpLen };
  }

  private generateObstacles(trackPoints: Point[], segments: TrackSegment[], numCurves: number): Obstacle[] {
    const obstacles: Obstacle[] = [];
    const pointsPerSegment = Math.floor(trackPoints.length / numCurves);
    const centerX = 1000;
    const centerY = 1000;

    for (let segIndex = 0; segIndex < segments.length; segIndex++) {
      const numObstacles = Math.floor(this.random.nextRange(2, 4));
      const startIdx = segIndex * pointsPerSegment;
      
      for (let i = 0; i < numObstacles; i++) {
        const t = (i + 1) / (numObstacles + 1);
        const pointIdx = Math.floor(startIdx + t * pointsPerSegment) % trackPoints.length;
        const point = trackPoints[pointIdx];
        const normal = this.getNormalAtPoint(trackPoints, pointIdx, centerX, centerY);
        const offset = 35;

        obstacles.push({
          x: point.x + normal.x * offset,
          y: point.y + normal.y * offset,
          rotation: this.random.nextRange(0, Math.PI * 2)
        });
      }
    }

    return obstacles;
  }

  private generateEnergyOrbs(trackPoints: Point[], segments: TrackSegment[], centerX: number, centerY: number): EnergyOrb[] {
    const energyOrbs: EnergyOrb[] = [];
    const pointsPerSegment = Math.floor(trackPoints.length / segments.length);

    for (let segIndex = 0; segIndex < segments.length; segIndex++) {
      const numOrbs = Math.floor(this.random.nextRange(2, 4));
      const startIdx = segIndex * pointsPerSegment;
      
      for (let i = 0; i < numOrbs; i++) {
        const t = (i + 1) / (numOrbs + 1);
        const pointIdx = Math.floor(startIdx + t * pointsPerSegment) % trackPoints.length;
        const point = trackPoints[pointIdx];
        const normal = this.getNormalAtPoint(trackPoints, pointIdx, centerX, centerY);
        const offset = 50;

        energyOrbs.push({
          x: point.x - normal.x * offset,
          y: point.y - normal.y * offset,
          collected: false
        });
      }
    }

    return energyOrbs;
  }

  private calculateFinishLine(trackPoints: Point[]): { start: Point; end: Point } {
    const startPoint = trackPoints[0];
    const nextPoint = trackPoints[1];
    
    const dx = nextPoint.x - startPoint.x;
    const dy = nextPoint.y - startPoint.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    
    const perpX = -dy / len;
    const perpY = dx / len;
    
    const lineLength = 100;
    
    return {
      start: {
        x: startPoint.x + perpX * lineLength / 2,
        y: startPoint.y + perpY * lineLength / 2
      },
      end: {
        x: startPoint.x - perpX * lineLength / 2,
        y: startPoint.y - perpY * lineLength / 2
      }
    };
  }

  static getTrackWidth(): number {
    return 80;
  }
}
