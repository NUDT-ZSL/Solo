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

interface TrailPoint {
  x: number;
  y: number;
  age: number;
}

type StatsCallback = (stats: PerformanceStats) => void;

export class ParticleEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private maxParticles = 500;
  private config: EngineConfig;

  private animationId = 0;
  private lastTime = 0;
  private frameCount = 0;
  private fpsAccum = 0;
  private fpsSampleTime = 0;
  private currentFps = 60;
  private cpuLoad = 0;

  private lowFpsStart = 0;
  private performanceMode = false;
  private perfRecoverTimer: number | null = null;

  private selectedParticle: Particle | null = null;
  private isDragging = false;
  private lastMouseX = 0;
  private lastMouseY = 0;

  private trail: TrailPoint[] = [];
  private readonly TRAIL_MAX_AGE = 20;

  private readonly GRID_SIZE = 50;
  private grid: Map<number, Particle[]> = new Map();
  private gridCols = 0;
  private gridRows = 0;

  private onStatsUpdate: StatsCallback | null = null;

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

  public setStatsCallback(cb: StatsCallback | null): void {
    this.onStatsUpdate = cb;
  }

  public resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  public start(): void {
    this.lastTime = performance.now();
    this.fpsSampleTime = this.lastTime;
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
    this.trail = [];
    this.grid.clear();
  }

  public deleteSelected(): void {
    if (this.selectedParticle) {
      const id = this.selectedParticle.id;
      this.particles = this.particles.filter(p => p.id !== id);
      this.selectedParticle = null;
    }
  }

  public handleMouseDown(x: number, y: number): void {
    const clicked = this.findParticleAt(x, y);
    if (clicked) {
      if (this.selectedParticle && this.selectedParticle !== clicked) {
        this.selectedParticle.selected = false;
      }
      this.selectedParticle = clicked;
      clicked.selected = true;
      this.isDragging = false;
    } else {
      if (this.selectedParticle) {
        this.selectedParticle.selected = false;
        this.selectedParticle = null;
      }
      this.isDragging = true;
      this.lastMouseX = x;
      this.lastMouseY = y;
      this.trail = [];
      this.spawnParticle(x, y, 0, 0);
    }
  }

  public handleMouseMove(x: number, y: number): void {
    if (this.isDragging) {
      this.trail.push({ x, y, age: 0 });

      const dx = x - this.lastMouseX;
      const dy = y - this.lastMouseY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 3) {
        this.spawnParticle(x, y, dx * 0.1, dy * 0.1);
      }
      this.lastMouseX = x;
      this.lastMouseY = y;
    }
  }

  public handleMouseUp(): void {
    this.isDragging = false;
  }

  private findParticleAt(x: number, y: number): Particle | null {
    const col = Math.floor(x / this.GRID_SIZE);
    const row = Math.floor(y / this.GRID_SIZE);
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const key = (row + dr) * this.gridCols + (col + dc);
        const cell = this.grid.get(key);
        if (!cell) continue;
        for (let i = cell.length - 1; i >= 0; i--) {
          if (cell[i].containsPoint(x, y)) return cell[i];
        }
      }
    }
    return null;
  }

  private spawnParticle(x: number, y: number, vxBase: number, vyBase: number): void {
    if (this.performanceMode) return;

    if (this.particles.length >= this.maxParticles) {
      let minLife = Infinity;
      let minIdx = 0;
      for (let i = 0; i < this.particles.length; i++) {
        if (this.particles[i].lifeFrames < minLife) {
          minLife = this.particles[i].lifeFrames;
          minIdx = i;
        }
      }
      const removed = this.particles[minIdx];
      if (this.selectedParticle && this.selectedParticle.id === removed.id) {
        this.selectedParticle = null;
      }
      this.particles[minIdx] = this.particles[this.particles.length - 1];
      this.particles.pop();
    }

    const [minSize, maxSize] = this.config.sizeRange;
    const [minSpeed, maxSpeed] = this.config.speedRange;
    const radius = minSize + Math.random() * (maxSize - minSize);
    const angle = Math.random() * Math.PI * 2;
    const speed = minSpeed + Math.random() * (maxSpeed - minSpeed);
    const color = this.config.colors[Math.floor(Math.random() * this.config.colors.length)];
    const isPositive = Math.random() < (this.config.chargeBias + 1) / 2;
    const charge = isPositive ? (0.5 + Math.random() * 0.5) : -(0.5 + Math.random() * 0.5);

    this.particles.push(new Particle({
      x: x + (Math.random() - 0.5) * 4,
      y: y + (Math.random() - 0.5) * 4,
      vx: vxBase + Math.cos(angle) * speed,
      vy: vyBase + Math.sin(angle) * speed,
      color,
      radius,
      charge,
    }));
  }

  private buildGrid(): void {
    this.grid.clear();
    const w = this.canvas.width / (window.devicePixelRatio || 1);
    const h = this.canvas.height / (window.devicePixelRatio || 1);
    this.gridCols = Math.ceil(w / this.GRID_SIZE) + 2;
    this.gridRows = Math.ceil(h / this.GRID_SIZE) + 2;

    for (const p of this.particles) {
      const col = Math.floor(p.x / this.GRID_SIZE);
      const row = Math.floor(p.y / this.GRID_SIZE);
      const key = row * this.gridCols + col;
      let cell = this.grid.get(key);
      if (!cell) {
        cell = [];
        this.grid.set(key, cell);
      }
      cell.push(p);
    }
  }

  private applyPhysics(dt: number): void {
    this.buildGrid();

    const toMerge: [Particle, Particle][] = [];
    const checked = new Set<number>();

    for (const [key, cell] of this.grid) {
      const row = Math.floor(key / this.gridCols);
      const col = key % this.gridCols;

      for (let dr = 0; dr <= 1; dr++) {
        for (let dc = (dr === 0 ? 0 : -1); dc <= 1; dc++) {
          const nKey = (row + dr) * this.gridCols + (col + dc);
          const neighbor = this.grid.get(nKey);
          if (!neighbor) continue;

          const isSame = dr === 0 && dc === 0;
          const startJ = isSame ? 0 : 0;

          for (let i = 0; i < cell.length; i++) {
            const p = cell[i];
            if (p.merged) continue;
            const jStart = isSame ? i + 1 : startJ;

            for (let j = jStart; j < neighbor.length; j++) {
              const other = neighbor[j];
              if (other.merged) continue;

              const dx = other.x - p.x;
              const dy = other.y - p.y;
              const distSq = dx * dx + dy * dy;
              const minDist = p.radius + other.radius;

              if (distSq < minDist * minDist && distSq > 0) {
                const pairHash = p.id < other.id
                  ? p.id * 100000 + other.id
                  : other.id * 100000 + p.id;
                if (!checked.has(pairHash)) {
                  checked.add(pairHash);
                  toMerge.push([p, other]);
                }
                continue;
              }

              if (distSq > 90000) continue;

              const dist = Math.sqrt(distSq);
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

              p.vx += (fx / p.mass) * dt;
              p.vy += (fy / p.mass) * dt;
              other.vx -= (fx / other.mass) * dt;
              other.vy -= (fy / other.mass) * dt;
            }
          }
        }
      }
    }

    this.processMerges(toMerge);
  }

  private processMerges(toMerge: [Particle, Particle][]): void {
    const mergedIds = new Set<number>();
    const newParticles: Particle[] = [];

    for (const [p1, p2] of toMerge) {
      if (mergedIds.has(p1.id) || mergedIds.has(p2.id)) continue;
      if (p1.merged || p2.merged) continue;

      mergedIds.add(p1.id);
      mergedIds.add(p2.id);
      p1.merged = true;
      p2.merged = true;

      if (this.selectedParticle) {
        if (this.selectedParticle.id === p1.id || this.selectedParticle.id === p2.id) {
          this.selectedParticle = null;
        }
      }

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

  private updateParticles(dt: number): void {
    const width = this.canvas.width / (window.devicePixelRatio || 1);
    const height = this.canvas.height / (window.devicePixelRatio || 1);

    for (const p of this.particles) {
      p.update(dt, width, height);
    }

    const deadSelected = this.selectedParticle?.isDead ?? false;
    if (deadSelected) this.selectedParticle = null;

    this.particles = this.particles.filter(p => !p.isDead);
  }

  private updateTrail(): void {
    for (const t of this.trail) {
      t.age++;
    }
    this.trail = this.trail.filter(t => t.age < this.TRAIL_MAX_AGE);
  }

  private render(): void {
    const width = this.canvas.width / (window.devicePixelRatio || 1);
    const height = this.canvas.height / (window.devicePixelRatio || 1);

    const grad = this.ctx.createRadialGradient(
      width / 2, height / 2, 0,
      width / 2, height / 2, Math.max(width, height) / 1.2
    );
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
    for (const t of this.trail) {
      const alpha = Math.max(0, 0.8 * (1 - t.age / this.TRAIL_MAX_AGE));
      if (alpha <= 0) continue;
      this.ctx.beginPath();
      this.ctx.arc(t.x, t.y, 3, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(139, 92, 246, ${alpha})`;
      this.ctx.fill();
    }
  }

  private renderParticle(p: Particle): void {
    const scale = p.currentScale;
    const r = p.radius * scale;
    const alpha = p.opacity;
    if (alpha <= 0 || r <= 0) return;

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
      this.ctx.globalAlpha = 1;
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, r + 4, 0, Math.PI * 2);
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  private updatePerformance(now: number): void {
    this.frameCount++;
    this.fpsAccum++;

    if (now - this.fpsSampleTime >= 500) {
      this.currentFps = (this.fpsAccum * 1000) / (now - this.fpsSampleTime);
      this.fpsAccum = 0;
      this.fpsSampleTime = now;

      if (this.currentFps < 25) {
        if (this.lowFpsStart === 0) {
          this.lowFpsStart = now;
        } else if (now - this.lowFpsStart > 2000 && !this.performanceMode) {
          this.enterPerformanceMode();
        }
      } else {
        this.lowFpsStart = 0;
        if (this.performanceMode && this.currentFps > 35) {
          this.exitPerformanceMode();
        }
      }
    }

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
    this.maxParticles = 300;
    if (this.particles.length > this.maxParticles) {
      this.particles.sort((a, b) => a.lifeFrames - b.lifeFrames);
      this.particles = this.particles.slice(this.particles.length - this.maxParticles);
    }
  }

  private exitPerformanceMode(): void {
    this.performanceMode = false;
    this.maxParticles = 500;
    this.lowFpsStart = 0;
  }

  private loop = (): void => {
    const now = performance.now();
    const deltaMs = now - this.lastTime;
    const dt = Math.min(deltaMs / 16.67, 2);
    this.lastTime = now;

    this.cpuLoad = Math.min(1, deltaMs / 16.67);

    this.applyPhysics(dt);
    this.updateParticles(dt);
    this.updateTrail();
    this.render();

    this.updatePerformance(now);

    this.animationId = requestAnimationFrame(this.loop);
  };
}
