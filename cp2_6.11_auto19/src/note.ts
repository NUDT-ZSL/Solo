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

export interface ControlPoint {
  x: number;
  y: number;
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

  private spiralPoints: ControlPoint[] = [];
  private spiralSegments: number = 0;

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
    this.computeControlPoints(centerX, centerY, canvasW, canvasH);

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

  private computeControlPoints(cx: number, cy: number, canvasW: number, canvasH: number) {
    const dx = cx - this.startX;
    const dy = cy - this.startY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    switch (this.trajectory) {
      case 'straight': {
        const straightness = 0.95;
        this.cp1X = this.startX + dx * 0.25 * straightness + dx * 0.25 * 0.05 * (Math.random() - 0.5);
        this.cp1Y = this.startY + dy * 0.25 * straightness + dy * 0.25 * 0.05 * (Math.random() - 0.5);
        this.cp2X = this.startX + dx * 0.75 * straightness + dx * 0.25 * 0.05 * (Math.random() - 0.5);
        this.cp2Y = this.startY + dy * 0.75 * straightness + dy * 0.25 * 0.05 * (Math.random() - 0.5);
        break;
      }
      case 's_curve': {
        const angle = Math.atan2(dy, dx);
        const perpAngle = angle + Math.PI / 2;
        const sWidth = Math.min(dist * 0.4, Math.max(canvasW, canvasH) * 0.25);

        const firstSwing = Math.random() > 0.5 ? 1 : -1;
        const secondSwing = -firstSwing;

        const cp1Dist = dist * 0.35;
        const cp2Dist = dist * 0.65;

        this.cp1X = this.startX + Math.cos(angle) * cp1Dist + Math.cos(perpAngle) * sWidth * firstSwing;
        this.cp1Y = this.startY + Math.sin(angle) * cp1Dist + Math.sin(perpAngle) * sWidth * firstSwing;

        this.cp2X = this.startX + Math.cos(angle) * cp2Dist + Math.cos(perpAngle) * sWidth * secondSwing;
        this.cp2Y = this.startY + Math.sin(angle) * cp2Dist + Math.sin(perpAngle) * sWidth * secondSwing;
        break;
      }
      case 'spiral': {
        this.spiralPoints = [];
        const startAngle = Math.atan2(dy, dx);
        const totalRotations = 1.5 + Math.random() * 1.5;
        const numPoints = 10;

        const clockwise = Math.random() > 0.5 ? 1 : -1;
        const maxRadius = dist * 0.6;

        this.spiralPoints.push({ x: this.startX, y: this.startY });

        for (let i = 1; i < numPoints; i++) {
          const t = i / (numPoints - 1);
          const easeT = t * t;
          const angle = startAngle + totalRotations * Math.PI * 2 * t * clockwise;
          const r = maxRadius * (1 - easeT) + 60 * easeT;

          const baseX = cx + Math.cos(angle) * r;
          const baseY = cy + Math.sin(angle) * r;

          const lineX = this.startX + dx * t;
          const lineY = this.startY + dy * t;

          const spiralBlend = 0.7;
          const px = lineX * (1 - spiralBlend) + baseX * spiralBlend;
          const py = lineY * (1 - spiralBlend) + baseY * spiralBlend;

          this.spiralPoints.push({ x: px, y: py });
        }

        this.spiralPoints.push({ x: cx, y: cy });
        this.spiralSegments = this.spiralPoints.length - 1;

        this.cp1X = this.spiralPoints[1]?.x ?? this.startX + dx * 0.3;
        this.cp1Y = this.spiralPoints[1]?.y ?? this.startY + dy * 0.3;
        this.cp2X = this.spiralPoints[2]?.x ?? this.startX + dx * 0.6;
        this.cp2Y = this.spiralPoints[2]?.y ?? this.startY + dy * 0.6;
        break;
      }
    }
  }

