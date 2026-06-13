import { Particle, RGB } from './Particle';

export interface EngineConfig {
  colors: RGB[];
  sizeRange: [number, number];
  speedRange: [number, number];
  chargeBias: number;
}

export interface PerformanceStats {
  fps: number;
  particleCount: number;
  cpuLoad: number;
  performanceMode: boolean;
}

export interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
}

type EngineEventCallback = (stats: PerformanceStats) => void;

export class ParticleEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private maxParticles: number = 500;
  private defaultMaxParticles: number = 500;
  private reducedMaxParticles: number = 300;
  private config: EngineConfig;
  private animationId: number = 0;
  private lastTime: number = 0;
  private fpsFrames: number = 0;
  private fpsTime: number = 0;
  private currentFps: number = 60;
  private cpuLoad: number = 0;
  private frameStart: number = 0;
  private lowFpsStartTime: number = 0;
  private performanceMode: boolean = false;
  private performanceModeTimeout: number | null = null;
  private selectedParticle: Particle | null = null;
  private isDragging: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  private mouseX: number = 0;
  private mouseY: number = 0;
  private trail: TrailPoint[] = [];
  private readonly TRAIL_LENGTH: number = 20;
  private readonly GRID_SIZE: number = 50;
  private spawnCooldown: number = 0;
  private onStatsUpdate: EngineEventCallback | null = null;
  private paused: boolean = false;

  constructor(canvas: HTMLCanvasElement, config: EngineConfig) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;
    this.config = config;
    this.resize();
  }

  public setConfig(config: EngineConfig): void {
    this.config = { ...config };
  }

  public setStatsCallback(cb: EngineEventCallback | null): void {
    this.onStatsUpdate = cb;
  }

  public resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
  }

  public start(): void {
    this.lastTime = performance.now();
    this.fpsTime = this.lastTime;
    this.loop();
  }

  public stop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = 0;
    }
  }

  public destroy(): void {
    this.stop();
    this.particles = [];
  }

  public getSelectedParticle(): Particle | null {
    return this.selectedParticle;
  }

  public deleteSelected(): void {
    if (this.selectedParticle) {
      this.particles = this.particles.filter(p => p.id !== this.selectedParticle!.id);
      this.selectedParticle = null;
    }
  }

  public clearAll(): void {
    this.particles = [];
    this.selectedParticle = null;
  }

  public handleMouseDown(x: number, y: number): void {
    const clicked = this.findParticleAt(x, y);
    if (clicked) {
      if (this.selectedParticle) this.selectedParticle.selected = false;
      this.selectedParticle = clicked;
      clicked.selected = true;
      this.isDragging = false;
    } else {
      if (this.selectedParticle) {
        this.selectedParticle.selected = false;
        this.selectedParticle = null;
      }
      this.isDragging = true;
      this.mouseX = x;
      this.mouseY = y;
      this.lastMouseX = x;
      this.lastMouseY = y;
      this.trail = [];
      this.spawnParticle(x, y, 0, 0);
    }
  }

  public handleMouseMove(x: number, y: number): void {
    this.mouseX = x;
    this.mouseY = y;
    if (this.isDragging) {
      this.addTrailPoint(x, y);
      this.spawnCooldown -= 1;
      if (this.spawnCooldown <= 0) {
        const dx = x - this.lastMouseX;
        const dy = y - this.lastMouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 3) {
          this.spawnParticle(x, y, dx * 0.1, dy * 0.1);
          this.spawnCooldown = 0;
        }
      }
      this.lastMouseX = x;
      this.lastMouseY = y;
    }
  }

  public handleMouseUp(): void {
    this.isDragging = false;
  }

  private addTrailPoint(x: number, y: number): void {
    this.trail.push({ x, y, alpha: 0.8 });
    if (this.trail.length > this.TRAIL_LENGTH) {
      this.trail.shift();
    }
    for (let i = 0; i < this.trail.length; i++) {
      this.trail[i].alpha = (i / this.trail.length) * 0.8;
    }
  }

  private findParticleAt(x: number, y: number): Particle | null {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      if (this.particles[i].containsPoint(x, y)) {
        return this.particles[i];
      }
    }
    return null;
  }

  private spawnParticle(x: number, y: number, vxBase: number, vyBase: number): void {
    if (this.performanceMode) return;
    if (this.particles.length >= this.maxParticles) {
      this.particles.sort((a, b) => a.remainingLife - b.remainingLife);
      this.particles = this.particles.slice(1);
    }

    const [minSize, maxSize] = this.config.sizeRange;
    const [minSpeed, maxSpeed] = this.config.speedRange;
    const radius = minSize + Math.random() * (maxSize - minSize);
    const angle = Math.random() * Math.PI * 2;
    const speed = minSpeed + Math.random() * (maxSpeed - minSpeed);
    const color = this.config.colors[Math.floor(Math.random() * this.config.colors.length)];

    const isPositive = Math.random() < (this.config.chargeBias + 1) / 2;
    const charge = isPositive ? (0.5 + Math.random() * 0.5) : -(0.5 + Math.random() * 0.5);

    const p = new Particle({
      x: x + (Math.random() - 0.5) * 4,
      y: y + (Math.random() - 0.5) * 4,
      vx: vxBase + Math.cos(angle) * speed,
      vy: vyBase + Math.sin(angle) * speed,
      color,
      radius,
      charge,
    });
    this.particles.push(p);
  }

  private buildSpatialGrid(): Map<string, Particle[]> {
    const grid = new Map<string, Particle[]>();
    for (const p of this.particles) {
      const gx = Math.floor(p.x / this.GRID_SIZE);
      const gy = Math.floor(p.y / this.GRID_SIZE);
      const key = `${gx},${gy}`;
      if (!grid.has(key)) grid.set(key, []);
      grid.get(key)!.push(p);
    }
    return grid;
  }

  private getNeighborCells(gx: number, gy: number): string[] {
    const cells: string[] = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        cells.push(`${gx + dx},${gy + dy}`);
      }
    }
    return cells;
  }

  private applyPhysics(deltaTime: number): void {
    const grid = this.buildSpatialGrid();
    const processed = new Set<string>();
    const toMerge: [Particle, Particle][] = [];

    for (const p of this.particles) {
      const gx = Math.floor(p.x / this.GRID_SIZE);
      const gy = Math.floor(p.y / this.GRID_SIZE);
      const neighbors = this.getNeighborCells(gx, gy);

      for (const cellKey of neighbors) {
        const cell = grid.get(cellKey);
        if (!cell) continue;
        for (const other of cell) {
          if (p.id === other.id) continue;
          const pairKey = p.id < other.id ? `${p.id}|${other.id}` : `${other.id}|${p.id}`;
          if (processed.has(pairKey)) continue;
          processed.add(pairKey);

          const dx = other.x - p.x;
          const dy = other.y - p.y;
          const distSq = dx * dx + dy * dy;
          const minDist = p.radius + other.radius;

          if (distSq < minDist * minDist) {
            toMerge.push([p, other]);
            continue;
          }

          const dist = Math.sqrt(distSq);
          if (dist > 300) continue;

          const sameSign = p.charge * other.charge > 0;
          const k = 800;
          let force: number;

          if (sameSign) {
            force = k * Math.abs(p.charge * other.charge) / (distSq + 100);
          } else {
            const decay = Math.max(0, 1 - dist / 200);
            force = -k * Math.abs(p.charge * other.charge) * decay / (distSq + 100);
          }

          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          p.vx += (fx / p.mass) * deltaTime;
          p.vy += (fy / p.mass) * deltaTime;
          other.vx -= (fx / other.mass) * deltaTime;
          other.vy -= (fy / other.mass) * deltaTime;
        }
      }
    }

    this.processMerges(toMerge);
  }

  private processMerges(toMerge: [Particle, Particle][]): void {
    const mergedIds = new Set<string>();
    const newParticles: Particle[] = [];

    for (const [p1, p2] of toMerge) {
      if (mergedIds.has(p1.id) || mergedIds.has(p2.id)) continue;
      if (p1.merged || p2.merged) continue;

      mergedIds.add(p1.id);
      mergedIds.add(p2.id);
      p1.merged = true;
      p2.merged = true;

      const merged = Particle.merge(p1, p2);
      newParticles.push(merged);

      const splits = Particle.createSplitParticles(merged);
      newParticles.push(...splits);
    }

    if (mergedIds.size > 0) {
      this.particles = this.particles.filter(p => !mergedIds.has(p.id));
      const capacity = this.maxParticles - this.particles.length;
      if (capacity > 0) {
        this.particles.push(...newParticles.slice(0, capacity));
      }
    }
  }

  private updateParticles(deltaTime: number): void {
    const width = this.canvas.width / (window.devicePixelRatio || 1);
    const height = this.canvas.height / (window.devicePixelRatio || 1);

    for (const p of this.particles) {
      p.update(deltaTime, width, height);
    }

    this.particles = this.particles.filter(p => !p.isDead);
  }

  private render(): void {
    const width = this.canvas.width / (window.devicePixelRatio || 1);
    const height = this.canvas.height / (window.devicePixelRatio || 1);

    const grad = this.ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) / 1.2);
    grad.addColorStop(0, '#0f0a1a');
    grad.addColorStop(1, '#1a0f2e');
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, width, height);

    this.renderTrail();

    for (const p of this.particles) {
      this.renderParticle(p);
    }
  }

  private renderTrail(): void {
    for (const point of this.trail) {
      this.ctx.beginPath();
      this.ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(139, 92, 246, ${point.alpha})`;
      this.ctx.fill();
    }
    if (this.trail.length > 0) {
      this.trail = this.trail.map(p => ({ ...p, alpha: p.alpha * 0.92 })).filter(p => p.alpha > 0.05);
    }
  }

  private renderParticle(p: Particle): void {
    const scale = p.currentScale;
    const r = p.radius * scale;
    const alpha = p.opacity;

    this.ctx.save();
    this.ctx.globalAlpha = alpha;

    this.ctx.shadowColor = `rgb(${p.color.r}, ${p.color.g}, ${p.color.b})`;
    this.ctx.shadowBlur = 3;

    const grad = this.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
    grad.addColorStop(0, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, 1)`);
    grad.addColorStop(0.7, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, 0.8)`);
    grad.addColorStop(1, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, 0)`);

    this.ctx.beginPath();
    this.ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    this.ctx.fillStyle = grad;
    this.ctx.fill();

    if (p.selected) {
      this.ctx.shadowBlur = 0;
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, r + 4, 0, Math.PI * 2);
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  private updatePerformance(now: number, deltaTime: number): void {
    this.fpsFrames++;
    if (now - this.fpsTime >= 500) {
      this.currentFps = (this.fpsFrames * 1000) / (now - this.fpsTime);
      this.fpsFrames = 0;
      this.fpsTime = now;

      if (this.currentFps < 25) {
        if (this.lowFpsStartTime === 0) {
          this.lowFpsStartTime = now;
        } else if (now - this.lowFpsStartTime > 2000 && !this.performanceMode) {
          this.enterPerformanceMode();
        }
      } else {
        this.lowFpsStartTime = 0;
      }
    }

    this.cpuLoad = Math.min(1, deltaTime / 16.67);

    if (this.onStatsUpdate) {
      this.onStatsUpdate({
        fps: this.currentFps,
        particleCount: this.particles.length,
        cpuLoad: this.cpuLoad,
        performanceMode: this.performanceMode,
      });
    }
  }

  private enterPerformanceMode(): void {
    this.performanceMode = true;
    this.maxParticles = this.reducedMaxParticles;
    if (this.particles.length > this.maxParticles) {
      this.particles.sort((a, b) => a.remainingLife - b.remainingLife);
      this.particles = this.particles.slice(this.particles.length - this.maxParticles);
    }
    if (this.performanceModeTimeout) clearTimeout(this.performanceModeTimeout);
    this.performanceModeTimeout = window.setTimeout(() => {
      this.performanceMode = false;
      this.maxParticles = this.defaultMaxParticles;
      this.lowFpsStartTime = 0;
    }, 10000);
  }

  private loop = (): void => {
    if (this.paused) {
      this.animationId = requestAnimationFrame(this.loop);
      return;
    }

    const now = performance.now();
    const deltaMs = now - this.lastTime;
    const deltaTime = Math.min(deltaMs / 16.67, 2);
    this.lastTime = now;
    this.frameStart = now;

    this.applyPhysics(deltaTime);
    this.updateParticles(deltaTime);
    this.render();

    const frameDuration = performance.now() - this.frameStart;
    this.updatePerformance(now, frameDuration);

    this.animationId = requestAnimationFrame(this.loop);
  };
}
