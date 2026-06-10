export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  baseVx: number;
  sineOffset: number;
  sineAmplitude: number;
  sineFrequency: number;
}

const MAX_PARTICLES = 200;
const GRAVITY = 50;
const AIR_TURBULENCE = 1;

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles: number = MAX_PARTICLES;

  constructor() {}

  public emit(x: number, y: number, baseColor: string, count: number = 40): void {
    const emitCount = Math.min(count, 50);
    
    if (this.particles.length + emitCount > this.maxParticles) {
      const removeCount = this.particles.length + emitCount - this.maxParticles;
      this.removeOldest(removeCount);
    }

    for (let i = 0; i < emitCount; i++) {
      const angle = (Math.random() - 0.5) * (Math.PI / 3) - Math.PI / 2;
      const speed = 120 + Math.random() * 80;
      const size = 2 + Math.random() * 3;
      const life = 1.5;
      const hueShift = (Math.random() - 0.5) * 20;

      const color = this.shiftHue(baseColor, hueShift);
      const sineOffset = Math.random() * Math.PI * 2;
      const sineAmplitude = 5 + Math.random() * 15;
      const sineFrequency = 2 + Math.random() * 3;

      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      const particle: Particle = {
        x,
        y,
        vx,
        vy,
        baseVx: vx,
        size,
        color,
        alpha: 1,
        life,
        maxLife: life,
        sineOffset,
        sineAmplitude,
        sineFrequency,
      };

      this.particles.push(particle);
    }
  }

  private shiftHue(hexColor: string, degrees: number): string {
    const r = parseInt(hexColor.slice(1, 3), 16) / 255;
    const g = parseInt(hexColor.slice(3, 5), 16) / 255;
    const b = parseInt(hexColor.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }

    h = (h + degrees / 360) % 1;
    if (h < 0) h += 1;

    const rgb = this.hslToRgb(h, s, l);
    return `rgb(${Math.round(rgb[0] * 255)}, ${Math.round(rgb[1] * 255)}, ${Math.round(rgb[2] * 255)})`;
  }

  private hslToRgb(h: number, s: number, l: number): [number, number, number] {
    let r, g, b;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    return [r, g, b];
  }

  private removeOldest(count: number): void {
    this.particles.splice(0, count);
  }

  public update(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      
      p.life -= deltaTime;
      
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      p.alpha = Math.max(0, p.life / p.maxLife);

      p.vy += GRAVITY * deltaTime;

      const turbulenceX = (Math.random() - 0.5) * AIR_TURBULENCE * 60 * deltaTime;
      const turbulenceY = (Math.random() - 0.5) * AIR_TURBULENCE * 60 * deltaTime;

      const progress = 1 - p.life / p.maxLife;
      const sineWave = Math.sin(progress * p.sineFrequency * Math.PI + p.sineOffset) * p.sineAmplitude * deltaTime * 2;
      
      p.vx = p.baseVx + sineWave;
      p.x += p.vx * deltaTime + turbulenceX;
      p.y += p.vy * deltaTime + turbulenceY;
    }
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  public getParticles(): Particle[] {
    return this.particles;
  }

  public clear(): void {
    this.particles = [];
  }
}
