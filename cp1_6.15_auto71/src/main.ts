import { FishManager } from './FishManager';
import { FoodManager } from './FoodManager';
import { AquariumRenderer } from './AquariumRenderer';
import { FISH_NAMES } from './types';

const MIN_WIDTH = 800;
const MIN_HEIGHT = 450;
const ASPECT_RATIO = 16 / 9;
const TARGET_FPS = 60;

class AquariumGame {
  private canvas: HTMLCanvasElement;
  private fishManager!: FishManager;
  private foodManager!: FoodManager;
  private renderer!: AquariumRenderer;
  private canvasWidth: number = 0;
  private canvasHeight: number = 0;
  private lastFrameTime: number = 0;
  private startTime: number = 0;
  private isLongPress: boolean = false;
  private longPressTimer: number | null = null;

  constructor() {
    const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    if (!canvas) throw new Error('Canvas element not found');
    this.canvas = canvas;

    this.init();
  }

  private init(): void {
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    this.fishManager = new FishManager(this.canvasWidth, this.canvasHeight);
    this.foodManager = new FoodManager(this.canvasWidth, this.canvasHeight);
    this.renderer = new AquariumRenderer(this.canvas, this.canvasWidth, this.canvasHeight);

    this.setupEventListeners();

    this.startTime = performance.now();
    this.lastFrameTime = this.startTime;
    this.gameLoop();
  }

  private resizeCanvas(): void {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    let width = windowWidth;
    let height = windowWidth / ASPECT_RATIO;

    if (height > windowHeight) {
      height = windowHeight;
      width = windowHeight * ASPECT_RATIO;
    }

    width = Math.max(width, MIN_WIDTH);
    height = Math.max(height, MIN_HEIGHT);

    this.canvasWidth = width;
    this.canvasHeight = height;

    this.canvas.width = width;
    this.canvas.height = height;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    if (this.fishManager) {
      this.fishManager.resize(width, height);
    }
    if (this.foodManager) {
      this.foodManager.resize(width, height);
    }
    if (this.renderer) {
      this.renderer.resize(width, height);
    }
  }

  private getCanvasCoordinates(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('click', (e) => {
      if (this.isLongPress) {
        this.isLongPress = false;
        return;
      }
      const { x, y } = this.getCanvasCoordinates(e.clientX, e.clientY);
      this.fishManager.handleClick(x, y);
    });

    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const { x, y } = this.getCanvasCoordinates(e.clientX, e.clientY);
      this.foodManager.spawnFood(x, y);
      this.fishManager.handleRightClick();
    });

    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.isLongPress = false;
        const { x, y } = this.getCanvasCoordinates(e.clientX, e.clientY);
        this.longPressTimer = window.setTimeout(() => {
          this.isLongPress = true;
          this.foodManager.spawnFood(x, y);
          this.fishManager.handleRightClick(x, y);
        }, 500);
      }
    });

    this.canvas.addEventListener('mouseup', () => {
      if (this.longPressTimer) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }
    });

    this.canvas.addEventListener('mouseleave', () => {
      if (this.longPressTimer) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }
      this.renderer.clearTooltip();
    });

    this.canvas.addEventListener('mousemove', (e) => {
      const { x, y } = this.getCanvasCoordinates(e.clientX, e.clientY);

      const fish = this.fishManager.getFishAtPosition(x, y);
      if (fish) {
        const tooltipText = `${FISH_NAMES[fish.species]}\n生命值: ${Math.floor(fish.health)}/${fish.maxHealth}`;
        this.renderer.setTooltip(x, y, tooltipText);
      } else {
        this.renderer.clearTooltip();
      }
    });
  }

  private gameLoop = (): void => {
    const currentTime = (performance.now() - this.startTime) / 1000;
    const deltaTime = Math.min(currentTime - this.lastFrameTime, 0.1);
    this.lastFrameTime = currentTime;

    this.foodManager.update(deltaTime);
    this.fishManager.updateFoodInteractions(this.foodManager.getFoods());
    this.fishManager.update(deltaTime, currentTime);
    this.renderer.update(deltaTime, currentTime);

    this.renderer.draw(this.fishManager.getState(), this.foodManager.getState());

    setTimeout(() => {
      requestAnimationFrame(this.gameLoop);
    }, 1000 / TARGET_FPS);
  };
}

window.addEventListener('DOMContentLoaded', () => {
  new AquariumGame();
});
