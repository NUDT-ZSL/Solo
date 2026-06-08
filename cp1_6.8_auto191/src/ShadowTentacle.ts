import { TentaclePlacement } from './MazeGenerator';

export interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
  time: number;
}

export class ShadowTentacle {
  x: number;
  y: number;
  path: { x: number; y: number }[];
  currentPathIndex: number;
  direction: 1 | -1;
  speed: number;
  trail: TrailPoint[];
  maxTrailLength: number;
  segmentProgress: number;
  private alive: boolean;

  constructor(placement: TentaclePlacement) {
    this.x = placement.startX;
    this.y = placement.startY;
    this.path = placement.path;
    this.currentPathIndex = 0;
    this.direction = 1;
    this.speed = 40 + Math.random() * 30;
    this.trail = [];
    this.maxTrailLength = 15;
    this.segmentProgress = 0;
    this.alive = true;
  }

  update(dt: number): void {
    if (!this.alive || this.path.length < 2) return;

    const currentTarget = this.path[this.currentPathIndex];
    const nextIndex = this.currentPathIndex + this.direction;

    if (nextIndex < 0 || nextIndex >= this.path.length) {
      this.direction = (this.direction * -1) as 1 | -1;
      return;
    }

    const nextTarget = this.path[nextIndex];
    const dx = nextTarget.x - currentTarget.x;
    const dy = nextTarget.y - currentTarget.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist === 0) {
      this.currentPathIndex = nextIndex;
      return;
    }

    this.segmentProgress += (this.speed * dt) / dist;

    if (this.segmentProgress >= 1) {
      this.segmentProgress = 0;
      this.currentPathIndex = nextIndex;
      this.x = nextTarget.x;
      this.y = nextTarget.y;

      if (nextIndex === 0 || nextIndex === this.path.length - 1) {
        this.direction = (this.direction * -1) as 1 | -1;
      }
    } else {
      this.x = currentTarget.x + dx * this.segmentProgress;
      this.y = currentTarget.y + dy * this.segmentProgress;
    }

    this.trail.unshift({ x: this.x, y: this.y, alpha: 1, time: performance.now() });
    if (this.trail.length > this.maxTrailLength) {
      this.trail.pop();
    }

    for (let i = 0; i < this.trail.length; i++) {
      this.trail[i].alpha = 1 - i / this.maxTrailLength;
    }
  }

  checkCollision(px: number, py: number, radius: number): boolean {
    const dx = this.x - px;
    const dy = this.y - py;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist < radius + 8;
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (this.trail.length < 2) {
      this.renderHead(ctx);
      return;
    }

    for (let i = 0; i < this.trail.length - 1; i++) {
      const p1 = this.trail[i];
      const p2 = this.trail[i + 1];
      const alpha = p1.alpha * 0.6;

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      const gradient = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
      gradient.addColorStop(0, `rgba(80, 20, 120, ${alpha})`);
      gradient.addColorStop(1, `rgba(10, 0, 20, ${alpha * 0.5})`);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = Math.max(1, 6 * p1.alpha);
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    this.renderHead(ctx);
  }

  private renderHead(ctx: CanvasRenderingContext2D): void {
    const glowRadius = 12;
    const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, glowRadius);
    gradient.addColorStop(0, 'rgba(120, 30, 160, 0.9)');
    gradient.addColorStop(0.4, 'rgba(60, 10, 100, 0.6)');
    gradient.addColorStop(1, 'rgba(10, 0, 20, 0)');

    ctx.beginPath();
    ctx.arc(this.x, this.y, glowRadius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(this.x, this.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(180, 50, 220, 0.95)';
    ctx.fill();
  }
}
