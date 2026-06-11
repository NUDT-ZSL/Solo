export interface Vector2D {
  x: number;
  y: number;
}

export class Particle {
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public radius: number;
  public color: string;
  public baseColor: string;
  public alpha: number;
  public life: number;
  public maxLife: number;
  public locked: boolean;
  public isVictoryParticle: boolean;
  public victoryAlpha: number;

  private glowPhase: number;
  private cachedCanvas: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.3 + Math.random() * 0.7;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.radius = 1 + Math.random() * 2;
    const gray = 0x4A + Math.floor(Math.random() * (0x7A - 0x4A));
    this.baseColor = `rgb(${gray}, ${gray}, ${gray})`;
    this.color = this.baseColor;
    this.alpha = 1;
    this.life = 1;
    this.maxLife = 1;
    this.locked = false;
    this.isVictoryParticle = false;
    this.victoryAlpha = 1;
    this.glowPhase = Math.random() * Math.PI * 2;
    this.cachedCanvas = 0;
  }

  public getGlowIntensity(time: number): number {
    return 0.2 + 0.3 * (0.5 + 0.5 * Math.sin(time * 0.004 + this.glowPhase));
  }

  public applyForce(fx: number, fy: number, dt: number): void {
    if (this.locked) return;
    this.vx += fx * dt;
    this.vy += fy * dt;
  }

  public update(dt: number, canvasSize: number, _time: number): void {
    if (this.locked && !this.isVictoryParticle) return;

    if (this.isVictoryParticle) {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.vx *= 0.98;
      this.vy *= 0.98;
      this.victoryAlpha -= dt * 0.0005;
      if (this.victoryAlpha < 0) this.victoryAlpha = 0;
      return;
    }

    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (speed > 80) {
      const scale = 80 / speed;
      this.vx *= scale;
      this.vy *= scale;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    this.vx *= 0.995;
    this.vy *= 0.995;

    const margin = 10;
    if (this.x < margin) {
      this.x = margin;
      this.vx = Math.abs(this.vx) * 0.5;
    }
    if (this.x > canvasSize - margin) {
      this.x = canvasSize - margin;
      this.vx = -Math.abs(this.vx) * 0.5;
    }
    if (this.y < margin) {
      this.y = margin;
      this.vy = Math.abs(this.vy) * 0.5;
    }
    if (this.y > canvasSize - margin) {
      this.y = canvasSize - margin;
      this.vy = -Math.abs(this.vy) * 0.5;
    }
  }

  public isNearEdge(canvasSize: number, margin: number = 50): boolean {
    return (
      this.x < margin ||
      this.x > canvasSize - margin ||
      this.y < margin ||
      this.y > canvasSize - margin
    );
  }

  public shouldRenderThisFrame(frameCount: number, canvasSize: number): boolean {
    if (!this.isNearEdge(canvasSize)) return true;
    return frameCount % 4 === this.cachedCanvas;
  }

  public setFrameOffset(offset: number): void {
    this.cachedCanvas = offset;
  }

  public triggerVictory(_centerX: number, _centerY: number): void {
    this.isVictoryParticle = true;
    this.locked = true;
    const angle = Math.random() * Math.PI * 2;
    const speed = 80 + Math.random() * 120;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.color = '#FFD700';
    this.victoryAlpha = 1;
  }

  public render(ctx: CanvasRenderingContext2D, time: number, frameCount: number, canvasSize: number): void {
    if (!this.shouldRenderThisFrame(frameCount, canvasSize)) return;

    const alpha = this.isVictoryParticle ? this.victoryAlpha : this.alpha;
    if (alpha <= 0) return;

    ctx.save();
    ctx.globalAlpha = alpha;

    if (!this.isVictoryParticle) {
      const glow = this.getGlowIntensity(time);
      ctx.shadowColor = '#AAAAAA';
      ctx.shadowBlur = 8 * glow;
    } else {
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 12;
    }

    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  public fadeOut(dt: number): void {
    this.alpha -= dt * 0.0008;
    if (this.alpha < 0) this.alpha = 0;
  }
}
