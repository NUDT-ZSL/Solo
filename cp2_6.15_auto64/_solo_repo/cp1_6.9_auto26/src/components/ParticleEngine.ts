export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  color: string;
  container: 'top' | 'bottom' | 'channel' | 'spilling';
  spillTimer?: number;
  settled?: boolean;
  settledY?: number;
}

export interface EngineStats {
  topCount: number;
  bottomCount: number;
  elapsedSeconds: number;
  isComplete: boolean;
}

export interface Ripple {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  startTime: number;
}

export interface Geometry {
  width: number;
  height: number;
  containerWidth: number;
  containerHeight: number;
  channelWidth: number;
  topY: number;
  topBottom: number;
  channelTop: number;
  channelBottom: number;
  bottomTop: number;
  bottomY: number;
  centerX: number;
}

const GRAVITY = 9.8;
const ELASTICITY = 0.3;
const REST_ANGLE_TAN = Math.tan((30 * Math.PI) / 180);
const MAX_STACK_HEIGHT_RATIO = 0.6;
const CHANNEL_MAX_PASS = 3;
const CHANNEL_BOOST_PASS = 6;
const RIPPLE_DURATION = 800;
const SPILL_FADE_TIME = 500;
const PARTICLE_COLORS = ['#D4A373', '#C99560', '#C28B4E', '#DBAE7C', '#CC9757'];

const SAND_COLOR_START = { r: 0xd4, g: 0xa3, b: 0x73 };
const SAND_COLOR_END = { r: 0xc2, g: 0x8b, b: 0x4e };

