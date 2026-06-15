import { Particle, ParticleOptions, RGB } from './particle';

export type ThemeName = 'nebulaPurple' | 'auroraGreen' | 'sunsetOrange';

export interface ThemePalette {
  name: ThemeName;
  label: string;
  colors: string[];
  rgbColors: RGB[];
}

function hexToRgb(hex: string): RGB {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16)
  };
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
    ],
    get rgbColors() {
      return this.colors.map(hexToRgb);
    }
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
    ],
    get rgbColors() {
      return this.colors.map(hexToRgb);
    }
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
    ],
    get rgbColors() {
      return this.colors.map(hexToRgb);
    }
  }
};

export interface ParticleSystemConfig {
  particleCount: number;
  theme: ThemeName;
  forceStrength: number;
  mouseInteraction: boolean;
  trailLength: number;
  trailEnabled: boolean;
}

interface FPSStats {
  fps: number;
  minFPS: number;
  maxFPS: number;
  avgFPS: number;
  frameCount: number;
  totalTime: number;
}

export class ParticleSystem {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private config: ParticleSystemConfig;

  private mouseX: number | null = null;
  private mouseY: number | null = null;
  private prevMouseX: number | null = null;
  private prevMouseY: number | null = null;
  private mouseVelX: number = 0;
  private mouseVelY: number = 0;
  private mouseActive: boolean = false;
  private mouseTimeoutId: number | null = null;
  private mouseFade: number = 0;

  private lastFrameTime: number = 0;
  private animationFrameId: number | null = null;

  private gridCellSize: number = 60;
  private grid: Particle[][] = [];
  private gridCols: number = 0;
  private gridRows: number = 0;

  private fpsStats: FPSStats = {
    fps: 0,
    minFPS: 999,
    maxFPS: 0,
    avgFPS: 0,
    frameCount: 0,
    totalTime: 0
  };
  private fpsUpdateTimer: number = 0;
  private fpsFrames: number = 0;

  private minDist: number = 20;
  private maxDist: number = 55;
  private minDistSq: number = 400;
  private maxDistSq: number = 3025;
  private repelStrength: number = 0.15;
  private attractStrength: number = 0.04;

  private forceUpdateCounter: number = 0;

  constructor(canvas: HTMLCanvasElement, config: ParticleSystemConfig) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
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

  public getFPS(): number {
    return this.fpsStats.fps;
  }

  public getAvgFPS(): number {
    return this.fpsStats.avgFPS;
  }

  public getMinFPS(): number {
    return this.fpsStats.minFPS;
  }

  public getMaxFPS(): number {
    return this.fpsStats.maxFPS;
  }

  public getParticleCount(): number {
    return this.particles.length;
  }

  public setParticleCount(count: number): void {
    const target = Math.max(500, Math.min(5000, count));
    if (target === this.config.particleCount) return;
    this.config.particleCount = target;
    this.adjustParticleCount();
  }

  public setTheme(theme: ThemeName): void {
    this.config.theme = theme;
    const palette = THEMES[theme];
    const rgbColors = palette.rgbColors;
    for (const particle of this.particles) {
      const newColor = rgbColors[Math.floor(Math.random() * rgbColors.length)];
      particle.setTargetColor(newColor);
    }
  }

  public setForceStrength(strength: number): void {
    this.config.forceStrength = Math.max(0, Math.min(1, strength));
    this.repelStrength = 0.15 * this.config.forceStrength;
    this.attractStrength = 0.04 * this.config.forceStrength;
  }

  public setMouseInteraction(enabled: boolean): void {
    this.config.mouseInteraction = enabled;
    if (!enabled) {
      this.mouseActive = false;
      this.mouseX = null;
      this.mouseY = null;
      this.mouseVelX = 0;
      this.mouseVelY = 0;
    }
  }

  public setTrailLength(length: number): void {
    this.config.trailLength = Math.max(0, Math.min(20, length));
    for (const particle of this.particles) {
      particle.setTrailLength(this.config.trailLength);
    }
  }

  public setTrailEnabled(enabled: boolean): void {
    this.config.trailEnabled = enabled;
    for (const particle of this.particles) {
      particle.setTrailEnabled(enabled);
    }
  }

