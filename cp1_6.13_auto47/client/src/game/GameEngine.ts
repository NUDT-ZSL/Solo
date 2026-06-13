import { Particle, Star, CollectEffect, SpeedUpEffect, Rect, GameState, GameCallbacks } from './types';
import { PlayerShip } from './PlayerShip';
import { ObstacleManager } from './ObstacleManager';

const MAX_PARTICLES = 500;
const GRID_COLS = 8;
const GRID_ROWS = 8;

export class GameEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  starCanvas: HTMLCanvasElement;
  starCtx: CanvasRenderingContext2D;
  width: number;
  height: number;
  ship: PlayerShip;
  obstacles: ObstacleManager;
  particles: Particle[] = [];
  collectEffects: CollectEffect[] = [];
  speedUpEffect: SpeedUpEffect | null = null;
  stars: Star[] = [];
  score: number = 0;
  gameState: GameState = 'menu';
  lastTime: number = 0;
  animFrameId: number = 0;
  time: number = 0;
  callbacks: GameCallbacks;

  private onKeyDown: (e: KeyboardEvent) => void;
  private onKeyUp: (e: KeyboardEvent) => void;

  constructor(canvas: HTMLCanvasElement, callbacks: GameCallbacks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.callbacks = callbacks;

    this.starCanvas = document.createElement('canvas');
    this.starCtx = this.starCanvas.getContext('2d')!;

    const rect = this.calcDimensions();
    this.width = rect.w;
    this.height = rect.h;
    canvas.width = this.width;
    canvas.height = this.height;
    this.starCanvas.width = this.width;
    this.starCanvas.height = this.height;

    this.ship = new PlayerShip(this.width, this.height);
    this.obstacles = new ObstacleManager(this.width, this.height);

    this.generateStars();
    this.drawStarsStatic();

    this.onKeyDown = (e: KeyboardEvent) => {
      this.ship.handleKeyDown(e);
      if (e.key.toLowerCase() === 'r' && this.gameState === 'gameover') {
        this.startGame();
      }
    };
    this.onKeyUp = (e: KeyboardEvent) => {
      this.ship.handleKeyUp(e);
    };

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);

    window.addEventListener('resize', () => this.handleResize());
  }

  private calcDimensions(): { w: number; h: number } {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const aspect = 16 / 9;
    let w: number, h: number;
    if (vw / vh > aspect) {
      h = vh;
      w = Math.round(h * aspect);
    } else {
      w = vw;
      h = Math.round(w / aspect);
    }
    if (w < 800) { w = 800; h = Math.round(800 / aspect); }
    if (h < 600) { h = 600; w = Math.round(600 * aspect); }
    return { w, h };
  }

  private handleResize() {
    const rect = this.calcDimensions();
    this.width = rect.w;
    this.height = rect.h;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.starCanvas.width = this.width;
    this.starCanvas.height = this.height;
    this.generateStars();
    this.drawStarsStatic();
    this.ship.reset(this.width, this.height);
    this.obstacles.reset(this.width, this.height);
  }

  private generateStars() {
    this.stars = [];
    for (let i = 0; i < 200; i++) {
      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: 0.5 + Math.random() * 1.5,
        alpha: 0.3 + Math.random() * 0.5,
        twinkleSpeed: 0.5 + Math.random() * 2,
        twinklePhase: Math.random() * Math.PI * 2,
      });
    }
  }

  private drawStarsStatic() {
    const ctx = this.starCtx;
    ctx.clearRect(0, 0, this.width, this.height);
    const grad = ctx.createLinearGradient(0, 0, 0, this.height);
    grad.addColorStop(0, '#0a0a23');
    grad.addColorStop(1, '#1a1a3e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, this.height);

    for (const s of this.stars) {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${s.alpha})`;
      ctx.fill();
    }
  }

  destroy() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    cancelAnimationFrame(this.animFrameId);
  }

  startGame() {
    this.score = 0;
    this.particles = [];
    this.collectEffects = [];
    this.speedUpEffect = null;
    this.ship.reset(this.width, this.height);
    this.obstacles.reset(this.width, this.height);
    this.gameState = 'playing';
    this.callbacks.onScoreChange(0);
    this.callbacks.onLivesChange(3);
    this.lastTime = performance.now();
    this.loop();
  }

  private loop = () => {
    if (this.gameState !== 'playing') return;
    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;
    this.time += dt;

    this.update(dt);
    this.draw();

    this.animFrameId = requestAnimationFrame(this.loop);
  };

  private update(dt: number) {
    const trailParticles = this.ship.update(dt);
    this.addParticles(trailParticles);

    const explosionParticles = this.obstacles.update(dt, this.score);
    this.addParticles(explosionParticles);

    this.checkCollisions();

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx;
      p.y += p.vy;
      p.alpha = (p.life / p.maxLife) * 0.8;
    }

    for (let i = this.collectEffects.length - 1; i >= 0; i--) {
      const e = this.collectEffects[i];
      e.life -= dt;
      if (e.life <= 0) {
        this.collectEffects.splice(i, 1);
        continue;
      }
      const t = 1 - e.life / e.maxLife;
      e.radius = 10 + t * 50;
      e.alpha = 0.8 * (1 - t);
    }

    if (this.speedUpEffect) {
      this.speedUpEffect.life -= dt;
      if (this.speedUpEffect.life <= 0) {
        this.speedUpEffect = null;
      }
    }
  }

  private addParticles(newParticles: Particle[]) {
    const available = MAX_PARTICLES - this.particles.length;
    if (available <= 0) return;
    const toAdd = newParticles.slice(0, available);
    this.particles.push(...toAdd);
  }

  private checkCollisions() {
    const shipBBox = this.ship.getBBox();
    const cellW = this.width / GRID_COLS;
    const cellH = this.height / GRID_ROWS;

    const grid: Map<string, { bbox: Rect; debris: any }[]> = new Map();

    const debrisData = this.obstacles.getDebrisBBoxes();
    for (const d of debrisData) {
      const minCol = Math.max(0, Math.floor(d.bbox.x / cellW));
      const maxCol = Math.min(GRID_COLS - 1, Math.floor((d.bbox.x + d.bbox.w) / cellW));
      const minRow = Math.max(0, Math.floor(d.bbox.y / cellH));
      const maxRow = Math.min(GRID_ROWS - 1, Math.floor((d.bbox.y + d.bbox.h) / cellH));

      for (let col = minCol; col <= maxCol; col++) {
        for (let row = minRow; row <= maxRow; row++) {
          const key = `${col},${row}`;
          if (!grid.has(key)) grid.set(key, []);
          grid.get(key)!.push(d);
        }
      }
    }

    const shipCenterCol = Math.floor((shipBBox.x + shipBBox.w / 2) / cellW);
    const shipCenterRow = Math.floor((shipBBox.y + shipBBox.h / 2) / cellH);
    const searchRadius = 1;

    const checkedDebris = new Set<any>();
    for (let col = Math.max(0, shipCenterCol - searchRadius); col <= Math.min(GRID_COLS - 1, shipCenterCol + searchRadius); col++) {
      for (let row = Math.max(0, shipCenterRow - searchRadius); row <= Math.min(GRID_ROWS - 1, shipCenterRow + searchRadius); row++) {
        const key = `${col},${row}`;
        const cell = grid.get(key);
        if (!cell) continue;
        for (const d of cell) {
          if (checkedDebris.has(d.debris)) continue;
          checkedDebris.add(d.debris);
          if (this.rectIntersect(shipBBox, d.bbox)) {
            if (this.ship.hit()) {
              const ex = this.obstacles.createExplosionParticles(d.debris.x, d.debris.y);
              this.addParticles(ex);
              const idx = this.obstacles.debris.indexOf(d.debris);
              if (idx !== -1) this.obstacles.debris.splice(idx, 1);
              this.callbacks.onLivesChange(this.ship.lives);
              if (this.ship.lives <= 0) {
                this.gameOver();
                return;
              }
            }
          }
        }
      }
    }

    for (let i = this.obstacles.orbs.length - 1; i >= 0; i--) {
      const orb = this.obstacles.orbs[i];
      const dx = this.ship.x - orb.x;
      const dy = this.ship.y - orb.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < orb.radius + this.ship.size * 0.4) {
        this.obstacles.orbs.splice(i, 1);
        this.addScore(10);
        this.collectEffects.push({
          x: this.ship.x,
          y: this.ship.y,
          radius: 10,
          maxRadius: 60,
          alpha: 0.8,
          life: 0.3,
          maxLife: 0.3,
          color: '#10b981',
        });
      }
    }
  }

  private rectIntersect(a: Rect, b: Rect): boolean {
    return a.x < b.x + b.w && a.x + a.w > b.x &&
           a.y < b.y + b.h && a.y + a.h > b.y;
  }

  private addScore(points: number) {
    const oldLevel = Math.floor(this.score / 50);
    this.score += points;
    this.callbacks.onScoreChange(this.score);
    const newLevel = Math.floor(this.score / 50);
    if (newLevel > oldLevel) {
      this.obstacles.updateSpeedMultiplier(this.score);
      this.speedUpEffect = { life: 1, maxLife: 1, scale: 0.5 };
      this.callbacks.onSpeedUp();
    }
  }

  private gameOver() {
    this.gameState = 'gameover';
    cancelAnimationFrame(this.animFrameId);
    this.callbacks.onGameOver();
  }

  private draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    ctx.drawImage(this.starCanvas, 0, 0);

    this.drawStarTwinkle(ctx);

    for (const p of this.particles) {
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    this.obstacles.drawDebris(ctx);
    this.obstacles.drawOrbs(ctx, this.time);
    this.ship.draw(ctx);

    for (const e of this.collectEffects) {
      ctx.save();
      ctx.globalAlpha = e.alpha;
      const gradient = ctx.createRadialGradient(e.x, e.y, e.radius * 0.6, e.x, e.y, e.radius);
      gradient.addColorStop(0, 'rgba(16,185,129,0)');
      gradient.addColorStop(0.7, 'rgba(16,185,129,0.5)');
      gradient.addColorStop(1, 'rgba(16,185,129,0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawStarTwinkle(ctx: CanvasRenderingContext2D) {
    for (const s of this.stars) {
      const twinkle = 0.5 + 0.5 * Math.sin(this.time * s.twinkleSpeed + s.twinklePhase);
      const alpha = s.alpha * twinkle;
      if (alpha < 0.1) continue;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  drawMenuBackground() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.drawImage(this.starCanvas, 0, 0);
    this.drawStarTwinkle(ctx);
    this.time += 0.016;
  }
}
