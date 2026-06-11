import { PLAYER1_COLOR, PLAYER2_COLOR } from './board';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

export interface PieceAnimation {
  row: number;
  col: number;
  scale: number;
  targetScale: number;
  phase: 'growing' | 'shrinking' | 'done';
  progress: number;
  duration: number;
}

export class EffectSystem {
  private particles: Particle[] = [];
  private pieceAnimations: Map<string, PieceAnimation> = new Map();
  private victoryGlow: { active: boolean; intensity: number; line: [number, number][] | null } = {
    active: false,
    intensity: 0,
    line: null,
  };
  private boardOpacity: number = 1;
  private boardFading: 'in' | 'out' | null = null;
  private boardFadeProgress: number = 0;
  private boardFadeDuration: number = 300;

  update(deltaTime: number): void {
    this.updateParticles(deltaTime);
    this.updatePieceAnimations(deltaTime);
    this.updateVictoryGlow(deltaTime);
    this.updateBoardFade(deltaTime);
  }

  private updateParticles(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * deltaTime * 0.06;
      p.y += p.vy * deltaTime * 0.06;
      p.vy += 0.15 * deltaTime * 0.06;
      p.life -= deltaTime;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private updatePieceAnimations(deltaTime: number): void {
    for (const [_key, anim] of this.pieceAnimations) {
      if (anim.phase === 'done') continue;

      anim.progress += deltaTime;
      const t = Math.min(anim.progress / anim.duration, 1);

      if (anim.phase === 'growing') {
        anim.scale = this.easeOutElastic(t, 0, 1.2, 1);
        if (t >= 0.6) {
          anim.phase = 'shrinking';
          anim.progress = 0;
        }
      } else if (anim.phase === 'shrinking') {
        anim.scale = 1.2 - this.easeOutQuad(t, 0, 0.2, 1);
        if (t >= 1) {
          anim.phase = 'done';
          anim.scale = 1;
        }
      }
    }
  }

  private easeOutElastic(t: number, b: number, c: number, d: number): number {
    const p = d * 0.3;
    const a = c;
    const s = p * 0.25;
    if (t === 0) return b;
    if ((t /= d) === 1) return b + c;
    return a * Math.pow(2, -10 * t) * Math.sin((t * d - s) * (2 * Math.PI) / p) + c + b;
  }

  private easeOutQuad(t: number, b: number, c: number, d: number): number {
    return -c * (t /= d) * (t - 2) + b;
  }

  private updateVictoryGlow(deltaTime: number): void {
    if (this.victoryGlow.active) {
      this.victoryGlow.intensity = Math.min(1, this.victoryGlow.intensity + deltaTime * 0.003);
    } else {
      this.victoryGlow.intensity = Math.max(0, this.victoryGlow.intensity - deltaTime * 0.005);
    }
  }

  private updateBoardFade(deltaTime: number): void {
    if (this.boardFading === null) return;

    this.boardFadeProgress += deltaTime;
    const t = Math.min(this.boardFadeProgress / this.boardFadeDuration, 1);

    if (this.boardFading === 'out') {
      this.boardOpacity = 1 - t;
    } else {
      this.boardOpacity = t;
    }

    if (t >= 1) {
      this.boardFading = null;
    }
  }

  spawnBurstParticles(centerX: number, centerY: number, count: number = 40): void {
    count = Math.min(count, 50);
    const colors = [PLAYER1_COLOR, PLAYER2_COLOR];
    
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      this.particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 2 + Math.random() * 2,
        life: 600 + Math.random() * 200,
        maxLife: 800,
      });
    }
  }

  startPieceAnimation(row: number, col: number): void {
    const key = `${row}-${col}`;
    this.pieceAnimations.set(key, {
      row,
      col,
      scale: 0,
      targetScale: 1,
      phase: 'growing',
      progress: 0,
      duration: 200,
    });
  }

  getPieceScale(row: number, col: number): number {
    const key = `${row}-${col}`;
    const anim = this.pieceAnimations.get(key);
    return anim ? anim.scale : 1;
  }

  clearPieceAnimations(): void {
    this.pieceAnimations.clear();
  }

  startBoardFadeOut(): void {
    this.boardFading = 'out';
    this.boardFadeProgress = 0;
    this.boardOpacity = 1;
  }

  startBoardFadeIn(): void {
    this.boardFading = 'in';
    this.boardFadeProgress = 0;
    this.boardOpacity = 0;
  }

  getBoardOpacity(): number {
    return this.boardOpacity;
  }

  isBoardFading(): boolean {
    return this.boardFading !== null;
  }

  startVictoryGlow(line: [number, number][]): void {
    this.victoryGlow.active = true;
    this.victoryGlow.line = line;
    this.victoryGlow.intensity = 0;
  }

  stopVictoryGlow(): void {
    this.victoryGlow.active = false;
  }

  getVictoryGlow(): { intensity: number; line: [number, number][] | null } {
    return { intensity: this.victoryGlow.intensity, line: this.victoryGlow.line };
  }

  getParticles(): Particle[] {
    return this.particles;
  }

  clearAll(): void {
    this.particles = [];
    this.pieceAnimations.clear();
    this.victoryGlow = { active: false, intensity: 0, line: null };
    this.boardOpacity = 1;
    this.boardFading = null;
    this.boardFadeProgress = 0;
  }
}
