import { GameState, Platform, Obstacle, Note, Player } from './EventBus';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  life: number;
  maxLife: number;
  color: string;
}

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private animationFrameId: number | null = null;
  private currentState: GameState | null = null;
  private time: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
  }

  start(): void {
    this.lastRenderTime = performance.now();
    this.renderLoop();
  }

  stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  setState(state: GameState): void {
    this.currentState = state;
  }

  spawnParticles(x: number, y: number): void {
    const count = 6;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
      const speed = 50 + Math.random() * 30;
      const radius = Math.random() * 3 + 3;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius,
        life: 0.5,
        maxLife: 0.5,
        color: '#fdcb6e',
      });
    }
  }

  private lastRenderTime: number = 0;

  private renderLoop = (): void => {
    const now = performance.now();
    const dt = Math.min((now - this.lastRenderTime) / 1000, 1 / 30);
    this.lastRenderTime = now;
    this.time += dt;

    this.updateParticles(dt);
    this.draw();

    this.animationFrameId = requestAnimationFrame(this.renderLoop);
  };

  private updateParticles(dt: number): void {
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      p.radius += 10 * dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  private draw(): void {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!this.currentState) return;

    this.drawPlatforms(this.currentState.platforms);
    this.drawObstacles(this.currentState.obstacles);
    this.drawNotes(this.currentState.notes);
    this.drawPlayer(this.currentState.player);
    this.drawParticles();
  }

  private drawPlatforms(platforms: Platform[]): void {
    const { ctx } = this;
    for (const p of platforms) {
      ctx.save();
      ctx.shadowColor = 'rgba(108, 92, 231, 0.3)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      ctx.fillStyle = '#dfe6e9';
      ctx.beginPath();
      this.roundRect(ctx, p.x, p.y, p.width, p.height, 4);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawObstacles(obstacles: Obstacle[]): void {
    const { ctx } = this;
    const wobbleOffset = Math.sin(this.time * Math.PI) * 3;

    for (const o of obstacles) {
      ctx.fillStyle = '#fab1a0';
      ctx.beginPath();
      ctx.moveTo(o.x + o.baseWidth / 2, o.y + wobbleOffset);
      ctx.lineTo(o.x, o.y + o.height);
      ctx.lineTo(o.x + o.baseWidth, o.y + o.height);
      ctx.closePath();
      ctx.fill();
    }
  }

  private drawNotes(notes: Note[]): void {
    const { ctx } = this;
    for (const n of notes) {
      if (n.collected) continue;

      ctx.save();
      ctx.shadowColor = 'rgba(253, 203, 110, 0.5)';
      ctx.shadowBlur = 10;

      ctx.fillStyle = '#ffeaa7';
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = '#fdcb6e';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('♪', n.x, n.y);
    }
  }

  private drawPlayer(player: Player): void {
    const { ctx } = this;
    ctx.fillStyle = '#6c5ce7';
    ctx.beginPath();
    this.roundRect(ctx, player.x, player.y, player.width, player.height, 4);
    ctx.fill();
  }

  private drawParticles(): void {
    const { ctx } = this;
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
  }
}
