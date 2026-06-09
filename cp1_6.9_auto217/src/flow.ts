import { parseColor, getComplementaryColor, lerpColor } from './ink';

export interface FlowParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  startColor: string;
  endColor: string;
  progress: number;
  speed: number;
  life: number;
  maxLife: number;
  opacity: number;
  fadeOutStart: number | null;
  trail: Array<{ x: number; y: number; opacity: number }>;
  pathPoints: Array<{ x: number; y: number }>;
  pathIndex: number;
  pathT: number;
  strokeId: string;
}

export interface PathPoint {
  x: number;
  y: number;
}

const MAX_PARTICLES = 1500;
const TRAIL_LENGTH = 10;
const FLOW_SPEED = 60;
const PARTICLE_POOL: FlowParticle[] = [];
let _particleIdCounter = 0;

function acquireParticle(): FlowParticle {
  if (PARTICLE_POOL.length > 0) {
    return PARTICLE_POOL.pop()!;
  }
  return {
    id: 0,
    x: 0, y: 0,
    vx: 0, vy: 0,
    size: 0,
    color: '',
    startColor: '',
    endColor: '',
    progress: 0,
    speed: 0,
    life: 0,
    maxLife: 0,
    opacity: 0,
    fadeOutStart: null,
    trail: [],
    pathPoints: [],
    pathIndex: 0,
    pathT: 0,
    strokeId: ''
  };
}

function releaseParticle(p: FlowParticle): void {
  p.trail.length = 0;
  p.pathPoints.length = 0;
  PARTICLE_POOL.push(p);
}

export class FlowSystem {
  particles: FlowParticle[] = [];
  private _overflowBuffer: FlowParticle[] = [];

  spawnParticles(
    strokeId: string,
    pathPoints: PathPoint[],
    baseColor: string,
    _now: number
  ): void {
    if (pathPoints.length < 2) return;
    const endColor = getComplementaryColor(baseColor);
    const totalDistance = this.pathTotalLength(pathPoints);
    const particleSpacing = 18;
    const count = Math.max(1, Math.min(100, Math.floor(totalDistance / particleSpacing)));
    const distancePerParticle = totalDistance / count;

    let accDistance = 0;
    for (let i = 0; i < count; i++) {
      if (this.particles.length + this._overflowBuffer.length >= MAX_PARTICLES) {
        break;
      }
      const targetDistance = i * distancePerParticle;
      while (accDistance < targetDistance) accDistance += 0.5;

      const pos = this.pointAtDistance(pathPoints, i * distancePerParticle);
      if (!pos) break;
      const nextPos = this.pointAtDistance(pathPoints, Math.min(totalDistance, (i + 1) * distancePerParticle));
      const dx = nextPos ? nextPos.x - pos.x : 0;
      const dy = nextPos ? nextPos.y - pos.y : 0;
      const len = Math.hypot(dx, dy) || 1;

      const p = acquireParticle();
      _particleIdCounter++;
      p.id = _particleIdCounter;
      p.strokeId = strokeId;
      p.startColor = baseColor;
      p.endColor = endColor;
      p.color = baseColor;
      p.progress = 0;
      p.size = 2 + Math.random() * 3;
      p.speed = FLOW_SPEED * (0.7 + Math.random() * 0.6);
      p.life = 0;
      p.maxLife = (totalDistance / p.speed) * 1000 + 800;
      p.opacity = 1;
      p.fadeOutStart = null;
      p.x = pos.x;
      p.y = pos.y;
      p.vx = (dx / len) * 0.1;
      p.vy = (dy / len) * 0.1;
      p.pathPoints = pathPoints.slice();
      p.pathIndex = 0;
      p.pathT = 0;
      p.trail.length = 0;
      p.trail.push({ x: p.x, y: p.y, opacity: 1 });

      this._overflowBuffer.push(p);
    }

    while (this.particles.length + this._overflowBuffer.length > MAX_PARTICLES) {
      const victim = this.particles.shift();
      if (victim) releaseParticle(victim);
      else break;
    }

    for (const p of this._overflowBuffer) {
      this.particles.push(p);
    }
    this._overflowBuffer.length = 0;
  }

