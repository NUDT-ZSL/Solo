import { Vec2, Rect, Particle } from './types';

export class PlayerShip {
  x: number;
  y: number;
  vx: number = 0;
  vy: number = 0;
  angle: number = 0;
  thrust: number = 0.15;
  friction: number = 0.98;
  rotationSpeed: number = 0.05;
  size: number = 24;
  lives: number = 3;
  invincible: boolean = false;
  invincibleTimer: number = 0;
  invincibleDuration: number = 0.5;
  invincibleFreq: number = 8;

  private keys: Set<string> = new Set();
  private canvasW: number;
  private canvasH: number;

  constructor(canvasW: number, canvasH: number) {
    this.canvasW = canvasW;
    this.canvasH = canvasH;
    this.x = canvasW * 0.15;
    this.y = canvasH * 0.5;
  }

  handleKeyDown(e: KeyboardEvent) {
    this.keys.add(e.key.toLowerCase());
  }

  handleKeyUp(e: KeyboardEvent) {
    this.keys.delete(e.key.toLowerCase());
  }

  reset(canvasW: number, canvasH: number) {
    this.canvasW = canvasW;
    this.canvasH = canvasH;
    this.x = canvasW * 0.15;
    this.y = canvasH * 0.5;
    this.vx = 0;
    this.vy = 0;
    this.angle = 0;
    this.lives = 3;
    this.invincible = false;
    this.invincibleTimer = 0;
    this.keys.clear();
  }

  update(dt: number): Particle[] {
    const trailParticles: Particle[] = [];

    if (this.keys.has('a')) {
      this.angle -= this.rotationSpeed;
    }
    if (this.keys.has('d')) {
      this.angle += this.rotationSpeed;
    }

    let thrusting = false;
    if (this.keys.has('w')) {
      this.vx += Math.cos(this.angle) * this.thrust;
      this.vy += Math.sin(this.angle) * this.thrust;
      thrusting = true;
    }
    if (this.keys.has('s')) {
      this.vx -= Math.cos(this.angle) * this.thrust * 0.5;
      this.vy -= Math.sin(this.angle) * this.thrust * 0.5;
    }

    this.vx *= this.friction;
    this.vy *= this.friction;

    this.x += this.vx;
    this.y += this.vy;

    if (this.x < 0) { this.x = 0; this.vx = 0; }
    if (this.x > this.canvasW) { this.x = this.canvasW; this.vx = 0; }
    if (this.y < 0) { this.y = 0; this.vy = 0; }
    if (this.y > this.canvasH) { this.y = this.canvasH; this.vy = 0; }

    if (this.invincible) {
      this.invincibleTimer -= dt;
      if (this.invincibleTimer <= 0) {
        this.invincible = false;
      }
    }

    if (thrusting) {
      const tailX = this.x - Math.cos(this.angle) * this.size * 0.5;
      const tailY = this.y - Math.sin(this.angle) * this.size * 0.5;
      const spread = 0.4;
      for (let i = 0; i < 2; i++) {
        const a = this.angle + Math.PI + (Math.random() - 0.5) * spread;
        const speed = 1.5 + Math.random() * 2;
        const t = Math.random();
        const r = Math.round(56 + (2 - 56) * t);
        const g = Math.round(189 + (132 - 189) * t);
        const b = Math.round(248 + (199 - 248) * t);
        trailParticles.push({
          x: tailX + (Math.random() - 0.5) * 4,
          y: tailY + (Math.random() - 0.5) * 4,
          vx: Math.cos(a) * speed + this.vx * 0.3,
          vy: Math.sin(a) * speed + this.vy * 0.3,
          life: 1.5,
          maxLife: 1.5,
          size: 2 + Math.random() * 2,
          color: `rgb(${r},${g},${b})`,
          alpha: 0.8,
        });
      }
    }

    return trailParticles;
  }

  hit() {
    if (this.invincible) return false;
    this.lives--;
    this.invincible = true;
    this.invincibleTimer = this.invincibleDuration;
    return true;
  }

  getBBox(): Rect {
    const half = this.size * 0.45;
    return {
      x: this.x - half,
      y: this.y - half,
      w: half * 2,
      h: half * 2,
    };
  }

  getAlpha(): number {
    if (!this.invincible) return 1;
    const freq = this.invincibleFreq;
    const t = this.invincibleTimer;
    const blink = Math.sin(t * freq * Math.PI * 2);
    return blink > 0 ? 1 : 0.3;
  }

  draw(ctx: CanvasRenderingContext2D) {
    const alpha = this.getAlpha();
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.globalAlpha = alpha;

    const s = this.size;
    ctx.beginPath();
    ctx.moveTo(s * 0.55, 0);
    ctx.lineTo(-s * 0.45, -s * 0.4);
    ctx.lineTo(-s * 0.3, 0);
    ctx.lineTo(-s * 0.45, s * 0.4);
    ctx.closePath();

    ctx.fillStyle = '#facc15';
    ctx.fill();
    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.globalAlpha = 1;
    ctx.restore();
  }
}
