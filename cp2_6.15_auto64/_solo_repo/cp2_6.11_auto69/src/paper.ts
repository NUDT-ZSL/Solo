export interface Point {
  x: number;
  y: number;
}

export interface DeformedPage {
  topLeft: Point;
  topRight: Point;
  bottomLeft: Point;
  bottomRight: Point;
  foldControl: Point;
  foldControl2: Point;
  foldStart: Point;
  foldEnd: Point;
  foldMid: Point;
  backTopLeft: Point;
  backTopRight: Point;
  backBottomLeft: Point;
  backBottomRight: Point;
  backFoldControl: Point;
  progress: number;
  direction: 'next' | 'prev';
  desaturate: number;
}

type FlipState = 'idle' | 'dragging' | 'inertia';

function bezierCubic(t: number, p0: Point, p1: Point, p2: Point, p3: Point): Point {
  const mt = 1 - t;
  return {
    x: mt * mt * mt * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * p3.x,
    y: mt * mt * mt * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * p3.y
  };
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export class PageFlipper {
  private width: number;
  private height: number;

  private state: FlipState = 'idle';
  private direction: 'next' | 'prev' = 'next';

  private progress: number = 0;
  private velocity: number = 0;

  private readonly elasticity: number = 0.3;
  private readonly damping: number = 4.5;
  private readonly flipThreshold: number = 0.35;

  private dragStartX: number = 0;
  private lastMoveTime: number = 0;
  private lastMoveX: number = 0;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  isAnimating(): boolean {
    return this.state !== 'idle';
  }

  getProgress(): number {
    return this.progress;
  }

  getDirection(): 'next' | 'prev' {
    return this.direction;
  }

  startDrag(x: number, _y: number, side: 'left' | 'right'): void {
    this.state = 'dragging';
    this.direction = side === 'right' ? 'next' : 'prev';
    this.dragStartX = x;
    this.lastMoveX = x;
    this.lastMoveTime = performance.now();
    this.velocity = 0;
  }

  moveDrag(x: number, _y: number): void {
    if (this.state !== 'dragging') return;
    const now = performance.now();
    const dt = Math.max(1, now - this.lastMoveTime);
    this.velocity = (x - this.lastMoveX) / dt;
    this.lastMoveX = x;
    this.lastMoveTime = now;

    if (this.direction === 'next') {
      const dx = this.dragStartX - x;
      this.progress = Math.max(0, Math.min(1, dx / (this.width * 0.82)));
    } else {
      const dx = x - this.dragStartX;
      this.progress = Math.max(0, Math.min(1, dx / (this.width * 0.82)));
    }
  }

  endDrag(): { committed: boolean; direction: 'next' | 'prev' } {
    if (this.state !== 'dragging') {
      return { committed: false, direction: this.direction };
    }
    this.state = 'inertia';

    const vThreshold = 0.3;
    let willFlip: boolean;
    if (Math.abs(this.velocity) > vThreshold) {
      willFlip = this.direction === 'next' ? this.velocity < 0 : this.velocity > 0;
    } else {
      willFlip = this.progress > this.flipThreshold;
    }

    const targetProgress = willFlip ? 1 : 0;
    const distance = targetProgress - this.progress;
    this.velocity = distance * this.elasticity * 10;
    if (Math.abs(this.velocity) < 2.2) {
      this.velocity = (willFlip ? 1 : -1) * 2.2;
    }

    return { committed: willFlip, direction: this.direction };
  }

  triggerFlip(direction: 'next' | 'prev'): void {
    if (this.state !== 'idle') return;
    this.state = 'inertia';
    this.direction = direction;
    this.progress = 0;
    this.velocity = (direction === 'next' ? 1 : -1) * 3.0;
  }

  update(dtMs: number): boolean {
    const dt = dtMs / 1000;

    if (this.state === 'inertia') {
      this.progress += this.velocity * dt;
      const target = this.velocity > 0 ? 1 : 0;
      const spring = (target - this.progress) * this.elasticity * 12;
      this.velocity += spring * dt;
      this.velocity *= Math.max(0, 1 - this.damping * dt);

      if (this.progress >= 1) {
        this.progress = 1;
        this.state = 'idle';
        return true;
      }
      if (this.progress <= 0) {
        this.progress = 0;
        this.state = 'idle';
        return true;
      }
    }
    return false;
  }

  getDeformedPage(): DeformedPage {
    const t = this.progress;
    const w = this.width;
    const h = this.height;

    if (this.direction === 'next') {
      const curvedT = easeOutCubic(t);
      const foldX = w * (1 - curvedT);
      const arcDepth = Math.sin(t * Math.PI) * w * 0.18;
      const lift = Math.sin(t * Math.PI) * h * 0.04;

      const tl: Point = { x: 0, y: 0 };
      const bl: Point = { x: 0, y: h };

      const trFixed: Point = { x: w, y: 0 };
      const brFixed: Point = { x: w, y: h };

      const tr: Point = {
        x: foldX - arcDepth * 0.7,
        y: -lift
      };
      const br: Point = {
        x: foldX - arcDepth * 0.7,
        y: h + lift
      };

      const foldStart: Point = { x: foldX, y: 0 };
      const foldEnd: Point = { x: foldX, y: h };
      const foldMid: Point = {
        x: foldX - arcDepth * 1.0,
        y: h / 2
      };

      const foldControl: Point = {
        x: foldX - arcDepth * 1.3,
        y: h * 0.12
      };
      const foldControl2: Point = {
        x: foldX - arcDepth * 1.3,
        y: h * 0.88
      };

      const backTl: Point = { x: foldX, y: 0 };
      const backTr: Point = {
        x: foldX + arcDepth * 0.45,
        y: lift * 0.6
      };
      const backBl: Point = { x: foldX, y: h };
      const backBr: Point = {
        x: foldX + arcDepth * 0.45,
        y: h - lift * 0.6
      };
      const backFoldControl: Point = {
        x: foldX + arcDepth * 0.6,
        y: h / 2
      };

      return {
        topLeft: tl,
        topRight: tr,
        bottomLeft: bl,
        bottomRight: br,
        foldControl,
        foldControl2,
        foldStart,
        foldEnd,
        foldMid,
        backTopLeft: backTl,
        backTopRight: backTr,
        backBottomLeft: backBl,
        backBottomRight: backBr,
        backFoldControl,
        progress: t,
        direction: this.direction,
        desaturate: Math.sin(t * Math.PI) * 0.85
      };
    } else {
      const curvedT = easeOutCubic(t);
      const foldX = w * curvedT;
      const arcDepth = Math.sin(t * Math.PI) * w * 0.18;
      const lift = Math.sin(t * Math.PI) * h * 0.04;

      const tr: Point = { x: w, y: 0 };
      const br: Point = { x: w, y: h };

      const tlFixed: Point = { x: 0, y: 0 };
      const blFixed: Point = { x: 0, y: h };

      const dtl: Point = {
        x: foldX + arcDepth * 0.7,
        y: -lift
      };
      const dbl: Point = {
        x: foldX + arcDepth * 0.7,
        y: h + lift
      };

      const foldStart: Point = { x: foldX, y: 0 };
      const foldEnd: Point = { x: foldX, y: h };
      const foldMid: Point = {
        x: foldX + arcDepth * 1.0,
        y: h / 2
      };

      const foldControl: Point = {
        x: foldX + arcDepth * 1.3,
        y: h * 0.12
      };
      const foldControl2: Point = {
        x: foldX + arcDepth * 1.3,
        y: h * 0.88
      };

      const backTl: Point = {
        x: foldX - arcDepth * 0.45,
        y: lift * 0.6
      };
      const backTr: Point = { x: foldX, y: 0 };
      const backBl: Point = {
        x: foldX - arcDepth * 0.45,
        y: h - lift * 0.6
      };
      const backBr: Point = { x: foldX, y: h };
      const backFoldControl: Point = {
        x: foldX - arcDepth * 0.6,
        y: h / 2
      };

      return {
        topLeft: dtl,
        topRight: tr,
        bottomLeft: dbl,
        bottomRight: br,
        foldControl,
        foldControl2,
        foldStart,
        foldEnd,
        foldMid,
        backTopLeft: backTl,
        backTopRight: backTr,
        backBottomLeft: backBl,
        backBottomRight: backBr,
        backFoldControl,
        progress: t,
        direction: this.direction,
        desaturate: Math.sin(t * Math.PI) * 0.85
      };
    }
  }

  sampleFoldCurve(progress: number): Point[] {
    const t = progress;
    const deformed = this.getDeformedPage();
    const samples: Point[] = [];
    for (let i = 0; i <= 20; i++) {
      const st = i / 20;
      const p = bezierCubic(
        st,
        deformed.foldStart,
        deformed.foldControl,
        deformed.foldControl2,
        deformed.foldEnd
      );
      samples.push(p);
    }
    return samples;
  }

  reset(): void {
    this.state = 'idle';
    this.progress = 0;
    this.velocity = 0;
  }
}