function lerpColor(t: number): string {
  const r = Math.round(SAND_COLOR_START.r + (SAND_COLOR_END.r - SAND_COLOR_START.r) * t);
  const g = Math.round(SAND_COLOR_START.g + (SAND_COLOR_END.g - SAND_COLOR_START.g) * t);
  const b = Math.round(SAND_COLOR_START.b + (SAND_COLOR_END.b - SAND_COLOR_START.b) * t);
  return `rgb(${r},${g},${b})`;
}

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export class ParticleEngine {
  private particles: Particle[] = [];
  private running = false;
  private startTime = 0;
  private pausedElapsed = 0;
  private pauseStartTime = 0;
  private lastFrameTime = 0;
  private rafId: number | null = null;
  private onStatsChange?: (stats: EngineStats) => void;
  private onComplete?: () => void;
  private ripples: Ripple[] = [];
  private blockUntil = 0;
  private boostUntil = 0;
  private tiltAngle = 0;
  private tiltUntil = 0;
  private completed = false;
  private geometry: Geometry;
  private bottomStackHeights: Map<number, number> = new Map();
  private channelPassedThisFrame = 0;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.geometry = this.computeGeometry(canvasWidth, canvasHeight);
    this.initParticles();
  }

  private computeGeometry(w: number, h: number): Geometry {
    const containerWidth = Math.min(300, w * 0.6);
    const containerHeight = Math.min(200, h * 0.22);
    const channelWidth = 40;
    const centerX = w / 2;
    const topY = h * 0.08;
    const topBottom = topY + containerHeight;
    const channelTop = topBottom;
    const channelBottom = channelTop + 40;
    const bottomTop = channelBottom;
    const bottomY = bottomTop + containerHeight;
    return {
      width: w,
      height: h,
      containerWidth,
      containerHeight,
      channelWidth,
      topY,
      topBottom,
      channelTop,
      channelBottom,
      bottomTop,
      bottomY,
      centerX
    };
  }

  public resize(w: number, h: number) {
    this.geometry = this.computeGeometry(w, h);
    this.reset();
  }

  public getGeometry(): Geometry {
    return this.geometry;
  }

  private initParticles() {
    this.particles = [];
    this.bottomStackHeights.clear();
    const count = Math.floor(rand(800, 1201));
    const g = this.geometry;
    for (let i = 0; i < count; i++) {
      const progress = i / count;
      const y = g.topY + 10 + progress * (g.containerHeight - 20);
      const halfWidthAtY = ((y - g.topY) / g.containerHeight) * (g.containerWidth / 2);
      const xOffset = rand(-halfWidthAtY, halfWidthAtY) + rand(-10, 10);
      const x = g.centerX + xOffset;
      const r = rand(3, 5);
      this.particles.push({
        x: Math.max(g.centerX - halfWidthAtY + r, Math.min(g.centerX + halfWidthAtY - r, x)),
        y,
        vx: 0,
        vy: 0,
        r,
        color: lerpColor(Math.random()),
        container: 'top'
      });
    }
    this.completed = false;
  }

  public reset() {
    this.stop();
    this.startTime = 0;
    this.pausedElapsed = 0;
    this.blockUntil = 0;
    this.boostUntil = 0;
    this.tiltAngle = 0;
    this.tiltUntil = 0;
    this.ripples = [];
    this.initParticles();
    this.emitStats();
  }

  public start() {
    if (this.running) return;
    this.running = true;
    if (this.startTime === 0) {
      this.startTime = performance.now();
    } else if (this.pauseStartTime > 0) {
      this.pausedElapsed += performance.now() - this.pauseStartTime;
      this.pauseStartTime = 0;
    }
    this.lastFrameTime = performance.now();
    this.loop();
  }

  public stop() {
    if (!this.running) return;
    this.running = false;
    this.pauseStartTime = performance.now();
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  public setOnStatsChange(cb: (stats: EngineStats) => void) {
    this.onStatsChange = cb;
    this.emitStats();
  }

  public setOnComplete(cb: () => void) {
    this.onComplete = cb;
  }

  public setBlocked(ms: number) {
    const duration = ms + rand(0, 1000);
    this.blockUntil = Math.max(this.blockUntil, performance.now() + duration);
  }

  public setSpeedBoost(ms: number) {
    this.boostUntil = Math.max(this.boostUntil, performance.now() + ms);
  }

  public setTilt(angleDeg: number, ms: number) {
    this.tiltAngle = angleDeg;
    this.tiltUntil = performance.now() + ms;
  }

  public addRipple(x: number, y: number) {
    this.ripples.push({
      x,
      y,
      radius: 10,
      alpha: 0.6,
      startTime: performance.now()
    });
  }

  private getTiltAngle(): number {
    if (performance.now() > this.tiltUntil) {
      const k = 0.1;
      this.tiltAngle = this.tiltAngle * (1 - k);
      if (Math.abs(this.tiltAngle) < 0.1) this.tiltAngle = 0;
    }
    return this.tiltAngle;
  }

  private loop = () => {
    if (!this.running) return;
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.lastFrameTime) / 1000);
    this.lastFrameTime = now;
    this.channelPassedThisFrame = 0;
    this.update(dt, now);
    this.emitStats();
    if (this.onStatsChange) this.rafId = requestAnimationFrame(this.loop);
    else this.rafId = requestAnimationFrame(this.loop);
  };

  private emitStats() {
    if (!this.onStatsChange) return;
    let topCount = 0, bottomCount = 0;
    for (const p of this.particles) {
      if (p.container === 'top' || p.container === 'channel') topCount++;
      else if (p.container === 'bottom') bottomCount++;
    }
    const elapsed = this.getElapsedSeconds();
    const isComplete = topCount === 0 && !this.completed;
    if (isComplete) {
      this.completed = true;
      setTimeout(() => this.onComplete && this.onComplete(), 0);
    }
    this.onStatsChange({
      topCount,
      bottomCount,
      elapsedSeconds: elapsed,
      isComplete: this.completed
    });
  }

  public getElapsedSeconds(): number {
    if (this.startTime === 0) return 0;
    const now = this.pauseStartTime > 0 ? this.pauseStartTime : performance.now();
    return Math.floor((now - this.startTime - this.pausedElapsed) / 1000);
  }

  public getStats(): EngineStats {
    let topCount = 0, bottomCount = 0;
    for (const p of this.particles) {
      if (p.container === 'top' || p.container === 'channel') topCount++;
      else if (p.container === 'bottom') bottomCount++;
    }
    return {
      topCount,
      bottomCount,
      elapsedSeconds: this.getElapsedSeconds(),
      isComplete: this.completed
    };
  }

  private isInsideTopContainer(x: number, y: number, r: number): boolean {
    const g = this.geometry;
    if (y < g.topY + r || y > g.topBottom - r) return false;
    const progress = (y - g.topY) / g.containerHeight;
    const halfWidth = progress * (g.containerWidth / 2);
    return Math.abs(x - g.centerX) <= halfWidth - r;
  }

  private isInsideBottomContainer(x: number, y: number, r: number): boolean {
    const g = this.geometry;
    if (y < g.bottomTop + r || y > g.bottomY - r) return false;
    const progress = (y - g.bottomTop) / g.containerHeight;
    const halfWidth = (1 - progress) * (g.containerWidth / 2);
    return Math.abs(x - g.centerX) <= halfWidth - r;
  }

  private isInsideChannel(x: number, y: number, r: number): boolean {
    const g = this.geometry;
    if (y < g.channelTop + r || y > g.channelBottom - r) return false;
    return Math.abs(x - g.centerX) <= g.channelWidth / 2 - r;
  }

  private update(dt: number, now: number) {
    const g = this.geometry;
    const tiltRad = (this.getTiltAngle() * Math.PI) / 180;
    const tiltX = Math.sin(tiltRad) * 20;
    const isBlocked = now < this.blockUntil;
    const isBoost = now < this.boostUntil;
    const maxPass = isBoost ? CHANNEL_BOOST_PASS : CHANNEL_MAX_PASS;

    for (let i = 0; i < this.ripples.length; i++) {
      const age = now - this.ripples[i].startTime;
      const t = age / RIPPLE_DURATION;
      if (t >= 1) {
        this.ripples.splice(i, 1);
        i--;
        continue;
      }
      this.ripples[i].radius = 10 + t * (Math.max(g.width, g.height) * 0.6);
      this.ripples[i].alpha = 0.6 * (1 - t);
    }

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];

      if (p.container === 'spilling') {
        p.spillTimer = (p.spillTimer || 0) + dt * 1000;
        if ((p.spillTimer || 0) >= SPILL_FADE_TIME) {
          this.particles.splice(i, 1);
          i--;
          continue;
        }
        p.x += p.vx * dt * 60;
        p.y += p.vy * dt * 60;
        p.vy += GRAVITY * dt * 0.5;
        continue;
      }

      if (p.settled && p.container === 'bottom') continue;

      p.vy += GRAVITY * dt;
      p.x += p.vx * dt * 60 + tiltX * dt * 2;
      p.y += p.vy * dt * 60;
      p.vx *= 0.98;

      if (p.container === 'top') {
        const progress = (p.y - g.topY) / g.containerHeight;
        const halfWidth = Math.max(10, progress * (g.containerWidth / 2));
        const dx = p.x - g.centerX;
        if (Math.abs(dx) > halfWidth - p.r) {
          const sign = dx > 0 ? 1 : -1;
          p.x = g.centerX + sign * (halfWidth - p.r);
          p.vx = -p.vx * ELASTICITY;
        }
        if (p.y < g.topY + p.r) {
          p.y = g.topY + p.r;
          p.vy = -p.vy * ELASTICITY;
        }
        if (p.y >= g.topBottom - p.r - 2 && !isBlocked && this.channelPassedThisFrame < maxPass) {
          if (Math.abs(p.x - g.centerX) < g.channelWidth / 2 - p.r) {
            this.channelPassedThisFrame++;
            p.container = 'channel';
            p.y = g.channelTop + p.r + 1;
          }
        }
        if (Math.abs(tiltX) > 3 && Math.abs(dx) > halfWidth - p.r - 2) {
          if (progress < 0.3 && Math.random() < 0.1) {
            p.container = 'spilling';
            p.vx = sign(dx) * 2;
            p.vy = -1;
            p.spillTimer = 0;
          }
        }
      } else if (p.container === 'channel') {
        const dx = p.x - g.centerX;
        if (Math.abs(dx) > g.channelWidth / 2 - p.r) {
          const sign = dx > 0 ? 1 : -1;
          p.x = g.centerX + sign * (g.channelWidth / 2 - p.r);
          p.vx = -p.vx * ELASTICITY;
        }
        if (p.y >= g.channelBottom - p.r) {
          p.container = 'bottom';
          p.y = g.bottomTop + p.r + 1;
        }
      } else if (p.container === 'bottom') {
        const progress = (p.y - g.bottomTop) / g.containerHeight;
        const halfWidth = Math.max(10, (1 - progress) * (g.containerWidth / 2));
        const dx = p.x - g.centerX;
        if (Math.abs(dx) > halfWidth - p.r) {
          const s = dx > 0 ? 1 : -1;
          p.x = g.centerX + s * (halfWidth - p.r);
          p.vx = -p.vx * ELASTICITY;
        }
        const colKey = Math.floor(p.x / 8);
        const stackHeight = this.bottomStackHeights.get(colKey) || 0;
        const maxStackY = g.bottomY - stack - stack * MAX_STACK_HEIGHT_RATIO;
        const floorY = g.bottomY - p.r - stack;
        const settledFloorY = stack;
        if (p.y >= stack) {
          p.y = stack;
          p.vy = -p.vy * 0.1;
          p.vx *= 0.7;
          if (Math.abs(p.vy) < 0.5) {
            p.settled = true;
            p.settledY = p.y;
            const col = Math.floor(p.x / 8);
            const cur = this.bottomStackHeights.get(col) || 0;
            const newH = g.bottomY - p.y;
            if (newH > cur) this.bottomStackHeights.set(col, newH);
            this.enforceAngleOfRepose(col);
          }
        }
        if (Math.abs(p.vy) < 0.2 && p.y > stack && p.vy >= 0) {
          p.settled = true;
          p.settledY = p.y;
          const col = Math.floor(p.x / 8);
          const stack = this.bottomStackHeights.get(col) || 0;
          const stack = g.bottomY - p.y;
          if (stack > stack) this.bottomStackHeights.set(col, stack);
          this.enforceAngleOfRepose(col);
        }
      }
    }

    this.handleCollisions();
  }

  private enforceAngleOfRepose(modifiedCol: number) {
    const stack = this.bottomStackHeights;
    const stack = [modifiedCol - 2, modifiedCol - 1, modifiedCol, modifiedCol + 1, modifiedCol + 2];
    for (const c of stack) {
      const stack = stack.get(c) || 0;
      if (stack <= 0) continue;
      const neighbors = [c - 1, c + 1];
      for (const n of neighbors) {
        const stack = stack.get(n) || 0;
        const stack = stack - stack;
        const stack = Math.tan((30 * Math.PI) / 180) * 8;
        if (stack > stack * 1.5) {
          const drop = Math.min(stack, stack);
          stack.set(c, stack - drop);
          stack.set(n, stack + drop * 0.7);
        }
      }
    }
  }

  private handleCollisions() {
    const maxR = 5;
    const cellSize = maxR * 2.2;
    const grid: Map<string, Particle[]> = new Map();

    for (const p of this.particles) {
      if (p.container === 'spilling') continue;
      if (p.settled) continue;
      const cx = Math.floor(p.x / cellSize);
      const cy = Math.floor(p.y / cellSize);
      const key = `${cx},${cy}`;
      let arr = grid.get(key);
      if (!arr) { arr = []; grid.set(key, arr); }
      arr.push(p);
    }

    const checked = new Set<string>();

    for (const [key, bucket] of grid) {
      const [cxStr, cyStr] = key.split(',');
      const cx = parseInt(cxStr);
      const cy = parseInt(cyStr);
      for (let dx = 0; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy < 0) continue;
          const otherKey = `${cx + dx},${cy + dy}`;
          const other = grid.get(otherKey);
          if (!other) continue;
          const isSame = dx === 0 && dy === 0;
          for (let i = 0; i < bucket.length; i++) {
            const jStart = isSame ? i + 1 : 0;
            for (let j = jStart; j < other.length; j++) {
              const p1 = bucket[i];
              const p2 = other[j];
              const pairKey = p1 === p2 ? '' : `${Math.min(p1.x, p2.x)}_${Math.min(p1.y, p2.y)}`;
              if (p1 === p2) continue;
              this.resolveCollision(p1, p2);
            }
          }
        }
      }
    }
  }

  private resolveCollision(p1: Particle, p2: Particle) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const distSq = dx * dx + dy * dy;
    const minDist = p1.r + p2.r;
    const minDistSq = minDist * minDist;
    if (distSq >= minDistSq || distSq === 0) return;
    const dist = Math.sqrt(distSq);
    const nx = dx / dist;
    const ny = dy / dist;
    const overlap = (minDist - dist) * 0.5;
    if (!p1.settled) {
      p1.x -= nx * overlap;
      p1.y -= ny * overlap;
    }
    if (!p2.settled) {
      p2.x += nx * overlap;
      p2.y += ny * overlap;
    }
    const dvx = p1.vx - p2.vx;
    const dvy = p1.vy - p2.vy;
    const dvDotN = dvx * nx + dvy * ny;
    if (dvDotN <= 0) return;
    const e = ELASTICITY;
    const impulse = -(1 + e) * dvDotN / 2;
    if (!p1.settled) {
      p1.vx += impulse * nx;
      p1.vy += impulse * ny;
    }
    if (!p2.settled) {
      p2.vx -= impulse * nx;
      p2.vy -= impulse * ny;
    }
  }

  public render(ctx: CanvasRenderingContext2D) {
    const g = this.geometry;
    const now = performance.now();

    this.drawBackgroundGlow(ctx);
    this.drawHourglassShape(ctx);
    this.drawBottomAccumulationGlow(ctx);

    for (const p of this.particles) {
      this.drawParticle(ctx, p, now);
    }

    this.drawRipples(ctx);
  }

  private drawBackgroundGlow(ctx: CanvasRenderingContext2D) {
    const g = this.geometry;
    const grad = ctx.createRadialGradient(g.centerX, (g.topY + g.bottomY) / 2, 20, g.centerX, (g.topY + g.bottomY) / 2, g.containerWidth);
    grad.addColorStop(0, 'rgba(100, 80, 160, 0.08)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, g.width, g.height);
  }

  private drawBottomAccumulationGlow(ctx: CanvasRenderingContext2D) {
    const g = this.geometry;
    const grad = ctx.createRadialGradient(g.centerX, g.bottomY - 10, 10, g.centerX, g.bottomY - 10, 100);
    grad.addColorStop(0, 'rgba(212, 163, 115, 0.1)');
    grad.addColorStop(1, 'rgba(212, 163, 115, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(g.centerX, g.bottomY - 10, 100, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawHourglassShape(ctx: CanvasRenderingContext2D) {
    const g = this.geometry;
    const cw = g.containerWidth / 2;
    const ch = g.channelWidth / 2;

    ctx.save();
    ctx.translate(g.centerX, 0);

    const tiltAngle = this.getTiltAngle();
    ctx.rotate((tiltAngle * Math.PI) / 180);

    ctx.beginPath();
    ctx.moveTo(-cw, g.topY);
    ctx.lineTo(0, g.topBottom - 2);
    ctx.lineTo(-ch, g.channelBottom);
    ctx.lineTo(-cw, g.bottomY);
    ctx.lineTo(cw, g.bottomY);
    ctx.lineTo(ch, g.channelBottom);
    ctx.lineTo(0, g.topBottom - 2);
    ctx.lineTo(cw, g.topY);
    ctx.closePath();

    ctx.save();
    ctx.shadowColor = 'rgba(138, 74, 138, 0.6)';
    ctx.shadowBlur = 18;
    const borderGrad = ctx.createLinearGradient(-cw, g.topY, cw, g.bottomY);
    borderGrad.addColorStop(0, '#4a4a8a');
    borderGrad.addColorStop(0.5, '#8a4a8a');
    borderGrad.addColorStop(1, '#4a4a8a');
    ctx.strokeStyle = borderGrad;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();

    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  }

  private drawParticle(ctx: CanvasRenderingContext2D, p: Particle, now: number) {
    let alpha = 1;
    if (p.container === 'spilling' && p.spillTimer !== undefined) {
      alpha = Math.max(0, 1 - p.spillTimer / SPILL_FADE_TIME);
    }

    ctx.save();
    ctx.globalAlpha = alpha * 0.2;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r + 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawRipples(ctx: CanvasRenderingContext2D) {
    for (const r of this.ripples) {
      ctx.save();
      ctx.strokeStyle = `rgba(106, 169, 255, ${r.alpha})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
}

function sign(n: number): number { return n > 0 ? 1 : n < 0 ? -1 : 0; }
