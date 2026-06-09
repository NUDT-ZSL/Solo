import { Point, SilkThread, WebManager } from './web';

export interface TrailDot {
  x: number;
  y: number;
  alpha: number;
  hue: number;
}

export interface SpiderConfig {
  speed: number;
}

export class Spider {
  public x: number;
  public y: number;
  public currentThread: SilkThread | null;
  public progress: number;
  public direction: 1 | -1;
  public trail: TrailDot[];
  public speed: number;
  public legPhase: number;
  public bodyColor: string;
  public radius: number;
  public hue: number;
  public readonly MAX_TRAIL_DOTS: number = 5;

  constructor(startPoint: Point, config: SpiderConfig) {
    this.x = startPoint.x;
    this.y = startPoint.y;
    this.currentThread = null;
    this.progress = 0;
    this.direction = 1;
    this.trail = [];
    this.speed = config.speed;
    this.legPhase = 0;
    this.bodyColor = '#FFD93D';
    this.radius = 6;
    this.hue = 50;
  }

  public update(
    deltaTime: number,
    webManager: WebManager,
    threads: SilkThread[]
  ): void {
    this.legPhase += deltaTime * 2 * Math.PI * 2;

    if (!this.currentThread && threads.length > 0) {
      this.currentThread = this.findNearestThread(threads);
      if (this.currentThread) {
        this.progress = this.calculateProgressOnThread(this.currentThread);
        this.direction = Math.random() > 0.5 ? 1 : -1;
      }
    }

    if (this.currentThread) {
      const thread: SilkThread = this.currentThread;
      const dx: number = thread.end.x - thread.start.x;
      const dy: number = thread.end.y - thread.start.y;
      const length: number = Math.sqrt(dx * dx + dy * dy);

      if (length > 0) {
        const moveAmount: number = (this.speed * deltaTime) / length;
        this.progress += moveAmount * this.direction;

        if (this.progress >= 1) {
          this.progress = 1;
          this.chooseNewDirection(webManager, thread);
        } else if (this.progress <= 0) {
          this.progress = 0;
          this.chooseNewDirection(webManager, thread);
        }

        this.x = thread.start.x + this.progress * dx;
        this.y = thread.start.y + this.progress * dy;
      }
    }

    this.updateTrail();
  }

  private chooseNewDirection(
    webManager: WebManager,
    currentThread: SilkThread
  ): void {
    const currentPoint: Point = { x: this.x, y: this.y };
    const allThreads: SilkThread[] = webManager.getThreads();
    let nearestThread: SilkThread | null = null;
    let nearestDistance: number = Infinity;

    for (const thread of allThreads) {
      if (thread.id === currentThread.id) {
        continue;
      }

      const distToStart: number = this.distance(currentPoint, thread.start);
      const distToEnd: number = this.distance(currentPoint, thread.end);

      if (distToStart < 15 && distToStart < nearestDistance) {
        nearestDistance = distToStart;
        nearestThread = thread;
        this.progress = 0;
        this.direction = 1;
      } else if (distToEnd < 15 && distToEnd < nearestDistance) {
        nearestDistance = distToEnd;
        nearestThread = thread;
        this.progress = 1;
        this.direction = -1;
      }
    }

    if (nearestThread) {
      this.currentThread = nearestThread;
    } else {
      this.direction = (this.direction === 1 ? -1 : 1) as 1 | -1;
    }
  }

  private findNearestThread(threads: SilkThread[]): SilkThread | null {
    let nearest: SilkThread | null = null;
    let nearestDist: number = Infinity;

    for (const thread of threads) {
      const dist: number = this.pointToThreadDistance(
        { x: this.x, y: this.y },
        thread
      );
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = thread;
      }
    }

    return nearest;
  }

  private calculateProgressOnThread(thread: SilkThread): number {
    const dx: number = thread.end.x - thread.start.x;
    const dy: number = thread.end.y - thread.start.y;
    const lenSq: number = dx * dx + dy * dy;

    if (lenSq === 0) {
      return 0;
    }

    let t: number = ((this.x - thread.start.x) * dx + (this.y - thread.start.y) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    return t;
  }

  private pointToThreadDistance(point: Point, thread: SilkThread): number {
    const dx: number = thread.end.x - thread.start.x;
    const dy: number = thread.end.y - thread.start.y;
    const lenSq: number = dx * dx + dy * dy;

    if (lenSq === 0) {
      return this.distance(point, thread.start);
    }

    let t: number = ((point.x - thread.start.x) * dx + (point.y - thread.start.y) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));

    const projX: number = thread.start.x + t * dx;
    const projY: number = thread.start.y + t * dy;

    const finalDx: number = point.x - projX;
    const finalDy: number = point.y - projY;
    return Math.sqrt(finalDx * finalDx + finalDy * finalDy);
  }

  private distance(a: Point, b: Point): number {
    const dx: number = a.x - b.x;
    const dy: number = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private updateTrail(): void {
    this.trail.unshift({
      x: this.x,
      y: this.y,
      alpha: 0.6,
      hue: this.hue
    });

    if (this.trail.length > this.MAX_TRAIL_DOTS) {
      this.trail.pop();
    }

    for (let i: number = 0; i < this.trail.length; i++) {
      this.trail[i].alpha = 0.6 * (1 - i / this.MAX_TRAIL_DOTS);
    }
  }

  public setSpeed(speed: number): void {
    this.speed = speed;
  }
}

export class SpiderManager {
  public spiders: Spider[];
  public readonly MAX_SPIDERS: number = 10;
  private config: SpiderConfig;

  constructor(config: SpiderConfig) {
    this.spiders = [];
    this.config = config;
  }

  public addSpider(startPoint: Point): Spider | null {
    if (this.spiders.length >= this.MAX_SPIDERS) {
      return null;
    }

    const spider: Spider = new Spider(startPoint, { ...this.config });
    this.spiders.push(spider);
    return spider;
  }

  public update(deltaTime: number, webManager: WebManager): void {
    const threads: SilkThread[] = webManager.getThreads();
    for (const spider of this.spiders) {
      spider.update(deltaTime, webManager, threads);
    }
  }

  public updateSpeed(speed: number): void {
    this.config.speed = speed;
    for (const spider of this.spiders) {
      spider.setSpeed(speed);
    }
  }

  public clear(): void {
    this.spiders = [];
  }
}
