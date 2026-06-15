import { Season, Ripple, ForestStats, BG_GRADIENTS, SEASON_ORDER } from './types';
import { TreeSystem } from './TreeSystem';
import { AnimalManager } from './AnimalManager';

export class EcosystemEngine {
  treeSystem: TreeSystem;
  animalManager: AnimalManager;
  ripples: Ripple[] = [];

  season: Season = 'spring';
  seasonProgress = 0;
  windStrength = 0.3;

  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private animFrameId = 0;
  private lastTime = 0;
  private running = false;
  private onStatsChange: ((stats: ForestStats) => void) | null = null;

  constructor() {
    this.treeSystem = new TreeSystem();
    this.animalManager = new AnimalManager();
  }

  init(canvas: HTMLCanvasElement, onStatsChange: (stats: ForestStats) => void) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.onStatsChange = onStatsChange;
    this.resize();
  }

  resize() {
    if (!this.canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx!.scale(dpr, dpr);
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  stop() {
    this.running = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = 0;
    }
  }

  setSeason(season: Season) {
    this.season = season;
    this.emitStats();
  }

  setSeasonByProgress(progress: number) {
    this.seasonProgress = progress;
    const idx = Math.min(3, Math.floor(progress * 4));
    this.season = SEASON_ORDER[idx];
    this.emitStats();
  }

  plantTree(x: number, y: number, type: 'pine' | 'oak' | 'cherry') {
    const tree = this.treeSystem.addTree(x, y, type);
    this.animalManager.trySpawnForTree(tree, this.treeSystem);
    this.emitStats();
  }

  reset() {
    this.treeSystem.clear();
    this.animalManager.clear();
    this.ripples = [];
    this.emitStats();
  }

  addRipple(x: number, y: number) {
    this.ripples.push({
      x, y,
      radius: 5,
      maxRadius: 60 + Math.random() * 20,
      alpha: 0.6,
      speed: 80,
    });
  }

  private loop = (now: number) => {
    if (!this.running) return;

    const dt = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    this.update(dt, now);
    this.render(now);

    this.animFrameId = requestAnimationFrame(this.loop);
  };

  private update(dt: number, now: number) {
    this.windStrength = 0.3 + Math.sin(now * 0.0003) * 0.2;
    this.treeSystem.update(dt, this.season, this.windStrength);
    const w = this.canvas?.getBoundingClientRect().width ?? 800;
    const h = this.canvas?.getBoundingClientRect().height ?? 600;
    this.animalManager.update(dt, this.treeSystem, w, h);

    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.radius += r.speed * dt;
      r.alpha = 0.6 * (1 - r.radius / r.maxRadius);
      if (r.radius >= r.maxRadius) {
        this.ripples.splice(i, 1);
      }
    }
  }

  private render(now: number) {
    const ctx = this.ctx;
    if (!ctx || !this.canvas) return;
    const w = this.canvas.getBoundingClientRect().width;
    const h = this.canvas.getBoundingClientRect().height;

    this.drawBackground(ctx, w, h);
    this.drawGround(ctx, w, h, now);
    this.drawRipples(ctx);
    this.treeSystem.draw(ctx, this.season, now);
    this.animalManager.draw(ctx, now);
    this.drawAtmosphere(ctx, w, h, now);
  }

  private drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const colors = BG_GRADIENTS[this.season];
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, colors[0]);
    grad.addColorStop(1, colors[1]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  private drawGround(ctx: CanvasRenderingContext2D, w: number, h: number, now: number) {
    const groundY = h * 0.75;
    const grad = ctx.createLinearGradient(0, groundY, 0, h);
    const isWinter = this.season === 'winter';

    grad.addColorStop(0, isWinter ? '#546E7A40' : '#1B5E2040');
    grad.addColorStop(0.3, isWinter ? '#78909C30' : '#2E7D3230');
    grad.addColorStop(1, isWinter ? '#90A4AE20' : '#388E3C20');
    ctx.fillStyle = grad;
    ctx.fillRect(0, groundY, w, h - groundY);

    ctx.strokeStyle = isWinter ? '#B0BEC520' : '#4CAF5018';
    ctx.lineWidth = 1;
    for (let i = 0; i < 30; i++) {
      const gx = ((i * 37 + now * 0.001) % 1) * w;
      const gy = groundY + 20 + Math.sin(i * 0.7) * (h * 0.12);
      const sway = Math.sin(now * 0.002 + i) * 3;
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.quadraticCurveTo(gx + sway, gy - 10, gx + sway * 1.5, gy - 15);
      ctx.stroke();
    }
  }

  private drawRipples(ctx: CanvasRenderingContext2D) {
    for (const r of this.ripples) {
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(76, 175, 80, ${r.alpha})`;
      ctx.lineWidth = 2;
      ctx.stroke();

      if (r.alpha > 0.2) {
        const innerGrad = ctx.createRadialGradient(r.x, r.y, 0, r.x, r.y, r.radius);
        innerGrad.addColorStop(0, `rgba(76, 175, 80, ${r.alpha * 0.15})`);
        innerGrad.addColorStop(1, `rgba(76, 175, 80, 0)`);
        ctx.fillStyle = innerGrad;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private drawAtmosphere(ctx: CanvasRenderingContext2D, w: number, h: number, now: number) {
    if (this.season === 'autumn') {
      for (let i = 0; i < 8; i++) {
        const fx = (Math.sin(now * 0.0005 + i * 2.1) * 0.5 + 0.5) * w;
        const fy = (Math.cos(now * 0.0003 + i * 1.7) * 0.5 + 0.5) * h;
        const grad = ctx.createRadialGradient(fx, fy, 0, fx, fy, 30);
        grad.addColorStop(0, 'rgba(255, 183, 77, 0.06)');
        grad.addColorStop(1, 'rgba(255, 183, 77, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(fx, fy, 30, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (this.season === 'winter') {
      for (let i = 0; i < 15; i++) {
        const sx = ((now * 0.01 + i * 97) % (w + 40)) - 20;
        const sy = ((now * 0.02 + i * 53) % (h + 40)) - 20;
        ctx.beginPath();
        ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fill();
      }
    }

    if (this.season === 'spring') {
      for (let i = 0; i < 6; i++) {
        const px = (Math.sin(now * 0.0004 + i * 1.3) * 0.5 + 0.5) * w;
        const py = (Math.cos(now * 0.0002 + i * 2.1) * 0.5 + 0.5) * h * 0.5;
        const grad = ctx.createRadialGradient(px, py, 0, px, py, 20);
        grad.addColorStop(0, 'rgba(244, 143, 177, 0.04)');
        grad.addColorStop(1, 'rgba(244, 143, 177, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py, 20, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private emitStats() {
    if (this.onStatsChange) {
      this.onStatsChange({
        treeCount: this.treeSystem.trees.length,
        animalCount: this.animalManager.animals.length,
        season: this.season,
      });
    }
  }

  getStats(): ForestStats {
    return {
      treeCount: this.treeSystem.trees.length,
      animalCount: this.animalManager.animals.length,
      season: this.season,
    };
  }
}
