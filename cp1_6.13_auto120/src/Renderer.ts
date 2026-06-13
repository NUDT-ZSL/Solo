import { GameStateData, Character, Obstacle, Note, Particle } from './GameManager';

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private groundY: number;
  private animationFrameId: number | null = null;
  private fps: number = 60;
  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  private fpsUpdateTime: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.width = canvas.width;
    this.height = canvas.height;
    this.groundY = this.height - 100;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    this.groundY = this.height - 100;
  }

  start(onRender: (dt: number) => void): void {
    this.lastFrameTime = performance.now();
    const loop = (now: number) => {
      const dt = (now - this.lastFrameTime) / 1000;
      this.lastFrameTime = now;
      this.frameCount++;
      if (now - this.fpsUpdateTime >= 1000) {
        this.fps = this.frameCount;
        this.frameCount = 0;
        this.fpsUpdateTime = now;
      }
      onRender(dt);
      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  getFPS(): number {
    return this.fps;
  }

  render(state: GameStateData): void {
    this.clear();
    this.drawBackground();
    this.drawGrid();
    this.drawGround();
    this.drawObstacles(state.obstacles);
    this.drawNotes(state.notes);
    this.drawCharacter(state.character, state.glowAlpha);
    this.drawParticles(state.particles);
    this.drawBeatIndicator(state.beatSchedule?.beats ?? [], state.currentBeatIndex);
    this.drawProgressBar(state.progress);
  }

  private clear(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  private drawBackground(): void {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#0f172a');
    gradient.addColorStop(1, '#1e293b');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawGrid(): void {
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    this.ctx.lineWidth = 1;

    const gridSize = 20;
    for (let x = 0; x < this.width; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.height);
      this.ctx.stroke();
    }
    for (let y = 0; y < this.height; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.width, y);
      this.ctx.stroke();
    }
  }

  private drawGround(): void {
    this.ctx.fillStyle = '#1e293b';
    this.ctx.fillRect(0, this.groundY, this.width, this.height - this.groundY);

    this.ctx.strokeStyle = '#3b82f6';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.groundY);
    this.ctx.lineTo(this.width, this.groundY);
    this.ctx.stroke();
  }

  private drawObstacles(obstacles: Obstacle[]): void {
    for (const obs of obstacles) {
      this.ctx.fillStyle = '#ef4444';
      this.ctx.beginPath();
      this.ctx.moveTo(obs.x + obs.width / 2, obs.y);
      this.ctx.lineTo(obs.x, obs.y + obs.height);
      this.ctx.lineTo(obs.x + obs.width, obs.y + obs.height);
      this.ctx.closePath();
      this.ctx.fill();

      this.ctx.fillStyle = 'rgba(239, 68, 68, 0.3)';
      this.ctx.beginPath();
      this.ctx.moveTo(obs.x + obs.width / 2, obs.y + 15);
      this.ctx.lineTo(obs.x + obs.width / 2 - 8, obs.y + obs.height);
      this.ctx.lineTo(obs.x + obs.width / 2 + 8, obs.y + obs.height);
      this.ctx.closePath();
      this.ctx.fill();
    }
  }

  private drawNotes(notes: Note[]): void {
    for (const note of notes) {
      if (note.collected) continue;
      this.drawStar(note.x, note.y, note.size, '#facc15');
    }
  }

  private drawStar(cx: number, cy: number, size: number, color: string): void {
    const spikes = 5;
    const outerRadius = size / 2;
    const innerRadius = size / 4;
    let rot = (Math.PI / 2) * 3;
    const step = Math.PI / spikes;

    this.ctx.save();
    this.ctx.translate(cx, cy);
    this.ctx.beginPath();
    this.ctx.moveTo(0, -outerRadius);

    for (let i = 0; i < spikes; i++) {
      let x = Math.cos(rot) * outerRadius;
      let y = Math.sin(rot) * outerRadius;
      this.ctx.lineTo(x, y);
      rot += step;

      x = Math.cos(rot) * innerRadius;
      y = Math.sin(rot) * innerRadius;
      this.ctx.lineTo(x, y);
      rot += step;
    }

    this.ctx.lineTo(0, -outerRadius);
    this.ctx.closePath();
    this.ctx.fillStyle = color;
    this.ctx.fill();
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();
    this.ctx.restore();
  }

  private drawCharacter(char: Character, glowAlpha: number): void {
    const centerX = char.x + char.width / 2;
    const centerY = char.y + char.height / 2;

    if (glowAlpha > 0) {
      const gradient = this.ctx.createRadialGradient(
        centerX,
        char.y + char.height,
        0,
        centerX,
        char.y + char.height,
        50
      );
      gradient.addColorStop(0, `rgba(250, 204, 21, ${glowAlpha})`);
      gradient.addColorStop(1, 'rgba(250, 204, 21, 0)');
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(centerX, char.y + char.height, 50, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.save();
    this.ctx.translate(centerX, centerY);
    this.ctx.rotate((char.rotation * Math.PI) / 180);

    const w = char.width;
    const h = char.height;

    this.ctx.fillStyle = '#3b82f6';
    this.ctx.fillRect(-w / 2, -h / 4, w, h / 2);

    this.ctx.fillStyle = '#f8fafc';
    this.ctx.fillRect(-w / 3, -h / 2, (w * 2) / 3, h / 4);

    this.ctx.fillStyle = '#0f172a';
    this.ctx.fillRect(-w / 6, -h / 2 + 4, 4, 4);
    this.ctx.fillRect(w / 12, -h / 2 + 4, 4, 4);

    this.ctx.fillStyle = '#1e293b';
    if (char.isJumping) {
      this.ctx.fillRect(-w / 4, h / 4, w / 5, h / 4);
      this.ctx.fillRect(w / 20, h / 4, w / 5, h / 4);
    } else {
      this.ctx.fillRect(-w / 4, h / 4, w / 5, h / 3);
      this.ctx.fillRect(w / 20, h / 4, w / 5, h / 3);
    }

    this.ctx.fillStyle = '#60a5fa';
    this.ctx.fillRect(-w / 2 - 4, -h / 6, 6, h / 3);
    this.ctx.fillRect(w / 2 - 2, -h / 6, 6, h / 3);

    this.ctx.restore();
  }

  private drawParticles(particles: Particle[]): void {
    for (const p of particles) {
      const alpha = p.life / p.maxLife;
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = alpha;
      this.ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    this.ctx.globalAlpha = 1;
  }

  private drawBeatIndicator(beats: number[], currentBeatIndex: number): void {
    const dotSize = 6;
    const dotSpacing = 8;
    const maxDots = Math.min(beats.length, 20);
    const totalWidth = maxDots * dotSize + (maxDots - 1) * dotSpacing;
    const startX = (this.width - totalWidth) / 2;
    const y = 30;

    const visibleStart = Math.max(0, currentBeatIndex - 5);
    const visibleEnd = Math.min(beats.length, visibleStart + maxDots);
    const visibleCount = visibleEnd - visibleStart;
    const actualStartX = (this.width - visibleCount * (dotSize + dotSpacing) + dotSpacing) / 2;

    for (let i = visibleStart; i < visibleEnd; i++) {
      const idx = i - visibleStart;
      const x = actualStartX + idx * (dotSize + dotSpacing);
      const isActive = i === currentBeatIndex;
      const isPast = i < currentBeatIndex;

      this.ctx.beginPath();
      this.ctx.arc(x, y, dotSize / 2, 0, Math.PI * 2);

      if (isActive) {
        this.ctx.fillStyle = '#facc15';
        this.ctx.shadowColor = '#facc15';
        this.ctx.shadowBlur = 10;
      } else if (isPast) {
        this.ctx.fillStyle = 'rgba(250, 204, 21, 0.3)';
        this.ctx.shadowBlur = 0;
      } else {
        this.ctx.fillStyle = 'rgba(250, 204, 21, 0.6)';
        this.ctx.shadowBlur = 0;
      }

      this.ctx.fill();
      this.ctx.shadowBlur = 0;
    }
  }

  private drawProgressBar(progress: number): void {
    const barHeight = 6;
    const y = this.height - barHeight;
    const width = this.width * progress;

    const gradient = this.ctx.createLinearGradient(0, y, this.width, y);
    gradient.addColorStop(0, '#22c55e');
    gradient.addColorStop(1, '#ef4444');

    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    this.ctx.fillRect(0, y, this.width, barHeight);

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, y, width, barHeight);
  }

  drawGameOver(): void {
    this.ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
    this.ctx.fillRect(0, 0, this.width, this.height);
  }
}
