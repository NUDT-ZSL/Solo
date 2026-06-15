import { EmojiManager, ThemeType } from './emojiManager';
import { InteractionHandler } from './interactionHandler';

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  startTime: number;
  duration: number;
  color: string;
}

class App {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private emojiManager: EmojiManager;
  private interactionHandler: InteractionHandler;
  private animationId: number = 0;
  private lastTime: number = 0;
  private fps: number = 0;
  private frameCount: number = 0;
  private fpsTime: number = 0;
  private ripples: Ripple[] = [];

  constructor() {
    this.canvas = document.getElementById('canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    
    this.resizeCanvas();
    window.addEventListener('resize', this.handleResize.bind(this));
    
    this.emojiManager = new EmojiManager(this.canvas);
    this.interactionHandler = new InteractionHandler(this.canvas, this.emojiManager);
    
    this.emojiManager.init();
    this.setupControls();
    
    this.lastTime = performance.now();
    this.animate();
  }

  private resizeCanvas(): void {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);
    
    this.canvas.style.width = `${window.innerWidth}px`;
    this.canvas.style.height = `${window.innerHeight}px`;
  }

  private handleResize(): void {
    this.resizeCanvas();
    this.emojiManager.resize();
    this.interactionHandler.updateScaleFactor(this.emojiManager.getScaleFactor());
  }

  private setupControls(): void {
    const themeButtons = document.querySelectorAll('.theme-btn');
    themeButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLButtonElement;
        const theme = target.dataset.theme as ThemeType;
        
        themeButtons.forEach(b => b.classList.remove('active'));
        target.classList.add('active');
        
        this.emojiManager.setTheme(theme);
        this.createButtonRipple(target, e as MouseEvent);
      });
    });
    
    const densitySlider = document.getElementById('densitySlider') as HTMLInputElement;
    const densityValue = document.getElementById('densityValue') as HTMLElement;
    
    densitySlider.addEventListener('input', () => {
      const value = parseInt(densitySlider.value, 10);
      densityValue.textContent = value.toString();
      this.emojiManager.setCount(value);
    });
    
    const trailToggle = document.getElementById('trailToggle') as HTMLInputElement;
    trailToggle.addEventListener('change', () => {
      this.emojiManager.setTrailEnabled(trailToggle.checked);
    });
  }

  private createButtonRipple(button: HTMLElement, event: MouseEvent): void {
    const rect = button.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const existingRipples = button.querySelectorAll('.ripple');
    existingRipples.forEach(r => r.remove());
    
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    
    const maxDim = Math.max(rect.width, rect.height) * 2;
    ripple.style.width = ripple.style.height = `${maxDim}px`;
    ripple.style.marginLeft = ripple.style.marginTop = `-${maxDim / 2}px`;
    
    button.appendChild(ripple);
    
    setTimeout(() => {
      ripple.remove();
    }, 650);
  }

  private animate(): void {
    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;
    
    this.frameCount++;
    if (currentTime - this.fpsTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.fpsTime = currentTime;
    }
    
    this.update(deltaTime, currentTime);
    this.render();
    
    this.animationId = requestAnimationFrame(() => this.animate());
  }

  private update(deltaTime: number, currentTime: number): void {
    this.interactionHandler.update();
    this.emojiManager.update(deltaTime, currentTime);
    this.updateRipples(currentTime);
  }

  private updateRipples(currentTime: number): void {
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const ripple = this.ripples[i];
      const elapsed = currentTime - ripple.startTime;
      
      if (elapsed >= ripple.duration) {
        this.ripples.splice(i, 1);
        continue;
      }
      
      const t = elapsed / ripple.duration;
      ripple.radius = t * ripple.maxRadius;
      ripple.alpha = 1 - t;
    }
  }

  private render(): void {
    const ctx = this.ctx;
    const width = this.canvas.width / (window.devicePixelRatio || 1);
    const height = this.canvas.height / (window.devicePixelRatio || 1);
    
    ctx.clearRect(0, 0, width, height);
    
    this.renderBackground(width, height);
    
    this.emojiManager.render();
    
    this.renderRipples(ctx);
  }

  private renderBackground(width: number, height: number): void {
    const ctx = this.ctx;
    
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#0f0c29');
    gradient.addColorStop(0.5, '#302b63');
    gradient.addColorStop(1, '#24243e');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    ctx.save();
    ctx.globalAlpha = 0.03;
    ctx.fillStyle = '#a855f7';
    
    for (let i = 0; i < 50; i++) {
      const x = (i * 73 + (performance.now() * 0.01) % width) % width;
      const y = (i * 41) % height;
      const size = 1 + (i % 3);
      
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.restore();
  }

  private renderRipples(ctx: CanvasRenderingContext2D): void {
    for (const ripple of this.ripples) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
      ctx.strokeStyle = ripple.color;
      ctx.globalAlpha = ripple.alpha * 0.6;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
  }

  destroy(): void {
    cancelAnimationFrame(this.animationId);
    window.removeEventListener('resize', this.handleResize.bind(this));
    this.interactionHandler.destroy();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new App();
});
