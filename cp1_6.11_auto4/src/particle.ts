interface BurstParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  initialRadius: number;
  age: number;
  maxAge: number;
  alive: boolean;
}

export class ParticleSystem {
  particles: BurstParticle[];
  private glowCanvas: HTMLCanvasElement;
  private glowCtx: CanvasRenderingContext2D;

  constructor() {
    this.particles = [];
    this.glowCanvas = document.createElement('canvas');
    this.glowCanvas.width = 64;
    this.glowCanvas.height = 64;
    this.glowCtx = this.glowCanvas.getContext('2d')!;
    this.buildGlowSprite();
  }

  private buildGlowSprite(): void {
    const ctx = this.glowCtx;
    const w = this.glowCanvas.width;
    const h = this.glowCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    ctx.clearRect(0, 0, w, h);

    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, w / 2);
    grad.addColorStop(0, 'rgba(255,225,130,1)');
    grad.addColorStop(0.3, 'rgba(255,210,80,0.55)');
    grad.addColorStop(0.6, 'rgba(255,180,50,0.2)');
    grad.addColorStop(1, 'rgba(255,160,30,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  spawnBurst(x: number, y: number): void {
    const count = 8 + Math.floor(Math.random() * 5);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 100;
      const radius = 3;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        initialRadius: radius,
        age: 0,
        maxAge: 2,
        alive: true,
      });
    }
  }

  update(dt: number): void {
    for (const p of this.particles) {
      if (!p.alive) continue;
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.96;
      p.vy *= 0.96;
      if (p.age >= p.maxAge) {
        p.alive = false;
      }
    }
    if (this.particles.length > 0 && this.particles.length < 500) {
      this.particles = this.particles.filter((p) => p.alive);
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const len = this.particles.length;
    if (len === 0) return;

    const sprite = this.glowCanvas;
    const spriteW = sprite.width;
    const spriteH = sprite.height;

    for (let i = 0; i < len; i++) {
      const p = this.particles[i];
      if (!p.alive) continue;

      const progress = p.age / p.maxAge;
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const alpha = 1 - easeOut;
      if (alpha <= 0.01) continue;

      const currentRadius = Math.max(0.1, p.initialRadius * (1 - easeOut));
      if (currentRadius < 0.2) continue;

      ctx.globalAlpha = alpha;
      const drawSize = currentRadius * 8;
      ctx.drawImage(
        sprite,
        p.x - drawSize / 2,
        p.y - drawSize / 2,
        drawSize,
        drawSize
      );

      ctx.globalAlpha = alpha * 0.95;
      ctx.beginPath();
      ctx.arc(p.x, p.y, currentRadius, 0, Math.PI * 2);
      ctx.fillStyle = '#FFF2B0';
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  reset(): void {
    this.particles = [];
  }
}
