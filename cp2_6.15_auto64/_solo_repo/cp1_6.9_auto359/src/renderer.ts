import { Particle } from './particle';
import { Spark } from './spark';

interface BackgroundStar {
  x: number;
  y: number;
  size: number;
  opacity: number;
}

export type { BackgroundStar };

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private particles: Particle[] = [];
  private sparks: Spark[] = [];
  private backgroundStars: BackgroundStar[] = [];

  private readonly MAX_PARTICLES = 2000;
  private readonly MAX_SPARKS = 3000;
  private readonly STAR_COUNT = 300;
  private readonly GRID_SPACING = 40;
  private readonly FUSION_THRESHOLD = 3;
  private readonly FUSION_CHECK_INTERVAL = 100;
  private readonly PARTICLES_PER_FRAME_MIN = 4;
  private readonly PARTICLES_PER_FRAME_MAX = 6;
  private readonly GRID_ROTATION_SPEED = 0.2;
  private readonly MAX_GRID_ROTATION = 15;

  private gridRotation = 0;
  private targetGridRotation = 0;
  private lastFusionCheck = 0;

  private lastMouseX = 0;
  private lastMouseY = 0;
  private isDrawing = false;
  private mouseX = 0;
  private mouseY = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D rendering context');
    }
    this.ctx = ctx;

    this.resize();
    this.generateBackgroundStars();
  }

  public resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);

    this.generateBackgroundStars();
  }

  public setMousePosition(x: number, y: number): void {
    const dx = x - this.mouseX;
    const dy = y - this.mouseY;
    const delta = Math.sqrt(dx * dx + dy * dy);

    if (delta > 2) {
      const direction = dx > 0 ? 1 : -1;
      this.targetGridRotation += direction * this.GRID_ROTATION_SPEED;
      this.targetGridRotation = Math.max(
        -this.MAX_GRID_ROTATION,
        Math.min(this.MAX_GRID_ROTATION, this.targetGridRotation)
      );
    }

    this.mouseX = x;
    this.mouseY = y;
  }

  public startDrawing(x: number, y: number): void {
    this.isDrawing = true;
    this.lastMouseX = x;
    this.lastMouseY = y;
    this.mouseX = x;
    this.mouseY = y;
  }

  public stopDrawing(): void {
    this.isDrawing = false;
  }

  public update(deltaTime: number, now: number): void {
    if (this.isDrawing) {
      this.emitParticles(now);
    }

    this.gridRotation += (this.targetGridRotation - this.gridRotation) * 0.05;

    for (const p of this.particles) {
      p.update(deltaTime);
    }
    for (const s of this.sparks) {
      s.update(deltaTime);
    }

    if (now - this.lastFusionCheck >= this.FUSION_CHECK_INTERVAL) {
      this.performFusion(now);
      this.lastFusionCheck = now;
    }

    this.cleanup();
  }

  public render(now: number): void {
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    this.ctx.clearRect(0, 0, w, h);

    this.drawBackground(w, h);
    this.drawGrid(w, h);
    this.drawBackgroundStars();

    for (const s of this.sparks) {
      s.draw(this.ctx);
    }

    this.particles.sort((a, b) => a.currentSize - b.currentSize);
    for (const p of this.particles) {
      p.draw(this.ctx);
    }

    if (this.mouseX > 0 || this.mouseY > 0) {
      this.drawCursor();
    }
  }

  public getActiveCount(): number {
    return this.particles.length;
  }

  private emitParticles(now: number): void {
    const count =
      this.PARTICLES_PER_FRAME_MIN +
      Math.floor(Math.random() * (this.PARTICLES_PER_FRAME_MAX - this.PARTICLES_PER_FRAME_MIN + 1));

    const dx = this.mouseX - this.lastMouseX;
    const dy = this.mouseY - this.lastMouseY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speedUnitX = dist > 0 ? dx / dist : 0;
    const speedUnitY = dist > 0 ? dy / dist : 0;
    const baseSpeed = 0.02;

    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 1 : i / (count - 1);
      const px = this.lastMouseX + dx * t;
      const py = this.lastMouseY + dy * t;

      const vx = speedUnitX * baseSpeed + (Math.random() - 0.5) * 0.005;
      const vy = speedUnitY * baseSpeed + (Math.random() - 0.5) * 0.005;

      const particle = new Particle(px, py, vx, vy, now, 3000);
      this.addParticle(particle);

      if (Math.random() < 0.5) {
        this.emitSpark(px, py, vx, vy, now);
      }
    }

    this.lastMouseX = this.mouseX;
    this.lastMouseY = this.mouseY;
  }

  private emitSpark(
    x: number,
    y: number,
    vx: number,
    vy: number,
    now: number
  ): void {
    const offsetAngle = Math.random() * Math.PI * 2;
    const offsetDist = Math.random() * 4 + 2;
    const sx = x + Math.cos(offsetAngle) * offsetDist;
    const sy = y + Math.sin(offsetAngle) * offsetDist;

    const svx = vx * 0.3 + (Math.random() - 0.5) * 0.01;
    const svy = vy * 0.3 + (Math.random() - 0.5) * 0.01;

    const lifespan = 800 + Math.random() * 1200;
    const spark = new Spark(sx, sy, svx, svy, now, lifespan);
    this.addSpark(spark);
  }

  private addParticle(p: Particle): void {
    if (this.particles.length >= this.MAX_PARTICLES) {
      this.particles.shift();
    }
    this.particles.push(p);
  }

  private addSpark(s: Spark): void {
    if (this.sparks.length >= this.MAX_SPARKS) {
      this.sparks.shift();
    }
    this.sparks.push(s);
  }

  private performFusion(now: number): void {
    const alive = this.particles.filter((p) => p.isAlive);
    const fusedIndices = new Set<number>();
    const newParticles: Particle[] = [];

    for (let i = 0; i < alive.length; i++) {
      if (fusedIndices.has(i)) continue;
      const a = alive[i];
      let fused = false;

      for (let j = i + 1; j < alive.length; j++) {
        if (fusedIndices.has(j)) continue;
        const b = alive[j];

        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < this.FUSION_THRESHOLD) {
          const fusedParticle = Particle.fuse(a, b, now);
          newParticles.push(fusedParticle);
          fusedIndices.add(i);
          fusedIndices.add(j);
          fused = true;
          break;
        }
      }

      if (!fused && !fusedIndices.has(i)) {
        newParticles.push(a);
      }
    }

    this.particles = newParticles;
  }

  private cleanup(): void {
    this.particles = this.particles.filter((p) => p.isAlive);
    this.sparks = this.sparks.filter((s) => s.isAlive);
  }

  private generateBackgroundStars(): void {
    this.backgroundStars = [];
    const rect = this.canvas.getBoundingClientRect();
    for (let i = 0; i < this.STAR_COUNT; i++) {
      this.backgroundStars.push({
        x: Math.random() * rect.width,
        y: Math.random() * rect.height,
        size: 1 + Math.random() * 2,
        opacity: 0.2 + Math.random() * 0.4,
      });
    }
  }

  private drawBackground(w: number, h: number): void {
    const gradient = this.ctx.createRadialGradient(
      w / 2,
      h / 2,
      0,
      w / 2,
      h / 2,
      Math.max(w, h) * 0.7
    );
    gradient.addColorStop(0, '#0a0a2e');
    gradient.addColorStop(1, '#1a1a3e');

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, w, h);
  }

  private drawGrid(w: number, h: number): void {
    this.ctx.save();
    this.ctx.translate(w / 2, h / 2);
    this.ctx.rotate((this.gridRotation * Math.PI) / 180);

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    this.ctx.lineWidth = 0.5;

    const diagonal = Math.sqrt(w * w + h * h);
    const halfDiag = diagonal / 2;

    this.ctx.beginPath();
    for (let x = -halfDiag; x <= halfDiag; x += this.GRID_SPACING) {
      this.ctx.moveTo(x, -halfDiag);
      this.ctx.lineTo(x, halfDiag);
    }
    for (let y = -halfDiag; y <= halfDiag; y += this.GRID_SPACING) {
      this.ctx.moveTo(-halfDiag, y);
      this.ctx.lineTo(halfDiag, y);
    }
    this.ctx.stroke();

    this.ctx.restore();
  }

  private drawBackgroundStars(): void {
    for (const star of this.backgroundStars) {
      this.ctx.beginPath();
      this.ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
      this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private drawCursor(): void {
    const radius = 12;

    const gradient = this.ctx.createRadialGradient(
      this.mouseX,
      this.mouseY,
      0,
      this.mouseX,
      this.mouseY,
      radius * 2
    );
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.15)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    this.ctx.beginPath();
    this.ctx.fillStyle = gradient;
    this.ctx.arc(this.mouseX, this.mouseY, radius * 2, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    this.ctx.lineWidth = 1.5;
    this.ctx.arc(this.mouseX, this.mouseY, radius, 0, Math.PI * 2);
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    this.ctx.arc(this.mouseX, this.mouseY, 2, 0, Math.PI * 2);
    this.ctx.fill();
  }
}
