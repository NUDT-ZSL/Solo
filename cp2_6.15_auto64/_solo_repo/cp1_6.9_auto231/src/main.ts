import { Network, Node, Point } from './network';
import { Renderer } from './renderer';
import { Controls } from './controls';

const TARGET_FPS = 60;
const FRAME_INTERVAL = 1000 / TARGET_FPS;

class App {
  private canvas: HTMLCanvasElement;
  private network: Network;
  private renderer: Renderer;
  private controls: Controls;

  private rafId: number | null;
  private lastTime: number;
  private frameAccumulator: number;
  private fpsCounter: number;
  private fpsTimer: number;

  private hoveredNode: Node | null;
  private lastRippleTime: number;

  private globalSlowFactor: number;
  private targetSlowFactor: number;
  private slowTransitionSpeed: number;

  private colorTransitionActive: boolean;
  private colorTransitionProgress: number;

  constructor() {
    this.canvas = document.getElementById('canvas') as HTMLCanvasElement;
    if (!this.canvas) {
      throw new Error('Canvas element not found');
    }

    this.network = new Network();
    this.renderer = new Renderer(this.canvas);
    this.controls = new Controls(this.canvas, this.network, this.renderer, {
      onColorModeChange: this.onColorModeChange,
      onClearCanvas: this.onClearCanvas,
      onTrajectoryStart: this.onTrajectoryStart,
      onTrajectoryMove: this.onTrajectoryMove,
      onTrajectoryEnd: this.onTrajectoryEnd,
      onNodeHover: this.onNodeHover,
      onMouseMove: this.onMouseMove,
      onMouseEnter: this.onMouseEnter,
      onMouseLeave: this.onMouseLeave,
    });

    this.rafId = null;
    this.lastTime = performance.now();
    this.frameAccumulator = 0;
    this.fpsCounter = 0;
    this.fpsTimer = 0;

    this.hoveredNode = null;
    this.lastRippleTime = 0;

    this.globalSlowFactor = 1;
    this.targetSlowFactor = 1;
    this.slowTransitionSpeed = 1000;

    this.colorTransitionActive = false;
    this.colorTransitionProgress = 1;

    this.resizeCanvas();
    window.addEventListener('resize', this.resizeCanvas);
  }

  private resizeCanvas = (): void => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.renderer.resize(w * dpr, h * dpr);
    const ctx = this.canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }
    this.renderer.width = w;
    this.renderer.height = h;
  };

  private onColorModeChange = (_mode: 'gradient' | 'random'): void => {
    this.colorTransitionActive = true;
    this.colorTransitionProgress = 0;
  };

  private onClearCanvas = (): void => {
    const cx = this.renderer.width / 2;
    const cy = this.renderer.height / 2;
    this.network.startFadeAnimation({ x: cx, y: cy });
  };

  private onTrajectoryStart = (point: Point, hue: number): void => {
    this.network.startTrajectory(point, hue);
  };

  private onTrajectoryMove = (point: Point, hue: number): void => {
    this.network.addTrajectoryPoint(point, hue);
  };

  private onTrajectoryEnd = (): void => {
    this.network.completeTrajectory();
  };

  private onNodeHover = (node: Node | null): void => {
    if (node && this.hoveredNode?.id !== node.id) {
      const now = performance.now();
      if (now - this.lastRippleTime > 600) {
        this.network.triggerRippleAtNode(node);
        this.lastRippleTime = now;
      }
    }
    this.hoveredNode = node;
  };

  private onMouseMove = (_point: Point): void => {
    // no-op, handled by controls and onNodeHover
  };

  private onMouseEnter = (): void => {
    this.targetSlowFactor = 1;
  };

  private onMouseLeave = (): void => {
    this.targetSlowFactor = 0.3;
    this.hoveredNode = null;
  };

  private updateSlowFactor(deltaTime: number): void {
    if (Math.abs(this.globalSlowFactor - this.targetSlowFactor) > 0.001) {
      const diff = this.targetSlowFactor - this.globalSlowFactor;
      const step = (deltaTime / this.slowTransitionSpeed) * Math.sign(diff);
      if (Math.abs(step) > Math.abs(diff)) {
        this.globalSlowFactor = this.targetSlowFactor;
      } else {
        this.globalSlowFactor += step;
      }
    } else {
      this.globalSlowFactor = this.targetSlowFactor;
    }
  }

  private updateColorTransition(deltaTime: number): void {
    if (this.colorTransitionActive) {
      this.colorTransitionProgress += deltaTime / 800;
      if (this.colorTransitionProgress >= 1) {
        this.colorTransitionProgress = 1;
        this.colorTransitionActive = false;
      }
    }
  }

  private update(deltaTime: number): void {
    this.updateSlowFactor(deltaTime);
    this.updateColorTransition(deltaTime);

    this.network.update(
      deltaTime,
      this.controls.state.speedMultiplier,
      this.globalSlowFactor
    );

    this.controls.update(deltaTime);
  }

  private render(): void {
    this.renderer.render(this.network, this.hoveredNode, this.controls.state);
  }

  private gameLoop = (now: number): void => {
    const delta = now - this.lastTime;
    this.lastTime = now;
    this.frameAccumulator += delta;

    this.fpsTimer += delta;
    this.fpsCounter++;
    if (this.fpsTimer >= 1000) {
      this.fpsCounter = 0;
      this.fpsTimer = 0;
    }

    let updatesCount = 0;
    while (this.frameAccumulator >= FRAME_INTERVAL && updatesCount < 5) {
      this.update(FRAME_INTERVAL);
      this.frameAccumulator -= FRAME_INTERVAL;
      updatesCount++;
    }

    if (updatesCount === 5) {
      this.frameAccumulator = 0;
    }

    this.render();

    this.rafId = requestAnimationFrame(this.gameLoop);
  };

  start(): void {
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.gameLoop);
  }

  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}

function bootstrap(): void {
  const app = new App();
  app.start();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
