import { ReactionManager } from './reaction';
import { Renderer } from './renderer';

class GameApp {
  private canvas: HTMLCanvasElement;
  private reactionManager: ReactionManager;
  private renderer: Renderer;
  private energyCounter: HTMLElement;
  private resetBtn: HTMLElement;
  private flashEl: HTMLElement;
  private loadingEl: HTMLElement;
  private lastTime: number = 0;
  private rafId: number = 0;
  private currentEnergy: number = 0;
  private hasFlashed: boolean = false;

  constructor() {
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    const energyCounter = document.getElementById('energy-counter');
    const resetBtn = document.getElementById('reset-btn');
    const flashEl = document.getElementById('flash');
    const loadingEl = document.getElementById('loading');

    if (!canvas || !energyCounter || !resetBtn || !flashEl || !loadingEl) {
      throw new Error('无法找到必要的 DOM 元素');
    }

    this.canvas = canvas;
    this.energyCounter = energyCounter;
    this.resetBtn = resetBtn;
    this.flashEl = flashEl;
    this.loadingEl = loadingEl;

    const w = window.innerWidth;
    const h = window.innerHeight;

    this.renderer = new Renderer(canvas);
    this.renderer.resize(w, h);

    this.reactionManager = new ReactionManager(w, h);
    this.reactionManager.onEnergyUpdate((energy, maxLevel) => this.handleEnergyUpdate(energy, maxLevel));

    this.bindEvents();
  }

  private bindEvents(): void {
    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this.reactionManager.fireRay(x, y);
    });

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      if (!touch) return;
      const rect = this.canvas.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      this.reactionManager.fireRay(x, y);
    }, { passive: false });

    this.resetBtn.addEventListener('click', () => {
      this.reactionManager.reset();
      this.currentEnergy = 0;
      this.hasFlashed = false;
      this.updateEnergyDisplay(0, 0);
    });

    window.addEventListener('resize', () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.renderer.resize(w, h);
      this.reactionManager.resize(w, h);
    });
  }

  private handleEnergyUpdate(energy: number, maxLevel: number): void {
    this.currentEnergy = energy;
    void this.currentEnergy;
    this.updateEnergyDisplay(energy, maxLevel);

    if (energy >= 20 && !this.hasFlashed) {
      this.hasFlashed = true;
      this.triggerFlash();
    }
  }

  private updateEnergyDisplay(energy: number, maxLevel: number): void {
    this.energyCounter.textContent = `能量: ${energy}`;
    if (maxLevel >= 5) {
      this.energyCounter.classList.add('highlight');
    } else {
      this.energyCounter.classList.remove('highlight');
    }
  }

  private triggerFlash(): void {
    this.flashEl.classList.remove('active');
    void this.flashEl.offsetWidth;
    this.flashEl.classList.add('active');
    setTimeout(() => {
      this.flashEl.classList.remove('active');
    }, 600);
  }

  private hideLoading(): void {
    setTimeout(() => {
      this.loadingEl.classList.add('hidden');
    }, 300);
  }

  private loop = (time: number): void => {
    if (this.lastTime === 0) this.lastTime = time;
    const dt = Math.min((time - this.lastTime) / 1000, 0.05);
    this.lastTime = time;

    this.reactionManager.update(dt);
    this.renderer.render(this.reactionManager.getState());

    this.rafId = requestAnimationFrame(this.loop);
  };

  public start(): void {
    this.hideLoading();
    this.lastTime = 0;
    this.rafId = requestAnimationFrame(this.loop);
  }

  public destroy(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  try {
    const app = new GameApp();
    app.start();
    (window as unknown as { __gameApp?: GameApp }).__gameApp = app;
  } catch (err) {
    console.error('游戏初始化失败:', err);
  }
});
