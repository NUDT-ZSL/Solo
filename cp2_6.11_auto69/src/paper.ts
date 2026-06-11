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
  foldStart: Point;
  foldEnd: Point;
  backTopLeft: Point;
  backTopRight: Point;
  backBottomLeft: Point;
  backBottomRight: Point;
  progress: number;
  direction: 'next' | 'prev';
  desaturate: number;
}

type FlipState = 'idle' | 'dragging' | 'inertia';

export class PageFlipper {
  private width: number;
  private height: number;
  private cx: number;
  private cy: number;

  private state: FlipState = 'idle';
  private direction: 'next' | 'prev' = 'next';

  private progress: number = 0;
  private velocity: number = 0;

  private readonly elasticity: number = 0.3;
  private readonly damping: number = 4.5;
  private readonly flipThreshold: number = 0.35;

  private dragStartX: number = 0;
  private dragX: number = 0;
  private lastMoveTime: number = 0;
  private lastMoveX: number = 0;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.cx = width / 2;
    this.cy = height / 2;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.cx = width / 2;
    this.cy = height / 2;
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
    this.dragX = x;
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
    this.dragX = x;

    if (this.direction === 'next') {
      const dx = this.dragStartX - x;
      this.progress = Math.max(0, Math.min(1, dx / (this.width * 0.85)));
    } else {
      const dx = x - this.dragStartX;
      this.progress = Math.max(0, Math.min(1, dx / (this.width * 0.85)));
    }
  }

  endDrag(): { committed: boolean; direction: 'next' | 'prev' } {
    if (this.state !== 'dragging') {
      return { committed: false, direction: this.direction };
    }
    this.state = 'inertia';

    const vThreshold = 0.35;
    let willFlip: boolean;
    if (Math.abs(this.velocity) > vThreshold) {
      willFlip = this.direction === 'next' ? this.velocity < 0 : this.velocity > 0;
    } else {
      willFlip = this.progress > this.flipThreshold;
    }

    const targetProgress = willFlip ? 1 : 0;
    const distance = targetProgress - this.progress;
    this.velocity = distance * this.elasticity * 10;
    if (willFlip) {
      this.velocity = Math.max(this.velocity, (willFlip ? 1 : -1) * 2.5);
    }

    return { committed: willFlip, direction: this.direction };
  }

  triggerFlip(direction: 'next' | 'prev'): void {
    if (this.state !== 'idle') return;
    this.state = 'inertia';
    this.direction = direction;
    this.progress = 0;
    this.velocity = (direction === 'next' ? 1 : -1) * 3.2;
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

    const tl: Point = { x: 0, y: 0 };
    const bl: Point = { x: 0, y: h };

    if (this.direction === 'next') {
      const foldX = w * (1 - t);
      const curveDepth = Math.sin(t * Math.PI) * w * 0.12;

      const tr: Point = { x: foldX - curveDepth, y: -h * 0.02 * t };
      const br: Point = { x: foldX - curveDepth, y: h + h * 0.02 * t };

      const foldStart: Point = { x: foldX, y: 0 };
      const foldEnd: Point = { x: foldX, y: h };
      const foldControl: Point = {
        x: foldX - curveDepth * 1.4,
        y: h / 2
      };

      const backTl: Point = { x: foldX, y: 0 };
      const backTr: Point = { x: foldX + curveDepth * 0.6, y: h * 0.05 * t };
      const backBl: Point = { x: foldX, y: h };
      const backBr: Point = { x: foldX + curveDepth * 0.6, y: h - h * 0.05 * t };

      return {
        topLeft: tl,
        topRight: tr,
        bottomLeft: bl,
        bottomRight: br,
        foldControl,
        foldStart,
        foldEnd,
        backTopLeft: backTl,
        backTopRight: backTr,
        backBottomLeft: backBl,
        backBottomRight: backBr,
        progress: t,
        direction: this.direction,
        desaturate: Math.sin(t * Math.PI) * 0.7
      };
    } else {
      const foldX = w * t;
      const curveDepth = Math.sin(t * Math.PI) * w * 0.12;

      const tr: Point = { x: w, y: 0 };
      const br: Point = { x: w, y: h };

      const dtl: Point = { x: foldX + curveDepth, y: -h * 0.02 * t };
      const dbl: Point = { x: foldX + curveDepth, y: h + h * 0.02 * t };

      const foldStart: Point = { x: foldX, y: 0 };
      const foldEnd: Point = { x: foldX, y: h };
      const foldControl: Point = {
        x: foldX + curveDepth * 1.4,
        y: h / 2
      };

      const backTl: Point = { x: foldX - curveDepth * 0.6, y: h * 0.05 * t };
      const backTr: Point = { x: foldX, y: 0 };
      const backBl: Point = { x: foldX - curveDepth * 0.6, y: h - h * 0.05 * t };
      const backBr: Point = { x: foldX, y: h };

      return {
        topLeft: dtl,
        topRight: tr,
        bottomLeft: dbl,
        bottomRight: br,
        foldControl,
        foldStart,
        foldEnd,
        backTopLeft: backTl,
        backTopRight: backTr,
        backBottomLeft: backBl,
        backBottomRight: backBr,
        progress: t,
        direction: this.direction,
        desaturate: Math.sin(t * Math.PI) * 0.7
      };
    }
  }

  reset(): void {
    this.state = 'idle';
    this.progress = 0;
    this.velocity = 0;
  }
}
