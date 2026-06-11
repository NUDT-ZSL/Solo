import { Particle } from './particle';
import { UIManager, GameState, UIState } from './ui';

const TOTAL_TIME = 60;
const PARTICLE_COUNT_MIN = 500;
const PARTICLE_COUNT_MAX = 800;
const MAGNET_RADIUS = 50;
const MAGNET_MAX_FORCE = 80;
const SHAPE_THRESHOLD = 0.85;
const HOURGLASS_SIDE = 120;
const HOURGLASS_GAP = 40;
const SPATIAL_CELL_SIZE = 50;
const REPULSION_RADIUS = 20;
const REPULSION_STRENGTH = 15;
const CENTRAL_ATTRACTION = 0.02;
const BEST_TIME_KEY = 'magnetic_hourglass_best_time';

class SpatialHashGrid {
  private cellSize: number;
  private grid: Map<string, Particle[]>;

  constructor(cellSize: number) {
    this.cellSize = cellSize;
    this.grid = new Map();
  }

  public clear(): void {
    this.grid.clear();
  }

  private getKey(x: number, y: number): string {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    return `${cx},${cy}`;
  }

  public insert(particle: Particle): void {
    const key = this.getKey(particle.x, particle.y);
    let bucket = this.grid.get(key);
    if (!bucket) {
      bucket = [];
      this.grid.set(key, bucket);
    }
    bucket.push(particle);
  }

  public query(x: number, y: number, radius: number): Particle[] {
    const result: Particle[] = [];
    const minX = Math.floor((x - radius) / this.cellSize);
    const maxX = Math.floor((x + radius) / this.cellSize);
    const minY = Math.floor((y - radius) / this.cellSize);
    const maxY = Math.floor((y + radius) / this.cellSize);

    for (let cx = minX; cx <= maxX; cx++) {
      for (let cy = minY; cy <= maxY; cy++) {
        const bucket = this.grid.get(`${cx},${cy}`);
        if (bucket) {
          for (const p of bucket) {
            const dx = p.x - x;
            const dy = p.y - y;
            if (dx * dx + dy * dy <= radius * radius) {
              result.push(p);
            }
          }
        }
      }
    }
    return result;
  }
}

function isPointInTriangle(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number
): boolean {
  const d1 = (px - x2) * (y1 - y2) - (x1 - x2) * (py - y2);
  const d2 = (px - x3) * (y2 - y3) - (x2 - x3) * (py - y3);
  const d3 = (px - x1) * (y3 - y1) - (x3 - x1) * (py - y1);

  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;

  return !(hasNeg && hasPos);
}

