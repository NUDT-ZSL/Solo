import { Particle, ColorTheme, THEME_RANGES, ThemeRange } from './particle';

export class SpiralManager {
  private particles: Particle[] = [];
  private theme: ColorTheme = 'rainbow';
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  private lastTriggerTime: number = 0;
  private minDistance: number = 5;
  private audioContext: AudioContext | null = null;
  private performanceMode: boolean = false;
  private canvasWidth: number;
  private canvasHeight: number;
  private transitionOverlay: HTMLElement | null = null;

  constructor(width: number, height: number) {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  setCanvasSize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  setTransitionOverlay(el: HTMLElement): void {
    this.transitionOverlay = el;
  }

  getTheme(): ColorTheme {
    return this.theme;
  }

  getThemeInfo(): ThemeRange {
    return THEME_RANGES[this.theme];
  }

  getParticleCount(): number {
    return this.particles.length;
  }

  isPerformanceMode(): boolean {
    return this.performanceMode;
  }

  private playTone(frequency: number): void {
    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = this.audioContext;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

      gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.12);
    } catch {
      // Audio not supported, silently fail
    }
  }

  setTheme(theme: ColorTheme): void {
    if (this.theme === theme) return;

    this.theme = theme;

    const themeInfo = THEME_RANGES[theme];
    const frequencies: Record<ColorTheme, number> = {
      rainbow: 523,
      red: 330,
      green: 440,
      blue: 660
    };
    this.playTone(frequencies[theme]);

    if (this.transitionOverlay) {
      const color = this.getThemeGradient(theme);
      this.transitionOverlay.style.background = color;
      this.transitionOverlay.style.opacity = '1';
      setTimeout(() => {
        if (this.transitionOverlay) {
          this.transitionOverlay.style.opacity = '0';
        }
      }, 50);
    }
  }

  private getThemeGradient(theme: ColorTheme): string {
    switch (theme) {
      case 'red':
        return 'radial-gradient(circle at center, rgba(255, 60, 60, 0.25), rgba(255, 0, 0, 0.1), transparent 70%)';
      case 'green':
        return 'radial-gradient(circle at center, rgba(60, 255, 120, 0.25), rgba(0, 255, 80, 0.1), transparent 70%)';
      case 'blue':
        return 'radial-gradient(circle at center, rgba(60, 180, 255, 0.25), rgba(0, 120, 255, 0.1), transparent 70%)';
      default:
        return 'radial-gradient(circle at center, rgba(255, 200, 100, 0.2), rgba(200, 100, 255, 0.1), transparent 70%)';
    }
  }

  spawnParticles(x: number, y: number): void {
    const now = performance.now();
    const dx = x - this.lastMouseX;
    const dy = y - this.lastMouseY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < this.minDistance && (now - this.lastTriggerTime) < 30) {
      return;
    }

    this.lastMouseX = x;
    this.lastMouseY = y;
    this.lastTriggerTime = now;

    const themeInfo = THEME_RANGES[this.theme];
    const count = this.performanceMode ? 15 : 30;

    for (let i = 0; i < count; i++) {
      let hue: number;
      if (this.theme === 'rainbow') {
        hue = (i / count) * 360;
      } else {
        hue = themeInfo.min + Math.random() * (themeInfo.max - themeInfo.min);
      }

      const particle = new Particle(x, y, hue, 15);
      this.particles.push(particle);
    }
  }

  clearAll(): void {
    for (const p of this.particles) {
      p.fadeOut = true;
      p.fadeProgress = 0;
    }
  }

  update(deltaTime: number): void {
    this.particles = this.particles.filter(p => p.update(deltaTime, this.performanceMode));

    this.performanceMode = this.particles.length > 2000;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.performanceMode && this.particles.length > 1) {
      this.drawConnections(ctx);
    }

    for (const particle of this.particles) {
      particle.draw(ctx);
    }
  }

  private drawConnections(ctx: CanvasRenderingContext2D): void {
    const maxDistance = 20;
    const particles = this.particles;

    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const p1 = particles[i];
        const p2 = particles[j];

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < maxDistance) {
          const alpha1 = p1.getAlpha();
          const alpha2 = p2.getAlpha();
          const avgAlpha = (alpha1 + alpha2) / 2 * 0.3;
          const avgHue = (p1.hue + p2.hue) / 2;

          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = `hsla(${avgHue}, 100%, 70%, ${avgAlpha})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }
  }
}
