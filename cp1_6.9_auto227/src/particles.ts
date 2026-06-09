export type SymbolShape = 'triangle' | 'circle' | 'star' | 'diamond' | 'hexagon';

export interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
  life: number;
}

export interface ExplosionParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  size: number;
  life: number;
  maxLife: number;
}

export enum ParticleState {
  IDLE = 'idle',
  ATTRACTED = 'attracted',
  CAPTURED = 'captured',
  EXPLODED = 'exploded'
}

export class Particle {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  vx: number = 0;
  vy: number = 0;
  baseSize: number;
  size: number;
  hue: number;
  saturation: number = 80;
  baseLightness: number = 70;
  lightness: number = 70;
  shape: SymbolShape;
  state: ParticleState = ParticleState.IDLE;
  pulsePhase: number;
  rotation: number = 0;
  rotationSpeed: number;
  trail: TrailPoint[] = [];
  readonly maxTrailLength: number = 15;
  readonly trailDuration: number = 0.8;
  targetX: number = 0;
  targetY: number = 0;
  capturedProgress: number = 0;
  readonly captureDuration: number = 0.6;
  explosionParticles: ExplosionParticle[] = [];
  readonly explosionCount: number = 12;
  attractedIntensity: number = 0;
  readonly attractDamping: number = 0.2;
  readonly baseReturnForce: number = 0.03;

  constructor(x: number, y: number, hue: number) {
    this.x = x;
    this.y = y;
    this.baseX = x;
    this.baseY = y;
    this.baseSize = 3 + Math.random() * 5;
    this.size = this.baseSize;
    this.hue = hue;
    this.shape = this.randomShape();
    this.pulsePhase = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 0.02;
  }

  private randomShape(): SymbolShape {
    const shapes: SymbolShape[] = ['triangle', 'circle', 'star', 'diamond', 'hexagon'];
    return shapes[Math.floor(Math.random() * shapes.length)];
  }

