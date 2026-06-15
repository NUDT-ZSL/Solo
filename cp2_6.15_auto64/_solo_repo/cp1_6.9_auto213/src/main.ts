import { FluidGrid, ColorTheme } from './grid';
import { CanvasRenderer } from './renderer';
import { ControlPanel } from './ui';

class FluidApp {
  private canvas: HTMLCanvasElement;
  private grid: FluidGrid;
  private renderer: CanvasRenderer;

  private isDragging: boolean = false;
  private lastX: number = 0;
  private lastY: number = 0;
  private rafId: number = 0;
  private pointerDownTime: number = 0;
  private pointerDownX: number = 0;
  private pointerDownY: number = 0;
  private movedSinceDown: boolean = false;

  constructor() {
    const appRoot = document.getElementById('app');
    if (!appRoot) {
      throw new Error('App root not found');
    }

    const canvas = document.getElementById('fluid-canvas') as HTMLCanvasElement;
    if (!canvas) {
      throw new Error('Canvas element not found');
    }
    this.canvas = canvas;

    const w = window.innerWidth;
    const h = window.innerHeight;

    this.renderer = new CanvasRenderer(canvas);
    this.renderer.resize(w, h);

    this.grid = new FluidGrid({
      cols: 30,
      rows: 30,
      flowSpeed: 1.5,
      width: w,
      height: h,
      theme: 'ocean',
    });

    new ControlPanel(appRoot, {
      onGridDensityChange: (density: number) => {
        this.grid.setSize(density, density);
      },
      onFlowSpeedChange: (speed: number) => {
        this.grid.setFlowSpeed(speed);
      },
      onThemeChange: (theme: ColorTheme) => {
        this.grid.setTheme(theme);
      },
      onExport: () => {
        this.renderer.exportPNG();
      },
    });

    this.bindEvents();
    this.startLoop();
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.renderer.resize(w, h);
      this.grid.resize(w, h);
    });

    this.canvas.addEventListener('pointerdown', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this.isDragging = true;
      this.lastX = x;
      this.lastY = y;
      this.pointerDownX = x;
      this.pointerDownY = y;
      this.pointerDownTime = performance.now();
      this.movedSinceDown = false;
      this.canvas.setPointerCapture(e.pointerId);
    });

    this.canvas.addEventListener('pointermove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (this.isDragging) {
        const dx = x - this.lastX;
        const dy = y - this.lastY;
        const distSq = dx * dx + dy * dy;
        if (distSq > 1) {
          this.grid.applyDrag(x, y, dx, dy);
          this.lastX = x;
          this.lastY = y;
          this.movedSinceDown = true;
        }
      }
    });

    this.canvas.addEventListener('pointerup', (e) => {
      if (!this.isDragging) return;
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const elapsed = performance.now() - this.pointerDownTime;
      const moveDistSq =
        (x - this.pointerDownX) * (x - this.pointerDownX) +
        (y - this.pointerDownY) * (y - this.pointerDownY);
      if (!this.movedSinceDown && elapsed < 300 && moveDistSq < 100) {
        this.grid.applyPulse(x, y);
      }
      this.isDragging = false;
      try {
        this.canvas.releasePointerCapture(e.pointerId);
      } catch (_) {
        // ignore
      }
    });

    this.canvas.addEventListener('pointercancel', () => {
      this.isDragging = false;
    });

    this.canvas.addEventListener('pointerleave', () => {
      if (this.isDragging) {
        this.isDragging = false;
      }
    });
  }

  private startLoop(): void {
    const tick = (now: number) => {
      this.grid.update(now);
      const cells = this.grid.getRenderData();
      this.renderer.render(cells);
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  public destroy(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }
}

function bootstrap(): void {
  try {
    new FluidApp();
  } catch (err) {
    console.error('Failed to initialize FluidApp:', err);
    const root = document.getElementById('app');
    if (root) {
      const msg = document.createElement('div');
      msg.style.position = 'absolute';
      msg.style.left = '50%';
      msg.style.top = '50%';
      msg.style.transform = 'translate(-50%, -50%)';
      msg.style.color = '#ff6b81';
      msg.style.fontSize = '16px';
      msg.style.padding = '20px';
      msg.style.background = 'rgba(0,0,0,0.6)';
      msg.style.borderRadius = '10px';
      msg.textContent = '应用初始化失败，请查看控制台。';
      root.appendChild(msg);
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
