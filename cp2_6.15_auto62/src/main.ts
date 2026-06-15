import { FluidSolver } from './solver';
import { SmokeRenderer } from './renderer';
import { UIControls } from './uiControls';

interface MouseState {
  isDown: boolean;
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  velocityX: number;
  velocityY: number;
  speed: number;
  trailPoints: { x: number; y: number; alpha: number }[];
}

interface DemoState {
  active: boolean;
  startTime: number;
  duration: number;
  x: number;
  y: number;
  angle: number;
  densityAmount: number;
}

interface PerformanceStats {
  fps: number;
  frameCount: number;
  lastFpsUpdate: number;
  lowFpsBlinkPhase: number;
  lastBlinkUpdate: number;
  currentBlinkOpacity: number;
  frameTimes: number[];
  lastFrameTime: number;
}

const GRID_SIZE = 100;
const PARTICLE_RADIUS = 15;
const TRAIL_LENGTH = 20;
const SPEED_THRESHOLD = 200;
const SHOCKWAVE_RADIUS = 80;
const DEMO_DURATION = 10000;

class FluidSimulationApp {
  private canvas: HTMLCanvasElement;
  private solver: FluidSolver;
  private renderer: SmokeRenderer;
  private uiControls: UIControls;

  private mouseState: MouseState;
  private demoState: DemoState;
  private performanceStats: PerformanceStats;

  private densityInjectionRate: number = 0.5;
  private diffusionRate: number = 0.0001;
  private windAngle: number = 0;

  private animationFrameId: number | null = null;
  private lastTime: number = 0;

  private fpsDisplay: HTMLElement;
  private particleDisplay: HTMLElement;

  constructor() {
    const canvas = document.getElementById('canvas') as HTMLCanvasElement;
    if (!canvas) throw new Error('Canvas element not found');
    this.canvas = canvas;

    this.solver = new FluidSolver({
      gridSize: GRID_SIZE,
      timeStep: 0.01,
      viscosity: 0.0001,
      diffusion: 0.0001,
      pressureIterations: 20,
    });

    this.renderer = new SmokeRenderer(canvas, GRID_SIZE);

    this.uiControls = new UIControls('sliderContainer');
    this.setupUIControls();

    const fpsEl = document.getElementById('fpsDisplay');
    const particleEl = document.getElementById('particleDisplay');
    if (!fpsEl || !particleEl) throw new Error('Stats elements not found');
    this.fpsDisplay = fpsEl;
    this.particleDisplay = particleEl;

    this.mouseState = {
      isDown: false,
      x: 0,
      y: 0,
      prevX: 0,
      prevY: 0,
      velocityX: 0,
      velocityY: 0,
      speed: 0,
      trailPoints: [],
    };

    this.demoState = {
      active: true,
      startTime: performance.now(),
      duration: DEMO_DURATION,
      x: 0.5,
      y: 0.5,
      angle: Math.random() * Math.PI * 2,
      densityAmount: 0.5,
    };

    this.performanceStats = {
      fps: 0,
      frameCount: 0,
      lastFpsUpdate: performance.now(),
      lowFpsBlinkPhase: 0,
      lastBlinkUpdate: performance.now(),
      currentBlinkOpacity: 1,
      frameTimes: [],
      lastFrameTime: performance.now(),
    };

    this.setupEventListeners();
  }

  private setupUIControls(): void {
    this.uiControls.addSlider('density', {
      label: '烟雾密度注入率',
      min: 0.01,
      max: 1.0,
      step: 0.01,
      defaultValue: 0.5,
      onChange: (value) => {
        this.densityInjectionRate = value;
      },
    });

    this.uiControls.addSlider('diffusion', {
      label: '扩散速度',
      min: 0.0,
      max: 0.5,
      step: 0.01,
      defaultValue: 0.0001,
      onChange: (value) => {
        this.diffusionRate = value;
        this.solver.setDiffusion(value);
      },
    });

    this.uiControls.addSlider('wind', {
      label: '风力角度',
      min: 0,
      max: 360,
      step: 1,
      defaultValue: 0,
      onChange: (value) => {
        this.windAngle = value;
        this.solver.setWindAngle(value);
      },
    });
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.handleMouseUp.bind(this));

    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
    this.canvas.addEventListener('touchcancel', this.handleTouchEnd.bind(this));