  private pathTotalLength(pts: PathPoint[]): number {
    let total = 0;
    for (let i = 1; i < pts.length; i++) {
      total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    }
    return total;
  }

  private pointAtDistance(pts: PathPoint[], distance: number): PathPoint | null {
    if (pts.length === 0) return null;
    if (distance <= 0) return { x: pts[0].x, y: pts[0].y };
    let acc = 0;
    for (let i = 1; i < pts.length; i++) {
      const segLen = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      if (acc + segLen >= distance) {
        const t = segLen === 0 ? 0 : (distance - acc) / segLen;
        return {
          x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * t,
          y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * t
        };
      }
      acc += segLen;
    }
    return { x: pts[pts.length - 1].x, y: pts[pts.length - 1].y };
  }

  update(now: number, deltaTimeMs: number): void {
    void deltaTimeMs;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      if (p.fadeOutStart !== null) {
        const fadeElapsed = now - p.fadeOutStart;
        p.opacity = Math.max(0, 1 - fadeElapsed / 300);
        if (p.opacity <= 0) {
          const removed = this.particles.splice(i, 1)[0];
          releaseParticle(removed);
          continue;
        }
      }

      p.life += deltaTimeMs;

      const pathProgress = Math.min(1, (p.life * p.speed) / 1000 / Math.max(1, this.pathTotalLength(p.pathPoints)));
      const distAlongPath = this.pathTotalLength(p.pathPoints) * pathProgress;
      const pos = this.pointAtDistance(p.pathPoints, distAlongPath);
      if (pos) {
        p.x = pos.x + (Math.sin(p.id + p.life * 0.003) * 1.5);
        p.y = pos.y + (Math.cos(p.id * 1.3 + p.life * 0.0025) * 1.5);
      }

      p.progress = Math.min(1, p.life / p.maxLife);
      const colorT = p.progress;
      p.color = lerpColor(p.startColor, p.endColor, colorT);

      if (p.fadeOutStart === null) {
        if (p.progress > 0.8) {
          p.opacity = Math.max(0, 1 - (p.progress - 0.8) / 0.2);
        } else {
          p.opacity = 1;
        }
      }

      p.trail.unshift({ x: p.x, y: p.y, opacity: p.opacity });
      if (p.trail.length > TRAIL_LENGTH) {
        p.trail.length = TRAIL_LENGTH;
      }

      if (p.life >= p.maxLife + 500) {
        const removed = this.particles.splice(i, 1)[0];
        releaseParticle(removed);
      }
    }
  }

  startFadeParticlesByStroke(strokeId: string, now: number): void {
    for (const p of this.particles) {
      if (p.strokeId === strokeId && p.fadeOutStart === null) {
        p.fadeOutStart = now;
      }
    }
  }

  removeAllFaded(): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      if (this.particles[i].opacity <= 0) {
        const removed = this.particles.splice(i, 1)[0];
        releaseParticle(removed);
      }
    }
  }

  clear(): void {
    for (const p of this.particles) {
      releaseParticle(p);
    }
    this.particles.length = 0;
    this._overflowBuffer.length = 0;
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (const p of this.particles) {
      if (p.opacity <= 0) continue;
      const rgb = parseColor(p.color);

      for (let i = p.trail.length - 1; i >= 0; i--) {
        const trailPoint = p.trail[i];
        const trailAlpha = (1 - i / p.trail.length) * p.opacity * 0.45;
        const trailSize = p.size * (1 - i / p.trail.length * 0.7);
        const grad = ctx.createRadialGradient(
          trailPoint.x, trailPoint.y, 0,
          trailPoint.x, trailPoint.y, trailSize
        );
        grad.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${trailAlpha})`);
        grad.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(trailPoint.x, trailPoint.y, trailSize, 0, Math.PI * 2);
        ctx.fill();
      }

      const glowRadius = p.size * 2.8;
      const coreAlpha = p.opacity;
      const coreGrad = ctx.createRadialGradient(
        p.x, p.y, 0,
        p.x, p.y, glowRadius
      );
      coreGrad.addColorStop(0, `rgba(255, 255, 255, ${coreAlpha * 0.9})`);
      coreGrad.addColorStop(0.3, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${coreAlpha * 0.8})`);
      coreGrad.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, glowRadius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
