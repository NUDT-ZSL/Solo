export interface Particle {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  vx: number;
  vy: number;
  initialVx: number;
  initialVy: number;
  initialSpeed: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  elapsed: number;
  sineOffset: number;
  sineAmplitude: number;
  sineFrequency: number;
  perpX: number;
  perpY: number;
}

const MAX_PARTICLES = 50;
const GRAVITY = 50;
const AIR_TURBULENCE = 1;

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles: number = MAX_PARTICLES;
  private isModifying: boolean = false;

  constructor() {}

  public emit(x: number, y: number, baseColor: string, count: number = 40): void {
    if (this.isModifying) return;
    this.isModifying = true;

    try {
      const emitCount = Math.min(count, this.maxParticles);
      
      if (this.particles.length + emitCount > this.maxParticles) {
        const removeCount = this.particles.length + emitCount - this.maxParticles;
        this.removeOldest(removeCount);
      }

      for (let i = 0; i < emitCount; i++) {
        if (this.particles.length >= this.maxParticles) {
          this.removeOldest(1);
        }

        const angle = (Math.random() - 0.5) * (Math.PI / 3) - Math.PI / 2;
        const speed = 120 + Math.random() * 80;
        const size = 2 + Math.random() * 3;
        const life = 1.5;
        const hueShift = (Math.random() - 0.5) * 20;

        const color = this.shiftHue(baseColor, hueShift);
        const sineOffset = Math.random() * Math.PI * 2 + angle * 2;
        const sineAmplitude = 10 + Math.random() * 20;
        const sineFrequency = 1 + Math.random() * 2.5;

        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        const perpX = -vy / speed;
        const perpY = vx / speed;

        const particle: Particle = {
          x,
          y,
          baseX: x,
          baseY: y,
          vx,
          vy,
          initialVx: vx,
          initialVy: vy,
          initialSpeed: speed,
          size,
          color,
          alpha: 1,
          life,
          maxLife: life,
          elapsed: 0,
          sineOffset,
          sineAmplitude,
          sineFrequency,
          perpX,
          perpY,
        };

        this.particles.push(particle);
      }
    } finally {
      this.isModifying = false;
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
    if (this.isModifying) return;
    this.isModifying = true;

    try {
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        
        p.life -= deltaTime;
        p.elapsed += deltaTime;
        
        if (p.life <= 0) {
          this.particles.splice(i, 1);
          continue;
        }

        p.alpha = Math.max(0, p.life / p.maxLife);

        p.vy += GRAVITY * deltaTime;

        const turbulenceX = (Math.random() - 0.5) * AIR_TURBULENCE * 60 * deltaTime;
        const turbulenceY = (Math.random() - 0.5) * AIR_TURBULENCE * 60 * deltaTime;

        p.baseX += p.vx * deltaTime;
        p.baseY += p.vy * deltaTime;

        const sinePhase = p.elapsed * p.sineFrequency * Math.PI * 2 + p.sineOffset;
        const sineWave = Math.sin(sinePhase) * p.sineAmplitude;

        p.x = p.baseX + p.perpX * sineWave + turbulenceX;
        p.y = p.baseY + p.perpY * sineWave + turbulenceY;
      }
    } finally {
      this.isModifying = false;
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