  update(deltaTime: number, mouseX: number, mouseY: number, isMouseMoving: boolean, containerX: number, containerY: number): void {
    this.pulsePhase += deltaTime * (Math.PI * 2 / 0.3);
    this.rotation += this.rotationSpeed;

    if (this.state === ParticleState.IDLE || this.state === ParticleState.ATTRACTED) {
      const pulse = (Math.sin(this.pulsePhase) + 1) / 2;
      this.size = this.baseSize * (0.85 + pulse * 0.3);
      this.lightness = this.baseLightness + pulse * 30;

      const dx = mouseX - this.x;
      const dy = mouseY - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const attractRange = 120;

      if (isMouseMoving && dist < attractRange) {
        this.state = ParticleState.ATTRACTED;
        const falloff = 1 - dist / attractRange;
        const targetIntensity = falloff;
        this.attractedIntensity += (targetIntensity - this.attractedIntensity) * (1 - Math.exp(-deltaTime / 0.2));
        this.lightness = 100;
        this.size = this.baseSize * (1 + this.attractedIntensity * 0.6);

        const force = this.attractedIntensity * 3;
        const angle = Math.atan2(dy, dx);
        this.vx += Math.cos(angle) * force * deltaTime * 60;
        this.vy += Math.sin(angle) * force * deltaTime * 60;
      } else {
        this.attractedIntensity += (0 - this.attractedIntensity) * (1 - Math.exp(-deltaTime / 0.2));
        if (this.attractedIntensity < 0.01) {
          this.state = ParticleState.IDLE;
        }
      }

      this.vx += (this.baseX - this.x) * this.baseReturnForce;
      this.vy += (this.baseY - this.y) * this.baseReturnForce;
      this.vx *= 0.92;
      this.vy *= 0.92;
      this.x += this.vx * deltaTime * 60;
      this.y += this.vy * deltaTime * 60;

      if (Math.abs(this.vx) > 0.1 || Math.abs(this.vy) > 0.1 || this.state === ParticleState.ATTRACTED) {
        this.addTrailPoint();
      }
    }

    if (this.state === ParticleState.CAPTURED) {
      this.capturedProgress += deltaTime / this.captureDuration;
      const t = this.easeInOutCubic(Math.min(this.capturedProgress, 1));
      const easeT = this.easeInBack(t);
      
      const startX = this.baseX;
      const startY = this.baseY;
      this.x = startX + (containerX - startX) * easeT;
      this.y = startY + (containerY - startY) * easeT;

      const shrink = 1 - t * 0.5;
      this.size = this.baseSize * shrink;
      this.lightness = 100;

      this.addTrailPoint();

      if (this.capturedProgress >= 1) {
        this.explode();
      }
    }

    if (this.state === ParticleState.EXPLODED) {
      for (const p of this.explosionParticles) {
        p.life -= deltaTime;
        p.alpha = Math.max(0, p.life / p.maxLife);
        p.x += p.vx * deltaTime * 60;
        p.y += p.vy * deltaTime * 60;
        p.vx *= 0.96;
        p.vy *= 0.96;
      }
      this.explosionParticles = this.explosionParticles.filter(p => p.life > 0);
    }

    this.updateTrail(deltaTime);
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  private easeInBack(t: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return t < 0.8 ? this.easeInOutCubic(t) : 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  private addTrailPoint(): void {
    this.trail.push({
      x: this.x,
      y: this.y,
      alpha: 1,
      life: this.trailDuration
    });
    if (this.trail.length > this.maxTrailLength) {
      this.trail.shift();
    }
  }

  private updateTrail(deltaTime: number): void {
    for (let i = this.trail.length - 1; i >= 0; i--) {
      const point = this.trail[i];
      point.life -= deltaTime;
      point.alpha = Math.max(0, point.life / this.trailDuration);
      if (point.life <= 0) {
        this.trail.splice(i, 1);
      }
    }
  }

  capture(): void {
    if (this.state === ParticleState.IDLE || this.state === ParticleState.ATTRACTED) {
      this.state = ParticleState.CAPTURED;
      this.capturedProgress = 0;
      this.baseX = this.x;
      this.baseY = this.y;
    }
  }

  private explode(): void {
    this.state = ParticleState.EXPLODED;
    this.explosionParticles = [];
    for (let i = 0; i < this.explosionCount; i++) {
      const angle = (i / this.explosionCount) * Math.PI * 2 + Math.random() * 0.5;
      const speed = 2 + Math.random() * 3;
      this.explosionParticles.push({
        x: this.x,
        y: this.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1,
        size: 1 + Math.random() * 2,
        life: 0.4 + Math.random() * 0.3,
        maxLife: 0.7
      });
    }
  }

  isFullyExploded(): boolean {
    return this.state === ParticleState.EXPLODED && this.explosionParticles.length === 0;
  }

  getColor(lightnessOffset: number = 0): string {
    const l = Math.min(100, this.lightness + lightnessOffset);
    return `hsl(${this.hue}, ${this.saturation}%, ${l}%)`;
  }

  distanceTo(x: number, y: number): number {
    const dx = x - this.x;
    const dy = y - this.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  render(ctx: CanvasRenderingContext2D): void {
    this.renderTrail(ctx);
    this.renderExplosion(ctx);

    if (this.state === ParticleState.EXPLODED) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    const glowSize = this.size * 3;
    ctx.shadowColor = this.getColor(0);
    ctx.shadowBlur = glowSize;

    ctx.fillStyle = this.getColor(0);
    ctx.strokeStyle = this.getColor(10);
    ctx.lineWidth = 1;

    this.drawShape(ctx);

    ctx.restore();
  }

  private renderTrail(ctx: CanvasRenderingContext2D): void {
    if (this.trail.length < 2) return;

    for (let i = 1; i < this.trail.length; i++) {
      const prev = this.trail[i - 1];
      const curr = this.trail[i];
      const alpha = curr.alpha * 0.4;

      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(curr.x, curr.y);
      ctx.strokeStyle = `hsla(${this.hue}, ${this.saturation}%, 80%, ${alpha})`;
      ctx.lineWidth = this.size * curr.alpha * 0.8;
      ctx.lineCap = 'round';
      ctx.shadowColor = this.getColor(0);
      ctx.shadowBlur = 8 * curr.alpha;
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
  }

  private renderExplosion(ctx: CanvasRenderingContext2D): void {
    for (const p of this.explosionParticles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${this.hue}, ${this.saturation}%, 85%, ${p.alpha})`;
      ctx.shadowColor = this.getColor(0);
      ctx.shadowBlur = 10 * p.alpha;
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  private drawShape(ctx: CanvasRenderingContext2D): void {
    const s = this.size;
    ctx.beginPath();

    switch (this.shape) {
      case 'triangle':
        ctx.moveTo(0, -s);
        ctx.lineTo(s * 0.866, s * 0.5);
        ctx.lineTo(-s * 0.866, s * 0.5);
        ctx.closePath();
        break;
      case 'circle':
        ctx.arc(0, 0, s * 0.8, 0, Math.PI * 2);
        break;
      case 'star':
        for (let i = 0; i < 10; i++) {
          const angle = (i * Math.PI) / 5 - Math.PI / 2;
          const radius = i % 2 === 0 ? s : s * 0.45;
          const px = Math.cos(angle) * radius;
          const py = Math.sin(angle) * radius;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        break;
      case 'diamond':
        ctx.moveTo(0, -s);
        ctx.lineTo(s * 0.7, 0);
        ctx.lineTo(0, s);
        ctx.lineTo(-s * 0.7, 0);
        ctx.closePath();
        break;
      case 'hexagon':
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI) / 3;
          const px = Math.cos(angle) * s * 0.9;
          const py = Math.sin(angle) * s * 0.9;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        break;
    }

    ctx.fill();
    ctx.stroke();
  }
}