  private easeProgress(t: number): number {
    switch (this.trajectory) {
      case 'straight':
        return t * t;
      case 's_curve':
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      case 'spiral':
        return t;
      default:
        return t;
    }
  }

  private getSpiralPosition(t: number): { x: number; y: number } {
    if (this.spiralPoints.length < 2) {
      return { x: this.startX, y: this.startY };
    }

    const segT = t * this.spiralSegments;
    const segIndex = Math.min(Math.floor(segT), this.spiralSegments - 1);
    const localT = segT - segIndex;

    const p0 = this.spiralPoints[segIndex];
    const p1 = this.spiralPoints[segIndex + 1];

    const nextP1 = this.spiralPoints[Math.min(segIndex + 2, this.spiralPoints.length - 1)];
    const prevP0 = this.spiralPoints[Math.max(segIndex - 1, 0)];

    const cp1x = p0.x + (p1.x - prevP0.x) * 0.3;
    const cp1y = p0.y + (p1.y - prevP0.y) * 0.3;
    const cp2x = p1.x - (nextP1.x - p0.x) * 0.3;
    const cp2y = p1.y - (nextP1.y - p0.y) * 0.3;

    const lt = localT;
    const lt2 = lt * lt;
    const lt3 = lt2 * lt;
    const mlt = 1 - lt;
    const mlt2 = mlt * mlt;
    const mlt3 = mlt2 * mlt;

    return {
      x: mlt3 * p0.x + 3 * mlt2 * lt * cp1x + 3 * mlt * lt2 * cp2x + lt3 * p1.x,
      y: mlt3 * p0.y + 3 * mlt2 * lt * cp1y + 3 * mlt * lt2 * cp2y + lt3 * p1.y
    };
  }

  update(elapsed: number, speedMultiplier: number): boolean {
    const adjustedDuration = this.duration / speedMultiplier;
    const linearProgress = Math.min(1, (elapsed - this.spawnTime) / adjustedDuration);
    this.progress = linearProgress;

    const t = this.easeProgress(linearProgress);

    if (this.trajectory === 'spiral' && this.spiralPoints.length > 0) {
      const pos = this.getSpiralPosition(t);
      this.x = pos.x;
      this.y = pos.y;
    } else {
      const t3 = t * t * t;
      const mt = 1 - t;
      const mt2 = mt * mt;
      const mt3 = mt2 * mt;

      this.x = mt3 * this.startX + 3 * mt2 * t * this.cp1X + 3 * mt * t * t * this.cp2X + t3 * this.endX;
      this.y = mt3 * this.startY + 3 * mt2 * t * this.cp1Y + 3 * mt * t * t * this.cp2Y + t3 * this.endY;
    }

    if (linearProgress >= 1) {
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

    if (this.trajectory === 'spiral' && this.spiralPoints.length > 1) {
      ctx.beginPath();
      ctx.moveTo(this.spiralPoints[0].x, this.spiralPoints[0].y);

      for (let i = 1; i < this.spiralPoints.length - 1; i++) {
        const p0 = this.spiralPoints[i - 1];
        const p1 = this.spiralPoints[i];
        const p2 = this.spiralPoints[i + 1];

        const cp1x = p1.x - (p2.x - p0.x) * 0.3;
        const cp1y = p1.y - (p2.y - p0.y) * 0.3;
        const cp2x = p1.x + (p2.x - p0.x) * 0.3;
        const cp2y = p1.y + (p2.y - p0.y) * 0.3;

        void cp2x;
        void cp2y;

        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;

        ctx.quadraticCurveTo(cp1x, cp1y, midX, midY);
        ctx.quadraticCurveTo(cp2x, cp2y, p2.x, p2.y);
      }
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(this.startX, this.startY);
      ctx.bezierCurveTo(this.cp1X, this.cp1Y, this.cp2X, this.cp2Y, this.endX, this.endY);
      ctx.stroke();
    }
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
