export const COLORS = {
  PLAYER1: '#4FC3F7',
  PLAYER2: '#FF7043',
  GOLD: '#D4AF37',
  GOLD_DARK: '#4A3B1A',
  BG: '#0D0D0D',
  CELL_BG: 'rgba(42, 31, 13, 0.7)',
};

const PARTICLE_LIFETIME = 0.6;
const MAX_PARTICLES = 50;
const MIN_PARTICLES = 30;
const PARTICLE_COUNT_RANGE = MAX_PARTICLES - MIN_PARTICLES;

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
}

export interface PieceAnimation {
  row: number;
  col: number;
  progress: number;
  duration: number;
}

export class EffectManager {
  particles: Particle[] = [];
  placementAnims: PieceAnimation[] = [];
  victoryFlash = 0;
  victoryLine: [number, number][] | null = null;

  createResetParticles(centerX: number, centerY: number): void {
    const rawCount = MIN_PARTICLES + Math.floor(Math.random() * (PARTICLE_COUNT_RANGE + 1));
    const safeCount = Math.max(MIN_PARTICLES, Math.min(rawCount, MAX_PARTICLES));
    const availableSlots = MAX_PARTICLES - this.particles.length;
    const finalCount = Math.min(safeCount, availableSlots);
    if (finalCount <= 0) return;
    const colors = [COLORS.PLAYER1, COLORS.PLAYER2, COLORS.GOLD];
    for (let i = 0; i < finalCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 160;
      this.particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 2 + Math.random() * 2,
        life: PARTICLE_LIFETIME,
      });
    }
  }

  createPlacementAnim(row: number, col: number): void {
    this.placementAnims.push({
      row,
      col,
      progress: 0,
      duration: 0.2,
    });
  }

  setVictory(line: [number, number][] | null): void {
    this.victoryLine = line;
    this.victoryFlash = line ? 1 : 0;
  }

  update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 120 * dt;
    }

    for (let i = this.placementAnims.length - 1; i >= 0; i--) {
      const a = this.placementAnims[i];
      a.progress += dt;
      if (a.progress >= a.duration) {
        this.placementAnims.splice(i, 1);
      }
    }

    if (this.victoryFlash > 0) {
      this.victoryFlash = Math.max(0, this.victoryFlash - dt * 0.8);
    }
  }

  getPlacementScale(row: number, col: number): number {
    for (const a of this.placementAnims) {
      if (a.row === row && a.col === col) {
        const t = a.progress / a.duration;
        if (t < 0.5) {
          return 1 + 0.4 * Math.sin(t * Math.PI);
        }
        return 1 + 0.2 * (1 - (t - 0.5) * 2);
      }
    }
    return 1;
  }

  renderParticles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const normalizedLife = Math.max(0, Math.min(1, p.life / PARTICLE_LIFETIME));
      const alpha = normalizedLife <= 0 ? 0 : normalizedLife;
      if (alpha <= 0) continue;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.shadowBlur = 8 * alpha;
      ctx.shadowColor = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  clear(): void {
    this.particles = [];
    this.placementAnims = [];
    this.victoryFlash = 0;
    this.victoryLine = null;
  }
}
