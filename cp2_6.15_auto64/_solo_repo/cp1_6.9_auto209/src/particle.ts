export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  brightness: number;
  twinkleSpeed: number;
  twinkleOffset: number;
}

export interface ColorTheme {
  name: string;
  center: [number, number, number];
  edge: [number, number, number];
  particles: [number, number, number][];
}

export const colorThemes: Record<string, ColorTheme> = {
  fantasy: {
    name: '幻彩',
    center: [255, 180, 100],
    edge: [180, 80, 255],
    particles: [
      [255, 120, 200],
      [120, 200, 255],
      [255, 220, 120],
      [180, 120, 255],
      [255, 160, 100],
    ],
  },
  aurora: {
    name: '极光',
    center: [100, 255, 200],
    edge: [80, 120, 255],
    particles: [
      [100, 255, 180],
      [120, 200, 255],
      [180, 255, 120],
      [80, 220, 255],
      [200, 120, 255],
    ],
  },
  lava: {
    name: '熔岩',
    center: [255, 120, 60],
    edge: [255, 60, 30],
    particles: [
      [255, 100, 50],
      [255, 180, 80],
      [255, 60, 30],
      [255, 200, 100],
      [200, 50, 30],
    ],
  },
  ice: {
    name: '冰晶',
    center: [200, 240, 255],
    edge: [100, 180, 255],
    particles: [
      [200, 240, 255],
      [150, 220, 255],
      [255, 255, 255],
      [180, 230, 255],
      [120, 200, 255],
    ],
  },
};

export class ParticleSystem {
  particles: Particle[] = [];
  maxParticles: number;
  theme: ColorTheme;
  centerX: number = 0;
  centerY: number = 0;
  vortexRotation: number = 0;
  vortexScale: number = 1;

  constructor(maxParticles: number = 500, themeKey: string = 'fantasy') {
    this.maxParticles = maxParticles;
    this.theme = colorThemes[themeKey] || colorThemes.fantasy;
  }

  setMaxParticles(count: number) {
    this.maxParticles = count;
  }

  setTheme(themeKey: string) {
    this.theme = colorThemes[themeKey] || colorThemes.fantasy;
  }

  setCenter(x: number, y: number) {
    this.centerX = x;
    this.centerY = y;
  }

  setVortexState(rotation: number, scale: number) {
    this.vortexRotation = rotation;
    this.vortexScale = scale;
  }

  emit(count: number = 5) {
    for (let i = 0; i < count && this.particles.length < this.maxParticles; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 2.5;
      const colorSet = this.theme.particles;
      const color = colorSet[Math.floor(Math.random() * colorSet.length)];
      const maxLife = 60 + Math.random() * 120;

      this.particles.push({
        x: this.centerX + (Math.random() - 0.5) * 20,
        y: this.centerY + (Math.random() - 0.5) * 20,
        vx: Math.cos(angle) * speed + Math.cos(this.vortexRotation) * 0.5,
        vy: Math.sin(angle) * speed + Math.sin(this.vortexRotation) * 0.5,
        life: maxLife,
        maxLife,
        size: 1 + Math.random() * 2.5,
        color: `rgb(${color[0]}, ${color[1]}, ${color[2]})`,
        brightness: 0.6 + Math.random() * 0.4,
        twinkleSpeed: 0.05 + Math.random() * 0.1,
        twinkleOffset: Math.random() * Math.PI * 2,
      });
    }
  }

  update(time: number) {
    const toRemove: number[] = [];

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];

      const dx = p.x - this.centerX;
      const dy = p.y - this.centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxDist = 200 * this.vortexScale;

      if (dist > 0) {
        const cosR = Math.cos(this.vortexRotation * 0.02);
        const sinR = Math.sin(this.vortexRotation * 0.02);
        const nx = dx * cosR - dy * sinR;
        const ny = dx * sinR + dy * cosR;
        p.vx += (nx - dx) * 0.002;
        p.vy += (ny - dy) * 0.002;
      }

      if (dist > 10) {
        const outward = 0.015;
        p.vx += (dx / dist) * outward;
        p.vy += (dy / dist) * outward;
      }

      p.vx *= 0.985;
      p.vy *= 0.985;

      p.x += p.vx;
      p.y += p.vy;

      p.life--;

      if (dist > maxDist || p.life <= 0) {
        toRemove.push(i);
      }
    }

    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.particles.splice(toRemove[i], 1);
    }

    const emitCount = Math.floor(3 + Math.random() * 4);
    this.emit(emitCount);

    this.currentTime = time;
  }

  private currentTime: number = 0;

  render(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (const p of this.particles) {
      const lifeRatio = p.life / p.maxLife;
      const twinkle = 0.6 + 0.4 * Math.sin(this.currentTime * p.twinkleSpeed + p.twinkleOffset);
      const alpha = lifeRatio * twinkle * p.brightness;
      const size = p.size * (0.5 + lifeRatio * 0.5);

      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size * 3);
      gradient.addColorStop(0, this.hexWithAlpha(p.color, alpha));
      gradient.addColorStop(0.4, this.hexWithAlpha(p.color, alpha * 0.4));
      gradient.addColorStop(1, this.hexWithAlpha(p.color, 0));

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(p.x, p.y, size * 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = this.hexWithAlpha('rgb(255, 255, 255)', alpha * 0.9);
      ctx.beginPath();
      ctx.arc(p.x, p.y, size * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private hexWithAlpha(rgbStr: string, alpha: number): string {
    const match = rgbStr.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
      return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${alpha})`;
    }
    return `rgba(255, 255, 255, ${alpha})`;
  }
}
