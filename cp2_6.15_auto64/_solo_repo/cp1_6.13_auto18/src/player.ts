import { IMaze, WallSegment, CELL_SIZE } from './maze';

export interface Pulse {
  x: number;
  y: number;
  dirX: number;
  dirY: number;
  radius: number;
  maxRadius: number;
  startTime: number;
  duration: number;
  baseOpacity: number;
  bounceCount: number;
  triggeredWalls: Set<number>;
  active: boolean;
}

export interface HighlightWall {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  startTime: number;
  duration: number;
  baseOpacity: number;
}

export interface RippleEffect {
  x: number;
  y: number;
  startTime: number;
  duration: number;
  maxRadius: number;
}

export interface FloatingText {
  x: number;
  y: number;
  text: string;
  startTime: number;
  duration: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

export interface PlayerStatusData {
  pulseCount: number;
  stepCount: number;
  fragmentCount: number;
}

export type FragmentCollectedCallback = (count: number, total: number) => void;

export function reflectVector(dx: number, dy: number, nx: number, ny: number): { rx: number; ry: number } {
  const dot = dx * nx + dy * ny;
  const rx = dx - 2 * dot * nx;
  const ry = dy - 2 * dot * ny;
  return { rx, ry };
}

export function closestPointOnSegment(px: number, py: number, seg: WallSegment): { x: number; y: number } {
  const dx = seg.x2 - seg.x1;
  const dy = seg.y2 - seg.y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return { x: seg.x1, y: seg.y1 };
  let t = ((px - seg.x1) * dx + (py - seg.y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return { x: seg.x1 + t * dx, y: seg.y1 + t * dy };
}

export function distToSegment(px: number, py: number, seg: WallSegment): number {
  const pt = closestPointOnSegment(px, py, seg);
  return Math.hypot(px - pt.x, py - pt.y);
}

export class Player {
  x: number;
  y: number;
  radius: number;
  speed: number;
  facing: number;
  pulses: Pulse[];
  highlightWalls: HighlightWall[];
  rippleEffects: RippleEffect[];
  floatingTexts: FloatingText[];
  particles: Particle[];
  pulseCount: number;
  stepCount: number;
  fragmentCount: number;
  totalFragments: number;
  moveDir: { x: number; y: number };
  lastMoveTime: number;
  moveInterval: number;
  onFragmentCollected: FragmentCollectedCallback | null;
  readonly maxBounces: number = 3;

  constructor(totalFragments: number = 10) {
    this.x = CELL_SIZE / 2;
    this.y = CELL_SIZE / 2;
    this.radius = 12;
    this.speed = 3;
    this.facing = 0;
    this.pulses = [];
    this.highlightWalls = [];
    this.rippleEffects = [];
    this.floatingTexts = [];
    this.particles = [];
    this.pulseCount = 0;
    this.stepCount = 0;
    this.fragmentCount = 0;
    this.totalFragments = totalFragments;
    this.moveDir = { x: 0, y: 0 };
    this.lastMoveTime = 0;
    this.moveInterval = 120;
    this.onFragmentCollected = null;
  }

  emitPulse(): void {
    const now = performance.now();
    const dirLen = Math.hypot(Math.cos(this.facing), Math.sin(this.facing)) || 1;
    const pulse: Pulse = {
      x: this.x,
      y: this.y,
      dirX: Math.cos(this.facing) / dirLen,
      dirY: Math.sin(this.facing) / dirLen,
      radius: 0,
      maxRadius: 300,
      startTime: now,
      duration: 600,
      baseOpacity: 1,
      bounceCount: 0,
      triggeredWalls: new Set(),
      active: true,
    };
    this.pulses.push(pulse);
    this.pulseCount++;

    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12;
      this.particles.push({
        x: this.x,
        y: this.y,
        vx: Math.cos(angle) * 2.5,
        vy: Math.sin(angle) * 2.5,
        life: 400,
        maxLife: 400,
        size: 3,
      });
    }
  }

  getStatus(): PlayerStatusData {
    return {
      pulseCount: this.pulseCount,
      stepCount: this.stepCount,
      fragmentCount: this.fragmentCount,
    };
  }

  update(maze: IMaze, now: number, dt: number): void {
    this.updateMovement(maze, now);
    this.updatePulses(maze, now);
    this.updateParticles(dt);
    this.cleanupExpired(now);

    const collected = maze.collectFragment(this.x, this.y, this.radius);
    if (collected > 0) {
      this.fragmentCount += collected;

      for (let i = 0; i < collected; i++) {
        this.rippleEffects.push({
          x: this.x,
          y: this.y,
          startTime: now + i * 80,
          duration: 500,
          maxRadius: 50,
        });
      }

      this.floatingTexts.push({
        x: this.x,
        y: this.y - 20,
        text: `+${collected}`,
        startTime: now,
        duration: 900,
      });

      if (this.onFragmentCollected) {
        this.onFragmentCollected(this.fragmentCount, this.totalFragments);
      }
    }
  }

  private updateMovement(maze: IMaze, now: number): void {
    if (this.moveDir.x === 0 && this.moveDir.y === 0) return;
    if (now - this.lastMoveTime < this.moveInterval) return;

    const dx = this.moveDir.x;
    const dy = this.moveDir.y;

    if (dx !== 0 || dy !== 0) {
      if (Math.abs(dx) >= Math.abs(dy)) {
        this.facing = dx > 0 ? 0 : Math.PI;
      } else {
        this.facing = dy > 0 ? Math.PI / 2 : -Math.PI / 2;
      }
    }

    const newX = this.x + dx * this.speed;
    const newY = this.y + dy * this.speed;

    let moved = false;
    if (maze.canMove(this.x, this.y, newX, this.y)) {
      this.x = newX;
      moved = true;
    }
    if (maze.canMove(this.x, this.y, this.x, newY)) {
      this.y = newY;
      moved = true;
    }

    if (moved) {
      this.stepCount++;
    }
    this.lastMoveTime = now;
  }

  private updatePulses(maze: IMaze, now: number): void {
    const walls = maze.getWalls();
    const newPulses: Pulse[] = [];

    for (const pulse of this.pulses) {
      if (!pulse.active) continue;

      const elapsed = now - pulse.startTime;
      const progress = Math.min(elapsed / pulse.duration, 1);
      const currentRadius = progress * pulse.maxRadius;

      if (progress >= 1) {
        pulse.active = false;
        continue;
      }

      pulse.radius = currentRadius;

      if (pulse.bounceCount < this.maxBounces) {
        for (let i = 0; i < walls.length; i++) {
          const seg = walls[i];
          if (pulse.triggeredWalls.has(i)) continue;

          const d = distToSegment(pulse.x, pulse.y, seg);

          if (d <= currentRadius && d >= Math.max(0, currentRadius - 10)) {
            pulse.triggeredWalls.add(i);

            this.highlightWalls.push({
              x1: seg.x1,
              y1: seg.y1,
              x2: seg.x2,
              y2: seg.y2,
              startTime: now,
              duration: 1000,
              baseOpacity: pulse.baseOpacity * 0.85,
            });

            if (pulse.bounceCount < this.maxBounces) {
              const hitPoint = closestPointOnSegment(pulse.x, pulse.y, seg);

              let nx = seg.normalX;
              let ny = seg.normalY;

              const toCenterX = pulse.x - hitPoint.x;
              const toCenterY = pulse.y - hitPoint.y;
              const toCenterDot = toCenterX * nx + toCenterY * ny;
              if (toCenterDot < 0) {
                nx = -nx;
                ny = -ny;
              }

              const distFromCenter = Math.hypot(toCenterX, toCenterY);
              if (distFromCenter < 0.001) continue;

              const reflectDist = distFromCenter * 2;
              const reflectX = pulse.x + nx * reflectDist;
              const reflectY = pulse.y + ny * reflectDist;

              const bounceRadius = Math.max(80, 200 - pulse.bounceCount * 50);
              const bounceOpacity = pulse.baseOpacity * 0.45;

              newPulses.push({
                x: reflectX,
                y: reflectY,
                dirX: nx,
                dirY: ny,
                radius: 0,
                maxRadius: bounceRadius,
                startTime: now,
                duration: 400,
                baseOpacity: bounceOpacity,
                bounceCount: pulse.bounceCount + 1,
                triggeredWalls: new Set([i]),
                active: true,
              });

              pulse.bounceCount++;
              if (pulse.bounceCount >= this.maxBounces) {
                break;
              }
            }
          }
        }
      }
    }

    for (const np of newPulses) {
      this.pulses.push(np);
    }
  }

  private updateParticles(dt: number): void {
    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.life -= dt;
    }
  }

  private cleanupExpired(now: number): void {
    this.pulses = this.pulses.filter(p =>
      p.active && (now - p.startTime < p.duration + 100)
    );
    this.highlightWalls = this.highlightWalls.filter(h =>
      now - h.startTime < h.duration
    );
    this.rippleEffects = this.rippleEffects.filter(r =>
      now - r.startTime < r.duration
    );
    this.floatingTexts = this.floatingTexts.filter(f =>
      now - f.startTime < f.duration
    );
    this.particles = this.particles.filter(p => p.life > 0);
  }

  draw(ctx: CanvasRenderingContext2D, now: number): void {
    this.drawPulses(ctx, now);
    this.drawHighlights(ctx, now);
    this.drawRipples(ctx, now);
    this.drawParticles(ctx);
    this.drawFloatingTexts(ctx, now);
    this.drawPlayer(ctx);
  }

  private drawPulses(ctx: CanvasRenderingContext2D, now: number): void {
    for (const pulse of this.pulses) {
      if (!pulse.active) continue;
      const elapsed = now - pulse.startTime;
      const progress = Math.min(elapsed / pulse.duration, 1);
      const currentRadius = progress * pulse.maxRadius;
      const fadeOpacity = pulse.baseOpacity * (1 - progress);

      if (fadeOpacity <= 0 || currentRadius <= 0) continue;

      ctx.beginPath();
      ctx.arc(pulse.x, pulse.y, currentRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 255, 255, ${fadeOpacity * 0.7})`;
      ctx.lineWidth = 2;
      ctx.stroke();

      if (currentRadius > 6) {
        ctx.beginPath();
        ctx.arc(pulse.x, pulse.y, currentRadius - 3, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 255, 255, ${fadeOpacity * 0.35})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      if (currentRadius > 12) {
        ctx.beginPath();
        ctx.arc(pulse.x, pulse.y, currentRadius - 8, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 255, 255, ${fadeOpacity * 0.15})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }

  private drawHighlights(ctx: CanvasRenderingContext2D, now: number): void {
    for (const hw of this.highlightWalls) {
      const elapsed = now - hw.startTime;
      const progress = elapsed / hw.duration;
      const alpha = hw.baseOpacity * (1 - progress);
      if (alpha <= 0) continue;

      ctx.beginPath();
      ctx.moveTo(hw.x1, hw.y1);
      ctx.lineTo(hw.x2, hw.y2);
      ctx.strokeStyle = `rgba(255, 248, 220, ${alpha})`;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  }

  private drawRipples(ctx: CanvasRenderingContext2D, now: number): void {
    for (const ripple of this.rippleEffects) {
      const elapsed = now - ripple.startTime;
      if (elapsed < 0) continue;
      const progress = elapsed / ripple.duration;
      const currentRadius = progress * ripple.maxRadius;
      const alpha = 1 - progress;

      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, currentRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.85})`;
      ctx.lineWidth = 2;
      ctx.stroke();

      if (currentRadius > 8) {
        ctx.beginPath();
        ctx.arc(ripple.x, ripple.y, currentRadius * 0.6, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.5})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }

  private drawParticles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.85})`;
      ctx.fill();
    }
  }

  private drawFloatingTexts(ctx: CanvasRenderingContext2D, now: number): void {
    for (const ft of this.floatingTexts) {
      const elapsed = now - ft.startTime;
      const progress = elapsed / ft.duration;
      const alpha = 1 - progress;
      const yOffset = progress * 36;

      ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.fillStyle = `rgba(0, 0, 0, ${alpha * 0.5})`;
      ctx.fillText(ft.text, ft.x + 1, ft.y - yOffset + 1);

      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.fillText(ft.text, ft.x, ft.y - yOffset);
    }
  }

  private drawPlayer(ctx: CanvasRenderingContext2D): void {
    const glowOuter = this.radius * 2.2;
    const gradient = ctx.createRadialGradient(
      this.x, this.y, 0,
      this.x, this.y, glowOuter
    );
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    gradient.addColorStop(0.35, 'rgba(255, 255, 255, 0.5)');
    gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.15)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.beginPath();
    ctx.arc(this.x, this.y, glowOuter, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    const dirLen = this.radius * 0.9;
    const dirX = this.x + Math.cos(this.facing) * dirLen;
    const dirY = this.y + Math.sin(this.facing) * dirLen;
    ctx.beginPath();
    ctx.arc(dirX, dirY, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 240, 200, 0.95)';
    ctx.fill();
  }

  reset(totalFragments: number = 10): void {
    this.x = CELL_SIZE / 2;
    this.y = CELL_SIZE / 2;
    this.facing = 0;
    this.pulses = [];
    this.highlightWalls = [];
    this.rippleEffects = [];
    this.floatingTexts = [];
    this.particles = [];
    this.pulseCount = 0;
    this.stepCount = 0;
    this.fragmentCount = 0;
    this.totalFragments = totalFragments;
    this.moveDir = { x: 0, y: 0 };
  }
}
