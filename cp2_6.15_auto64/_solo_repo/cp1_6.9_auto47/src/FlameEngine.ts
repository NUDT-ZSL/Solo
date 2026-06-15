export interface FlameParticle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface AshParticle {
  id: string;
  char: string;
  startX: number;
  startY: number;
  createdAt: number;
  driftPhase: number;
}

export interface BurnState {
  cardId: string;
  text: string;
  cardRect: { x: number; y: number; width: number; height: number };
  startTime: number;
  burnProgress: number;
  lastCharIndex: number;
  nextFlameSpawn: number;
  highlightTimers: Map<number, number>;
}

const ASH_TOTAL_DURATION = 6000;
const CHAR_HIGHLIGHT_DURATION = 300;
const FLAME_SPAWN_INTERVAL = 220;
const TWO_PI = Math.PI * 2;

function lerpColor(hex1: string, hex2: string, t: number): string {
  const r1 = parseInt(hex1.slice(1, 3), 16);
  const g1 = parseInt(hex1.slice(3, 5), 16);
  const b1 = parseInt(hex1.slice(5, 7), 16);
  const r2 = parseInt(hex2.slice(1, 3), 16);
  const g2 = parseInt(hex2.slice(3, 5), 16);
  const b2 = parseInt(hex2.slice(5, 7), 16);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r},${g},${b})`;
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

let particleIdCounter = 0;
const genId = (): string => `p_${Date.now()}_${particleIdCounter++}`;

export class FlameEngine {
  private flameParticles: FlameParticle[] = [];
  private burnStates: Map<string, BurnState> = new Map();
  private ashSpawnedChars: Set<string> = new Set();
  private onAshSpawn: ((ashes: AshParticle[]) => void) | null = null;
  private onProgressUpdate: ((cardId: string, progress: number, highlightIndices: number[]) => void) | null = null;

  setAshSpawnCallback(cb: (ashes: AshParticle[]) => void): void {
    this.onAshSpawn = cb;
  }

  setProgressCallback(cb: (cardId: string, progress: number, highlightIndices: number[]) => void): void {
    this.onProgressUpdate = cb;
  }

  startBurn(
    cardId: string,
    text: string,
    cardRect: { x: number; y: number; width: number; height: number },
    now: number
  ): void {
    if (this.burnStates.has(cardId)) return;
    this.burnStates.set(cardId, {
      cardId,
      text,
      cardRect,
      startTime: now,
      burnProgress: 0,
      lastCharIndex: -1,
      nextFlameSpawn: now,
      highlightTimers: new Map(),
    });
  }

  reset(): void {
    this.flameParticles = [];
    this.burnStates.clear();
    this.ashSpawnedChars.clear();
  }

  update(now: number, dt: number): { flameParticles: FlameParticle[] } {
    this.flameParticles = this.flameParticles.filter((p) => {
      p.life -= dt;
      if (p.life <= 0) return false;
      const lifeRatio = p.life / p.maxLife;
      p.alpha = Math.max(0, lifeRatio);
      p.x += p.vx * dt * 0.06;
      p.y += p.vy * dt * 0.06;
      p.vy -= 0.02 * dt * 0.06;
      p.vx += (Math.random() - 0.5) * 0.05 * dt * 0.06;
      p.size = Math.max(0.3, p.size * (1 - 0.001 * dt));
      return true;
    });

    this.burnStates.forEach((state) => {
      const elapsed = now - state.startTime;
      const BURN_DURATION = 8000;
      state.burnProgress = Math.min(1, elapsed / BURN_DURATION);

      if (now >= state.nextFlameSpawn) {
        const count = 2 + Math.floor(Math.random() * 2);
        this.spawnFlameParticles(state, count);
        state.nextFlameSpawn = now + FLAME_SPAWN_INTERVAL;
      }

      const chars = [...state.text];
      const totalChars = chars.length;
      const progressCharCount = Math.floor(totalChars * state.burnProgress * 1.1);

      const newHighlights: number[] = [];
      for (let i = state.lastCharIndex + 1; i < Math.min(progressCharCount, totalChars); i++) {
        state.highlightTimers.set(i, now);
        state.lastCharIndex = i;
        newHighlights.push(i);

        setTimeout(() => {
          const charKey = `${state.cardId}_${i}`;
          if (!this.ashSpawnedChars.has(charKey) && chars[i]) {
            this.ashSpawnedChars.add(charKey);
            const ash = this.createAshParticle(state, i, chars[i]);
            if (this.onAshSpawn) this.onAshSpawn([ash]);
          }
        }, CHAR_HIGHLIGHT_DURATION);
      }

      const activeHighlights: number[] = [];
      state.highlightTimers.forEach((start, idx) => {
        if (now - start < CHAR_HIGHLIGHT_DURATION) activeHighlights.push(idx);
      });

      if (this.onProgressUpdate) {
        this.onProgressUpdate(state.cardId, state.burnProgress, activeHighlights);
      }

      if (state.burnProgress >= 1) {
        setTimeout(() => this.burnStates.delete(state.cardId), 1000);
      }
    });

    return { flameParticles: this.flameParticles };
  }

  private spawnFlameParticles(state: BurnState, count: number): void {
    const { cardRect, burnProgress } = state;
    const burnY = cardRect.y + cardRect.height * (1 - burnProgress * 0.8);
    const colors = ['#FF4500', '#FF6347', '#FF8C00', '#FFD700', '#8B0000'];

    for (let i = 0; i < count; i++) {
      const x = cardRect.x + Math.random() * cardRect.width;
      const y = burnY + (Math.random() - 0.3) * 10;
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.2;
      const speed = 1 + Math.random() * 2.5;
      const life = 600 + Math.random() * 900;
      const color = colors[Math.floor(Math.random() * colors.length)];

      this.flameParticles.push({
        id: genId(),
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 1 + Math.random() * 5,
        color,
        alpha: 1,
        life,
        maxLife: life,
      });
    }
  }

  private createAshParticle(state: BurnState, charIndex: number, char: string): AshParticle {
    const { cardRect, text } = state;
    const charsBefore = text.slice(0, charIndex).length;
    const row = Math.floor(charsBefore / 8);
    const col = charsBefore % 8;
    const x = cardRect.x + 16 + col * (cardRect.width - 32) / 8 + (Math.random() - 0.5) * 8;
    const y = cardRect.y + 60 + row * 28 + (Math.random() - 0.5) * 6;

    return {
      id: genId(),
      char,
      startX: x,
      startY: y,
      createdAt: performance.now(),
      driftPhase: Math.random() * TWO_PI,
    };
  }

  renderBaseFlame(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    flameAreaRect: { x: number; y: number; width: number; height: number }
  ): void {
    const cx = flameAreaRect.x + flameAreaRect.width / 2;
    const bottomY = flameAreaRect.y + flameAreaRect.height;
    const baseRadius = Math.min(flameAreaRect.width * 0.6, flameAreaRect.height * 0.9);

    for (let i = 9; i >= 0; i--) {
      const t = i / 9;
      const radius = baseRadius * (1 - t * 0.55);
      const centerY = bottomY - radius * 0.3;
      const alpha = 0.55 - t * 0.4;
      const color = lerpColor('#FF4500', '#8B0000', t);
      const angleOffset = (i % 2 === 0 ? -1 : 1) * 6 * (Math.PI / 180);
      const startAngle = Math.PI + angleOffset + (i * 4 * Math.PI) / 180;
      const endAngle = TWO_PI - angleOffset - (i * 4 * Math.PI) / 180;

      const gradient = ctx.createRadialGradient(cx, centerY, radius * 0.1, cx, centerY, radius);
      gradient.addColorStop(0, hexToRgba(color, alpha + 0.1));
      gradient.addColorStop(0.5, hexToRgba(color, alpha));
      gradient.addColorStop(1, hexToRgba(color, 0));

      ctx.beginPath();
      ctx.moveTo(cx, centerY);
      ctx.arc(cx, centerY, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();
    }

    const glowGradient = ctx.createRadialGradient(cx, bottomY, 0, cx, bottomY, baseRadius * 1.1);
    glowGradient.addColorStop(0, 'rgba(255,165,0,0.25)');
    glowGradient.addColorStop(0.5, 'rgba(255,69,0,0.1)');
    glowGradient.addColorStop(1, 'rgba(139,0,0,0)');
    ctx.fillStyle = glowGradient;
    ctx.fillRect(flameAreaRect.x - 50, flameAreaRect.y - 50, flameAreaRect.width + 100, flameAreaRect.height + 100);
  }

  renderFlameParticles(ctx: CanvasRenderingContext2D, particles: FlameParticle[]): void {
    for (const p of particles) {
      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
      gradient.addColorStop(0, hexToRgba(p.color, p.alpha));
      gradient.addColorStop(0.5, hexToRgba(p.color, p.alpha * 0.6));
      gradient.addColorStop(1, hexToRgba(p.color, 0));
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, TWO_PI);
      ctx.fill();
    }
  }

  static computeAshPosition(ash: AshParticle, now: number): { x: number; y: number; alpha: number; size: number; color: string } {
    const t = now - ash.createdAt;
    const progress = Math.min(1, t / ASH_TOTAL_DURATION);
    const amplitude = 2;
    const period = 3000;
    const drift = amplitude * Math.sin(ash.driftPhase + (t / period) * TWO_PI);
    const riseVelocity = 0.035;
    const x = ash.startX + drift + (Math.sin(ash.driftPhase * 1.7 + t / 900) * 8);
    const y = ash.startY - riseVelocity * t - progress * progress * 80;
    const alpha = progress < 0.85 ? 1 - progress * progress * 0.6 : Math.max(0, 1 - (progress - 0.85) / 0.15 * 1);
    const size = 3 - progress * 2;
    const color = lerpColor('#FFA500', '#D3D3D3', progress);

    return { x, y, alpha, size, color };
  }

  static isAshExpired(ash: AshParticle, now: number): boolean {
    return now - ash.createdAt >= ASH_TOTAL_DURATION;
  }
}
