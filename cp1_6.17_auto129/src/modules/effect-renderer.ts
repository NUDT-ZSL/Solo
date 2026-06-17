import type { EffectType } from './element-combination';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  type: 'circle' | 'spark' | 'smoke' | 'shard';
  rotation: number;
  rotationSpeed: number;
}

export interface EffectRendererOptions {
  canvas: HTMLCanvasElement;
  maxParticles?: number;
}

export class EffectRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private maxParticles: number;
  private animationId: number | null = null;
  private screenShake: { x: number; y: number; intensity: number; duration: number } = {
    x: 0,
    y: 0,
    intensity: 0,
    duration: 0,
  };
  private glow: { x: number; y: number; radius: number; color: string; intensity: number } | null = null;
  private onComplete: (() => void) | null = null;
  private isRunning: boolean = false;

  constructor(options: EffectRendererOptions) {
    this.canvas = options.canvas;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }
    this.ctx = ctx;
    this.maxParticles = options.maxParticles || 200;
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.animate();
  }

  stop(): void {
    this.isRunning = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  clear(): void {
    this.particles = [];
    this.glow = null;
    this.screenShake.intensity = 0;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  playSpellEffect(effectType: EffectType, color: string, x: number, y: number, intensity: number = 1): void {
    this.glow = {
      x,
      y,
      radius: 80 * intensity,
      color,
      intensity: 0.8,
    };

    this.screenShake.intensity = 8 * intensity;
    this.screenShake.duration = 300;

    switch (effectType) {
      case 'fire':
        this.spawnFireParticles(x, y, intensity, color);
        break;
      case 'water':
        this.spawnWaterParticles(x, y, intensity, color);
        break;
      case 'wind':
        this.spawnWindParticles(x, y, intensity, color);
        break;
      case 'thunder':
        this.spawnThunderParticles(x, y, intensity, color);
        break;
      case 'steam':
        this.spawnSteamParticles(x, y, intensity, color);
        break;
      case 'storm':
        this.spawnStormParticles(x, y, intensity, color);
        break;
      case 'blizzard':
        this.spawnBlizzardParticles(x, y, intensity, color);
        break;
      case 'plasma':
        this.spawnPlasmaParticles(x, y, intensity, color);
        break;
      case 'electromagnetic':
        this.spawnElectromagneticParticles(x, y, intensity, color);
        break;
      default:
        this.spawnFireParticles(x, y, intensity, color);
    }
  }

  playCrystalShatter(x: number, y: number, color: string = '#00BFFF'): void {
    this.screenShake.intensity = 15;
    this.screenShake.duration = 500;

    const shardCount = 40;
    for (let i = 0; i < shardCount; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (Math.PI * 2 * i) / shardCount + Math.random() * 0.3;
      const speed = 3 + Math.random() * 5;

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        life: 1000,
        maxLife: 1000,
        color,
        size: 4 + Math.random() * 6,
        type: 'shard',
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.3,
      });
    }

    for (let i = 0; i < 30; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 800,
        maxLife: 800,
        color: '#ffffff',
        size: 2 + Math.random() * 3,
        type: 'spark',
        rotation: 0,
        rotationSpeed: 0,
      });
    }

    this.glow = {
      x,
      y,
      radius: 100,
      color,
      intensity: 1,
    };
  }

  private spawnFireParticles(x: number, y: number, intensity: number, color: string): void {
    const count = Math.floor(60 * intensity);
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.8;
      const speed = 2 + Math.random() * 4 * intensity;

      this.particles.push({
        x: x + (Math.random() - 0.5) * 30,
        y: y + (Math.random() - 0.5) * 20,
        vx: Math.cos(angle) * speed * 0.5,
        vy: Math.sin(angle) * speed,
        life: 600 + Math.random() * 400,
        maxLife: 1000,
        color: Math.random() > 0.5 ? color : '#FFD700',
        size: 3 + Math.random() * 5,
        type: 'circle',
        rotation: 0,
        rotationSpeed: 0,
      });
    }

    for (let i = 0; i < 15; i++) {
      if (this.particles.length >= this.maxParticles) break;

      this.particles.push({
        x: x + (Math.random() - 0.5) * 20,
        y: y + Math.random() * 10,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -1 - Math.random() * 1.5,
        life: 1000 + Math.random() * 500,
        maxLife: 1500,
        color: '#333333',
        size: 8 + Math.random() * 8,
        type: 'smoke',
        rotation: 0,
        rotationSpeed: 0,
      });
    }
  }

  private spawnWaterParticles(x: number, y: number, intensity: number, color: string): void {
    const count = Math.floor(50 * intensity);
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3 * intensity;

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed + 1,
        life: 800 + Math.random() * 400,
        maxLife: 1200,
        color,
        size: 3 + Math.random() * 4,
        type: 'circle',
        rotation: 0,
        rotationSpeed: 0,
      });
    }
  }

  private spawnWindParticles(x: number, y: number, intensity: number, color: string): void {
    const count = Math.floor(40 * intensity);
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 4 * intensity;

      this.particles.push({
        x: x + (Math.random() - 0.5) * 40,
        y: y + (Math.random() - 0.5) * 40,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.5,
        life: 500 + Math.random() * 500,
        maxLife: 1000,
        color,
        size: 2 + Math.random() * 3,
        type: 'spark',
        rotation: angle,
        rotationSpeed: 0.1,
      });
    }
  }

  private spawnThunderParticles(x: number, y: number, intensity: number, color: string): void {
    const count = Math.floor(30 * intensity);
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 6 * intensity;

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 300 + Math.random() * 300,
        maxLife: 600,
        color,
        size: 2 + Math.random() * 3,
        type: 'spark',
        rotation: 0,
        rotationSpeed: 0,
      });
    }

    for (let i = 0; i < 8; i++) {
      if (this.particles.length >= this.maxParticles) break;

      this.particles.push({
        x: x + (Math.random() - 0.5) * 20,
        y: y - 10 - Math.random() * 50,
        vx: (Math.random() - 0.5) * 2,
        vy: 8 + Math.random() * 4,
        life: 200,
        maxLife: 200,
        color: '#FFFFFF',
        size: 3,
        type: 'spark',
        rotation: 0,
        rotationSpeed: 0,
      });
    }
  }

  private spawnSteamParticles(x: number, y: number, intensity: number, color: string): void {
    const count = Math.floor(35 * intensity);
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      this.particles.push({
        x: x + (Math.random() - 0.5) * 50,
        y: y + Math.random() * 20,
        vx: (Math.random() - 0.5) * 1,
        vy: -1 - Math.random() * 2,
        life: 1200 + Math.random() * 800,
        maxLife: 2000,
        color,
        size: 10 + Math.random() * 15,
        type: 'smoke',
        rotation: 0,
        rotationSpeed: 0,
      });
    }
  }

  private spawnStormParticles(x: number, y: number, intensity: number, color: string): void {
    this.spawnWaterParticles(x, y, intensity * 0.7, color);
    this.spawnThunderParticles(x, y, intensity * 0.6, '#FFD700');
  }

  private spawnBlizzardParticles(x: number, y: number, intensity: number, color: string): void {
    const count = Math.floor(80 * intensity);
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = -Math.PI / 4 + (Math.random() - 0.5) * Math.PI * 0.5;
      const speed = 2 + Math.random() * 3 * intensity;

      this.particles.push({
        x: x + (Math.random() - 0.5) * 150,
        y: y - 50 - Math.random() * 100,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed + 2,
        life: 1500 + Math.random() * 1000,
        maxLife: 2500,
        color: Math.random() > 0.7 ? color : '#FFFFFF',
        size: 2 + Math.random() * 4,
        type: 'circle',
        rotation: 0,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
      });
    }

    this.spawnWindParticles(x, y, intensity * 0.5, color);
  }

  private spawnPlasmaParticles(x: number, y: number, intensity: number, color: string): void {
    const count = Math.floor(50 * intensity);
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 5 * intensity;

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 500 + Math.random() * 500,
        maxLife: 1000,
        color: Math.random() > 0.5 ? color : '#FFD700',
        size: 4 + Math.random() * 4,
        type: 'circle',
        rotation: 0,
        rotationSpeed: 0,
      });
    }

    this.screenShake.intensity = 12 * intensity;
    this.screenShake.duration = 400;
  }

  private spawnElectromagneticParticles(x: number, y: number, intensity: number, color: string): void {
    const count = Math.floor(45 * intensity);
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = Math.random() * Math.PI * 2;
      const radius = 30 + Math.random() * 50;
      const speed = 2 + Math.random() * 3 * intensity;
      const orbitAngle = Math.random() * Math.PI * 2;

      this.particles.push({
        x: x + Math.cos(orbitAngle) * radius,
        y: y + Math.sin(orbitAngle) * radius,
        vx: Math.cos(angle) * speed * 0.3,
        vy: Math.sin(angle) * speed * 0.3,
        life: 800 + Math.random() * 600,
        maxLife: 1400,
        color: Math.random() > 0.5 ? color : '#9370DB',
        size: 3 + Math.random() * 3,
        type: 'spark',
        rotation: angle,
        rotationSpeed: 0.15,
      });
    }
  }

  private animate = (): void => {
    if (!this.isRunning) return;

    this.update();
    this.render();

    this.animationId = requestAnimationFrame(this.animate);
  };

  private update(): void {
    const dt = 16.67;

    if (this.screenShake.duration > 0) {
      this.screenShake.duration -= dt;
      if (this.screenShake.duration <= 0) {
        this.screenShake.intensity = 0;
        this.screenShake.x = 0;
        this.screenShake.y = 0;
      } else {
        const intensity = this.screenShake.intensity * (this.screenShake.duration / 300);
        this.screenShake.x = (Math.random() - 0.5) * intensity * 2;
        this.screenShake.y = (Math.random() - 0.5) * intensity * 2;
      }
    }

    if (this.glow) {
      this.glow.intensity *= 0.98;
      if (this.glow.intensity < 0.01) {
        this.glow = null;
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      p.x += p.vx;
      p.y += p.vy;

      if (p.type === 'smoke') {
        p.vy -= 0.02;
        p.vx *= 0.99;
        p.size += 0.05;
      } else if (p.type === 'shard') {
        p.vy += 0.15;
        p.vx *= 0.99;
        p.rotation += p.rotationSpeed;
      } else {
        p.vy += 0.05;
      }

      if (p.type === 'spark' || p.rotationSpeed !== 0) {
        p.rotation += p.rotationSpeed;
      }
    }

    if (this.particles.length === 0 && !this.glow && this.screenShake.duration <= 0) {
      if (this.onComplete) {
        const callback = this.onComplete;
        this.onComplete = null;
        callback();
      }
    }
  }

  private render(): void {
    const ctx = this.ctx;
    const { width, height } = this.canvas;

    ctx.clearRect(0, 0, width, height);

    ctx.save();
    if (this.screenShake.duration > 0) {
      ctx.translate(this.screenShake.x, this.screenShake.y);
    }

    if (this.glow) {
      const gradient = ctx.createRadialGradient(
        this.glow.x,
        this.glow.y,
        0,
        this.glow.x,
        this.glow.y,
        this.glow.radius
      );
      gradient.addColorStop(0, this.hexToRgba(this.glow.color, this.glow.intensity * 0.8));
      gradient.addColorStop(0.5, this.hexToRgba(this.glow.color, this.glow.intensity * 0.3));
      gradient.addColorStop(1, this.hexToRgba(this.glow.color, 0));

      ctx.fillStyle = gradient;
      ctx.fillRect(
        this.glow.x - this.glow.radius,
        this.glow.y - this.glow.radius,
        this.glow.radius * 2,
        this.glow.radius * 2
      );
    }

    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      ctx.save();

      if (p.type === 'smoke') {
        ctx.globalAlpha = alpha * 0.4;
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
        gradient.addColorStop(0, p.color);
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'spark') {
        ctx.globalAlpha = alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.fillRect(-p.size, -1, p.size * 2, 2);
      } else if (p.type === 'shard') {
        ctx.globalAlpha = alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.moveTo(0, -p.size);
        ctx.lineTo(p.size * 0.6, p.size * 0.5);
        ctx.lineTo(-p.size * 0.6, p.size * 0.5);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    ctx.restore();
  }

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  setOnComplete(callback: () => void): void {
    this.onComplete = callback;
  }

  getParticleCount(): number {
    return this.particles.length;
  }
}
