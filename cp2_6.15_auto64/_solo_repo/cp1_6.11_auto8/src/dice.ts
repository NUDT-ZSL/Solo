export interface DiceOptions {
  x: number;
  y: number;
  size: number;
  color: string;
  glowColor: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
  targetX: number;
  targetY: number;
  trail: { x: number; y: number; alpha: number }[];
  trailMaxLength: number;
  active: boolean;
}

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

type DiceState = 'idle' | 'rolling' | 'exploding' | 'reforming' | 'settled';

class ParticlePool {
  private pool: Particle[] = [];
  private maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
    for (let i = 0; i < maxSize; i++) {
      this.pool.push(this.createEmptyParticle());
    }
  }

  private createEmptyParticle(): Particle {
    return {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      size: 0,
      alpha: 0,
      color: '#FFFFFF',
      targetX: 0,
      targetY: 0,
      trail: [],
      trailMaxLength: 18,
      active: false,
    };
  }

  acquire(): Particle | null {
    for (const p of this.pool) {
      if (!p.active) {
        p.active = true;
        p.trail = [];
        return p;
      }
    }
    if (this.pool.length < this.maxSize * 2) {
      const p = this.createEmptyParticle();
      p.active = true;
      this.pool.push(p);
      return p;
    }
    return null;
  }

  release(p: Particle): void {
    p.active = false;
  }

  getActive(): Particle[] {
    return this.pool.filter((p) => p.active);
  }

  getAll(): Particle[] {
    return this.pool;
  }
}

export class Dice {
  x: number;
  y: number;
  size: number;
  color: string;
  glowColor: string;
  value: number = 1;
  state: DiceState = 'idle';

  private rotationX: number = 0;
  private rotationY: number = 0;
  private rotationZ: number = 0;
  private angularVelocityX: number = 0;
  private angularVelocityY: number = 0;
  private angularVelocityZ: number = 0;

  private particlePool: ParticlePool;
  private particleCount: number = 120;
  private trailDuration: number = 0.3;
  private targetFps: number = 60;

  private animTime: number = 0;
  private rollDuration: number = 1.8;
  private explodeDuration: number = 0.7;
  private reformDuration: number = 0.6;
  private settleDuration: number = 0.4;

  private shockwaveRadius: number = 0;
  private shockwaveAlpha: number = 0;
  private shockwaveCount: number = 3;

  private finalValue: number = 1;
  private scale: number = 1;

  private faceCache: Map<number, { x: number; y: number }[]> = new Map();

  constructor(options: DiceOptions) {
    this.x = options.x;
    this.y = options.y;
    this.size = options.size;
    this.color = options.color;
    this.glowColor = options.glowColor;
    this.particlePool = new ParticlePool(this.particleCount * 2);
  }

  roll(targetValue: number): void {
    this.finalValue = targetValue;
    this.state = 'rolling';
    this.animTime = 0;
    this.angularVelocityX = (Math.random() - 0.5) * 18 + 12;
    this.angularVelocityY = (Math.random() - 0.5) * 20 + 14;
    this.angularVelocityZ = (Math.random() - 0.5) * 10;
    this.scale = 1;
    this.shockwaveRadius = 0;
    this.shockwaveAlpha = 0;
    this.faceCache.clear();
  }

  setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  setSize(size: number): void {
    this.size = size;
    this.faceCache.clear();
  }

  setColor(color: string, glowColor: string): void {
    this.color = color;
    this.glowColor = glowColor;
  }

  update(dt: number): void {
    switch (this.state) {
      case 'rolling':
        this.updateRolling(dt);
        break;
      case 'exploding':
        this.updateExploding(dt);
        break;
      case 'reforming':
        this.updateReforming(dt);
        break;
      case 'settled':
        this.updateSettled(dt);
        break;
      case 'idle':
      default:
        this.updateIdle(dt);
        break;
    }
  }

  private updateIdle(dt: number): void {
    this.rotationY += dt * 0.4;
    this.rotationX = Math.sin(Date.now() * 0.0015) * 0.12;
  }

  private updateRolling(dt: number): void {
    this.animTime += dt;

    this.rotationX += this.angularVelocityX * dt;
    this.rotationY += this.angularVelocityY * dt;
    this.rotationZ += this.angularVelocityZ * dt;

    this.angularVelocityX *= 0.985;
    this.angularVelocityY *= 0.982;
    this.angularVelocityZ *= 0.97;

    const progress = this.animTime / this.rollDuration;
    this.scale = 1 + Math.sin(progress * Math.PI) * 0.18;

    const fakeValue = Math.floor(Math.random() * 6) + 1;
    this.value = fakeValue;

    if (this.animTime >= this.rollDuration) {
      this.startExplosion();
    }
  }