  public handleMouseMove(x: number, y: number): void {
    if (!this.config.mouseInteraction) return;

    this.prevMouseX = this.mouseX;
    this.prevMouseY = this.mouseY;
    this.mouseX = x;
    this.mouseY = y;
    this.mouseActive = true;
    this.mouseFade = 1;

    if (this.prevMouseX !== null && this.prevMouseY !== null) {
      this.mouseVelX = x - this.prevMouseX;
      this.mouseVelY = y - this.prevMouseY;
    }

    if (this.mouseTimeoutId !== null) {
      clearTimeout(this.mouseTimeoutId);
    }
    this.mouseTimeoutId = window.setTimeout(() => {
      this.mouseActive = false;
    }, 600);
  }

  public handleMouseLeave(): void {
    this.mouseActive = false;
    this.mouseX = null;
    this.mouseY = null;
    this.mouseVelX = 0;
    this.mouseVelY = 0;
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
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);

    this.gridCols = Math.ceil(rect.width / this.gridCellSize) + 1;
    this.gridRows = Math.ceil(rect.height / this.gridCellSize) + 1;
    const totalCells = this.gridCols * this.gridRows;
    this.grid = new Array(totalCells);
    for (let i = 0; i < totalCells; i++) {
      this.grid[i] = [];
    }

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

    this.updateFPS(deltaTime);
    this.update(deltaTime);
    this.render();

