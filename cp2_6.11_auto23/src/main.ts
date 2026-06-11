import { Particle, SpatialHashGrid, ParticleState, PHYSICS_CONFIG } from './particle';
import { UIManager, UIState, UI_CONFIG } from './ui';

type GameState = 'playing' | 'won' | 'lost';

const GAME_CONFIG = {
  TOTAL_TIME: 60,
  MIN_PARTICLES: 500,
  MAX_PARTICLES: 800,
  WIN_THRESHOLD: 0.85,
  GRID_CELL_SIZE: 25,
  VICTORY_LOCK_DELAY: 300,
  VICTORY_ANIM_DURATION: 2,
  BREATH_PERIOD: 1.5,
  SHOW_PERFORMANCE_MONITOR: true,
  FPS_SMOOTHING: 0.9,
} as const;

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private ui: UIManager;

  private canvasSize: number;
  private dpr: number;

  private particles: Particle[] = [];
  private particleCount: number;
  private grid: SpatialHashGrid;

  private particleState: ParticleState = { phase: 'flowing' };

  private mouseX: number = 0;
  private mouseY: number = 0;
  private mouseActive: boolean = false;
  private mouseInside: boolean = false;

  private totalTime: number = GAME_CONFIG.TOTAL_TIME;
  private timeLeft: number = GAME_CONFIG.TOTAL_TIME;
  private elapsed: number = 0;
  private victoryTime: number | null = null;

  private gameState: GameState = 'playing';
  private bestTime: number | null = null;

  private breathTimer: number = 0;
  private breathIntensity: number = 0;

  private frameCount: number = 0;
  private lastTime: number = 0;
  private running: boolean = false;
  private animationId: number = 0;

  private timeUpAlpha: number = 0;
  private victoryAnimTimer: number = 0;
  private victoryAnimDuration: number = GAME_CONFIG.VICTORY_ANIM_DURATION;

  private buttonHover: boolean = false;

  private hourglassSide: number = UI_CONFIG.HOURGLASS_SIDE;
  private hourglassGap: number = UI_CONFIG.HOURGLASS_GAP;

  private winThreshold: number = GAME_CONFIG.WIN_THRESHOLD;

  private fps: number = 60;
  private fpsSmoothing: number = GAME_CONFIG.FPS_SMOOTHING;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    if (!this.canvas) {
      throw new Error('Canvas element not found');
    }
    const ctx = this.canvas.getContext('2d', { alpha: false });
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }
    this.ctx = ctx;

    this.dpr = window.devicePixelRatio || 1;
    this.canvasSize = this.calculateCanvasSize();

    this.setupCanvas();

    this.ui = new UIManager(this.ctx, this.canvasSize, this.canvasSize);
    this.particleCount = GAME_CONFIG.MIN_PARTICLES +
      Math.floor(Math.random() * (GAME_CONFIG.MAX_PARTICLES - GAME_CONFIG.MIN_PARTICLES + 1));
    this.grid = new SpatialHashGrid(GAME_CONFIG.GRID_CELL_SIZE);

    this.loadBestTime();
    this.initParticles();
    this.bindEvents();
    this.hideLoadingScreen();

    this.running = true;
    this.lastTime = performance.now();
    this.gameLoop = this.gameLoop.bind(this);
    this.animationId = requestAnimationFrame(this.gameLoop);
  }

  private calculateCanvasSize(): number {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const padding = 40;
    return Math.max(300, Math.min(w, h) - padding);
  }

  private setupCanvas() {
    this.canvas.width = this.canvasSize * this.dpr;
    this.canvas.height = this.canvasSize * this.dpr;
    this.canvas.style.width = `${this.canvasSize}px`;
    this.canvas.style.height = `${this.canvasSize}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  private initParticles() {
    this.particles = [];
    for (let i = 0; i < this.particleCount; i++) {
      this.particles.push(new Particle(this.canvasSize, this.canvasSize));
    }
  }

  private bindEvents() {
    window.addEventListener('resize', this.onResize.bind(this));

    const getPos = (e: MouseEvent | TouchEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      let clientX: number, clientY: number;
      if (e instanceof TouchEvent) {
        const touch = e.touches[0] || e.changedTouches[0];
        clientX = touch.clientX;
        clientY = touch.clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      return {
        x: (clientX - rect.left) * (this.canvasSize / rect.width),
        y: (clientY - rect.top) * (this.canvasSize / rect.height)
      };
    };

    const onMove = (e: MouseEvent | TouchEvent) => {
      const pos = getPos(e);
      this.mouseX = pos.x;
      this.mouseY = pos.y;
      if (this.gameState !== 'playing' && this.mouseActive) return;
      if (this.gameState !== 'playing') {
        this.updateButtonHover();
      }
    };

    const onDown = (e: MouseEvent | TouchEvent) => {
      const pos = getPos(e);
      this.mouseX = pos.x;
      this.mouseY = pos.y;

      if (this.gameState !== 'playing') {
        if (this.isInsideRestartButton(pos.x, pos.y)) {
          this.restart();
        }
        return;
      }

      this.mouseActive = true;
      this.mouseInside = true;
    };

    const onUp = () => {
      this.mouseActive = false;
    };

    const onEnter = () => {
      this.mouseInside = true;
    };

    const onLeave = () => {
      this.mouseInside = false;
      this.mouseActive = false;
      this.buttonHover = false;
    };

    this.canvas.addEventListener('mousemove', onMove);
    this.canvas.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    this.canvas.addEventListener('mouseenter', onEnter);
    this.canvas.addEventListener('mouseleave', onLeave);

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      onDown(e);
    }, { passive: false });
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      onMove(e);
    }, { passive: false });
    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      onUp();
    }, { passive: false });
  }

  private updateButtonHover() {
    this.buttonHover = this.isInsideRestartButton(this.mouseX, this.mouseY);
  }

  private isInsideRestartButton(x: number, y: number): boolean {
    const bounds = this.ui.getRestartButtonBounds();
    return (
      x >= bounds.x &&
      x <= bounds.x + bounds.width &&
      y >= bounds.y &&
      y <= bounds.y + bounds.height
    );
  }

  private onResize() {
    const newSize = this.calculateCanvasSize();
    if (newSize === this.canvasSize) return;

    const oldSize = this.canvasSize;
    this.canvasSize = newSize;
    this.setupCanvas();
    this.ui.resize(this.canvasSize, this.canvasSize);

    const scale = this.canvasSize / oldSize;
    for (const p of this.particles) {
      p.x *= scale;
      p.y *= scale;
      p.vx *= scale;
      p.vy *= scale;
      if (p.locked) {
        p.lockedX *= scale;
        p.lockedY *= scale;
      }
    }
  }

  private loadBestTime() {
    try {
      const stored = localStorage.getItem('magnetic-hourglass-best-time');
      if (stored) {
        const val = parseFloat(stored);
        if (!isNaN(val) && val > 0 && val < this.totalTime) {
          this.bestTime = val;
        }
      }
    } catch (_e) {
      this.bestTime = null;
    }
  }

  private saveBestTime(time: number) {
    try {
      localStorage.setItem('magnetic-hourglass-best-time', time.toFixed(2));
    } catch (_e) {
      // ignore storage errors
    }
  }

  private hideLoadingScreen() {
    setTimeout(() => {
      const loadingScreen = document.getElementById('loadingScreen');
      if (loadingScreen) {
        loadingScreen.classList.add('hidden');
        setTimeout(() => {
          if (loadingScreen.parentNode) {
            loadingScreen.parentNode.removeChild(loadingScreen);
          }
        }, 800);
      }
    }, 400);
  }

  private rebuildGrid() {
    this.grid.clear();
    for (let i = 0; i < this.particles.length; i++) {
      this.grid.insert(this.particles[i]);
    }
  }

  private updateFPS(deltaTime: number) {
    if (deltaTime > 0) {
      const instantFps = 1 / deltaTime;
      this.fps = this.fpsSmoothing * this.fps + (1 - this.fpsSmoothing) * instantFps;
    }
  }

  private update(deltaTime: number) {
    this.updateFPS(deltaTime);

    if (this.gameState === 'playing') {
      this.timeLeft -= deltaTime;
      this.elapsed += deltaTime;

      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        this.triggerLoss();
      }
    }

    this.breathTimer += deltaTime;
    if (this.breathTimer > GAME_CONFIG.BREATH_PERIOD) {
      this.breathTimer -= GAME_CONFIG.BREATH_PERIOD;
    }
    this.breathIntensity = 0.5 + 0.5 *
      Math.sin((this.breathTimer / GAME_CONFIG.BREATH_PERIOD) * Math.PI * 2);

    if (this.particleState.phase === 'victory') {
      this.victoryAnimTimer += deltaTime;
      if (this.victoryAnimTimer >= this.victoryAnimDuration) {
        for (const p of this.particles) {
          p.opacity = 0;
        }
      }
    }

    if (this.particleState.phase === 'fading') {
      this.timeUpAlpha = Math.min(1, this.timeUpAlpha + deltaTime / 1);
    }

    if (this.particleState.phase === 'flowing') {
      this.rebuildGrid();
    }

    const gridMap = this.grid.getGrid();
    const cx = this.canvasSize / 2;
    const cy = this.canvasSize / 2;

    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i].applyForces(
        this.particles,
        gridMap,
        this.grid.cellSize,
        cx,
        cy,
        this.mouseActive,
        this.mouseX,
        this.mouseY,
        deltaTime,
        this.particleState
      );
    }

    if (this.gameState === 'playing') {
      this.checkWinCondition();
    }

    const uiState: UIState = {
      timeLeft: this.timeLeft,
      totalTime: this.totalTime,
      progress: this.calculateHourglassProgress(),
      gameState: this.gameState,
      victoryTime: this.victoryTime,
      bestTime: this.bestTime,
      hintText: this.gameState === 'playing' ? '拖拽鼠标引导粒子' : '',
      mouseDown: this.mouseActive
    };

    this.ui.update(deltaTime, uiState);
    this.frameCount++;
  }

  private checkWinCondition() {
    const progress = this.calculateHourglassProgress();
    if (progress >= this.winThreshold) {
      this.triggerVictory();
    }
  }

  private calculateHourglassProgress(): number {
    if (this.particles.length === 0) return 0;
    let count = 0;
    const cx = this.canvasSize / 2;
    const cy = this.canvasSize / 2;
    for (let i = 0; i < this.particles.length; i++) {
      if (this.particles[i].isInHourglass(cx, cy, this.hourglassSide, this.hourglassGap)) {
        count++;
      }
    }
    return count / this.particles.length;
  }

  private triggerVictory() {
    this.gameState = 'won';
    this.victoryTime = parseFloat(this.elapsed.toFixed(1));
    this.particleState = { phase: 'locked' };

    for (const p of this.particles) {
      p.lockPosition();
    }

    setTimeout(() => {
      this.particleState = { phase: 'victory' };
      this.victoryAnimTimer = 0;
      for (const p of this.particles) {
        p.triggerVictoryBurst(this.canvasSize, this.canvasSize);
      }
    }, GAME_CONFIG.VICTORY_LOCK_DELAY);

    if (this.bestTime === null || this.victoryTime < this.bestTime) {
      this.bestTime = this.victoryTime;
      this.saveBestTime(this.victoryTime);
    }
  }

  private triggerLoss() {
    this.gameState = 'lost';
    this.particleState = { phase: 'fading' };
    for (const p of this.particles) {
      p.victoryVx = (Math.random() - 0.5) * 20;
      p.victoryVy = (Math.random() - 0.5) * 20;
    }
  }

  private restart() {
    this.particleCount = GAME_CONFIG.MIN_PARTICLES +
      Math.floor(Math.random() * (GAME_CONFIG.MAX_PARTICLES - GAME_CONFIG.MIN_PARTICLES + 1));
    this.initParticles();

    this.particleState = { phase: 'flowing' };
    this.gameState = 'playing';
    this.timeLeft = this.totalTime;
    this.elapsed = 0;
    this.victoryTime = null;
    this.timeUpAlpha = 0;
    this.victoryAnimTimer = 0;
    this.mouseActive = false;
    this.buttonHover = false;
    this.breathTimer = Math.random() * GAME_CONFIG.BREATH_PERIOD;
  }

  private render() {
    this.ctx.fillStyle = '#0A0A0F';
    this.ctx.fillRect(0, 0, this.canvasSize, this.canvasSize);

    this.drawBackgroundVignette();

    this.ui.drawHourglassOutline();

    if (this.mouseActive && this.mouseInside && this.gameState === 'playing') {
      this.ui.drawMagneticField(this.mouseX, this.mouseY, 1);
    }

    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i].render(
        this.ctx,
        this.canvasSize,
        this.canvasSize,
        this.breathIntensity,
        this.frameCount,
        this.particleState
      );
    }

    const uiState: UIState = {
      timeLeft: this.timeLeft,
      totalTime: this.totalTime,
      progress: this.calculateHourglassProgress(),
      gameState: this.gameState,
      victoryTime: this.victoryTime,
      bestTime: this.bestTime,
      hintText: this.gameState === 'playing' ? '拖拽鼠标引导粒子' : '',
      mouseDown: this.mouseActive
    };

    this.ui.render(uiState);

    if (GAME_CONFIG.SHOW_PERFORMANCE_MONITOR) {
      this.ui.drawPerformanceMonitor(this.fps, this.particles.length);
    }

    if (this.gameState === 'lost') {
      this.ui.drawTimeUpText(this.timeUpAlpha);
    }

    if (this.gameState !== 'playing') {
      this.ui.drawRestartButton(this.buttonHover, this.gameState);
    }
  }

  private drawBackgroundVignette() {
    const cx = this.canvasSize / 2;
    const cy = this.canvasSize / 2;
    const r = this.canvasSize * 0.7;
    const gradient = this.ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r);
    gradient.addColorStop(0, 'rgba(18,18,26,0)');
    gradient.addColorStop(1, 'rgba(10,10,15,0.8)');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvasSize, this.canvasSize);
  }

  private gameLoop(now: number) {
    if (!this.running) return;

    let delta = (now - this.lastTime) / 1000;
    this.lastTime = now;

    delta = Math.min(delta, 0.05);

    this.update(delta);
    this.render();

    this.animationId = requestAnimationFrame(this.gameLoop);
  }

  public destroy() {
    this.running = false;
    cancelAnimationFrame(this.animationId);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  try {
    (window as unknown as { __magneticHourglass?: Game }).__magneticHourglass = new Game();
  } catch (e) {
    console.error('Failed to initialize Magnetic Hourglass game:', e);
  }
});
