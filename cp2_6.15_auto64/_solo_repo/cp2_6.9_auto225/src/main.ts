import { Kite, WindData } from './kite';
import { ParticleSystem } from './particles';

class App {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private kite: Kite;
  private particles: ParticleSystem;
  private mouseX: number = 0;
  private mouseY: number = 0;
  private windIntensity: number = 3;
  private lastTime: number = 0;
  private animationId: number = 0;
  private width: number = 0;
  private height: number = 0;

  constructor() {
    this.canvas = document.getElementById('canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.resize();

    this.kite = new Kite(this.width / 2, this.height / 2);
    this.particles = new ParticleSystem();

    this.mouseX = this.width / 2;
    this.mouseY = this.height / 2;

    this.bindEvents();
    this.lastTime = performance.now();
    this.loop();
  }

  private resize(): void {
    const dpr = window.devicePixelRatio || 1;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => this.resize());

    this.canvas.addEventListener('mousemove', (e: MouseEvent) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
    });

    this.canvas.addEventListener('click', (e: MouseEvent) => {
      this.kite.triggerShake(e.clientX, e.clientY);
      this.particles.triggerBoost();
    });

    this.canvas.addEventListener('touchmove', (e: TouchEvent) => {
      if (e.touches.length > 0) {
        this.mouseX = e.touches[0].clientX;
        this.mouseY = e.touches[0].clientY;
      }
      e.preventDefault();
    }, { passive: false });

    this.canvas.addEventListener('touchstart', (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        this.kite.triggerShake(touch.clientX, touch.clientY);
        this.particles.triggerBoost();
      }
      e.preventDefault();
    }, { passive: false });

    const slider = document.getElementById('windSlider') as HTMLInputElement;
    slider.addEventListener('input', (e: Event) => {
      this.windIntensity = parseFloat((e.target as HTMLInputElement).value);
    });
  }

  private getWindData(): WindData {
    const normX = this.mouseX / this.width;
    const normY = this.mouseY / this.height;

    const direction = (normX - 0.5) * 60;
    const baseSpeed = (1 - normY) * 10;
    const speed = Math.max(0.5, Math.min(10, baseSpeed * 0.5 + this.windIntensity * 0.5));

    return {
      direction,
      speed,
      intensity: this.windIntensity
    };
  }

  private drawBackground(): void {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#F0E68C');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.drawMountains();
  }

  private drawMountains(): void {
    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(176, 196, 222, 0.3)';
    this.ctx.lineWidth = 2;
    this.ctx.fillStyle = 'rgba(176, 196, 222, 0.15)';

    const baseY = this.height * 0.85;
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.height);
    this.ctx.lineTo(0, baseY);

    const segments = 12;
    const segmentWidth = this.width / segments;
    for (let i = 0; i <= segments; i++) {
      const x = i * segmentWidth;
      const peakHeight = 40 + Math.sin(i * 0.8) * 30 + Math.cos(i * 1.3) * 20;
      this.ctx.lineTo(x, baseY - peakHeight);
    }

    this.ctx.lineTo(this.width, this.height);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();
    this.ctx.restore();
  }

  private drawHUD(wind: WindData): void {
    this.ctx.save();

    const padding = 16;
    const lineHeight = 24;
    const boxWidth = 200;
    const boxHeight = lineHeight * 2 + padding * 2 - 4;

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.beginPath();
    this.ctx.roundRect(padding, padding, boxWidth, boxHeight, 8);
    this.ctx.fill();

    this.ctx.font = '16px Arial, sans-serif';
    this.ctx.textBaseline = 'top';

    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    this.ctx.shadowBlur = 4;
    this.ctx.fillStyle = '#FFFFFF';

    const windLevel = Math.ceil(wind.speed);
    this.ctx.fillText(`风速等级: ${windLevel} 级`, padding + 12, padding + 8);

    const yOffset = Math.round(this.kite.yOffset);
    this.ctx.fillText(`高度偏移: ${yOffset} px`, padding + 12, padding + 8 + lineHeight);

    this.ctx.restore();
  }

  private loop = (): void => {
    const currentTime = performance.now();
    const dt = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;

    const wind = this.getWindData();

    this.kite.update(dt, wind, this.width / 2, this.height / 2);

    const tailPositions = this.kite.getTailEndPositions();
    this.particles.update(dt, tailPositions, wind.speed);

    this.drawBackground();
    this.particles.draw(this.ctx);
    this.kite.draw(this.ctx);
    this.drawHUD(wind);

    this.animationId = requestAnimationFrame(this.loop);
  };

  public destroy(): void {
    cancelAnimationFrame(this.animationId);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
