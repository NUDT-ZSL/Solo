export interface GravityResult {
  pullX: number;
  pullY: number;
  dangerT: number;
  collided: boolean;
  hasBlackHole: boolean;
  bhX: number;
  bhY: number;
}

export class BlackHole {
  private x: number = -9999;
  private y: number = -9999;
  private radius: number = 60;
  private influence: number = 150;
  private rotation: number = 0;
  private spawnTimer: number = 30;
  private active: boolean = false;
  private w: number = 0;
  private h: number = 0;
  private rotSpeed: number = (120 * Math.PI) / 180;

  resize(w: number, h: number): void {
    this.w = w;
    this.h = h;
  }

  isActive(): boolean {
    return this.active;
  }

  update(dt: number, shipX: number, shipY: number, minerals: Array<{ x: number; y: number }>): GravityResult {
    this.rotation += this.rotSpeed * dt;
    this.spawnTimer -= dt;

    if (!this.active && this.spawnTimer <= 0) {
      this.spawn(shipX, shipY, minerals);
      this.spawnTimer = 30;
    }

    if (!this.active) {
      return {
        pullX: 0,
        pullY: 0,
        dangerT: 0,
        collided: false,
        hasBlackHole: false,
        bhX: -9999,
        bhY: -9999
      };
    }

    const dx = this.x - shipX;
    const dy = this.y - shipY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    let pullX = 0;
    let pullY = 0;
    let dangerT = 0;
    let collided = false;

    if (dist < this.influence) {
      const ratio = 1 - dist / this.influence;
      const strength = 0.05 * (0.3 + ratio * 1.2);
      pullX = dx * strength;
      pullY = dy * strength;
      dangerT = ratio;
    }

    if (dist < 10) {
      collided = true;
      this.active = false;
      this.spawnTimer = 30;
    }

    return {
      pullX,
      pullY,
      dangerT,
      collided,
      hasBlackHole: true,
      bhX: this.x,
      bhY: this.y
    };
  }

  private spawn(shipX: number, shipY: number, minerals: Array<{ x: number; y: number }>): void {
    const minDist = 150;
    const pad = 80;
    let tries = 0;
    while (tries < 200) {
      tries++;
      const cx = pad + Math.random() * (this.w - pad * 2);
      const cy = pad + Math.random() * (this.h - pad * 2);
      const ddx = cx - shipX;
      const ddy = cy - shipY;
      if (ddx * ddx + ddy * ddy < minDist * minDist) continue;
      let ok = true;
      for (const m of minerals) {
        const mdx = cx - m.x;
        const mdy = cy - m.y;
        if (mdx * mdx + mdy * mdy < minDist * minDist) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;
      this.x = cx;
      this.y = cy;
      this.active = true;
      this.rotation = Math.random() * Math.PI * 2;
      return;
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.active) return;
    const cx = this.x;
    const cy = this.y;
    const r = this.radius;
    const inf = this.influence;

    const ringGrad = ctx.createRadialGradient(cx, cy, r, cx, cy, inf);
    ringGrad.addColorStop(0, 'rgba(80, 30, 100, 0.25)');
    ringGrad.addColorStop(0.5, 'rgba(40, 20, 60, 0.1)');
    ringGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = ringGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, inf, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.rotation);
    for (let band = 4; band >= 1; band--) {
      const bandR = r * (0.35 + band * 0.2);
      const alpha = 0.08 + band * 0.05;
      ctx.beginPath();
      for (let a = 0; a < Math.PI * 2; a += 0.03) {
        const wobble = Math.sin(a * 5 + band) * (3 + band * 2);
        const rr = bandR + wobble;
        const px = Math.cos(a) * rr;
        const py = Math.sin(a) * rr;
        if (a === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      const swirl = ctx.createRadialGradient(0, 0, r * 0.1, 0, 0, bandR * 1.2);
      swirl.addColorStop(0, `rgba(20, 20, 30, ${alpha})`);
      swirl.addColorStop(0.5, `rgba(60, 50, 75, ${alpha * 0.9})`);
      swirl.addColorStop(1, `rgba(30, 25, 40, ${alpha * 0.3})`);
      ctx.fillStyle = swirl;
      ctx.fill();
    }
    ctx.restore();

    const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    core.addColorStop(0, '#000000');
    core.addColorStop(0.7, '#08080f');
    core.addColorStop(1, 'rgba(25, 15, 35, 0.9)');
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = core;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    const edge = ctx.createRadialGradient(cx, cy, r * 0.85, cx, cy, r);
    edge.addColorStop(0, 'rgba(100, 50, 150, 0)');
    edge.addColorStop(1, 'rgba(160, 80, 220, 0.45)');
    ctx.strokeStyle = edge;
    ctx.lineWidth = 3;
    ctx.stroke();
  }
}