    window.addEventListener('resize', this.handleResize.bind(this));
  }

  private handleMouseDown(e: MouseEvent): void {
    e.preventDefault();
    this.demoState.active = false;
    this.mouseState.isDown = true;
    this.updateMousePosition(e.clientX, e.clientY);
    this.mouseState.prevX = this.mouseState.x;
    this.mouseState.prevY = this.mouseState.y;
    this.mouseState.trailPoints = [];

    const nx = this.mouseState.x / window.innerWidth;
    const ny = this.mouseState.y / window.innerHeight;
    const radius = SHOCKWAVE_RADIUS / Math.min(window.innerWidth, window.innerHeight);

    this.solver.createShockwave(nx, ny, 5.0, radius);
  }

  private handleMouseMove(e: MouseEvent): void {
    this.updateMousePosition(e.clientX, e.clientY);
  }

  private handleMouseUp(): void {
    this.mouseState.isDown = false;
    this.mouseState.trailPoints = [];
  }

  private handleTouchStart(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      this.demoState.active = false;
      this.mouseState.isDown = true;
      this.updateMousePosition(touch.clientX, touch.clientY);
      this.mouseState.prevX = this.mouseState.x;
      this.mouseState.prevY = this.mouseState.y;
      this.mouseState.trailPoints = [];

      const nx = this.mouseState.x / window.innerWidth;
      const ny = this.mouseState.y / window.innerHeight;
      const radius = SHOCKWAVE_RADIUS / Math.min(window.innerWidth, window.innerHeight);

      this.solver.createShockwave(nx, ny, 5.0, radius);
    }
  }

  private handleTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      this.updateMousePosition(touch.clientX, touch.clientY);
    }
  }

  private handleTouchEnd(): void {
    this.mouseState.isDown = false;
    this.mouseState.trailPoints = [];
  }

  private updateMousePosition(clientX: number, clientY: number): void {
    this.mouseState.prevX = this.mouseState.x;
    this.mouseState.prevY = this.mouseState.y;
    this.mouseState.x = clientX;
    this.mouseState.y = clientY;

    const dx = this.mouseState.x - this.mouseState.prevX;
    const dy = this.mouseState.y - this.mouseState.prevY;
    const dt = 1 / 60;

    this.mouseState.velocityX = dx / dt;
    this.mouseState.velocityY = dy / dt;
    this.mouseState.speed = Math.sqrt(dx * dx + dy * dy) / dt;
  }

  private handleResize(): void {
    this.renderer.resize();
  }

  private updateDemo(currentTime: number): void {
    if (!this.demoState.active) return;

    const elapsed = currentTime - this.demoState.startTime;
    const progress = elapsed / this.demoState.duration;

    if (progress >= 1) {
      this.demoState.active = false;
      return;
    }

    this.demoState.densityAmount = progress < 0.9 ? 0.5 : 0.5 - (progress - 0.9) * 4;

    const time = currentTime * 0.001;
    this.demoState.x = 0.5 + Math.sin(time * 0.5) * 0.2;
    this.demoState.y = 0.5 + Math.cos(time * 0.3) * 0.15;

    const vx = Math.cos(this.demoState.angle) * 2.0;
    const vy = Math.sin(this.demoState.angle) * 2.0;

    this.solver.injectDensity(this.demoState.x, this.demoState.y, 0.08, this.demoState.densityAmount * this.densityInjectionRate);
    this.solver.injectVelocity(this.demoState.x, this.demoState.y, vx, vy, 0.08);
  }

  private updateMouseInteraction(): void {
    if (!this.mouseState.isDown) return;

    const nx = this.mouseState.x / window.innerWidth;
    const ny = this.mouseState.y / window.innerHeight;
    const radius = PARTICLE_RADIUS / Math.min(window.innerWidth, window.innerHeight);

    this.solver.injectDensity(nx, ny, radius, 0.8);

    const vx = this.mouseState.velocityX / window.innerWidth * 0.1;
    const vy = this.mouseState.velocityY / window.innerHeight * 0.1;
    this.solver.injectVelocity(nx, ny, vx, vy, radius);

    this.mouseState.trailPoints.unshift({
      x: this.mouseState.x,
      y: this.mouseState.y,
      alpha: 0.6,
    });

    if (this.mouseState.trailPoints.length > TRAIL_LENGTH) {
      this.mouseState.trailPoints.pop();
    }

    for (let i = 0; i < this.mouseState.trailPoints.length; i++) {
      this.mouseState.trailPoints[i].alpha = 0.6 * (1 - i / TRAIL_LENGTH);
    }
  }

  private updatePerformance(currentTime: number, frameTime: number): void {
    this.performanceStats.frameCount++;
    this.performanceStats.frameTimes.push(frameTime);

    if (this.performanceStats.frameTimes.length > 60) {
      this.performanceStats.frameTimes.shift();
    }

    if (currentTime - this.performanceStats.lastFpsUpdate >= 1000) {
      this.performanceStats.fps = Math.round(
        this.performanceStats.frameCount * 1000 / (currentTime - this.performanceStats.lastFpsUpdate)
      );
      this.performanceStats.frameCount = 0;
      this.performanceStats.lastFpsUpdate = currentTime;
    }

    if (this.performanceStats.fps < 30) {
      if (currentTime - this.performanceStats.lastBlinkUpdate >= 500) {
        this.performanceStats.lowFpsBlinkPhase = 1 - this.performanceStats.lowFpsBlinkPhase;
        this.performanceStats.currentBlinkOpacity = 0.6 + this.performanceStats.lowFpsBlinkPhase * 0.4;
        this.performanceStats.lastBlinkUpdate = currentTime;
      }
    } else {
      this.performanceStats.currentBlinkOpacity = 1;
    }
  }

  private updateStatsDisplay(): void {
    const particleCount = this.solver.getParticleCount();

    if (this.performanceStats.fps < 30) {
      this.fpsDisplay.classList.add('warning');
      this.fpsDisplay.style.opacity = this.performanceStats.currentBlinkOpacity.toString();
    } else {
      this.fpsDisplay.classList.remove('warning');
      this.fpsDisplay.style.opacity = '1';
    }

    this.fpsDisplay.textContent = `FPS: ${this.performanceStats.fps || '--'}`;
    this.particleDisplay.textContent = `粒子数: ${particleCount}`;
  }

  private getAverageFrameTime(): number {
    if (this.performanceStats.frameTimes.length === 0) return 0;
    const sum = this.performanceStats.frameTimes.reduce((a, b) => a + b, 0);
    return sum / this.performanceStats.frameTimes.length;
  }

  private animate(currentTime: number): void {
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    const frameStartTime = performance.now();

    this.uiControls.update(deltaTime);
    this.updateDemo(currentTime);
    this.updateMouseInteraction();
    this.solver.step();

    const density = this.solver.getDensity();
    this.renderer.render(density);

    if (this.mouseState.isDown && this.mouseState.speed > SPEED_THRESHOLD) {
      this.renderer.drawTrail(this.mouseState.trailPoints, PARTICLE_RADIUS);
    }

    if (this.mouseState.isDown) {
      this.renderer.drawSmokeParticle(
        this.mouseState.x,
        this.mouseState.y,
        PARTICLE_RADIUS,
        0.8
      );
    }

    const frameEndTime = performance.now();
    const frameTime = frameEndTime - frameStartTime;

    this.updatePerformance(currentTime, frameTime);
    this.updateStatsDisplay();

    if (frameTime > 15 && this.solver.pressureIterations > 10) {
      console.warn(`Frame time exceeded 15ms: ${frameTime.toFixed(2)}ms`);
    }

    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
  }

  public start(): void {
    this.lastTime = performance.now();
    this.animate(this.lastTime);
    console.log('Fluid simulation started. Grid size:', GRID_SIZE);
  }

  public stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public getPerformanceMetrics(): { fps: number; avgFrameTime: number; particleCount: number } {
    return {
      fps: this.performanceStats.fps,
      avgFrameTime: this.getAverageFrameTime(),
      particleCount: this.solver.getParticleCount(),
    };
  }
}

let app: FluidSimulationApp | null = null;

document.addEventListener('DOMContentLoaded', () => {
  try {
    app = new FluidSimulationApp();
    app.start();
  } catch (error) {
    console.error('Failed to initialize fluid simulation:', error);
  }
});

window.addEventListener('beforeunload', () => {
  if (app) {
    app.stop();
  }
});

export { FluidSimulationApp };
