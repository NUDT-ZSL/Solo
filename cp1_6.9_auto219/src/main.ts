import { Pattern } from './pattern';
import { ControlPanel } from './ui';

class App {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private pattern: Pattern;
  private controlPanel: ControlPanel;
  private lastTime: number;
  private animationFrameId: number | null;
  private mouseX: number;
  private mouseY: number;
  private dpr: number;

  constructor() {
    this.canvas = document.getElementById('mainCanvas') as HTMLCanvasElement;
    if (!this.canvas) {
      throw new Error('Canvas element not found');
    }

    const ctx = this.canvas.getContext('2d', { alpha: true });
    if (!ctx) {
      throw new Error('Could not get 2D rendering context');
    }
    this.ctx = ctx;

    this.dpr = window.devicePixelRatio || 1;
    this.lastTime = performance.now();
    this.animationFrameId = null;
    this.mouseX = 0;
    this.mouseY = 0;

    this.resizeCanvas();

    this.pattern = new Pattern(this.canvas.width / this.dpr, this.canvas.height / this.dpr);
    this.controlPanel = new ControlPanel(this.pattern);

    this.bindEvents();
    this.start();
  }

  private resizeCanvas(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.dpr = window.devicePixelRatio || 1;

    this.canvas.width = Math.floor(width * this.dpr);
    this.canvas.height = Math.floor(height * this.dpr);

    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';

    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    if (this.pattern) {
      this.pattern.resize(width, height);
    }
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => {
      this.resizeCanvas();
    }, { passive: true });

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = e.clientX - rect.left;
      this.mouseY = e.clientY - rect.top;
      this.pattern.handleMouseMove(this.mouseX, this.mouseY);
    }, { passive: true });

    this.canvas.addEventListener('mouseleave', () => {
      this.pattern.handleMouseMove(-9999, -9999);
    }, { passive: true });

    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this.pattern.handleClick(x, y);
    }, { passive: true });

    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        this.mouseX = touch.clientX - rect.left;
        this.mouseY = touch.clientY - rect.top;
        this.pattern.handleMouseMove(this.mouseX, this.mouseY);
        this.pattern.handleClick(this.mouseX, this.mouseY);
      }
    }, { passive: true });

    this.canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        this.mouseX = touch.clientX - rect.left;
        this.mouseY = touch.clientY - rect.top;
        this.pattern.handleMouseMove(this.mouseX, this.mouseY);
      }
    }, { passive: true });

    this.canvas.addEventListener('touchend', () => {
      this.pattern.handleMouseMove(-9999, -9999);
    }, { passive: true });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.lastTime = performance.now();
      }
    });
  }

  private start(): void {
    this.lastTime = performance.now();
    this.loop();
  }

  private loop(): void {
    this.animationFrameId = requestAnimationFrame(() => this.loop());

    const now = performance.now();
    let deltaTime = (now - this.lastTime) / 1000;
    this.lastTime = now;

    if (deltaTime > 0.1) {
      deltaTime = 0.1;
    }

    const shouldRender = this.pattern.update(deltaTime);

    if (shouldRender) {
      this.render();
    }
  }

  private render(): void {
    const logicalWidth = this.canvas.width / this.dpr;
    const logicalHeight = this.canvas.height / this.dpr;

    this.ctx.clearRect(0, 0, logicalWidth, logicalHeight);
    this.pattern.draw(this.ctx);
  }

  public destroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.controlPanel.destroy();
  }
}

function bootstrap(): void {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}

function init(): void {
  try {
    new App();
  } catch (error) {
    console.error('Failed to initialize application:', error);
    const msg = document.createElement('div');
    msg.style.position = 'fixed';
    msg.style.inset = '0';
    msg.style.display = 'flex';
    msg.style.alignItems = 'center';
    msg.style.justifyContent = 'center';
    msg.style.color = '#66FCF1';
    msg.style.fontFamily = 'sans-serif';
    msg.style.fontSize = '16px';
    msg.textContent = '应用初始化失败: ' + (error as Error).message;
    document.body.appendChild(msg);
  }
}

if (typeof window !== 'undefined') {
  bootstrap();
}

export { App };
