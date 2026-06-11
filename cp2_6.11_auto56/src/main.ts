import { ReactionManager } from './reaction';
import { Renderer } from './renderer';

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private reactionManager: ReactionManager;
  private renderer: Renderer;
  private energyValueEl: HTMLElement;
  private energyCounterEl: HTMLElement;
  private flashOverlayEl: HTMLElement;
  private resetBtnEl: HTMLElement;
  private lastTime: number = 0;
  private animationId: number | null = null;
  private isFlashing: boolean = false;

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取Canvas上下文');
    this.ctx = ctx;

    this.energyValueEl = document.getElementById('energy-value') as HTMLElement;
    this.energyCounterEl = document.getElementById('energy-counter') as HTMLElement;
    this.flashOverlayEl = document.getElementById('flash-overlay') as HTMLElement;
    this.resetBtnEl = document.getElementById('reset-btn') as HTMLElement;

    this.resize();

    this.reactionManager = new ReactionManager(this.canvas.width, this.canvas.height);
    this.renderer = new Renderer(this.ctx, this.canvas.width, this.canvas.height);

    this.setupEventListeners();
  }

  private resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();

    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;

    this.ctx.scale(dpr, dpr);

    if (this.renderer) {
      this.renderer.resize(rect.width, rect.height);
    }
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this.reactionManager.launchRay(x, y);
    });

    window.addEventListener('resize', () => {
      this.resize();
      this.reactionManager.reset(this.canvas.width / (window.devicePixelRatio || 1), this.canvas.height / (window.devicePixelRatio || 1));
    });

    this.resetBtnEl.addEventListener('click', () => {
      this.reset();
    });
  }

  private reset(): void {
    const dpr = window.devicePixelRatio || 1;
    this.reactionManager.reset(this.canvas.width / dpr, this.canvas.height / dpr);
    this.updateEnergyDisplay();
    this.energyCounterEl.classList.remove('flashing');
  }

  private updateEnergyDisplay(): void {
    const state = this.reactionManager.getState();
    this.energyValueEl.textContent = state.energy.toString();

    if (state.currentMaxLevel >= 5) {
      this.energyCounterEl.classList.add('flashing');
    } else {
      this.energyCounterEl.classList.remove('flashing');
    }
  }

  private triggerFlash(): void {
    if (this.isFlashing) return;
    this.isFlashing = true;

    this.flashOverlayEl.classList.remove('active');
    void this.flashOverlayEl.offsetWidth;
    this.flashOverlayEl.classList.add('active');

    setTimeout(() => {
      this.isFlashing = false;
    }, 600);
  }

  private loop(time: number): void {
    if (this.lastTime === 0) this.lastTime = time;
    const dt = Math.min((time - this.lastTime) / 1000, 0.05);
    this.lastTime = time;

    const gameTime = time / 1000;

    this.reactionManager.update(dt, gameTime);

    if (this.reactionManager.shouldTriggerFlash()) {
      this.triggerFlash();
    }

    const state = this.reactionManager.getState();
    this.renderer.render(state, dt, gameTime);

    this.updateEnergyDisplay();

    this.animationId = requestAnimationFrame((t) => this.loop(t));
  }

  start(): void {
    this.lastTime = 0;
    this.animationId = requestAnimationFrame((t) => this.loop(t));
  }

  stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    const game = new Game();
    game.start();
  }, 1500);
});