    this.animationFrameId = requestAnimationFrame(() => this.animate());
  }

  private updateFPS(deltaTime: number): void {
    this.fpsFrames++;
    this.fpsUpdateTimer += deltaTime;
    this.fpsStats.totalTime += deltaTime;
    this.fpsStats.frameCount++;

    if (this.fpsUpdateTimer >= 0.5) {
      const fps = this.fpsFrames / this.fpsUpdateTimer;
      this.fpsStats.fps = fps;
      this.fpsStats.minFPS = Math.min(this.fpsStats.minFPS, fps);
      this.fpsStats.maxFPS = Math.max(this.fpsStats.maxFPS, fps);
      this.fpsStats.avgFPS = this.fpsStats.frameCount / this.fpsStats.totalTime;

      this.fpsFrames = 0;
      this.fpsUpdateTimer = 0;
    }
  }

  private update(deltaTime: number): void {
    if (!this.mouseActive) {
      this.mouseFade = Math.max(0, this.mouseFade - deltaTime * 1.5);
    }

    this.mouseVelX *= 0.9;
    this.mouseVelY *= 0.9;

    const particleCount = this.particles.length;
    const forceUpdateInterval = particleCount > 3500 ? 2 : 1;
    this.forceUpdateCounter++;

    if (this.forceUpdateCounter % forceUpdateInterval === 0) {
      this.buildGrid();
      this.applyNeighborForces(deltaTime * forceUpdateInterval);
    }

    const forceStrength = this.config.forceStrength;
    const cellSize = this.gridCellSize;
    const mouseActive = this.mouseFade > 0.01;
    const mouseX = this.mouseX;
    const mouseY = this.mouseY;
    const mouseVelX = this.mouseVelX;
    const mouseVelY = this.mouseVelY;

    const particles = this.particles;
    const len = particles.length;

    for (let i = 0; i < len; i++) {
      particles[i].update(
        deltaTime,
        mouseX,
        mouseY,
        mouseVelX,
        mouseVelY,
        mouseActive,
        forceStrength,
        cellSize
      );
    }

    this.cleanupDeletedParticles();
  }

  private buildGrid(): void {
    const cellSize = this.gridCellSize;
    const cols = this.gridCols;
    const rows = this.gridRows;
    const grid = this.grid;
    const particles = this.particles;
    const len = particles.length;

    for (let i = 0; i < grid.length; i++) {
      grid[i].length = 0;
    }

    for (let i = 0; i < len; i++) {
      const p = particles[i];
      const gx = Math.floor(p.x / cellSize);
      const gy = Math.floor(p.y / cellSize);

      if (gx >= 0 && gx < cols && gy >= 0 && gy < rows) {
        p.gridX = gx;
        p.gridY = gy;
        const idx = gy * cols + gx;
        grid[idx].push(p);
      }
    }
  }

  private applyNeighborForces(deltaTime: number): void {
    const forceStrength = this.config.forceStrength;
    if (forceStrength <= 0) return;

    const cols = this.gridCols;
    const rows = this.gridRows;
    const grid = this.grid;
    const particles = this.particles;
    const len = particles.length;

    const minDistSq = this.minDistSq;
    const maxDistSq = this.maxDistSq;
    const minDist = this.minDist;
    const maxDist = this.maxDist;
    const repelStrength = this.repelStrength;
    const attractStrength = this.attractStrength;
    const dt = deltaTime * 60;

    for (let i = 0; i < len; i++) {
      const p = particles[i];
      const gx = p.gridX;
      const gy = p.gridY;

      const startX = Math.max(0, gx - 1);
      const endX = Math.min(cols - 1, gx + 1);
      const startY = Math.max(0, gy - 1);
      const endY = Math.min(rows - 1, gy + 1);

      for (let cy = startY; cy <= endY; cy++) {
        for (let cx = startX; cx <= endX; cx++) {
          const cell = grid[cy * cols + cx];
          const cellLen = cell.length;

          for (let j = 0; j < cellLen; j++) {
            const neighbor = cell[j];
            if (neighbor === p) continue;

            const dx = neighbor.x - p.x;
            const dy = neighbor.y - p.y;
            const distSq = dx * dx + dy * dy;

            if (distSq > maxDistSq || distSq < 0.01) continue;

            const dist = Math.sqrt(distSq);
            const nx = dx / dist;
            const ny = dy / dist;

            let force: number;
            if (distSq < minDistSq) {
              force = -(1 - dist / minDist) * repelStrength;
            } else {
              const t = (dist - minDist) / (maxDist - minDist);
              force = (1 - t) * (1 - t) * attractStrength;
            }

            p.vx += nx * force * dt;
            p.vy += ny * force * dt;
          }
        }
      }
    }
  }

  private cleanupDeletedParticles(): void {
    const target = this.config.particleCount;
    let writeIdx = 0;
    const particles = this.particles;
    const len = particles.length;

    for (let i = 0; i < len; i++) {
      const p = particles[i];
      if (!p.markedForDeletion && writeIdx < target) {
        particles[writeIdx] = p;
        writeIdx++;
      }
    }

    if (writeIdx < len) {
      particles.length = writeIdx;
    }
  }

  private render(): void {
    const rect = this.canvas.getBoundingClientRect();
    const ctx = this.ctx;

    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(10, 10, 18, 0.15)';
    ctx.fillRect(0, 0, rect.width, rect.height);

    ctx.globalCompositeOperation = 'lighter';

    const particles = this.particles;
    const len = particles.length;
    for (let i = 0; i < len; i++) {
      particles[i].render(ctx);
    }

    ctx.globalCompositeOperation = 'source-over';
  }

  private createParticles(): void {
    const rect = this.canvas.getBoundingClientRect();
    const palette = THEMES[this.config.theme];
    const rgbColors = palette.rgbColors;
    this.particles = [];

    for (let i = 0; i < this.config.particleCount; i++) {
      this.particles.push(this.createParticle(rect.width, rect.height, rgbColors, false));
    }
  }

  private adjustParticleCount(): void {
    const rect = this.canvas.getBoundingClientRect();
    const palette = THEMES[this.config.theme];
    const rgbColors = palette.rgbColors;
    const target = this.config.particleCount;
    const current = this.particles.length;

    if (target > current) {
      for (let i = current; i < target; i++) {
        this.particles.push(this.createParticle(rect.width, rect.height, rgbColors, true));
      }
    } else if (target < current) {
      const toRemove = current - target;
      for (let i = current - toRemove; i < current; i++) {
        this.particles[i].targetAlpha = 0;
      }
    }
  }

  private createParticle(
    width: number,
    height: number,
    colors: RGB[],
    fadeIn: boolean
  ): Particle {
    let x: number;
    let y: number;

    if (fadeIn) {
      const side = Math.floor(Math.random() * 4);
      switch (side) {
        case 0:
          x = Math.random() * width;
          y = -20;
          break;
        case 1:
          x = width + 20;
          y = Math.random() * height;
          break;
        case 2:
          x = Math.random() * width;
          y = height + 20;
          break;
        default:
          x = -20;
          y = Math.random() * height;
          break;
      }
    } else {
      x = Math.random() * width;
      y = Math.random() * height;
    }

    const options: ParticleOptions = {
      x,
      y,
      size: 2 + Math.random() * 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      speed: 0.3 + Math.random() * 0.7,
      width,
      height,
      fadeIn,
      trailLength: this.config.trailLength
    };
    const p = new Particle(options);
    p.setTrailEnabled(this.config.trailEnabled);
    return p;
  }
}
