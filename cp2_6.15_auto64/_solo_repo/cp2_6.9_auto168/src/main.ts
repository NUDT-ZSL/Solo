import { GameManager } from './gameManager';
import { UIManager } from './uiManager';

class Main {
  private canvas: HTMLCanvasElement;
  private gameManager: GameManager;
  private uiManager: UIManager;
  private lastTime: number = 0;
  private isMouseDown: boolean = false;
  private mouseDownX: number = 0;
  private mouseDownY: number = 0;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    this.resizeCanvas();
    this.gameManager = new GameManager(this.canvas.width, this.canvas.height);
    this.uiManager = new UIManager(this.canvas, this.gameManager);
    this.bindEvents();
    this.loop(performance.now());
  }

  private resizeCanvas(): void {
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(window.innerWidth, 800);
    const h = Math.max(window.innerHeight, 600);
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    const ctx = this.canvas.getContext('2d');
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => {
      this.resizeCanvas();
      const w = Math.max(window.innerWidth, 800);
      const h = Math.max(window.innerHeight, 600);
      this.gameManager.resize(w, h);
    });

    this.canvas.addEventListener('mousedown', (e: MouseEvent) => {
      const { x, y } = this.getCanvasPos(e);
      this.isMouseDown = true;
      this.mouseDownX = x;
      this.mouseDownY = y;
      this.gameManager.onMouseDown(x, y);
    });

    this.canvas.addEventListener('mousemove', (e: MouseEvent) => {
      const { x, y } = this.getCanvasPos(e);
      this.gameManager.onMouseMove(x, y);
      this.uiManager.handleMouseMove(x, y);
    });

    this.canvas.addEventListener('mouseup', (e: MouseEvent) => {
      const { x, y } = this.getCanvasPos(e);
      const dx = Math.abs(x - this.mouseDownX);
      const dy = Math.abs(y - this.mouseDownY);
      if (this.isMouseDown && dx < 5 && dy < 5) {
        this.uiManager.handleClick(x, y);
      }
      this.gameManager.onMouseUp(x, y);
      this.isMouseDown = false;
    });

    this.canvas.addEventListener('mouseleave', () => {
      if (this.gameManager.draggingRune) {
        this.gameManager.onMouseUp(this.gameManager.mouseX, this.gameManager.mouseY);
      }
      this.isMouseDown = false;
    });

    this.canvas.addEventListener('wheel', (e: WheelEvent) => {
      e.preventDefault();
      this.uiManager.handleWheel(e.deltaY);
    }, { passive: false });

    this.canvas.addEventListener('touchstart', (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        const { x, y } = this.getCanvasPos(touch);
        this.isMouseDown = true;
        this.mouseDownX = x;
        this.mouseDownY = y;
        this.gameManager.onMouseDown(x, y);
      }
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        const { x, y } = this.getCanvasPos(touch);
        this.gameManager.onMouseMove(x, y);
        this.uiManager.handleMouseMove(x, y);
      }
    }, { passive: false });

    this.canvas.addEventListener('touchend', (e: TouchEvent) => {
      e.preventDefault();
      const x = this.gameManager.mouseX;
      const y = this.gameManager.mouseY;
      const dx = Math.abs(x - this.mouseDownX);
      const dy = Math.abs(y - this.mouseDownY);
      if (this.isMouseDown && dx < 10 && dy < 10) {
        this.uiManager.handleClick(x, y);
      }
      this.gameManager.onMouseUp(x, y);
      this.isMouseDown = false;
    }, { passive: false });
  }

  private getCanvasPos(e: MouseEvent | Touch): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  private loop = (time: number): void => {
    const deltaTime = Math.min((time - this.lastTime) / 1000, 0.05);
    this.lastTime = time;

    this.gameManager.update(deltaTime);
    this.uiManager.render(time);

    requestAnimationFrame(this.loop);
  };
}

new Main();
