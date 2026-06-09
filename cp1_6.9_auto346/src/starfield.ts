export interface Star {
  x: number;
  y: number;
  r: number;
  yellow: number;
  alpha: number;
}

const STAR_COUNT = 800;

export class Starfield {
  private stars: Star[] = [];
  private bgCanvas: HTMLCanvasElement;
  private bgCtx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;

  constructor() {
    this.bgCanvas = document.createElement('canvas');
    const ctx = this.bgCanvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D not supported');
    this.bgCtx = ctx;
  }

  resize(w: number, h: number): void {
    this.width = w;
    this.height = h;
    this.bgCanvas.width = Math.max(1, Math.floor(w));
    this.bgCanvas.height = Math.max(1, Math.floor(h));
    this.renderBackground();
    if (this.stars.length === 0) {
      this.generateStars();
    } else {
      this.remapStars();
    }
  }

  private renderBackground(): void {
    const ctx = this.bgCtx;
    const w = this.bgCanvas.width;
    const h = this.bgCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const maxR = Math.sqrt(w * w + h * h) * 0.55;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR);
    grad.addColorStop(0, '#1a1a3e');
    grad.addColorStop(0.6, '#101036');
    grad.addColorStop(1, '#0b0b2e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  private generateStars(): void {
    this.stars = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        r: 1 + Math.random() * 2,
        yellow: Math.random(),
        alpha: 0.6 + Math.random() * 0.4
      });
    }
  }

  private remapStars(): void {
    for (const s of this.stars) {
      s.x = Math.random() * this.width;
      s.y = Math.random() * this.height;
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.drawImage(this.bgCanvas, 0, 0, this.width, this.height);
    const stars = this.stars;
    ctx.beginPath();
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      ctx.moveTo(s.x + s.r, s.y);
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    }
    const grad = ctx.createRadialGradient(0, 0, 0, 1, 1, 2);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 1;
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      const t = s.yellow;
      const r = 255;
      const g = Math.floor(240 + t * 15);
      const b = Math.floor(200 + t * 55);
      ctx.fillStyle = `rgba(${r},${g},${b},${s.alpha})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
