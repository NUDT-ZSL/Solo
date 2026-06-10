import { AudioEngine } from './audio';
import { StringManager } from './strings';
import { ParticleSystem } from './particles';
import { InputManager } from './input';

class WindHarpApp {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private audioEngine: AudioEngine;
  private stringManager: StringManager;
  private particleSystem: ParticleSystem;
  private inputManager: InputManager;

  private width: number = 0;
  private height: number = 0;
  private lastTime: number = 0;
  private animationFrameId: number = 0;
  private fps: number = 0;
  private frameCount: number = 0;
  private fpsUpdateTime: number = 0;

  private strongWindLight: {
    active: boolean;
    x: number;
    time: number;
    duration: number;
  } = {
    active: false,
    x: 0,
    time: 0,
    duration: 1.0
  };

  private backgroundGradient: CanvasGradient | null = null;

  constructor() {
    this.canvas = document.getElementById('canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;

    this.audioEngine = new AudioEngine();
    this.stringManager = new StringManager(this.audioEngine);
    this.particleSystem = new ParticleSystem(this.stringManager);
    this.inputManager = new InputManager(
      this.canvas,
      this.stringManager,
      this.particleSystem,
      this.audioEngine
    );

    this.canvas.addEventListener('strongWind', this.onStrongWind.bind(this));

    this.init();
  }

  private init(): void {
    this.resize();
    window.addEventListener('resize', this.resize.bind(this));

    this.stringManager.resize(this.width / 2, this.height - 80);
    this.stringManager.createStrings();

    this.particleSystem.resize(this.width, this.height);
    this.particleSystem.init();

    this.createBackgroundGradient();

    this.lastTime = performance.now();
    this.animate();
  }

  private createBackgroundGradient(): void {
    this.backgroundGradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    this.backgroundGradient.addColorStop(0, '#0A1628');
    this.backgroundGradient.addColorStop(1, '#1B1035');
  }

  private resize(): void {
    const dpr = window.devicePixelRatio || 1;
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;

    this.ctx.scale(dpr, dpr);

    this.stringManager.resize(this.width / 2, this.height - 80);
    this.particleSystem.resize(this.width, this.height);

    this.createBackgroundGradient();
  }

  private onStrongWind(): void {
    this.strongWindLight.active = true;
    this.strongWindLight.x = this.width + 50;
    this.strongWindLight.time = 0;
  }

  private update(deltaTime: number): void {
    this.stringManager.update(deltaTime);
    this.particleSystem.update(deltaTime);
    this.inputManager.update();

    if (this.strongWindLight.active) {
      this.strongWindLight.time += deltaTime;
      const progress = this.strongWindLight.time / this.strongWindLight.duration;
      this.strongWindLight.x = this.width + 50 - (this.width + 100) * progress;

      if (this.strongWindLight.time >= this.strongWindLight.duration) {
        this.strongWindLight.active = false;
      }
    }
  }

  private render(): void {
    this.renderBackground();
    this.particleSystem.render(this.ctx);
    this.stringManager.render(this.ctx);
    this.renderStrongWindLight();
  }

  private renderBackground(): void {
    if (this.backgroundGradient) {
      this.ctx.fillStyle = this.backgroundGradient;
      this.ctx.fillRect(0, 0, this.width, this.height);
    }
  }

  private renderStrongWindLight(): void {
    if (!this.strongWindLight.active) return;

    const progress = this.strongWindLight.time / this.strongWindLight.duration;
    const alpha = 0.5 * (1 - Math.pow(progress - 0.5, 2) * 4);

    const lightWidth = 60;
    const gradient = this.ctx.createLinearGradient(
      this.strongWindLight.x - lightWidth, 0,
      this.strongWindLight.x + lightWidth, 0
    );
    gradient.addColorStop(0, 'rgba(100, 180, 255, 0)');
    gradient.addColorStop(0.2, `rgba(130, 200, 255, ${alpha * 0.3})`);
    gradient.addColorStop(0.5, `rgba(180, 220, 255, ${alpha})`);
    gradient.addColorStop(0.8, `rgba(130, 200, 255, ${alpha * 0.3})`);
    gradient.addColorStop(1, 'rgba(100, 180, 255, 0)');

    this.ctx.save();
    this.ctx.globalCompositeOperation = 'screen';
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(
      this.strongWindLight.x - lightWidth,
      0,
      lightWidth * 2,
      this.height
    );
    this.ctx.restore();
  }

  private animate(): void {
    const now = performance.now();
    const deltaTime = Math.min((now - this.lastTime) / 1000, 1 / 30);
    this.lastTime = now;

    this.frameCount++;
    if (now - this.fpsUpdateTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.fpsUpdateTime = now;
    }

    this.update(deltaTime);
    this.render();

    this.animationFrameId = requestAnimationFrame(() => this.animate());
  }

  public destroy(): void {
    cancelAnimationFrame(this.animationFrameId);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new WindHarpApp();
});
