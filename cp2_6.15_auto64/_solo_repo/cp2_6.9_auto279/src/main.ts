import { Particle, hexToRgb, COLOR_SCHEMES, BURST_COLORS, ColorStop } from './particle';
import { Starfield } from './starfield';
import { UI } from './ui';

interface Halo {
  x: number;
  y: number;
  age: number;
  lifespan: number;
  radius: number;
  maxAlpha: number;
}

class App {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private starfield: Starfield;
  private ui: UI;
  private isMouseDown: boolean = false;
  private mouseX: number = 0;
  private mouseY: number = 0;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  private lastTime: number = 0;
  private particleCount: number = 40;
  private trailLength: number = 8;
  private colorScheme: number = 0;
  private halo: Halo | null = null;
  private fpsFrames: number = 0;
  private fpsTime: number = 0;
  private currentFps: number = 0;
  private currentFrameTime: number = 0;
  private hudParticleCount: HTMLElement;
  private hudFps: HTMLElement;
  private hudFrameTime: HTMLElement;
  private spawnAccumulator: number = 0;

  constructor() {
    this.canvas = document.getElementById('canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;

    this.hudParticleCount = document.getElementById('particle-count') as HTMLElement;
    this.hudFps = document.getElementById('fps') as HTMLElement;
    this.hudFrameTime = document.getElementById('frame-time') as HTMLElement;

    this.starfield = new Starfield(this.canvas, 20);

    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    this.ui = new UI({
      onParticleCountChange: (count) => {
        this.particleCount = count;
      },
      onTrailLengthChange: (length) => {
        this.trailLength = length;
      },
      onColorSchemeChange: (scheme) => {
        this.colorScheme = scheme;
      }
    });

    this.bindEvents();
    this.lastTime = performance.now();
    this.animate(this.lastTime);
  }

  private resizeCanvas(): void {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.canvas.style.width = window.innerWidth + 'px';
    this.canvas.style.height = window.innerHeight + 'px';
    this.ctx.scale(dpr, dpr);
    this.starfield.resize();
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.isMouseDown = true;
        this.updateMousePosition(e);
        this.lastMouseX = this.mouseX;
        this.lastMouseY = this.mouseY;
      }
    });

    this.canvas.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.isMouseDown = false;
      }
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.isMouseDown = false;
    });

    this.canvas.addEventListener('mousemove', (e) => {
      this.updateMousePosition(e);
    });

    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this.createBurst(x, y);
      this.createHalo(window.innerWidth / 2, window.innerHeight / 2);
    });
  }

  private updateMousePosition(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    this.mouseX = e.clientX - rect.left;
    this.mouseY = e.clientY - rect.top;
  }

  private createTrailParticle(): void {
    const scheme = COLOR_SCHEMES[this.colorScheme];
    const startColor = hexToRgb(scheme.start);
    const endColor = hexToRgb(scheme.end);

    const angle = Math.random() * Math.PI * 2;
    const speed = 80 + Math.random() * 40;
    const offsetX = (Math.random() - 0.5) * 30;
    const offsetY = (Math.random() - 0.5) * 30;

    const particle = new Particle({
      x: this.mouseX + offsetX,
      y: this.mouseY + offsetY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 2 + Math.random() * 2,
      startColor,
      endColor,
      trailLength: 5 + Math.floor(Math.random() * 4),
      lifespan: 0.8,
      speed: speed
    });

    this.particles.push(particle);
  }

  private createBurst(x: number, y: number): void {
    const count = 30 + Math.floor(Math.random() * 21);
    const startColor = hexToRgb(BURST_COLORS.start);
    const endColor = hexToRgb(BURST_COLORS.end);

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 150 + Math.random() * 100;
      const radius = Math.random() * 80;
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;

      const particle = new Particle({
        x: px,
        y: py,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 2 + Math.random() * 3,
        startColor: this.interpolateColor(startColor, endColor, Math.random()),
        endColor: this.interpolateColor(endColor, startColor, Math.random()),
        trailLength: 12,
        lifespan: 1.5,
        speed: speed
      });

      this.particles.push(particle);
    }
  }

  private createHalo(x: number, y: number): void {
    this.halo = {
      x,
      y,
      age: 0,
      lifespan: 0.4,
      radius: 50,
      maxAlpha: 0.3
    };
  }

  private interpolateColor(start: ColorStop, end: ColorStop, t: number): ColorStop {
    return {
      r: Math.round(start.r + (end.r - start.r) * t),
      g: Math.round(start.g + (end.g - start.g) * t),
      b: Math.round(start.b + (end.b - start.b) * t)
    };
  }

  private drawBackground(): void {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, window.innerHeight);
    gradient.addColorStop(0, '#0A0A1A');
    gradient.addColorStop(1, '#05050D');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
  }

  private drawHalo(deltaTime: number): void {
    if (!this.halo) return;

    this.halo.age += deltaTime;
    const progress = this.halo.age / this.halo.lifespan;
    const alpha = this.halo.maxAlpha * (1 - progress);
    const radius = this.halo.radius * (1 + progress * 0.5);

    if (progress >= 1) {
      this.halo = null;
      return;
    }

    const gradient = this.ctx.createRadialGradient(
      this.halo.x, this.halo.y, 0,
      this.halo.x, this.halo.y, radius
    );
    gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
  }

  private updateHud(): void {
    this.hudParticleCount.textContent = this.particles.length.toString();
    this.hudFps.textContent = this.currentFps.toString();
    this.hudFrameTime.textContent = this.currentFrameTime.toFixed(1);

    if (this.particles.length >= 100 && this.currentFps < 50) {
      this.hudFps.style.color = '#FF6B35';
    } else {
      this.hudFps.style.color = '#88AACC';
    }
  }

  private animate(currentTime: number): void {
    const frameStart = performance.now();
    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    this.fpsFrames++;
    this.fpsTime += deltaTime;
    if (this.fpsTime >= 0.5) {
      this.currentFps = Math.round(this.fpsFrames / this.fpsTime);
      this.fpsFrames = 0;
      this.fpsTime = 0;
    }

    this.drawBackground();

    this.starfield.update(currentTime / 1000);
    this.starfield.draw(this.ctx);

    if (this.isMouseDown) {
      const dx = this.mouseX - this.lastMouseX;
      const dy = this.mouseY - this.lastMouseY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      const spawnInterval = 1 / (this.particleCount / 10);
      this.spawnAccumulator += deltaTime;

      while (this.spawnAccumulator >= spawnInterval) {
        this.createTrailParticle();
        this.spawnAccumulator -= spawnInterval;
      }

      this.lastMouseX = this.mouseX;
      this.lastMouseY = this.mouseY;
    }

    this.particles = this.particles.filter(p => !p.dead);
    for (const particle of this.particles) {
      particle.trailLength = Math.max(3, this.trailLength);
      particle.update(deltaTime);
      particle.draw(this.ctx);
    }

    this.drawHalo(deltaTime);

    const frameEnd = performance.now();
    this.currentFrameTime = frameEnd - frameStart;

    this.updateHud();

    requestAnimationFrame((t) => this.animate(t));
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