  private startExplosion(): void {
    this.state = 'exploding';
    this.animTime = 0;
    this.generateParticles();
  }

  private generateParticles(): void {
    const activeParticles = this.particlePool.getActive();
    for (const p of activeParticles) {
      this.particlePool.release(p);
    }

    const colors = [this.color, this.glowColor, '#FFFFFF', '#FFD700', '#FFA500'];
    const facePoints = this.getFacePoints(this.finalValue);

    for (let i = 0; i < this.particleCount; i++) {
      const p = this.particlePool.acquire();
      if (!p) break;

      const angle = (Math.PI * 2 * i) / this.particleCount + Math.random() * 0.6;
      const speed = 120 + Math.random() * 250;
      const offsetRadius = Math.random() * this.size * 0.6;

      p.x = this.x + Math.cos(angle) * offsetRadius;
      p.y = this.y + Math.sin(angle) * offsetRadius;
      p.vx = Math.cos(angle) * speed + (Math.random() - 0.5) * 60;
      p.vy = Math.sin(angle) * speed + (Math.random() - 0.5) * 60 - 100;
      p.size = 2 + Math.random() * 5;
      p.alpha = 1;
      p.color = colors[Math.floor(Math.random() * colors.length)];

      const targetPoint = facePoints[i % facePoints.length];
      p.targetX = targetPoint.x;
      p.targetY = targetPoint.y;
      p.trailMaxLength = Math.floor(this.trailDuration * this.targetFps);
      p.trail = [];
      p.active = true;
    }
  }

  private getFacePoints(value: number): { x: number; y: number }[] {
    const cacheKey = value;
    if (this.faceCache.has(cacheKey)) {
      return this.faceCache.get(cacheKey)!;
    }

    const points: { x: number; y: number }[] = [];
    const s = this.size * 0.72;
    const cx = this.x;
    const cy = this.y;

    const dotPositions: { x: number; y: number }[] = [];

    switch (value) {
      case 1:
        dotPositions.push({ x: 0, y: 0 });
        break;
      case 2:
        dotPositions.push({ x: -s * 0.42, y: -s * 0.42 });
        dotPositions.push({ x: s * 0.42, y: s * 0.42 });
        break;
      case 3:
        dotPositions.push({ x: -s * 0.42, y: -s * 0.42 });
        dotPositions.push({ x: 0, y: 0 });
        dotPositions.push({ x: s * 0.42, y: s * 0.42 });
        break;
      case 4:
        dotPositions.push({ x: -s * 0.42, y: -s * 0.42 });
        dotPositions.push({ x: s * 0.42, y: -s * 0.42 });
        dotPositions.push({ x: -s * 0.42, y: s * 0.42 });
        dotPositions.push({ x: s * 0.42, y: s * 0.42 });
        break;
      case 5:
        dotPositions.push({ x: -s * 0.42, y: -s * 0.42 });
        dotPositions.push({ x: s * 0.42, y: -s * 0.42 });
        dotPositions.push({ x: 0, y: 0 });
        dotPositions.push({ x: -s * 0.42, y: s * 0.42 });
        dotPositions.push({ x: s * 0.42, y: s * 0.42 });
        break;
      case 6:
        dotPositions.push({ x: -s * 0.42, y: -s * 0.42 });
        dotPositions.push({ x: s * 0.42, y: -s * 0.42 });
        dotPositions.push({ x: -s * 0.42, y: 0 });
        dotPositions.push({ x: s * 0.42, y: 0 });
        dotPositions.push({ x: -s * 0.42, y: s * 0.42 });
        dotPositions.push({ x: s * 0.42, y: s * 0.42 });
        break;
    }

    const particlesPerDot = Math.ceil(this.particleCount * 0.55 / dotPositions.length);
    for (const dot of dotPositions) {
      for (let i = 0; i < particlesPerDot; i++) {
        const angle = (Math.PI * 2 * i) / particlesPerDot + Math.random() * 0.3;
        const r = (this.size * 0.1) * Math.sqrt(Math.random());
        points.push({
          x: cx + dot.x + Math.cos(angle) * r,
          y: cy + dot.y + Math.sin(angle) * r,
        });
      }
    }

    const perimeterCount = this.particleCount - points.length;
    for (let i = 0; i < perimeterCount; i++) {
      const angle = (Math.PI * 2 * i) / perimeterCount;
      const wobble = (Math.random() - 0.5) * 8;
      points.push({
        x: cx + Math.cos(angle) * (s * 0.92 + wobble),
        y: cy + Math.sin(angle) * (s * 0.92 + wobble),
      });
    }

    this.faceCache.set(cacheKey, points);
    return points;
  }

