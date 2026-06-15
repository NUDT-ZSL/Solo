import { PatrolPoint, Wall } from './types';

export class ShadowGuard {
  x: number;
  y: number;
  radius = 18;
  speed = 75;
  chaseSpeed = 155;
  patrol: PatrolPoint[];
  patrolIdx = 0;
  state: 'patrol' | 'chase' | 'stunned' = 'patrol';
  facing = 0;
  detectionRange = 190;
  detectionHalfAngle = Math.PI / 5;
  stunTimer = 0;
  stunDuration = 2;
  blinkTimer = 0;
  starAngle = 0;
  fogParticles: { ox: number; oy: number; phase: number }[] = [];
  chaseCooldown = 0;

  constructor(x: number, y: number, patrol: PatrolPoint[]) {
    this.x = x;
    this.y = y;
    this.patrol = patrol.length > 0 ? patrol : [{ x, y }];
    for (let i = 0; i < 6; i++) {
      this.fogParticles.push({
        ox: (Math.random() - 0.5) * 28,
        oy: (Math.random() - 0.5) * 28,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  update(dt: number, px: number, py: number, walls: Wall[]): void {
    this.blinkTimer += dt;

    if (this.state === 'stunned') {
      this.stunTimer -= dt;
      this.starAngle += dt * 4;
      if (this.stunTimer <= 0) {
        this.state = 'patrol';
        this.chaseCooldown = 0.5;
      }
      return;
    }

    if (this.chaseCooldown > 0) {
      this.chaseCooldown -= dt;
    }

    const dx = px - this.x;
    const dy = py - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const angleToP = Math.atan2(dy, dx);

    if (this.chaseCooldown <= 0 && dist < this.detectionRange && this.inCone(angleToP)) {
      const rayBlocked = this.isRayBlocked(px, py, walls);
      if (!rayBlocked) {
        this.state = 'chase';
        this.facing = angleToP;
      }
    }

    if (this.state === 'chase') {
      if (dist > this.detectionRange * 2) {
        this.state = 'patrol';
      } else {
        this.facing = angleToP;
        const moveX = (dx / dist) * this.chaseSpeed * dt;
        const moveY = (dy / dist) * this.chaseSpeed * dt;
        this.x += moveX;
        this.y += moveY;
      }
    } else {
      const target = this.patrol[this.patrolIdx];
      const tdx = target.x - this.x;
      const tdy = target.y - this.y;
      const tdist = Math.sqrt(tdx * tdx + tdy * tdy);

      if (tdist < 4) {
        this.patrolIdx = (this.patrolIdx + 1) % this.patrol.length;
      } else {
        this.facing = Math.atan2(tdy, tdx);
        this.x += (tdx / tdist) * this.speed * dt;
        this.y += (tdy / tdist) * this.speed * dt;
      }
    }
  }

  stun(): void {
    this.state = 'stunned';
    this.stunTimer = this.stunDuration;
    this.starAngle = 0;
  }

  isDetectingPlayer(): boolean {
    return this.state === 'chase';
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();

    if (this.state !== 'stunned') {
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.arc(
        this.x, this.y,
        this.detectionRange,
        this.facing - this.detectionHalfAngle,
        this.facing + this.detectionHalfAngle,
      );
      ctx.closePath();
      ctx.fillStyle = this.state === 'chase'
        ? 'rgba(255,60,60,0.07)'
        : 'rgba(160,80,200,0.05)';
      ctx.fill();
    }

    const isStunned = this.state === 'stunned';
    const baseR = isStunned ? 128 : 160;
    const baseG = isStunned ? 128 : 80;
    const baseB = isStunned ? 128 : 200;

    for (const p of this.fogParticles) {
      const px = this.x + p.ox + Math.sin(this.blinkTimer * 1.5 + p.phase) * 4;
      const py = this.y + p.oy + Math.cos(this.blinkTimer * 1.2 + p.phase) * 4;
      ctx.beginPath();
      ctx.arc(px, py, this.radius * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${baseR},${baseG},${baseB},0.12)`;
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${baseR},${baseG},${baseB},0.35)`;
    ctx.shadowColor = isStunned ? 'rgba(128,128,128,0.4)' : 'rgba(160,80,200,0.5)';
    ctx.shadowBlur = 22;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 0.65, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${baseR},${baseG},${baseB},0.25)`;
    ctx.fill();

    if (isStunned) {
      for (let i = 0; i < 3; i++) {
        const sa = this.starAngle + (i * Math.PI * 2) / 3;
        const sx = this.x + Math.cos(sa) * (this.radius + 10);
        const sy = this.y + Math.sin(sa) * (this.radius + 10);
        this.drawStar(ctx, sx, sy, 5, 5);
      }
    } else {
      const blink = Math.sin(this.blinkTimer * 5) > 0.85 ? 0.3 : 1;
      const eyeDist = 7;
      for (const offset of [-0.35, 0.35]) {
        const ex = this.x + Math.cos(this.facing + offset) * eyeDist;
        const ey = this.y + Math.sin(this.facing + offset) * eyeDist;
        ctx.beginPath();
        ctx.arc(ex, ey, 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,40,40,${blink})`;
        ctx.shadowColor = 'rgba(255,40,40,0.8)';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    ctx.restore();
  }

  private drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, pts: number): void {
    ctx.beginPath();
    for (let i = 0; i < pts * 2; i++) {
      const a = (i * Math.PI) / pts - Math.PI / 2;
      const rad = i % 2 === 0 ? r : r * 0.45;
      const sx = cx + Math.cos(a) * rad;
      const sy = cy + Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,255,100,0.85)';
    ctx.fill();
  }

  private inCone(angleToTarget: number): boolean {
    let diff = angleToTarget - this.facing;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return Math.abs(diff) < this.detectionHalfAngle;
  }

  private isRayBlocked(px: number, py: number, walls: Wall[]): boolean {
    const dx = px - this.x;
    const dy = py - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.ceil(dist / 10);
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const cx = this.x + dx * t;
      const cy = this.y + dy * t;
      for (const w of walls) {
        if (cx > w.x && cx < w.x + w.w && cy > w.y && cy < w.y + w.h) {
          return true;
        }
      }
    }
    return false;
  }
}
