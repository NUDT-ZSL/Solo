export interface Point {
  x: number;
  y: number;
}

export interface SilkThread {
  id: number;
  start: Point;
  end: Point;
  startColor: string;
  endColor: string;
  startHue: number;
  endHue: number;
  createdAt: number;
}

export interface Intersection {
  point: Point;
  threadIds: number[];
}

export interface OctagonRing {
  center: Point;
  createdAt: number;
  threads: SilkThread[];
  animationProgress: number;
}

export class WebManager {
  private threads: SilkThread[] = [];
  private intersections: Intersection[] = [];
  private rings: OctagonRing[] = [];
  private nextThreadId: number = 0;
  public readonly MAX_THREADS: number = 200;

  public addThread(start: Point, end: Point): SilkThread | null {
    if (this.threads.length >= this.MAX_THREADS) {
      return null;
    }

    const direction: number = this.calculateDirection(start, end);
    const startHue: number = this.hexToHue('#FF6B6B');
    const endHue: number = this.calculateEndHue(startHue, direction);
    const startColor: string = this.hslToString(startHue, 80, 65);
    const endColor: string = this.hslToString(endHue, 80, 65);

    const thread: SilkThread = {
      id: this.nextThreadId++,
      start,
      end,
      startColor,
      endColor,
      startHue,
      endHue,
      createdAt: performance.now()
    };

    this.threads.push(thread);
    this.updateIntersections(thread);
    return thread;
  }

  public addOctagonRing(center: Point): OctagonRing | null {
    if (this.threads.length + 8 >= this.MAX_THREADS) {
      return null;
    }

    const ringThreads: SilkThread[] = [];
    const baseHue: number = Math.random() * 360;

    for (let i: number = 0; i < 8; i++) {
      const angle: number = (i / 8) * Math.PI * 2;
      const end: Point = {
        x: center.x + Math.cos(angle) * 25,
        y: center.y + Math.sin(angle) * 25
      };

      const startHue: number = baseHue + i * 15;
      const endHue: number = baseHue + 180 + i * 15;

      const thread: SilkThread = {
        id: this.nextThreadId++,
        start: center,
        end,
        startColor: this.hslToString(startHue, 80, 65),
        endColor: this.hslToString(endHue, 80, 65),
        startHue,
        endHue,
        createdAt: performance.now()
      };

      ringThreads.push(thread);
      this.threads.push(thread);
    }

    const ring: OctagonRing = {
      center,
      createdAt: performance.now(),
      threads: ringThreads,
      animationProgress: 0
    };

    this.rings.push(ring);
    return ring;
  }

  public updateRings(deltaTime: number): void {
    for (const ring of this.rings) {
      if (ring.animationProgress < 1) {
        ring.animationProgress = Math.min(1, ring.animationProgress + deltaTime / 0.5);
      }
    }
  }

  public getRings(): OctagonRing[] {
    return this.rings;
  }

  public getThreads(): SilkThread[] {
    return this.threads;
  }

  public findNearestThread(point: Point, maxDistance: number = 8): SilkThread | null {
    let nearest: SilkThread | null = null;
    let nearestDist: number = maxDistance;

    for (const thread of this.threads) {
      const dist: number = this.pointToLineDistance(point, thread.start, thread.end);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = thread;
      }
    }

    return nearest;
  }

  public findIntersection(point: Point, maxDistance: number = 10): Intersection | null {
    let nearest: Intersection | null = null;
    let nearestDist: number = maxDistance;

    for (const intersection of this.intersections) {
      const dx: number = point.x - intersection.point.x;
      const dy: number = point.y - intersection.point.y;
      const dist: number = Math.sqrt(dx * dx + dy * dy);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = intersection;
      }
    }

    return nearest;
  }

  public pointToLineDistance(point: Point, lineStart: Point, lineEnd: Point): number {
    const dx: number = lineEnd.x - lineStart.x;
    const dy: number = lineEnd.y - lineStart.y;
    const lenSq: number = dx * dx + dy * dy;

    if (lenSq === 0) {
      const pdx: number = point.x - lineStart.x;
      const pdy: number = point.y - lineStart.y;
      return Math.sqrt(pdx * pdx + pdy * pdy);
    }

    let t: number = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));

    const projX: number = lineStart.x + t * dx;
    const projY: number = lineStart.y + t * dy;

    const finalDx: number = point.x - projX;
    const finalDy: number = point.y - projY;
    return Math.sqrt(finalDx * finalDx + finalDy * finalDy);
  }

  public clear(): void {
    this.threads = [];
    this.intersections = [];
    this.rings = [];
  }

  private updateIntersections(newThread: SilkThread): void {
    const newIntersections: Intersection[] = [];

    for (const existingThread of this.threads.slice(0, -1)) {
      const intersectionPoint: Point | null = this.lineIntersection(
        newThread.start,
        newThread.end,
        existingThread.start,
        existingThread.end
      );

      if (intersectionPoint) {
        let found: boolean = false;

        for (const existingIntersection of this.intersections) {
          const dx: number = existingIntersection.point.x - intersectionPoint.x;
          const dy: number = existingIntersection.point.y - intersectionPoint.y;
          if (dx * dx + dy * dy < 25) {
            if (existingIntersection.threadIds.indexOf(newThread.id) === -1) {
              existingIntersection.threadIds.push(newThread.id);
            }
            if (existingIntersection.threadIds.indexOf(existingThread.id) === -1) {
              existingIntersection.threadIds.push(existingThread.id);
            }
            found = true;
            break;
          }
        }

        if (!found) {
          newIntersections.push({
            point: intersectionPoint,
            threadIds: [newThread.id, existingThread.id]
          });
        }
      }
    }

    for (const inter of newIntersections) {
      this.intersections.push(inter);
    }
  }

  private lineIntersection(
    p1: Point,
    p2: Point,
    p3: Point,
    p4: Point
  ): Point | null {
    const denom: number = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);

    if (Math.abs(denom) < 0.0001) {
      return null;
    }

    const ua: number = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denom;
    const ub: number = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denom;

    if (ua > 0.01 && ua < 0.99 && ub > 0.01 && ub < 0.99) {
      return {
        x: p1.x + ua * (p2.x - p1.x),
        y: p1.y + ua * (p2.y - p1.y)
      };
    }

    return null;
  }

  private calculateDirection(start: Point, end: Point): number {
    return Math.atan2(end.y - start.y, end.x - start.x);
  }

  private calculateEndHue(startHue: number, direction: number): number {
    const hueShift: number = (direction / Math.PI) * 180;
    return (startHue + hueShift + 180) % 360;
  }

  private hexToHue(hex: string): number {
    const r: number = parseInt(hex.slice(1, 3), 16) / 255;
    const g: number = parseInt(hex.slice(3, 5), 16) / 255;
    const b: number = parseInt(hex.slice(5, 7), 16) / 255;

    const max: number = Math.max(r, g, b);
    const min: number = Math.min(r, g, b);
    let h: number = 0;

    if (max !== min) {
      const d: number = max - min;
      if (max === r) {
        h = 60 * (((g - b) / d) + (g < b ? 6 : 0));
      } else if (max === g) {
        h = 60 * (((b - r) / d) + 2);
      } else {
        h = 60 * (((r - g) / d) + 4);
      }
    }

    return h;
  }

  private hslToString(h: number, s: number, l: number): string {
    return `hsl(${h}, ${s}%, ${l}%)`;
  }
}