function isInHourglass(x: number, y: number, cx: number, cy: number): boolean {
  const triangleHeight = (Math.sqrt(3) / 2) * HOURGLASS_SIDE;
  const gap = HOURGLASS_GAP;

  const topBaseY = cy - gap / 2 - triangleHeight;
  const topApexY = cy - gap / 2;
  const bottomApexY = cy + gap / 2;
  const bottomBaseY = cy + gap / 2 + triangleHeight;

  if (y < topBaseY || y > bottomBaseY) return false;

  if (y >= topBaseY && y <= topApexY) {
    return isPointInTriangle(
      x, y,
      cx - HOURGLASS_SIDE / 2, topBaseY,
      cx + HOURGLASS_SIDE / 2, topBaseY,
      cx, topApexY
    );
  }

  if (y >= bottomApexY && y <= bottomBaseY) {
    return isPointInTriangle(
      x, y,
      cx, bottomApexY,
      cx - HOURGLASS_SIDE / 2, bottomBaseY,
      cx + HOURGLASS_SIDE / 2, bottomBaseY
    );
  }

  return false;
}

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private canvasSize: number = 0;
  private dpr: number = 1;
  private particles: Particle[] = [];
  private spatialGrid: SpatialHashGrid;
  private uiManager: UIManager;

  private gameState: GameState = 'playing';
  private timeLeft: number = TOTAL_TIME;
  private elapsedTime: number = 0;
  private particlesInShape: number = 0;
  private bestTime: number | null = null;
  private showRestartButton: boolean = false;
  private victoryTriggered: boolean = false;
  private victoryAnimTimer: number = 0;

  private mouseX: number = 0;
  private mouseY: number = 0;
  private isMouseDown: boolean = false;
  private restartButtonRect: { x: number; y: number; width: number; height: number } | null = null;

  private lastTime: number = 0;
  private frameCount: number = 0;
  private animationId: number = 0;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context not available');
    this.ctx = ctx;

    this.spatialGrid = new SpatialHashGrid(SPATIAL_CELL_SIZE);
    this.uiManager = new UIManager(this.ctx, this.canvasSize);

    this.loadBestTime();
    this.resize();
    this.initParticles();
    this.bindEvents();
  }

  private loadBestTime(): void {
    try {
      const stored = localStorage.getItem(BEST_TIME_KEY);
      if (stored !== null) {
        const val = parseFloat(stored);
        if (!isNaN(val) && val > 0) {
          this.bestTime = val;
        }
      }
    } catch {
      this.bestTime = null;
    }
  }

  private saveBestTime(time: number): void {
    try {
      if (this.bestTime === null || time < this.bestTime) {
        this.bestTime = time;
        localStorage.setItem(BEST_TIME_KEY, time.toString());
      }
    } catch {
    }
  }

  private resize(): void {
    this.dpr = window.devicePixelRatio || 1;
    const minDim = Math.min(window.innerWidth, window.innerHeight);
    this.canvasSize = minDim;

    this.canvas.width = this.canvasSize * this.dpr;
    this.canvas.height = this.canvasSize * this.dpr;
    this.canvas.style.width = `${this.canvasSize}px`;
    this.canvas.style.height = `${this.canvasSize}px`;

    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.uiManager.resize(this.canvasSize);
  }

  private initParticles(): void {
    this.particles = [];
    const count = PARTICLE_COUNT_MIN + Math.floor(Math.random() * (PARTICLE_COUNT_MAX - PARTICLE_COUNT_MIN + 1));
    const center = this.canvasSize / 2;
    const spread = this.canvasSize * 0.35;

    for (let i = 0; i < count; i++) {
      const x = center + (Math.random() - 0.5) * spread * 2;
      const y = center + (Math.random() - 0.5) * spread * 2;
      const p = new Particle(x, y);
      p.setFrameOffset(i % 4);
      this.particles.push(p);
    }
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => this.resize());

    const getMousePos = (e: MouseEvent | Touch): { x: number; y: number } => {
      const rect = this.canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    this.canvas.addEventListener('mousedown', (e) => {
      const pos = getMousePos(e);
      this.mouseX = pos.x;
      this.mouseY = pos.y;
      this.isMouseDown = true;

      if (this.showRestartButton && this.restartButtonRect) {
        const r = this.restartButtonRect;
        if (pos.x >= r.x && pos.x <= r.x + r.width && pos.y >= r.y && pos.y <= r.y + r.height) {
          this.restart();
        }
      }
    });

    this.canvas.addEventListener('mousemove', (e) => {
      const pos = getMousePos(e);
      this.mouseX = pos.x;
      this.mouseY = pos.y;
    });

    this.canvas.addEventListener('mouseup', () => {
      this.isMouseDown = false;
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.isMouseDown = false;
    });

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (e.touches.length > 0) {
        const pos = getMousePos(e.touches[0]);
        this.mouseX = pos.x;
        this.mouseY = pos.y;
        this.isMouseDown = true;

        if (this.showRestartButton && this.restartButtonRect) {
          const r = this.restartButtonRect;
          if (pos.x >= r.x && pos.x <= r.x + r.width && pos.y >= r.y && pos.y <= r.y + r.height) {
            this.restart();
          }
        }
      }
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (e.touches.length > 0) {
        const pos = getMousePos(e.touches[0]);
        this.mouseX = pos.x;
        this.mouseY = pos.y;
      }
    }, { passive: false });

    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.isMouseDown = false;
    }, { passive: false });
  }

  private restart(): void {
    this.gameState = 'playing';
    this.timeLeft = TOTAL_TIME;
    this.elapsedTime = 0;
    this.particlesInShape = 0;
    this.showRestartButton = false;
    this.victoryTriggered = false;
    this.victoryAnimTimer = 0;
    this.initParticles();
  }

  private applyForces(dt: number): void {
    const cx = this.canvasSize / 2;
    const cy = this.canvasSize / 2;

    this.spatialGrid.clear();
    for (const p of this.particles) {
      this.spatialGrid.insert(p);
    }

    for (const p of this.particles) {
      if (p.locked) continue;

      const dxC = cx - p.x;
      const dyC = cy - p.y;
      const distC = Math.sqrt(dxC * dxC + dyC * dyC);
      if (distC > 1) {
        p.applyForce(dxC * CENTRAL_ATTRACTION / distC, dyC * CENTRAL_ATTRACTION / distC, dt);
      }

      const neighbors = this.spatialGrid.query(p.x, p.y, REPULSION_RADIUS);
      for (const other of neighbors) {
        if (other === p) continue;
        const dx = p.x - other.x;
        const dy = p.y - other.y;
        const distSq = dx * dx + dy * dy;
        if (distSq > 0.01 && distSq < REPULSION_RADIUS * REPULSION_RADIUS) {
          const dist = Math.sqrt(distSq);
          const force = (1 - dist / REPULSION_RADIUS) * REPULSION_STRENGTH;
          p.applyForce((dx / dist) * force, (dy / dist) * force, dt);
        }
      }

      if (this.isMouseDown) {
        const dxM = this.mouseX - p.x;
        const dyM = this.mouseY - p.y;
        const distM = Math.sqrt(dxM * dxM + dyM * dyM);
        if (distM < MAGNET_RADIUS && distM > 0.1) {
          const forceMag = (1 - distM / MAGNET_RADIUS) * MAGNET_MAX_FORCE;
          p.applyForce((dxM / distM) * forceMag * 0.1, (dyM / distM) * forceMag * 0.1, dt);
        }
      }
    }
  }

  private checkShape(): number {
    const cx = this.canvasSize / 2;
    const cy = this.canvasSize / 2;
    let count = 0;
    for (const p of this.particles) {
      if (isInHourglass(p.x, p.y, cx, cy)) {
        count++;
      }
    }
    return count;
  }

  private triggerVictory(): void {
    this.victoryTriggered = true;
    this.gameState = 'victory';
    this.saveBestTime(this.elapsedTime);

    const cx = this.canvasSize / 2;
    const cy = this.canvasSize / 2;
    for (const p of this.particles) {
      if (!p.locked) {
        p.locked = true;
      }
    }

    setTimeout(() => {
      for (const p of this.particles) {
        p.triggerVictory(cx, cy);
      }
    }, 300);

    setTimeout(() => {
      this.showRestartButton = true;
    }, 2300);
  }

  private triggerTimeout(): void {
    this.gameState = 'timeout';
    setTimeout(() => {
      this.showRestartButton = true;
    }, 1500);
  }

  private drawMagnetField(): void {
    if (!this.isMouseDown || this.gameState !== 'playing') return;

    const ctx = this.ctx;
    ctx.save();

    const gradient = ctx.createRadialGradient(
      this.mouseX, this.mouseY, 0,
      this.mouseX, this.mouseY, MAGNET_RADIUS
    );
    gradient.addColorStop(0, 'rgba(0, 229, 255, 0.3)');
    gradient.addColorStop(1, 'rgba(0, 229, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.mouseX, this.mouseY, MAGNET_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(0, 229, 255, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(this.mouseX, this.mouseY, MAGNET_RADIUS, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  private update(dt: number, currentTime: number): void {
    this.frameCount++;

    if (this.gameState === 'playing') {
      this.timeLeft -= dt / 1000;
      this.elapsedTime += dt / 1000;

      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        this.triggerTimeout();
      }

      this.applyForces(dt / 16.67);

      for (const p of this.particles) {
        p.update(dt / 16.67, this.canvasSize, currentTime);
      }

      this.particlesInShape = this.checkShape();
      const percentage = (this.particlesInShape / this.particles.length) * 100;

      if (percentage >= SHAPE_THRESHOLD * 100 && !this.victoryTriggered) {
        this.triggerVictory();
      }
    } else if (this.gameState === 'timeout') {
      for (const p of this.particles) {
        p.fadeOut(dt);
      }
    } else if (this.gameState === 'victory') {
      for (const p of this.particles) {
        p.update(dt / 16.67, this.canvasSize, currentTime);
      }
      this.victoryAnimTimer += dt;
    }

    const uiState: UIState = {
      timeLeft: this.timeLeft,
      totalTime: TOTAL_TIME,
      particlesInShape: this.particlesInShape,
      totalParticles: this.particles.length,
      completionPercentage: (this.particlesInShape / this.particles.length) * 100,
      bestTime: this.bestTime,
      currentTime: this.elapsedTime,
      gameState: this.gameState,
      showRestartButton: this.showRestartButton,
    };

    this.uiManager.update(dt, uiState);
  }

  private render(currentTime: number): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvasSize, this.canvasSize);

    for (const p of this.particles) {
      p.render(ctx, currentTime, this.frameCount, this.canvasSize);
    }

    this.drawMagnetField();

    const uiState: UIState = {
      timeLeft: this.timeLeft,
      totalTime: TOTAL_TIME,
      particlesInShape: this.particlesInShape,
      totalParticles: this.particles.length,
      completionPercentage: (this.particlesInShape / this.particles.length) * 100,
      bestTime: this.bestTime,
      currentTime: this.elapsedTime,
      gameState: this.gameState,
      showRestartButton: this.showRestartButton,
    };

    this.restartButtonRect = this.uiManager.render(uiState, this.mouseX, this.mouseY);
  }

  private loop = (timestamp: number): void => {
    if (this.lastTime === 0) this.lastTime = timestamp;
    const dt = Math.min(33.33, timestamp - this.lastTime);
    this.lastTime = timestamp;

    this.update(dt, timestamp);
    this.render(timestamp);

    this.animationId = requestAnimationFrame(this.loop);
  };

  public start(): void {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
      setTimeout(() => {
        loadingScreen.classList.add('hidden');
      }, 600);
    }
    this.animationId = requestAnimationFrame(this.loop);
  }

  public destroy(): void {
    cancelAnimationFrame(this.animationId);
  }
}

const game = new Game();
game.start();