  private updateExploding(dt: number): void {
    this.animTime += dt;
    const progress = this.animTime / this.explodeDuration;

    const particles = this.particlePool.getActive();
    for (const p of particles) {
      if (!p.active) continue;

      p.trail.unshift({ x: p.x, y: p.y, alpha: p.alpha });
      if (p.trail.length > p.trailMaxLength) {
        p.trail.pop();
      }

      p.vy += 250 * dt;
      p.vx *= 0.995;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha = Math.max(0, 1 - progress * 0.6);
    }

    if (this.animTime >= this.explodeDuration) {
      this.state = 'reforming';
      this.animTime = 0;
      for (const p of particles) {
        p.vx = 0;
        p.vy = 0;
      }
    }
  }

  private updateReforming(dt: number): void {
    this.animTime += dt;
    const progress = Math.min(1, this.animTime / this.reformDuration);
    const ease = this.easeOutCubic(progress);

    const particles = this.particlePool.getActive();
    for (const p of particles) {
      if (!p.active) continue;

      p.trail.unshift({ x: p.x, y: p.y, alpha: p.alpha });
      if (p.trail.length > p.trailMaxLength) {
        p.trail.pop();
      }

      const dx = p.targetX - p.x;
      const dy = p.targetY - p.y;
      p.x += dx * ease * 0.25;
      p.y += dy * ease * 0.25;
      p.alpha = 0.4 + ease * 0.6;
    }

    if (this.animTime >= this.reformDuration) {
      this.state = 'settled';
      this.animTime = 0;
      this.value = this.finalValue;
      this.shockwaveRadius = 0;
      this.shockwaveAlpha = 1;
      this.scale = 0.9;
    }
  }

