import { BeamManager } from './BeamManager';
import { ParticleManager } from './ParticleManager';
import { UIManager } from './UIManager';
import { AudioEngine } from './AudioEngine';

export class App {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private beamManager: BeamManager;
  private particleManager: ParticleManager;
  private uiManager: UIManager;
  private audioEngine: AudioEngine;
  private dpr: number = 1;
  private lastTime: number = 0;
  private rafId: number = 0;
  private canvasWidth: number = 0;
  private canvasHeight: number = 0;

  constructor(container: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    container.appendChild(this.canvas);

    this.canvas.style.transformOrigin = 'center center';
    this.canvas.style.transition = 'transform 0.2s ease-out';
    this.canvas.style.willChange = 'transform';

    this.beamManager = new BeamManager();
    this.particleManager = new ParticleManager();
    this.uiManager = new UIManager();
    this.audioEngine = new AudioEngine();

    this.resize();
    window.addEventListener('resize', this.handleResize);

    this.uiManager.init(
      this.canvas,
      (index: number) => this.handleBeamTrigger(index),
      () => { this.beamManager.triggerRipple(); },
      (scale: number) => this.handleScaleChange(scale)
    );
  }

  public init(): void {
    this.lastTime = performance.now();
    this.startLoop();
  }

  private handleResize = (): void => {
    this.resize();
  };

  private resize(): void {
    const width: number = window.innerWidth;
    const height: number = window.innerHeight;
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
    this.canvas.width = Math.floor(width * this.dpr);
    this.canvas.height = Math.floor(height * this.dpr);

    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    this.beamManager.resize(width, height);
    this.particleManager.setCanvasSize(width, height);
  }

  private handleScaleChange(scale: number): void {
    this.canvas.style.transform = `scale(${scale})`;
  }

  private handleBeamTrigger(index: number): void {
    const triggered = this.beamManager.triggerBeam(index);
    if (!triggered) return;

    const beam = this.beamManager.beams[index];
    if (!beam) return;

    this.audioEngine.playNote(beam.soundFrequency, 0.4);

    const x: number = beam.x + beam.width / 2;
    const y: number = this.beamManager.beamStartY;
    this.particleManager.addBeamNoteTrigger(index, x, y, beam.color);
  }

  private startLoop(): void {
    const loop = (now: number): void => {
      const dt: number = Math.min(32, now - this.lastTime);
      this.lastTime = now;

      this.update(dt);
      this.render();

      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  private update(dt: number): void {
    this.uiManager.handleInput(
      this.beamManager,
      this.beamManager.beamStartX,
      this.beamManager.arrayBaseWidth
    );

    if (this.uiManager.cursor.isActive) {
      this.beamManager.setHover(this.uiManager.cursor.x, this.uiManager.cursor.y);
    } else {
      this.beamManager.clearHover();
    }

    this.beamManager.update();
    this.particleManager.update(dt);
  }

  private render(): void {
    const ctx: CanvasRenderingContext2D = this.ctx;
    const width: number = this.canvasWidth;
    const height: number = this.canvasHeight;

    ctx.clearRect(0, 0, width, height);

    this.renderBackground(ctx, width, height);
    this.beamManager.render(ctx);
    this.particleManager.render(ctx);

    this.uiManager.drawPlaybackProgress(
      ctx,
      this.beamManager.beamStartX,
      this.beamManager.arrayBaseWidth,
      this.beamManager.beamStartY,
      this.beamManager.arrayHeight
    );

    this.uiManager.drawScaleText(ctx, width, this.beamManager.beamStartY);
  }

  private renderBackground(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const grad: CanvasGradient = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#0B1A3A');
    grad.addColorStop(1, '#2A1B4A');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    this.renderStars(ctx, width, height);
  }

  private renderStars(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.save();
    const starCount: number = 60;
    const time: number = performance.now() / 1000;
    for (let i: number = 0; i < starCount; i++) {
      const x: number = ((i * 9301 + 49297) % 233280) / 233280 * width;
      const y: number = ((i * 49297 + 233280) % 9301) / 9301 * height * 0.7;
      const size: number = ((i * 7919) % 10) / 30 + 0.3;
      const alpha: number = 0.2 + ((i * 1234) % 100) / 300;
      const twinkle: number = 0.5 + 0.5 * Math.sin(time + i * 0.7);

      ctx.globalAlpha = alpha * (0.6 + 0.4 * twinkle);
      ctx.fillStyle = '#AADDFF';
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  public destroy(): void {
    cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this.handleResize);
    if (this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
  }
}
