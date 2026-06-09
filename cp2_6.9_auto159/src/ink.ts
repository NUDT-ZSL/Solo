import { BrushState, RGB } from './brush';

export interface InkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  g: number;
  b: number;
  alpha: number;
  size: number;
  life: number;
  maxLife: number;
  active: boolean;
  id: number;
  undoStepId: number | null;
  fadeOutProgress: number;
  isFadingOut: boolean;
}

export interface UndoStep {
  id: number;
  particles: InkParticle[];
  snapshotData: ImageData | null;
}

const MAX_PARTICLES = 800;
const POOL_SIZE = 1200;

export class InkSystem {
  particles: InkParticle[] = [];
  private pool: InkParticle[] = [];
  private nextParticleId = 0;
  private nextUndoId = 0;
  undoSteps: UndoStep[] = [];
  private currentStepParticles: InkParticle[] = [];
  spreadMultiplier = 1.0;
  fadeMultiplier = 1.0;
  canvasWidth: number = 0;
  canvasHeight: number = 0;

  constructor() {
    this.initPool();
  }

  private initPool(): void {
    for (let i = 0; i < POOL_SIZE; i++) {
      this.pool.push(this.createEmptyParticle());
    }
  }

  private createEmptyParticle(): InkParticle {
    return {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      r: 0,
      g: 0,
      b: 0,
      alpha: 0,
      size: 0,
      life: 0,
      maxLife: 0,
      active: false,
      id: -1,
      undoStepId: null,
      fadeOutProgress: 0,
      isFadingOut: false
    };
  }

  private acquireParticle(): InkParticle | null {
    if (this.particles.length >= MAX_PARTICLES) {
      this.eliminateLowestLife();
    }
    let p = this.pool.find((pp) => !pp.active);
    if (!p) {
      p = this.createEmptyParticle();
      this.pool.push(p);
    }
    return p;
  }

