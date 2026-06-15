import { ColorTheme } from './feather';

interface Star {
  x: number;
  y: number;
  size: number;
  baseOpacity: number;
  phase: number;
  speed: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  r: number;
  g: number;
  b: number;
}

interface BurstEffect {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
  r: number;
  g: number;
  b: number;
}

interface TrailPoint {
  x: number;
  y: number;
  age: number;
  maxAge: number;
  r: number;
  g: number;
  b: number;
  size: number;
}

export class EffectsManager {
  stars: Star[];
  particles: Particle[];
  bursts: BurstEffect[];
  mouseTrail: TrailPoint[];
  canvasWidth: number;
  canvasHeight: number;
  starCount: number;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.stars = [];
    this.particles = [];
    this.bursts = [];
    this.mouseTrail = [];
    this.starCount = 0;
    this.initStars();
  }

  private initStars() {
    const area = this.canvasWidth * this.canvasHeight;
    this.starCount = Math.floor(area / 6000);
    this.stars = [];
    for (let i = 0; i < this.starCount; i++) {
      this.stars.push({
        x: Math.random() * this.canvasWidth,
        y: Math.random() * this.canvasHeight,
        size: Math.random() * 1.8 + 0.3,
        baseOpacity: Math.random() * 0.6 + 0.2,
        phase: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.0015 + 0.0005
      });
    }
  }

  resize(width: number, height: number) {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.initStars();
  }

  addBurst(x: number, y: number, theme: ColorTheme) {
    const colors = theme.colors;
    const c = this.hexToRgb(colors[Math.floor(Math.random() * colors.length)]);

    this.bursts.push({
      x,
      y,
      radius: 0,
      maxRadius: Math.min(this.canvasWidth, this.canvasHeight) * 0.35,
      life: 0,
      maxLife: 50,
      r: c.r,
      g: c.g,
      b: c.b
    });

    const particleCount = 80;
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.3;
      const speed = Math.random() * 6 + 3;
      const pc = this.hexToRgb(colors[Math.floor(Math.random() * colors.length)]);
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: Math.random() * 40 + 30,
        size: Math.random() * 4 + 2,
        r: pc.r,
        g: pc.g,
        b: pc.b
      });
    }

    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 10 + 5;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: Math.random() * 25 + 15,
        size: Math.random() * 6 + 3,
        r: 255,
        g: 255,
        b: 240
      });
    }
  }

  addMouseTrailPoint(x: number, y: number, theme: ColorTheme) {
    const colors = theme.colors;
    const c = this.hexToRgb(colors[Math.floor(Math.random() * colors.length)]);
    this.mouseTrail.push({
      x,
      y,
      age: 0,
      maxAge: 25,
      r: c.r,
      g: c.g,
      b: c.b,
      size: Math.random() * 5 + 3
    });
    if (this.mouseTrail.length > 30) {
      this.mouseTrail.shift();
    }
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 255, g: 255, b: 255 };
  }

  update(time: number) {
    for (const star of this.stars) {
      star.phase += star.speed;
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life++;
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.vy += 0.02;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
      }
    }

    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const b = this.bursts[i];
      b.life++;
      const t = b.life / b.maxLife;
      b.radius = b.maxRadius * (1 - Math.pow(1 - t, 3));
      if (b.life >= b.maxLife) {
        this.bursts.splice(i, 1);
      }
    }

    for (let i = this.mouseTrail.length - 1; i >= 0; i--) {
      this.mouseTrail[i].age++;
      if (this.mouseTrail[i].age >= this.mouseTrail[i].maxAge) {
        this.mouseTrail.splice(i, 1);
      }
    }
  }

  renderBackground(ctx: CanvasRenderingContext2D, time: number) {
    const bgGrad = ctx.createLinearGradient(0, 0, this.canvasWidth, this.canvasHeight);
    const hueShift = Math.sin(time * 0.00005) * 10;
    bgGrad.addColorStop(0, `hsl(${250 + hueShift}, 70%, 8%)`);
    bgGrad.addColorStop(0.4, `hsl(${265 + hueShift}, 75%, 10%)`);
    bgGrad.addColorStop(0.7, `hsl(${280 + hueShift}, 80%, 7%)`);
    bgGrad.addColorStop(1, `hsl(${290 + hueShift}, 85%, 5%)`);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    const auroraCount = 3;
    for (let a = 0; a < auroraCount; a++) {
      ctx.save();
      ctx.globalAlpha = 0.08;
      const offset = time * 0.00003 + a * 0.33;
      const hue = (260 + a * 40 + Math.sin(offset * 2) * 30) % 360;
      const auroraGrad = ctx.createRadialGradient(
        this.canvasWidth * (0.3 + 0.4 * Math.sin(offset)),
        this.canvasHeight * (0.2 + 0.3 * Math.cos(offset * 1.3)),
        0,
        this.canvasWidth * (0.3 + 0.4 * Math.sin(offset)),
        this.canvasHeight * (0.2 + 0.3 * Math.cos(offset * 1.3)),
        Math.max(this.canvasWidth, this.canvasHeight) * 0.7
      );
      auroraGrad.addColorStop(0, `hsla(${hue}, 80%, 60%, 0.6)`);
      auroraGrad.addColorStop(0.4, `hsla(${(hue + 30) % 360}, 70%, 50%, 0.3)`);
      auroraGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = auroraGrad;
      ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
      ctx.restore();
    }

    for (const star of this.stars) {
      const twinkle = 0.6 + 0.4 * Math.sin(star.phase + time * 0.001);
      const opacity = star.baseOpacity * twinkle;
      const glowSize = star.size * 3;

      const glow = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, glowSize);
      glow.addColorStop(0, `rgba(255, 255, 255, ${opacity * 0.8})`);
      glow.addColorStop(0.4, `rgba(200, 220, 255, ${opacity * 0.3})`);
      glow.addColorStop(1, 'rgba(200, 220, 255, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(star.x, star.y, glowSize, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  renderBursts(ctx: CanvasRenderingContext2D) {
    for (const b of this.bursts) {
      const t = b.life / b.maxLife;
      const alpha = (1 - t) * 0.7;

      for (let ring = 0; ring < 3; ring++) {
        const ringT = t - ring * 0.1;
        if (ringT <= 0) continue;
        const ringRadius = b.radius * (1 - ring * 0.25);
        const ringAlpha = alpha * (1 - ring * 0.3);
        ctx.strokeStyle = `rgba(${b.r}, ${b.g}, ${b.b}, ${ringAlpha})`;
        ctx.lineWidth = (3 - ring) * 2 * (1 - ringT);
        ctx.beginPath();
        ctx.arc(b.x, b.y, ringRadius, 0, Math.PI * 2);
        ctx.stroke();
      }

      const innerGrad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.radius * 0.4);
      innerGrad.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.5})`);
      innerGrad.addColorStop(0.5, `rgba(${b.r}, ${b.g}, ${b.b}, ${alpha * 0.3})`);
      innerGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = innerGrad;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  renderParticles(ctx: CanvasRenderingContext2D) {
    for (const p of this.particles) {
      const t = p.life / p.maxLife;
      const alpha = (1 - t) * 0.9;
      const size = p.size * (1 - t * 0.5);

      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size * 2);
      grad.addColorStop(0, `rgba(${p.r}, ${p.g}, ${p.b}, ${alpha})`);
      grad.addColorStop(0.5, `rgba(${p.r}, ${p.g}, ${p.b}, ${alpha * 0.4})`);
      grad.addColorStop(1, `rgba(${p.r}, ${p.g}, ${p.b}, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, size * 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(${Math.min(255, p.r + 50)}, ${Math.min(255, p.g + 50)}, ${Math.min(255, p.b + 50)}, ${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, size * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  renderMouseTrail(ctx: CanvasRenderingContext2D) {
    for (const t of this.mouseTrail) {
      const alpha = (1 - t.age / t.maxAge);
      const size = t.size * alpha;

      const grad = ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, size * 3);
      grad.addColorStop(0, `rgba(${t.r}, ${t.g}, ${t.b}, ${alpha * 0.7})`);
      grad.addColorStop(1, `rgba(${t.r}, ${t.g}, ${t.b}, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(t.x, t.y, size * 3, 0, Math.PI * 2);
      ctx.fill();
    }

    if (this.mouseTrail.length >= 2) {
      for (let i = 1; i < this.mouseTrail.length; i++) {
        const t1 = this.mouseTrail[i - 1];
        const t2 = this.mouseTrail[i];
        const alpha = (1 - t1.age / t1.maxAge) * 0.5;
        ctx.strokeStyle = `rgba(${t1.r}, ${t1.g}, ${t1.b}, ${alpha})`;
        ctx.lineWidth = 2 * alpha;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(t1.x, t1.y);
        ctx.lineTo(t2.x, t2.y);
        ctx.stroke();
      }
    }
  }

  renderConnections(
    ctx: CanvasRenderingContext2D,
    connections: { x1: number; y1: number; x2: number; y2: number; alpha: number }[],
    theme: ColorTheme
  ) {
    const colors = theme.colors;
    const c = this.hexToRgb(colors[Math.floor(colors.length / 2)]);

    for (const conn of connections) {
      const gradient = ctx.createLinearGradient(conn.x1, conn.y1, conn.x2, conn.y2);
      gradient.addColorStop(0, `rgba(${c.r}, ${c.g}, ${c.b}, ${conn.alpha * 0.3})`);
      gradient.addColorStop(0.5, `rgba(${c.r}, ${c.g}, ${c.b}, ${conn.alpha})`);
      gradient.addColorStop(1, `rgba(${c.r}, ${c.g}, ${c.b}, ${conn.alpha * 0.3})`);

      ctx.strokeStyle = gradient;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(conn.x1, conn.y1);
      ctx.lineTo(conn.x2, conn.y2);
      ctx.stroke();
    }
  }
}
