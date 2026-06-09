import { Particle, ParticleState } from './particles';
import { LightContainer } from './container';

const PARTICLE_COUNT: number = 150;
const CONNECTION_DISTANCE: number = 50;
const HUE_MIN: number = 230;
const HUE_MAX: number = 35;

export interface MouseState {
  x: number;
  y: number;
  isMoving: boolean;
  lastMoveTime: number;
}

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private container: LightContainer;
  private mouse: MouseState;
  private animationId: number = 0;
  private lastFrameTime: number = 0;
  private capturedParticleHues: { hue: number; delay: number }[] = [];
  private readonly MOVE_IDLE_THRESHOLD: number = 0.15;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.container = new LightContainer();
    this.mouse = {
      x: -9999,
      y: -9999,
      isMoving: false,
      lastMoveTime: -Infinity
    };

    this.resize();
    this.initParticles();
    this.bindEvents();
  }

  private resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.canvas.style.width = window.innerWidth + 'px';
    this.canvas.style.height = window.innerHeight + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private initParticles(): void {
    this.particles = [];
    const w = window.innerWidth;
    const h = window.innerHeight;
    const margin = 80;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      let hue: number;
      const t = Math.random();
      if (t < 0.5) {
        hue = HUE_MIN + Math.random() * (360 - HUE_MIN);
      } else {
        hue = Math.random() * HUE_MAX;
      }

      const x = margin + Math.random() * (w - margin * 2 - 150);
      const y = margin + Math.random() * (h - margin * 2 - 150);

      this.particles.push(new Particle(x, y, hue));
    }
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => {
      this.resize();
      this.repositionParticles();
    });

    window.addEventListener('mousemove', (e: MouseEvent) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
      this.mouse.isMoving = true;
      this.mouse.lastMoveTime = performance.now() / 1000;
    });

    window.addEventListener('mouseleave', () => {
      this.mouse.x = -9999;
      this.mouse.y = -9999;
      this.mouse.isMoving = false;
    });

    window.addEventListener('click', (e: MouseEvent) => {
      this.handleClick(e.clientX, e.clientY);
    });

    window.addEventListener('touchmove', (e: TouchEvent) => {
      if (e.touches.length > 0) {
        this.mouse.x = e.touches[0].clientX;
        this.mouse.y = e.touches[0].clientY;
        this.mouse.isMoving = true;
        this.mouse.lastMoveTime = performance.now() / 1000;
      }
    });

    window.addEventListener('touchend', (e: TouchEvent) => {
      if (e.changedTouches.length > 0) {
        this.handleClick(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
      }
    });
  }

  private repositionParticles(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const margin = 80;

    for (const p of this.particles) {
      if (p.state !== ParticleState.IDLE && p.state !== ParticleState.ATTRACTED) {
        continue;
      }
      if (p.x < margin || p.x > w - margin - 150 || p.y < margin || p.y > h - margin - 150) {
        p.x = margin + Math.random() * (w - margin * 2 - 150);
        p.y = margin + Math.random() * (h - margin * 2 - 150);
        p.baseX = p.x;
        p.baseY = p.y;
      }
    }
  }

  private handleClick(x: number, y: number): void {
    let nearest: Particle | null = null;
    let nearestDist = Infinity;

    for (const p of this.particles) {
      if (p.state !== ParticleState.IDLE && p.state !== ParticleState.ATTRACTED) {
        continue;
      }
      const dist = p.distanceTo(x, y);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = p;
      }
    }

    if (nearest && nearestDist < 200) {
      const hue = nearest.hue;
      nearest.capture();
      this.capturedParticleHues.push({ hue, delay: nearest.captureDuration });
    }
  }

  start(): void {
    this.lastFrameTime = performance.now();
    this.loop();
  }

  stop(): void {
    if (this.animationId !== 0) {
      cancelAnimationFrame(this.animationId);
      this.animationId = 0;
    }
  }

  private loop(): void {
    const now = performance.now();
    let deltaTime = (now - this.lastFrameTime) / 1000;
    deltaTime = Math.min(deltaTime, 0.05);
    this.lastFrameTime = now;

    const currentTime = now / 1000;
    if (currentTime - this.mouse.lastMoveTime > this.MOVE_IDLE_THRESHOLD) {
      this.mouse.isMoving = false;
    }

    this.update(deltaTime);
    this.render();

    this.animationId = requestAnimationFrame(() => this.loop());
  }

  private update(deltaTime: number): void {
    const w = window.innerWidth;
    const h = window.innerHeight;

    this.container.update(deltaTime, w, h);

    for (let i = this.capturedParticleHues.length - 1; i >= 0; i--) {
      this.capturedParticleHues[i].delay -= deltaTime;
      if (this.capturedParticleHues[i].delay <= 0) {
        this.container.addCaptureParticle(this.capturedParticleHues[i].hue);
        this.capturedParticleHues.splice(i, 1);
      }
    }

    for (const p of this.particles) {
      p.update(deltaTime, this.mouse.x, this.mouse.y, this.mouse.isMoving, this.container.x, this.container.y);
    }

    this.particles = this.particles.filter(p => !p.isFullyExploded());
  }

  private render(): void {
    this.drawBackground();
    this.drawConnections();
    this.drawParticles();
    this.container.render(this.ctx);
    this.drawMouseGlow();
  }

  private drawBackground(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;

    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.fillStyle = 'rgba(5, 5, 10, 0.25)';
    this.ctx.fillRect(0, 0, w, h);

    const gradient = this.ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.7);
    gradient.addColorStop(0, 'rgba(20, 20, 45, 0.08)');
    gradient.addColorStop(0.5, 'rgba(10, 10, 25, 0.03)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, w, h);

    this.drawStarField(w, h);
  }

  private drawStarField(w: number, h: number): void {
    this.ctx.fillStyle = 'rgba(120, 150, 200, 0.15)';
    for (let i = 0; i < 40; i++) {
      const x = (i * 137.5 + w * 0.3) % w;
      const y = (i * 97.3 + h * 0.6) % h;
      const size = ((i * 7) % 3) * 0.4 + 0.5;
      this.ctx.fillRect(x, y, size, size);
    }
  }

  private drawConnections(): void {
    const visible = this.particles.filter(p =>
      p.state === ParticleState.IDLE || p.state === ParticleState.ATTRACTED
    );

    this.ctx.lineWidth = 0.5;

    for (let i = 0; i < visible.length; i++) {
      const a = visible[i];
      for (let j = i + 1; j < visible.length; j++) {
        const b = visible[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < CONNECTION_DISTANCE) {
          const falloff = 1 - dist / CONNECTION_DISTANCE;
          const alpha = falloff * 0.2;
          const avgHue = (a.hue + b.hue) / 2;

          this.ctx.beginPath();
          this.ctx.moveTo(a.x, a.y);
          this.ctx.lineTo(b.x, b.y);
          this.ctx.strokeStyle = `hsla(${avgHue}, 80%, 75%, ${alpha})`;
          this.ctx.shadowColor = `hsl(${avgHue}, 80%, 70%)`;
          this.ctx.shadowBlur = 4 * falloff;
          this.ctx.stroke();
        }
      }
    }
    this.ctx.shadowBlur = 0;
  }

  private drawParticles(): void {
    for (const p of this.particles) {
      p.render(this.ctx);
    }
  }

  private drawMouseGlow(): void {
    if (!this.mouse.isMoving && (this.mouse.x < 0 || this.mouse.y < 0)) return;
    if (this.mouse.x < 0 || this.mouse.y < 0 || this.mouse.x > window.innerWidth || this.mouse.y > window.innerHeight) return;

    const radius = 80;
    const alpha = this.mouse.isMoving ? 0.12 : 0.05;

    const gradient = this.ctx.createRadialGradient(
      this.mouse.x, this.mouse.y, 0,
      this.mouse.x, this.mouse.y, radius
    );
    gradient.addColorStop(0, `hsla(210, 90%, 75%, ${alpha})`);
    gradient.addColorStop(0.5, `hsla(230, 85%, 70%, ${alpha * 0.5})`);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(this.mouse.x, this.mouse.y, radius, 0, Math.PI * 2);
    this.ctx.fill();
  }

  getParticleCount(): number {
    return this.particles.filter(p => p.state !== ParticleState.EXPLODED).length;
  }

  getCapturedCount(): number {
    return this.container.capturedCount;
  }
}
