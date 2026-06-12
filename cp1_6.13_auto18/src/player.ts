import { Maze, CELL_SIZE, COLS, ROWS } from './maze';

export interface Pulse {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  startTime: number;
  duration: number;
  opacity: number;
  bounceCount: number;
  triggeredWalls: Set<string>;
  active: boolean;
}

export interface HighlightWall {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  startTime: number;
  duration: number;
  opacity: number;
}

export interface RippleEffect {
  x: number;
  y: number;
  startTime: number;
  duration: number;
  radius: number;
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
  moveDir: { x: number; y: number };
  lastMoveTime: number;
  moveInterval: number;

  constructor() {
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
    this.moveDir = { x: 0, y: 0 };
    this.lastMoveTime = 0;
    this.moveInterval = 120;
  }

  emitPulse(): void {
    const now = performance.now();
    const pulse: Pulse = {
      x: this.x,
      y: this.y,
      radius: 0,
      maxRadius: 300,
      startTime: now,
      duration: 600,
      opacity: 1,
      bounceCount: 0,
      triggeredWalls: new Set(),
      active: true,
    };
    this.pulses.push(pulse);
    this.pulseCount++;

    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      this.particles.push({
        x: this.x,
        y: this.y,
        vx: Math.cos(angle) * 2,
        vy: Math.sin(angle) * 2,
        life: 300,
        maxLife: 300,
        size: 3,
      });
    }
  }

  update(maze: Maze, now: number, dt: number): void {
    this.updateMovement(maze, now);
    this.updatePulses(maze, now);
    this.updateParticles(dt);
    this.updateHighlights(now);
    this.updateRipples(now);
    this.updateFloatingTexts(now);

    const collected = maze.collectFragment(this.x, this.y, this.radius);
    if (collected > 0) {
      this.fragmentCount += collected;
      this.rippleEffects.push({
        x: this.x,
        y: this.y,
        startTime: now,
        duration: 500,
        radius: 40,
      });
      this.floatingTexts.push({
        x: this.x,
        y: this.y - 20,
        text: `+${collected}`,
        startTime: now,
        duration: 800,
      });
    }
  }

  private updateMovement(maze: Maze, now: number): void {
    if (this.moveDir.x === 0 && this.moveDir.y === 0) return;
    if (now - this.lastMoveTime < this.moveInterval) return;

    const dx = this.moveDir.x;
    const dy = this.moveDir.y;

    if (dx !== 0) {
      this.facing = dx > 0 ? 0 : Math.PI;
    }
    if (dy !== 0) {
      this.facing = dy > 0 ? Math.PI / 2 : -Math.PI / 2;
    }

    const newX = this.x + dx * this.speed;
    const newY = this.y + dy * this.speed;

    if (maze.canMove(this.x, this.y, newX, this.y)) {
      this.x = newX;
    }
    if (maze.canMove(this.x, this.y, this.x, newY)) {
      this.y = newY;
    }

    this.stepCount++;
    this.lastMoveTime = now;
  }

  private updatePulses(maze: Maze, now: number): void {
    const wallSegments = maze.getWallSegments();

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

      if (pulse.bounceCount < 3) {
        for (let i = 0; i < wallSegments.length; i++) {
          const seg = wallSegments[i];
          const key = `${i}`;

          if (pulse.triggeredWalls.has(key)) continue;

          const dist = this.distToSegment(
            pulse.x, pulse.y,
            seg.x1, seg.y1, seg.x2, seg.y2
          );

          if (dist <= currentRadius && dist >= currentRadius - 10) {
            pulse.triggeredWalls.add(key);

            this.highlightWalls.push({
              x1: seg.x1,
              y1: seg.y1,
              x2: seg.x2,
              y2: seg.y2,
              startTime: now,
              duration: 1000,
              opacity: pulse.opacity * 0.8,
            });

            if (pulse.bounceCount < 3) {
              const closest = this.closestPointOnSegment(
                pulse.x, pulse.y,
                seg.x1, seg.y1, seg.x2, seg.y2
              );

              const reflectedPulse: Pulse = {
                x: closest.x,
                y: closest.y,
                radius: 0,
                maxRadius: 200 - pulse.bounceCount * 50,
                startTime: now,
                duration: 400,
                opacity: pulse.opacity * 0.5,
                bounceCount: pulse.bounceCount + 1,
                triggeredWalls: new Set(),
                active: true,
              };
              this.pulses.push(reflectedPulse);
              pulse.bounceCount++;
            }
          }
        }
      }
    }

    this.pulses = this.pulses.filter(p => p.active || (now - p.startTime < p.duration + 200));
    const activePulseIds = new Set(this.pulses);
    this.pulses = [...activePulseIds];
  }

  private updateParticles(dt: number): void {
    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= dt;
    }
    this.particles = this.particles.filter(p => p.life > 0);
  }

  private updateHighlights(now: number): void {
    this.highlightWalls = this.highlightWalls.filter(h => {
      const elapsed = now - h.startTime;
      return elapsed < h.duration;
    });
  }

  private updateRipples(now: number): void {
    this.rippleEffects = this.rippleEffects.filter(r => {
      const elapsed = now - r.startTime;
      return elapsed < r.duration;
    });
  }

  private updateFloatingTexts(now: number): void {
    this.floatingTexts = this.floatingTexts.filter(f => {
      const elapsed = now - f.startTime;
      return elapsed < f.duration;
    });
  }

  private distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
  }

  private closestPointOnSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): { x: number; y: number } {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return { x: x1, y: y1 };
    let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    return { x: x1 + t * dx, y: y1 + t * dy };
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
      const fadeOpacity = pulse.opacity * (1 - progress);

      if (fadeOpacity <= 0 || currentRadius <= 0) continue;

      ctx.beginPath();
      ctx.arc(pulse.x, pulse.y, currentRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 255, 255, ${fadeOpacity * 0.6})`;
      ctx.lineWidth = 2;
      ctx.stroke();

      if (currentRadius > 4) {
        ctx.beginPath();
        ctx.arc(pulse.x, pulse.y, currentRadius - 2, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 255, 255, ${fadeOpacity * 0.3})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }

  private drawHighlights(ctx: CanvasRenderingContext2D, now: number): void {
    for (const hw of this.highlightWalls) {
      const elapsed = now - hw.startTime;
      const progress = elapsed / hw.duration;
      const alpha = hw.opacity * (1 - progress);

      if (alpha <= 0) continue;

      ctx.beginPath();
      ctx.moveTo(hw.x1, hw.y1);
      ctx.lineTo(hw.x2, hw.y2);
      ctx.strokeStyle = `rgba(255, 248, 220, ${alpha})`;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }

  private drawRipples(ctx: CanvasRenderingContext2D, now: number): void {
    for (const ripple of this.rippleEffects) {
      const elapsed = now - ripple.startTime;
      const progress = elapsed / ripple.duration;
      const currentRadius = progress * ripple.radius;
      const alpha = 1 - progress;

      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, currentRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  private drawParticles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
      ctx.fill();
    }
  }

  private drawFloatingTexts(ctx: CanvasRenderingContext2D, now: number): void {
    for (const ft of this.floatingTexts) {
      const elapsed = now - ft.startTime;
      const progress = elapsed / ft.duration;
      const alpha = 1 - progress;
      const yOffset = progress * 30;

      ctx.font = 'bold 16px monospace';
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.textAlign = 'center';
      ctx.fillText(ft.text, ft.x, ft.y - yOffset);
    }
  }

  private drawPlayer(ctx: CanvasRenderingContext2D): void {
    const gradient = ctx.createRadialGradient(
      this.x, this.y, 0,
      this.x, this.y, this.radius
    );
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    const dirLen = this.radius * 0.8;
    const dirX = this.x + Math.cos(this.facing) * dirLen;
    const dirY = this.y + Math.sin(this.facing) * dirLen;
    ctx.beginPath();
    ctx.arc(dirX, dirY, 3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fill();
  }

  reset(): void {
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
    this.moveDir = { x: 0, y: 0 };
  }
}