  private updateSettled(dt: number): void {
    this.animTime += dt;
    const progress = Math.min(1, this.animTime / this.settleDuration);

    this.shockwaveRadius = this.size * 0.5 + progress * this.size * 2;
    this.shockwaveAlpha = 1 - progress;

    const bounceProgress = progress;
    const bounce = this.elasticOut(bounceProgress);
    this.scale = 0.9 + 0.2 * bounce;

    const particles = this.particlePool.getActive();
    for (const p of particles) {
      if (!p.active) continue;

      p.trail.unshift({ x: p.x, y: p.y, alpha: p.alpha });
      if (p.trail.length > p.trailMaxLength) {
        p.trail.pop();
      }

      p.alpha = Math.max(0, p.alpha - dt * 0.3);
    }

    if (this.animTime >= this.settleDuration) {
      this.state = 'idle';
      this.scale = 1;
      const activeParticles = this.particlePool.getActive();
      for (const p of activeParticles) {
        this.particlePool.release(p);
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (this.state === 'exploding' || this.state === 'reforming') {
      this.drawParticles(ctx);
    } else if (this.state === 'settled') {
      this.drawShockwave(ctx);
      this.drawParticles(ctx);
      this.drawDiceFace(ctx);
    } else {
      this.drawDiceFace(ctx);
    }
  }

  private drawDiceFace(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(this.scale, this.scale);

    const s = this.size;
    const r = s * 0.16;

    const glowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 1.4);
    glowGradient.addColorStop(0, this.hexToRgba(this.glowColor, 0.35));
    glowGradient.addColorStop(0.4, this.hexToRgba(this.glowColor, 0.12));
    glowGradient.addColorStop(1, 'transparent');
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(0, 0, s * 1.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowColor = this.glowColor;
    ctx.shadowBlur = 30;

    const bodyGradient = ctx.createLinearGradient(-s * 0.8, -s * 0.8, s * 0.8, s * 0.8);
    bodyGradient.addColorStop(0, this.lightenColor(this.color, 20));
    bodyGradient.addColorStop(0.3, this.color);
    bodyGradient.addColorStop(0.7, this.darkenColor(this.color, 10));
    bodyGradient.addColorStop(1, this.darkenColor(this.color, 25));

    ctx.fillStyle = bodyGradient;
    ctx.strokeStyle = this.glowColor;
    ctx.lineWidth = 2.5;

    this.roundRect(ctx, -s * 0.72, -s * 0.72, s * 1.44, s * 1.44, r);
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;

    const highlightGradient = ctx.createLinearGradient(-s * 0.6, -s * 0.6, s * 0.3, s * 0.3);
    highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
    highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = highlightGradient;
    this.roundRect(ctx, -s * 0.65, -s * 0.65, s * 1.3, s * 1.3, r * 0.8);
    ctx.fill();

    this.drawDots(ctx, this.value, s * 0.72);

    ctx.restore();
  }

  private drawDots(ctx: CanvasRenderingContext2D, value: number, s: number): void {
    const dotSize = s * 0.13;
    const dotColor = '#FFFFFF';

    ctx.fillStyle = dotColor;
    ctx.shadowColor = this.glowColor;
    ctx.shadowBlur = 12;

    const positions = this.getDotPositions(value, s);
    for (const pos of positions) {
      this.drawDot(ctx, pos.x, pos.y, dotSize);
    }

    ctx.shadowBlur = 0;
  }

  private getDotPositions(value: number, s: number): { x: number; y: number }[] {
    const offset = s * 0.42;
    switch (value) {
      case 1:
        return [{ x: 0, y: 0 }];
      case 2:
        return [
          { x: -offset, y: -offset },
          { x: offset, y: offset },
        ];
      case 3:
        return [
          { x: -offset, y: -offset },
          { x: 0, y: 0 },
          { x: offset, y: offset },
        ];
      case 4:
        return [
          { x: -offset, y: -offset },
          { x: offset, y: -offset },
          { x: -offset, y: offset },
          { x: offset, y: offset },
        ];
      case 5:
        return [
          { x: -offset, y: -offset },
          { x: offset, y: -offset },
          { x: 0, y: 0 },
          { x: -offset, y: offset },
          { x: offset, y: offset },
        ];
      case 6:
        return [
          { x: -offset, y: -offset },
          { x: offset, y: -offset },
          { x: -offset, y: 0 },
          { x: offset, y: 0 },
          { x: -offset, y: offset },
          { x: offset, y: offset },
        ];
      default:
        return [];
    }
  }

  private drawDot(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    const gradient = ctx.createRadialGradient(x - size * 0.3, y - size * 0.3, 0, x, y, size);
    gradient.addColorStop(0, '#FFFFFF');
    gradient.addColorStop(0.6, '#F0F0F0');
    gradient.addColorStop(1, '#D0D0D0');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawParticles(ctx: CanvasRenderingContext2D): void {
    const particles = this.particlePool.getActive();

    for (const p of particles) {
      if (!p.active || p.alpha <= 0.01) continue;

      for (let i = p.trail.length - 1; i >= 0; i--) {
        const t = p.trail[i];
        const trailRatio = 1 - i / p.trail.length;
        const trailAlpha = t.alpha * trailRatio * 0.5;
        const trailSize = p.size * (0.3 + trailRatio * 0.5);

        ctx.fillStyle = this.hexToRgba(p.color, trailAlpha);
        ctx.beginPath();
        ctx.arc(t.x, t.y, trailSize, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.save();
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 18;
      ctx.fillStyle = this.hexToRgba(p.color, p.alpha);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawShockwave(ctx: CanvasRenderingContext2D): void {
    if (this.shockwaveAlpha <= 0) return;

    ctx.save();
    for (let i = 0; i < this.shockwaveCount; i++) {
      const offset = i * 0.15;
      const alpha = Math.max(0, this.shockwaveAlpha - offset);
      const radius = this.shockwaveRadius * (1 + i * 0.2);

      if (alpha <= 0) continue;

      ctx.strokeStyle = this.hexToRgba(this.glowColor, alpha * 0.8);
      ctx.lineWidth = 3 - i;
      ctx.shadowColor = this.glowColor;
      ctx.shadowBlur = 25;
      ctx.beginPath();
      ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  private rotatePoint(point: Vec3, rx: number, ry: number, rz: number): Vec3 {
    let { x, y, z } = point;

    let cosY = Math.cos(ry);
    let sinY = Math.sin(ry);
    let x1 = x * cosY - z * sinY;
    let z1 = x * sinY + z * cosY;

    let cosX = Math.cos(rx);
    let sinX = Math.sin(rx);
    let y1 = y * cosX - z1 * sinX;
    let z2 = y * sinX + z1 * cosX;

    let cosZ = Math.cos(rz);
    let sinZ = Math.sin(rz);
    let x2 = x1 * cosZ - y1 * sinZ;
    let y2 = x1 * sinZ + y1 * cosZ;

    return { x: x2, y: y2, z: z2 };
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  private lightenColor(hex: string, percent: number): string {
    const num = parseInt(hex.slice(1), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, ((num >> 8) & 0x00ff) + amt);
    const B = Math.min(255, (num & 0x0000ff) + amt);
    return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
  }

  private darkenColor(hex: string, percent: number): string {
    const num = parseInt(hex.slice(1), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, (num >> 16) - amt);
    const G = Math.max(0, ((num >> 8) & 0x00ff) - amt);
    const B = Math.max(0, (num & 0x0000ff) - amt);
    return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private elasticOut(t: number): number {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  }

  isFinished(): boolean {
    return this.state === 'idle';
  }

  getTotalDuration(): number {
    return this.rollDuration + this.explodeDuration + this.reformDuration + this.settleDuration;
  }

  getParticleCount(): number {
    return this.particleCount;
  }

  getTrailDuration(): number {
    return this.trailDuration;
  }
}
