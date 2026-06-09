import { Flock } from './flock';
import { EffectsManager } from './effects';
import { ControlPanel } from './ui';
import { ColorTheme, THEMES } from './feather';

class LingyuApp {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private flock!: Flock;
  private effects!: EffectsManager;
  private panel!: ControlPanel;
  private width: number = 0;
  private height: number = 0;
  private dpr: number;
  private startTime: number;
  private isMouseDown: boolean;
  private clickStartTime: number;
  private clickStartX: number;
  private clickStartY: number;
  private lastMouseX: number;
  private lastMouseY: number;
  private frameCount: number;
  private fpsTime: number;
  private currentTheme: ColorTheme;
  private animationId: number = 0;

  constructor() {
    const canvasEl = document.getElementById('main-canvas') as HTMLCanvasElement | null;
    if (!canvasEl) {
      throw new Error('Canvas element not found');
    }
    this.canvas = canvasEl;

    const ctx = this.canvas.getContext('2d', { alpha: false });
    if (!ctx) {
      throw new Error('Could not get 2D context');
    }
    this.ctx = ctx;

    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.startTime = performance.now();
    this.isMouseDown = false;
    this.clickStartTime = 0;
    this.clickStartX = 0;
    this.clickStartY = 0;
    this.lastMouseX = 0;
    this.lastMouseY = 0;
    this.frameCount = 0;
    this.fpsTime = this.startTime;
    this.currentTheme = THEMES[0];

    this.init();
  }

  private init() {
    this.resize();
    this.flock = new Flock(150, this.width, this.height);
    this.effects = new EffectsManager(this.width, this.height);
    this.panel = new ControlPanel();
    this.panel.mount();

    this.panel.onFeatherCountChange = (count: number) => {
      this.flock.setCount(count);
    };
    this.panel.onSpeedChange = (_speed: number) => {};
    this.panel.onThemeChange = (theme: ColorTheme) => {
      this.currentTheme = theme;
    };
    this.panel.onReset = () => {
      this.flock.resetArrangement();
    };

    this.bindEvents();
    this.loop();
  }

  private resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    if (this.flock) {
      this.flock.resize(this.width, this.height);
    }
    if (this.effects) {
      this.effects.resize(this.width, this.height);
    }
  }

  private getCanvasPos(e: MouseEvent | TouchEvent): { x: number; y: number } {
    if ('touches' in e) {
      const touch = e.touches.length > 0 ? e.touches[0] : (e.changedTouches[0] || null);
      if (!touch) return { x: 0, y: 0 };
      return { x: touch.clientX, y: touch.clientY };
    }
    return { x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY };
  }

  private bindEvents() {
    window.addEventListener('resize', () => this.resize());

    this.canvas.addEventListener('mousedown', (e) => {
      const pos = this.getCanvasPos(e);
      this.isMouseDown = true;
      this.clickStartTime = performance.now();
      this.clickStartX = pos.x;
      this.clickStartY = pos.y;
      this.lastMouseX = pos.x;
      this.lastMouseY = pos.y;
      this.flock.onMouseDown(pos.x, pos.y);
      e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
      const pos = this.getCanvasPos(e);
      if (this.isMouseDown) {
        this.flock.onMouseMove(pos.x, pos.y);
        this.effects.addMouseTrailPoint(pos.x, pos.y, this.currentTheme);
      }
      this.lastMouseX = pos.x;
      this.lastMouseY = pos.y;
    });

    window.addEventListener('mouseup', (e) => {
      if (!this.isMouseDown) return;
      const pos = this.getCanvasPos(e);
      const elapsed = performance.now() - this.clickStartTime;
      const dx = pos.x - this.clickStartX;
      const dy = pos.y - this.clickStartY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      this.flock.onMouseUp(pos.x, pos.y);
      this.isMouseDown = false;

      if (elapsed < 250 && dist < 8) {
        this.handleClick(pos.x, pos.y);
      }
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.flock.onMouseLeave();
      this.isMouseDown = false;
    });

    this.canvas.addEventListener('touchstart', (e) => {
      const pos = this.getCanvasPos(e);
      this.isMouseDown = true;
      this.clickStartTime = performance.now();
      this.clickStartX = pos.x;
      this.clickStartY = pos.y;
      this.lastMouseX = pos.x;
      this.lastMouseY = pos.y;
      this.flock.onMouseDown(pos.x, pos.y);
      e.preventDefault();
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      const pos = this.getCanvasPos(e);
      if (this.isMouseDown) {
        this.flock.onMouseMove(pos.x, pos.y);
        this.effects.addMouseTrailPoint(pos.x, pos.y, this.currentTheme);
      }
      this.lastMouseX = pos.x;
      this.lastMouseY = pos.y;
      e.preventDefault();
    }, { passive: false });

    this.canvas.addEventListener('touchend', (e) => {
      if (!this.isMouseDown) return;
      const pos = this.getCanvasPos(e);
      const elapsed = performance.now() - this.clickStartTime;
      const dx = pos.x - this.clickStartX;
      const dy = pos.y - this.clickStartY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      this.flock.onMouseUp(pos.x, pos.y);
      this.isMouseDown = false;

      if (elapsed < 300 && dist < 15) {
        this.handleClick(pos.x, pos.y);
      }
      e.preventDefault();
    }, { passive: false });
  }

  private handleClick(x: number, y: number) {
    const { burstX, burstY } = this.flock.onClick(x, y);
    this.effects.addBurst(burstX, burstY, this.currentTheme);
  }

  private loop = () => {
    const time = performance.now() - this.startTime;

    this.frameCount++;
    if (time - this.fpsTime >= 1000) {
      this.fpsTime = time;
      this.frameCount = 0;
    }

    this.flock.update(this.panel.state.speedMultiplier, time);
    this.effects.update(time);

    this.effects.renderBackground(this.ctx, time);

    this.ctx.globalCompositeOperation = 'lighter';

    this.effects.renderMouseTrail(this.ctx);

    const connections = this.flock.getConnections();
    this.effects.renderConnections(this.ctx, connections, this.currentTheme);

    for (const feather of this.flock.feathers) {
      feather.render(this.ctx, this.currentTheme, time);
    }

    this.effects.renderBursts(this.ctx);
    this.effects.renderParticles(this.ctx);

    this.ctx.globalCompositeOperation = 'source-over';

    this.animationId = requestAnimationFrame(this.loop);
  };

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  try {
    (window as unknown as { lingyuApp?: LingyuApp }).lingyuApp = new LingyuApp();
  } catch (err) {
    console.error('Failed to initialize Lingyu App:', err);
  }
});