  private eliminateLowestLife(): void {
    let minLife = Infinity;
    let minIdx = -1;
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.isFadingOut && p.life < minLife) {
        minLife = p.life;
        minIdx = i;
      }
    }
    if (minIdx >= 0) {
      const removed = this.particles.splice(minIdx, 1)[0];
      removed.active = false;
    }
  }

  spawnParticles(brush: BrushState, count: number): void {
    const particleCount = Math.max(5, Math.min(15, count));
    for (let i = 0; i < particleCount; i++) {
      this.spawnSingle(brush);
    }
  }

  private spawnSingle(brush: BrushState): void {
    const p = this.acquireParticle();
    if (!p) return;

    const angle = Math.random() * Math.PI * 2;
    const speed = (1 + Math.random() * 2) * this.spreadMultiplier;
    const offset = Math.random() * 20;
    const offsetX = Math.cos(angle) * offset;
    const offsetY = Math.sin(angle) * offset;

    p.x = brush.x + offsetX;
    p.y = brush.y + offsetY;
    p.vx = Math.cos(angle) * speed;
    p.vy = Math.sin(angle) * speed;
    p.r = brush.color.r;
    p.g = brush.color.g;
    p.b = brush.color.b;
    p.alpha = (0.6 + Math.random() * 0.3) * brush.alpha;
    p.size = 6 + Math.random() * 10;
    p.life = p.alpha;
    p.maxLife = p.alpha;
    p.active = true;
    p.id = this.nextParticleId++;
    p.undoStepId = null;
    p.fadeOutProgress = 0;
    p.isFadingOut = false;

    this.particles.push(p);
    this.currentStepParticles.push(p);
  }

  markCurrentStep(): void {
    if (this.currentStepParticles.length === 0) return;
    const stepId = this.nextUndoId++;
    const stepParticles: InkParticle[] = [];
    for (const p of this.currentStepParticles) {
      p.undoStepId = stepId;
      stepParticles.push(p);
    }
    this.undoSteps.push({
      id: stepId,
      particles: stepParticles,
      snapshotData: null
    });
    if (this.undoSteps.length > 20) {
      this.undoSteps.shift();
    }
    this.currentStepParticles = [];
  }

  undoLast(): number {
    if (this.undoSteps.length === 0) return 0;
    const step = this.undoSteps.pop()!;
    for (const p of step.particles) {
      if (p.active) {
        p.isFadingOut = true;
        p.fadeOutProgress = 0;
      }
    }
    return step.particles.length;
  }

  update(): void {
    const fadeRate = 0.005 + Math.random() * 0.005;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      if (!p.active) {
        this.particles.splice(i, 1);
        continue;
      }

      if (p.isFadingOut) {
        p.fadeOutProgress += 1 / 18;
        if (p.fadeOutProgress >= 1) {
          p.active = false;
          this.particles.splice(i, 1);
          continue;
        }
        const fadeMult = 1 - p.fadeOutProgress;
        p.alpha = p.alpha * fadeMult;
      } else {
        const brownianX = (Math.random() - 0.5) * 2 * this.spreadMultiplier;
        const brownianY = (Math.random() - 0.5) * 2 * this.spreadMultiplier;
        p.x += p.vx + brownianX;
        p.y += p.vy + brownianY;
        p.vx *= 0.95;
        p.vy *= 0.95;
        p.alpha -= fadeRate * this.fadeMultiplier;
        p.life = p.alpha;

        if (
          p.x < -50 ||
          p.x > this.canvasWidth + 50 ||
          p.y < -50 ||
          p.y > this.canvasHeight + 50
        ) {
          p.active = false;
          this.particles.splice(i, 1);
          continue;
        }

        if (p.alpha < 0.05) {
          p.active = false;
          this.particles.splice(i, 1);
          continue;
        }
      }
    }

    this.blendNeighbors();
  }

  private blendNeighbors(): void {
    const threshold = 10;
    const n = this.particles.length;
    for (let i = 0; i < n; i++) {
      const a = this.particles[i];
      if (!a.active || a.isFadingOut) continue;
      for (let j = i + 1; j < n; j++) {
        const b = this.particles[j];
        if (!b.active || b.isFadingOut) continue;
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < threshold * threshold) {
          const midR = (a.r + b.r) * 0.5;
          const midG = (a.g + b.g) * 0.5;
          const midB = (a.b + b.b) * 0.5;
          const midAlpha = (a.alpha + b.alpha) * 0.5;
          a.r = midR;
          a.g = midG;
          a.b = midB;
          a.alpha = midAlpha;
          b.r = midR;
          b.g = midG;
          b.b = midB;
          b.alpha = midAlpha;
        }
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.globalCompositeOperation = 'source-over';
    for (const p of this.particles) {
      if (!p.active) continue;
      ctx.beginPath();
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
      const alpha = Math.max(0, Math.min(1, p.alpha));
      grad.addColorStop(0, `rgba(${Math.round(p.r)},${Math.round(p.g)},${Math.round(p.b)},${alpha})`);
      grad.addColorStop(0.5, `rgba(${Math.round(p.r)},${Math.round(p.g)},${Math.round(p.b)},${alpha * 0.5})`);
      grad.addColorStop(1, `rgba(${Math.round(p.r)},${Math.round(p.g)},${Math.round(p.b)},0)`);
      ctx.fillStyle = grad;
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  clearAll(): void {
    for (const p of this.particles) {
      p.active = false;
      p.isFadingOut = true;
      p.fadeOutProgress = 0;
    }
    this.particles = [];
    this.undoSteps = [];
    this.currentStepParticles = [];
  }

  getParticleCount(): number {
    return this.particles.length;
  }
}

export function parseRgbString(rgb: string): RGB {
  const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return { r: 0, g: 0, b: 0 };
  return {
    r: parseInt(match[1], 10),
    g: parseInt(match[2], 10),
    b: parseInt(match[3], 10)
  };
}
