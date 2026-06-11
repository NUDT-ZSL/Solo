export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  maxLife: number;
  active: boolean;
  size: number;
}

export type TrajectoryType = 'straight' | 's_curve' | 'spiral';
export type SpeedTier = 0 | 1 | 2;

const COLORS = ['#FF6EC7', '#00E5FF', '#FFD700', '#7CFC00', '#FF4444', '#9D4EDD'];

export class Note {
  x: number = 0;
  y: number = 0;
  startX: number = 0;
  startY: number = 0;
  cp1X: number = 0;
  cp1Y: number = 0;
  cp2X: number = 0;
  cp2Y: number = 0;
  endX: number = 0;
  endY: number = 0;
  progress: number = 0;
  duration: number = 0;
  color: string;
  trajectory: TrajectoryType;
  speedTier: SpeedTier;
  active: boolean = true;
  radius: number = 18;
  spawnTime: number = 0;
  scale: number = 1;

  constructor(
    canvasW: number,
    canvasH: number,
    trajectory: TrajectoryType,
    speedTier: SpeedTier,
    centerX: number,
    centerY: number,
    now: number
  ) {
    this.trajectory = trajectory;
    this.speedTier = speedTier;
    this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
    this.spawnTime = now;

    const speedMap = [6000, 4000, 2000];
    this.duration = speedMap[speedTier];

    this.setStartPosition(canvasW, canvasH);
    this.endX = centerX;
    this.endY = centerY;
    this.computeControlPoints(centerX, centerY);

    this.x = this.startX;
    this.y = this.startY;
  }

  private setStartPosition(canvasW: number, canvasH: number) {
    const edge = Math.floor(Math.random() * 4);
    const margin = 40;
    switch (edge) {
      case 0:
        this.startX = Math.random() * canvasW;
        this.startY = -margin;
        break;
      case 1:
        this.startX = canvasW + margin;
        this.startY = Math.random() * canvasH;
        break;
      case 2:
        this.startX = Math.random() * canvasW;
        this.startY = canvasH + margin;
        break;
      case 3:
        this.startX = -margin;
        this.startY = Math.random() * canvasH;
        break;
    }
  }

  private computeControlPoints(cx: number, cy: number) {
    const dx = cx - this.startX;
    const dy = cy - this.startY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const nx = -dy / dist;
    const ny = dx / dist;

    switch (this.trajectory) {
      case 'straight':
        this.cp1X = this.startX + dx * 0.33;
        this.cp1Y = this.startY + dy * 0.33;
        this.cp2X = this.startX + dx * 0.66;
        this.cp2Y = this.startY + dy * 0.66;
        break;
      case 's_curve': {
        const offset = dist * 0.3;
        this.cp1X = this.startX + dx * 0.33 + nx * offset;
        this.cp1Y = this.startY + dy * 0.33 + ny * offset;
        this.cp2X = this.startX + dx * 0.66 - nx * offset;
        this.cp2Y = this.startY + dy * 0.66 - ny * offset;
        break;
      }
      case 'spiral': {
        const offset = dist * 0.5;
        const midX = this.startX + dx * 0.5;
        const midY = this.startY + dy * 0.5;
        this.cp1X = midX + nx * offset;
        this.cp1Y = midY + ny * offset;
        this.cp2X = midX - nx * offset;
        this.cp2Y = midY - ny * offset;
        break;
      }
    }
  }

  update(elapsed: number, speedMultiplier: number): boolean {
    const adjustedDuration = this.duration / speedMultiplier;
    this.progress = Math.min(1, (elapsed - this.spawnTime) / adjustedDuration);

    const t = this.progress;
    const t2 = t * t;
    const t3 = t2 * t;
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;

    this.x = mt3 * this.startX + 3 * mt2 * t * this.cp1X + 3 * mt * t2 * this.cp2X + t3 * this.endX;
    this.y = mt3 * this.startY + 3 * mt2 * t * this.cp1Y + 3 * mt * t2 * this.cp2Y + t3 * this.endY;

    if (t >= 1) {
      this.active = false;
      return false;
    }
    return true;
  }

  isInHitWindow(_centerX: number, _centerY: number, hitWindowMs: number, now: number, speedMultiplier: number): boolean {
    if (!this.active) return false;
    const adjustedDuration = this.duration / speedMultiplier;
    const hitTime = this.spawnTime + adjustedDuration;
    return Math.abs(now - hitTime) <= hitWindowMs;
  }

  distanceToCenter(centerX: number, centerY: number): number {
    const dx = this.x - centerX;
    const dy = this.y - centerY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  drawTrajectory(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(this.startX, this.startY);
    ctx.bezierCurveTo(this.cp1X, this.cp1Y, this.cp2X, this.cp2Y, this.endX, this.endY);
    ctx.stroke();
    ctx.restore();
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    const pulse = 1 + Math.sin(Date.now() * 0.008) * 0.15;
    const r = this.radius * this.scale * pulse;

    const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, r * 2);
    gradient.addColorStop(0, this.color);
    gradient.addColorStop(0.5, this.color + '80');
    gradient.addColorStop(1, this.color + '00');

    ctx.shadowColor = this.color;
    ctx.shadowBlur = 16;
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.x, this.y, r * 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, r * 0.7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(this.x, this.y, r * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export class ParticlePool {
  private pool: Particle[] = [];

  constructor(max: number = 200) {
    for (let i = 0; i < max; i++) {
      this.pool.push({
        x: 0, y: 0, vx: 0, vy: 0, color: '', life: 0, maxLife: 0, active: false, size: 0
      });
    }
  }

  emit(x: number, y: number, color: string, count: number = 30, isGold: boolean = false) {
    let emitted = 0;
    for (const p of this.pool) {
      if (p.active) continue;
      if (emitted >= count) break;

      const angle = (Math.PI * 2 * emitted) / count + Math.random() * 0.2;
      const speed = 2 + Math.random() * 6;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.color = color;
      p.life = 500;
      p.maxLife = 500;
      p.active = true;
      p.size = isGold ? 4 + Math.random() * 4 : 2 + Math.random() * 3;
      emitted++;
    }
  }

  update(dt: number) {
    for (const p of this.pool) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.96;
      p.vy *= 0.96;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    for (const p of this.pool) {
      if (!p.active) continue;
      const alpha = easeOutQuad(p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  getActiveCount(): number {
    return this.pool.filter(p => p.active).length;
  }
}

function easeOutQuad(t: number): number {
  return t * (2 - t);
}
