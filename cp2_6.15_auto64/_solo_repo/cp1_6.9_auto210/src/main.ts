import { Game } from './game';
import { Renderer } from './renderer';
import { InputManager } from './input';

const LOGICAL_WIDTH = 960;
const LOGICAL_HEIGHT = 540;
const ASPECT_RATIO = 16 / 9;

class GameApp {
  private canvas: HTMLCanvasElement;
  private renderer: Renderer;
  private input: InputManager;
  private game: Game;
  private lastTime: number = 0;
  private animationId: number = 0;
  private fps: number = 0;
  private fpsTimer: number = 0;
  private fpsCount: number = 0;
  private frameTimeMs: number = 0;
  private maxFrameTimeMs: number = 0;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    if (!this.canvas) {
      throw new Error('Canvas element #gameCanvas not found');
    }

    this.canvas.width = LOGICAL_WIDTH;
    this.canvas.height = LOGICAL_HEIGHT;

    this.renderer = new Renderer(this.canvas, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    this.input = new InputManager(this.canvas);
    this.game = new Game(this.canvas, this.renderer, this.input);

    this.setupResizeHandler();
    this.exposeGlobals();
    this.startGameLoop();
  }

  private setupResizeHandler(): void {
    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;

      let canvasW = w;
      let canvasH = w / ASPECT_RATIO;

      if (canvasH > h) {
        canvasH = h;
        canvasW = h * ASPECT_RATIO;
      }

      this.canvas.style.width = `${Math.floor(canvasW)}px`;
      this.canvas.style.height = `${Math.floor(canvasH)}px`;
    };

    window.addEventListener('resize', resize);
    resize();
  }

  private exposeGlobals(): void {
    (window as any).__game = {
      start: () => { this.game.reset(); },
      restart: () => { this.game.reset(); },
      getGame: () => this.game,
      getStats: () => ({
        fps: this.fps,
        frameTimeMs: this.frameTimeMs,
        maxFrameTimeMs: this.maxFrameTimeMs,
        entities: this.renderer.entityCount,
        lodEnabled: this.renderer.lodEnabled
      })
    };
  }

  private startGameLoop(): void {
    this.lastTime = performance.now();
    const tick = (now: number) => {
      const startTime = performance.now();
      let dt = (now - this.lastTime) / 1000;
      this.lastTime = now;

      if (dt > 0.1) dt = 0.1;

      this.game.update(dt);
      this.game.render();

      const endTime = performance.now();
      this.frameTimeMs = endTime - startTime;
      if (this.frameTimeMs > this.maxFrameTimeMs) this.maxFrameTimeMs = this.frameTimeMs;

      this.fpsCount++;
      this.fpsTimer += dt;
      if (this.fpsTimer >= 1) {
        this.fps = Math.round(this.fpsCount / this.fpsTimer);
        this.fpsCount = 0;
        this.fpsTimer = 0;
        this.maxFrameTimeMs = 0;
      }

      this.animationId = requestAnimationFrame(tick);
    };
    this.animationId = requestAnimationFrame(tick);
  }

  destroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}

let app: GameApp | null = null;

function bootstrap() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      app = new GameApp();
    });
  } else {
    app = new GameApp();
  }
}

bootstrap();

export function start(): void {
  if ((window as any).__game) {
    (window as any).__game.start();
  }
}

export function restart(): void {
  if ((window as any).__game) {
    (window as any).__game.restart();
  }
}
