import { Simulator, MaterialType, MATERIAL_COLORS } from './simulator';
import { UIManager } from './ui';

const GRID_WIDTH = 200;
const GRID_HEIGHT = 150;
const CELL_SIZE = 4;
const BRUSH_RADIUS = 3;
const TARGET_FPS = 60;

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private simulator: Simulator;
  private ui: UIManager;
  private imageData: ImageData;

  private isDrawing: boolean = false;
  private isErasing: boolean = false;
  private mouseX: number = 0;
  private mouseY: number = 0;

  private lastTime: number = 0;
  private frameCount: number = 0;
  private fpsAccumulator: number = 0;
  private currentFPS: number = TARGET_FPS;
  private accumulator: number = 0;
  private readonly fixedTimeStep: number = 1000 / TARGET_FPS;
  private running: boolean = true;

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;

    this.canvas.width = GRID_WIDTH * CELL_SIZE;
    this.canvas.height = GRID_HEIGHT * CELL_SIZE;

    this.simulator = new Simulator(GRID_WIDTH, GRID_HEIGHT);
    this.ui = new UIManager();

    this.imageData = this.ctx.createImageData(this.canvas.width, this.canvas.height);

    this.init();
  }

  private init(): void {
    this.bindMouseEvents();
    this.bindTouchEvents();
    this.render();
    requestAnimationFrame((t) => this.gameLoop(t));
  }

  private bindMouseEvents(): void {
    this.canvas.addEventListener('mousedown', (e) => {
      e.preventDefault();
      if (e.button === 0) {
        this.isDrawing = true;
      } else if (e.button === 2) {
        this.isErasing = true;
      }
      this.updateMousePosition(e);
      this.applyBrush();
    });

    this.canvas.addEventListener('mousemove', (e) => {
      this.updateMousePosition(e);
      if (this.isDrawing || this.isErasing) {
        this.applyBrush();
      }
    });

    this.canvas.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.isDrawing = false;
      if (e.button === 2) this.isErasing = false;
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.isDrawing = false;
      this.isErasing = false;
    });

    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
  }

  private bindTouchEvents(): void {
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.isDrawing = true;
      this.updateTouchPosition(e);
      this.applyBrush();
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      this.updateTouchPosition(e);
      if (this.isDrawing) {
        this.applyBrush();
      }
    }, { passive: false });

    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.isDrawing = false;
    });
  }

  private updateMousePosition(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    this.mouseX = Math.floor((e.clientX - rect.left) / CELL_SIZE);
    this.mouseY = Math.floor((e.clientY - rect.top) / CELL_SIZE);
  }

  private updateTouchPosition(e: TouchEvent): void {
    if (e.touches.length === 0) return;
    const rect = this.canvas.getBoundingClientRect();
    this.mouseX = Math.floor((e.touches[0].clientX - rect.left) / CELL_SIZE);
    this.mouseY = Math.floor((e.touches[0].clientY - rect.top) / CELL_SIZE);
  }

  private applyBrush(): void {
    const material = this.isErasing ? MaterialType.Empty : this.ui.getActiveMaterial();

    for (let dy = -BRUSH_RADIUS; dy <= BRUSH_RADIUS; dy++) {
      for (let dx = -BRUSH_RADIUS; dx <= BRUSH_RADIUS; dx++) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= BRUSH_RADIUS) {
          const x = this.mouseX + dx;
          const y = this.mouseY + dy;
          this.simulator.setMaterial(x, y, material);
        }
      }
    }
  }

  private gameLoop(timestamp: number): void {
    if (!this.running) return;

    if (this.lastTime === 0) {
      this.lastTime = timestamp;
    }

    const deltaTime = timestamp - this.lastTime;
    this.lastTime = timestamp;

    this.accumulator += deltaTime;
    this.fpsAccumulator += deltaTime;
    this.frameCount++;

    if (this.fpsAccumulator >= 500) {
      this.currentFPS = (this.frameCount * 1000) / this.fpsAccumulator;
      this.frameCount = 0;
      this.fpsAccumulator = 0;
    }

    while (this.accumulator >= this.fixedTimeStep) {
      if (this.isDrawing || this.isErasing) {
        this.applyBrush();
      }
      this.simulator.update();
      this.accumulator -= this.fixedTimeStep;
    }

    this.render();
    this.ui.updateParticleCount(this.simulator.getParticleCount());
    this.ui.updateFPS(this.currentFPS);

    requestAnimationFrame((t) => this.gameLoop(t));
  }

  private render(): void {
    const data = this.imageData.data;
    const width = this.canvas.width;
    const height = this.canvas.height;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const gridX = Math.floor(x / CELL_SIZE);
        const gridY = Math.floor(y / CELL_SIZE);
        const material = this.simulator.getMaterial(gridX, gridY);
        const color = MATERIAL_COLORS[material];

        const idx = (y * width + x) * 4;
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);

        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = 255;

        if (x % CELL_SIZE === CELL_SIZE - 1 || y % CELL_SIZE === CELL_SIZE - 1) {
          data[idx] = Math.floor(r * 0.9 + 255 * 0.1 * 0.1);
          data[idx + 1] = Math.floor(g * 0.9 + 255 * 0.1 * 0.1);
          data[idx + 2] = Math.floor(b * 0.9 + 255 * 0.1 * 0.1);
        }
      }
    }

    this.ctx.putImageData(this.imageData, 0, 0);
  }

  public destroy(): void {
    this.running = false;
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
