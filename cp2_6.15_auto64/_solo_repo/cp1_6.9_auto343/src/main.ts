import { SceneRenderer } from './scene';
import { BreathInteraction } from './breath';
import { ParticleSystem } from './particle';

const BASE_WIDTH = 1200;
const BASE_HEIGHT = 800;
const ASPECT_RATIO = BASE_WIDTH / BASE_HEIGHT;

class App {
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private renderer!: SceneRenderer;
  private breath!: BreathInteraction;
  private particles!: ParticleSystem;
  private animationId: number = 0;
  private lastFrameTime: number = 0;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  private mouseSpeed: number = 0;
  private frameCount: number = 0;
  private fpsUpdateTime: number = 0;
  private currentFPS: number = 60;
  private lowPerformanceMode: boolean = false;

  public start(): void {
    this.initCanvas();
    this.initModules();
    this.bindEvents();
    this.lastFrameTime = performance.now();
    this.fpsUpdateTime = performance.now();
    this.animate();
  }

  private initCanvas(): void {
    const container = document.getElementById('app');
    if (!container) throw new Error('Container #app not found');

    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    this.canvas.width = BASE_WIDTH;
    this.canvas.height = BASE_HEIGHT;
    container.appendChild(this.canvas);
    this.resizeCanvas();
  }

  private initModules(): void {
    this.renderer = new SceneRenderer(this.ctx, BASE_WIDTH, BASE_HEIGHT);
    this.breath = new BreathInteraction(BASE_WIDTH, BASE_HEIGHT);
    this.particles = new ParticleSystem(BASE_WIDTH, BASE_HEIGHT);
  }

  private resizeCanvas(): void {
    const windowW = window.innerWidth - 40;
    const windowH = window.innerHeight - 40;
    let targetW = windowW;
    let targetH = targetW / ASPECT_RATIO;
    if (targetH > windowH) {
      targetH = windowH;
      targetW = targetH * ASPECT_RATIO;
    }
    targetW = Math.min(targetW, BASE_WIDTH);
    targetH = Math.min(targetH, BASE_HEIGHT);
    this.canvas.style.width = `${targetW}px`;
    this.canvas.style.height = `${targetH}px`;
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => {
      this.resizeCanvas();
    });

    this.canvas.addEventListener('mousedown', (e) => {
      const { x, y } = this.getCanvasCoordinates(e.clientX, e.clientY);
      this.breath.onMouseDown(x, y);
      this.lastMouseX = x;
      this.lastMouseY = y;
    });

    this.canvas.addEventListener('mousemove', (e) => {
      const { x, y } = this.getCanvasCoordinates(e.clientX, e.clientY);
      const dx = x - this.lastMouseX;
      const dy = y - this.lastMouseY;
      this.mouseSpeed = Math.sqrt(dx * dx + dy * dy);
      this.lastMouseX = x;
      this.lastMouseY = y;
      this.breath.onMouseMove(x, y);
    });

    window.addEventListener('mouseup', () => {
      this.breath.onMouseUp();
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.breath.onMouseUp();
    });

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const { x, y } = this.getCanvasCoordinates(touch.clientX, touch.clientY);
      this.breath.onMouseDown(x, y);
      this.lastMouseX = x;
      this.lastMouseY = y;
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const { x, y } = this.getCanvasCoordinates(touch.clientX, touch.clientY);
      const dx = x - this.lastMouseX;
      const dy = y - this.lastMouseY;
      this.mouseSpeed = Math.sqrt(dx * dx + dy * dy);
      this.lastMouseX = x;
      this.lastMouseY = y;
      this.breath.onMouseMove(x, y);
    }, { passive: false });

    this.canvas.addEventListener('touchend', () => {
      this.breath.onMouseUp();
    });
  }

  private getCanvasCoordinates(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = BASE_WIDTH / rect.width;
    const scaleY = BASE_HEIGHT / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);
    const now = performance.now();
    const deltaTime = Math.min(now - this.lastFrameTime, 50);
    this.lastFrameTime = now;

    this.frameCount++;
    if (now - this.fpsUpdateTime >= 1000) {
      this.currentFPS = this.frameCount;
      this.frameCount = 0;
      this.fpsUpdateTime = now;
      this.lowPerformanceMode = this.currentFPS < 30;
      this.particles.setLowPerformanceMode(this.lowPerformanceMode);
    }

    if (this.particles.shouldSpawnSnow(now)) {
      const count = Math.floor(Math.random() * 3) + 1;
      for (let i = 0; i < count; i++) {
        this.particles.spawnSnowflake();
      }
    }

    this.particles.updateSnowflakes(deltaTime);
    this.particles.updateWindChimes(this.lastMouseX, this.lastMouseY, this.mouseSpeed, now);
    this.particles.updateChimeParticles(deltaTime);
    this.breath.update(deltaTime, now);
    this.mouseSpeed *= 0.9;

    this.renderer.render(this.breath, this.particles, now);
  };

  public stop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}

const app = new App();
app.start();
