import { Particle, ParticleOptions } from './particle';

export type ThemeName = 'nebulaPurple' | 'auroraGreen' | 'sunsetOrange';

export interface ThemePalette {
  name: ThemeName;
  label: string;
  colors: string[];
}

export const THEMES: Record<ThemeName, ThemePalette> = {
  nebulaPurple: {
    name: 'nebulaPurple',
    label: '星云紫',
    colors: [
      '#9b5de5',
      '#f15bb5',
      '#fee440',
      '#00bbf9',
      '#00f5d4',
      '#7209b7',
      '#b5179e',
      '#480ca8'
    ]
  },
  auroraGreen: {
    name: 'auroraGreen',
    label: '极光绿',
    colors: [
      '#06d6a0',
      '#118ab2',
      '#073b4c',
      '#ffd166',
      '#ef476f',
      '#2ec4b6',
      '#83e377',
      '#52b788'
    ]
  },
  sunsetOrange: {
    name: 'sunsetOrange',
    label: '落日橙',
    colors: [
      '#ff6b35',
      '#f7c59f',
      '#efefef',
      '#2e294e',
      '#d7263d',
      '#f4a261',
      '#e76f51',
      '#ff9f1c'
    ]
  }
};

export interface ParticleSystemConfig {
  particleCount: number;
  theme: ThemeName;
  forceStrength: number;
  mouseInteraction: boolean;
}

export class ParticleSystem {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private config: ParticleSystemConfig;
  private mouseX: number | null = null;
  private mouseY: number | null = null;
  private mouseActive: boolean = false;
  private mouseTimeoutId: number | null = null;
  private lastFrameTime: number = 0;
  private animationFrameId: number | null = null;
  private gridCellSize: number = 80;

  constructor(canvas: HTMLCanvasElement, config: ParticleSystemConfig) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D rendering context');
    }
    this.ctx = ctx;
    this.config = { ...config };
    this.resize();
    this.createParticles();
  }

  public getConfig(): ParticleSystemConfig {
    return { ...this.config };
  }

  public setParticleCount(count: number): void {
    this.config.particleCount = Math.max(500, Math.min(5000, count));
    this.adjustParticleCount();
  }

  public setTheme(theme: ThemeName): void {
    this.config.theme = theme;
    const palette = THEMES[theme];
    for (const particle of this.particles) {
      const newColor = palette.colors[Math.floor(Math.random() * palette.colors.length)];
      particle.setTargetColor(newColor);
    }
  }

  public setForceStrength(strength: number): void {
    this.config.forceStrength = Math.max(0, Math.min(1, strength));
  }

  public setMouseInteraction(enabled: boolean): void {
    this.config.mouseInteraction = enabled;
    if (!enabled) {
      this.mouseActive = false;
      this.mouseX = null;
      this.mouseY = null;
    }
  }

  public handleMouseMove(x: number, y: number): void {
    if (!this.config.mouseInteraction) return;
    this.mouseX = x;
    this.mouseY = y;
    this.mouseActive = true;
    if (this.mouseTimeoutId !== null) {
      clearTimeout(this.mouseTimeoutId);
    }
    this.mouseTimeoutId = window.setTimeout(() => {
      this.mouseActive = false;
    }, 800);
  }

  public handleMouseLeave(): void {
    this.mouseActive = false;
    this.mouseX = null;
    this.mouseY = null;
  }

  public handleTouchMove(x: number, y: number): void {
    this.handleMouseMove(x, y);
  }

  public handleTouchEnd(): void {
    this.handleMouseLeave();
  }

  public resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);

    for (const particle of this.particles) {
      particle.resize(rect.width, rect.height);
    }
  }

  public start(): void {
    this.lastFrameTime = performance.now();
    this.animate();
  }

  public stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.mouseTimeoutId !== null) {
      clearTimeout(this.mouseTimeoutId);
      this.mouseTimeoutId = null;
    }
  }

  private animate(): void {
    const now = performance.now();
    let deltaTime = (now - this.lastFrameTime) / 1000;
    this.lastFrameTime = now;

    if (deltaTime > 0.05) {
      deltaTime = 0.05;
    }

    this.update(deltaTime);
    this.render();

    this.animationFrameId = requestAnimationFrame(() => this.animate());
  }

  private update(deltaTime: number): void {
    const grid = this.buildGrid();

    for (let i = 0; i < this.particles.length; i++) {
      const particle = this.particles[i];
      const neighbors = this.getNeighbors(particle, grid);
      particle.applyNeighborForce(neighbors, this.config.forceStrength, deltaTime);
      particle.update(
        deltaTime,
        this.mouseX,
        this.mouseY,
        this.mouseActive,
        this.config.forceStrength
      );
    }
  }

  private buildGrid(): Map<string, Particle[]> {
    const grid = new Map<string, Particle[]>();
    const cellSize = this.gridCellSize;

    for (const particle of this.particles) {
      const cellX = Math.floor(particle.x / cellSize);
      const cellY = Math.floor(particle.y / cellSize);
      const key = `${cellX},${cellY}`;
      if (!grid.has(key)) {
        grid.set(key, []);
      }
      grid.get(key)!.push(particle);
    }

    return grid;
  }

  private getNeighbors(particle: Particle, grid: Map<string, Particle[]>): Particle[] {
    const neighbors: Particle[] = [];
    const cellSize = this.gridCellSize;
    const cellX = Math.floor(particle.x / cellSize);
    const cellY = Math.floor(particle.y / cellSize);

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const key = `${cellX + dx},${cellY + dy}`;
        const cell = grid.get(key);
        if (cell) {
          for (const p of cell) {
            neighbors.push(p);
          }
        }
      }
    }

    return neighbors;
  }

  private render(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.ctx.fillStyle = 'rgba(10, 10, 18, 0.15)';
    this.ctx.fillRect(0, 0, rect.width, rect.height);

    this.ctx.globalCompositeOperation = 'lighter';
    for (const particle of this.particles) {
      particle.render(this.ctx);
    }
    this.ctx.globalCompositeOperation = 'source-over';
  }

  private createParticles(): void {
    const rect = this.canvas.getBoundingClientRect();
    const palette = THEMES[this.config.theme];
    this.particles = [];

    for (let i = 0; i < this.config.particleCount; i++) {
      this.particles.push(this.createParticle(rect.width, rect.height, palette.colors));
    }
  }

  private adjustParticleCount(): void {
    const rect = this.canvas.getBoundingClientRect();
    const palette = THEMES[this.config.theme];
    const target = this.config.particleCount;

    while (this.particles.length < target) {
      this.particles.push(this.createParticle(rect.width, rect.height, palette.colors));
    }

    if (this.particles.length > target) {
      this.particles.length = target;
    }
  }

  private createParticle(width: number, height: number, colors: string[]): Particle {
    const options: ParticleOptions = {
      x: Math.random() * width,
      y: Math.random() * height,
      size: 2 + Math.random() * 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      speed: 0.3 + Math.random() * 0.7,
      width,
      height
    };
    return new Particle(options);
  }
}
