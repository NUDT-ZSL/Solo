export type ParticleType = 'thrust' | 'explosion' | 'star' | 'debris';

export interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  age: number;
  size: number;
  startSize: number;
  color: string;
  alpha: number;
  startAlpha: number;
  type: ParticleType;
}

const MAX_PARTICLES = 1000;

export class ParticleSystem {
  private pool: Particle[] = [];
  private starParticles: Particle[] = [];
  private canvasWidth: number = 0;
  private canvasHeight: number = 0;

  constructor() {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.pool.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        age: 0,
        size: 0,
        startSize: 0,
        color: '#ffffff',
        alpha: 0,
        startAlpha: 0,
        type: 'thrust',
      });
    }
  }

  setCanvasSize(w: number, h: number): void {
    this.canvasWidth = w;
    this.canvasHeight = h;
    this.generateStars(Math.floor((w * h) / 6000));
  }

  private generateStars(count: number): void {
    this.starParticles = [];
    for (let i = 0; i < count; i++) {
      this.starParticles.push({
        active: true,
        x: Math.random() * this.canvasWidth,
        y: Math.random() * this.canvasHeight,
        vx: (Math.random() - 0.5) * 0.05,
        vy: (Math.random() - 0.5) * 0.05,
        life: Infinity,
        age: Math.random() * 10000,
        size: 0.5 + Math.random() * 1.5,
        startSize: 0,
        color: this.getStarColor(),
        alpha: 0.3 + Math.random() * 0.7,
        startAlpha: 0,
        type: 'star',
      });
    }
  }

  private getStarColor(): string {
    const r = Math.random();
    if (r < 0.6) return '#ffffff';
    if (r < 0.75) return '#aaccff';
    if (r < 0.85) return '#ffddaa';
    if (r < 0.93) return '#ffaaaa';
    return '#aaaaff';
  }

  emitThrust(x: number, y: number, angle: number, color: string, intensity: number = 1): void {
    const count = Math.ceil(2 * intensity);
    for (let i = 0; i < count; i++) {
      const p = this.alloc();
      if (!p) return;
      const spread = 0.3;
      const dir = angle + Math.PI + (Math.random() - 0.5) * spread;
      const speed = 30 + Math.random() * 60 * intensity;
      p.active = true;
      p.x = x + (Math.random() - 0.5) * 3;
      p.y = y + (Math.random() - 0.5) * 3;
      p.vx = Math.cos(dir) * speed;
      p.vy = Math.sin(dir) * speed;
      p.life = 300 + Math.random() * 200;
      p.age = 0;
      p.startSize = 2 + Math.random() * 3 * intensity;
      p.size = p.startSize;
      p.color = color;
      p.startAlpha = 0.8;
      p.alpha = p.startAlpha;
      p.type = 'thrust';
    }
  }

  emitExplosion(x: number, y: number, baseColor: string = '#ff8844'): void {
    const count = 20;
    const palette = ['#ffffff', '#ffff88', baseColor, '#ff4422', '#aa2200'];
    for (let i = 0; i < count; i++) {
      const p = this.alloc();
      if (!p) return;
      const dir = (Math.PI * 2 * i) / count + Math.random() * 0.3;
      const speed = 20 + Math.random() * 100;
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(dir) * speed;
      p.vy = Math.sin(dir) * speed;
      p.life = 300;
      p.age = 0;
      p.startSize = 2 + Math.random() * 4;
      p.size = p.startSize;
      p.color = palette[Math.floor(Math.random() * palette.length)];
      p.startAlpha = 1;
      p.alpha = 1;
      p.type = 'explosion';
    }
  }

  emitDebris(x: number, y: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const p = this.alloc();
      if (!p) return;
      const dir = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 120;
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(dir) * speed;
      p.vy = Math.sin(dir) * speed;
      p.life = 600 + Math.random() * 400;
      p.age = 0;
      p.startSize = 2 + Math.random() * 4;
      p.size = p.startSize;
      p.color = this.getDebrisColor();
      p.startAlpha = 0.9;
      p.alpha = 0.9;
      p.type = 'debris';
    }
  }

  private getDebrisColor(): string {
    const colors = ['#887766', '#aa8866', '#665544', '#998877', '#776655'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  private alloc(): Particle | null {
    for (let i = 0; i < this.pool.length; i++) {
      if (!this.pool[i].active) {
        return this.pool[i];
      }
    }
    return null;
  }

  update(dt: number): void {
    for (let i = 0; i < this.pool.length; i++) {
      const p = this.pool[i];
      if (!p.active) continue;
      p.age += dt;
      if (p.age >= p.life) {
        p.active = false;
        continue;
      }
      const t = p.age / p.life;
      p.x += p.vx * (dt / 1000);
      p.y += p.vy * (dt / 1000);
      if (p.type === 'thrust') {
        p.vx *= 0.96;
        p.vy *= 0.96;
        p.size = p.startSize * (1 - t * 0.7);
        p.alpha = p.startAlpha * (1 - t);
      } else if (p.type === 'explosion') {
        p.vx *= 0.93;
        p.vy *= 0.93;
        p.size = p.startSize + t * 15;
        const easeOut = 1 - Math.pow(1 - t, 3);
        p.alpha = p.startAlpha * (1 - easeOut);
      } else if (p.type === 'debris') {
        p.vx *= 0.99;
        p.vy *= 0.99;
        p.size = p.startSize * (1 - t * 0.5);
        p.alpha = p.startAlpha * (1 - t);
      }
    }
    for (let i = 0; i < this.starParticles.length; i++) {
      const s = this.starParticles[i];
      s.age += dt;
      s.x += s.vx * (dt / 1000);
      s.y += s.vy * (dt / 1000);
      if (s.x < 0) s.x += this.canvasWidth;
      if (s.x > this.canvasWidth) s.x -= this.canvasWidth;
      if (s.y < 0) s.y += this.canvasHeight;
      if (s.y > this.canvasHeight) s.y -= this.canvasHeight;
    }
  }

  drawBackgroundStars(ctx: CanvasRenderingContext2D, time: number): void {
    ctx.save();
    for (let i = 0; i < this.starParticles.length; i++) {
      const s = this.starParticles[i];
      const twinkle = 0.6 + 0.4 * Math.sin((time + s.age) * 0.003 + i);
      ctx.globalAlpha = s.alpha * twinkle;
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawForeground(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    for (let i = 0; i < this.pool.length; i++) {
      const p = this.pool[i];
      if (!p.active) continue;
      if (p.x < -50 || p.x > this.canvasWidth + 50 ||
          p.y < -50 || p.y > this.canvasHeight + 50) {
        continue;
      }
      ctx.globalAlpha = Math.max(0, p.alpha);
      if (p.type === 'explosion') {
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
        grad.addColorStop(0, p.color);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
      } else {
        ctx.fillStyle = p.color;
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  getActiveCount(): number {
    let n = 0;
    for (let i = 0; i < this.pool.length; i++) {
      if (this.pool[i].active) n++;
    }
    return n;
  }
}
