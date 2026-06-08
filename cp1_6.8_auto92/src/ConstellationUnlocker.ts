interface StarPoint {
  rx: number;
  ry: number;
}

interface Connection {
  from: number;
  to: number;
}

interface ConstellationDef {
  name: string;
  stars: StarPoint[];
  connections: Connection[];
}

interface ConstellationState {
  unlocked: boolean;
  unlockTime: number;
  lineProgress: number;
  completed: boolean;
}

const CONSTELLATIONS: ConstellationDef[] = [
  {
    name: '北斗',
    stars: [
      { rx: 0.12, ry: 0.15 }, { rx: 0.18, ry: 0.12 }, { rx: 0.24, ry: 0.14 },
      { rx: 0.28, ry: 0.18 }, { rx: 0.32, ry: 0.22 }, { rx: 0.36, ry: 0.20 },
      { rx: 0.34, ry: 0.26 },
    ],
    connections: [
      { from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 3 },
      { from: 3, to: 4 }, { from: 4, to: 5 }, { from: 5, to: 6 }, { from: 6, to: 3 },
    ],
  },
  {
    name: '仙后',
    stars: [
      { rx: 0.55, ry: 0.10 }, { rx: 0.60, ry: 0.16 }, { rx: 0.65, ry: 0.12 },
      { rx: 0.70, ry: 0.18 }, { rx: 0.75, ry: 0.13 },
    ],
    connections: [
      { from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 3 }, { from: 3, to: 4 },
    ],
  },
  {
    name: '天琴',
    stars: [
      { rx: 0.42, ry: 0.38 }, { rx: 0.40, ry: 0.44 }, { rx: 0.44, ry: 0.44 },
      { rx: 0.38, ry: 0.50 }, { rx: 0.46, ry: 0.50 },
    ],
    connections: [
      { from: 0, to: 1 }, { from: 0, to: 2 }, { from: 1, to: 3 },
      { from: 2, to: 4 }, { from: 3, to: 4 },
    ],
  },
  {
    name: '天鹰',
    stars: [
      { rx: 0.68, ry: 0.38 }, { rx: 0.72, ry: 0.42 }, { rx: 0.76, ry: 0.38 },
      { rx: 0.72, ry: 0.48 }, { rx: 0.70, ry: 0.54 }, { rx: 0.74, ry: 0.54 },
    ],
    connections: [
      { from: 0, to: 1 }, { from: 1, to: 2 }, { from: 1, to: 3 },
      { from: 3, to: 4 }, { from: 3, to: 5 },
    ],
  },
  {
    name: '织女',
    stars: [
      { rx: 0.48, ry: 0.62 }, { rx: 0.44, ry: 0.68 }, { rx: 0.52, ry: 0.68 },
      { rx: 0.42, ry: 0.74 }, { rx: 0.48, ry: 0.74 }, { rx: 0.54, ry: 0.74 },
      { rx: 0.48, ry: 0.80 },
    ],
    connections: [
      { from: 0, to: 1 }, { from: 0, to: 2 }, { from: 1, to: 3 },
      { from: 1, to: 4 }, { from: 2, to: 4 }, { from: 2, to: 5 },
      { from: 4, to: 6 },
    ],
  },
];

export const FRAGMENTS_PER_CONSTELLATION = 10;
export const TOTAL_CONSTELLATIONS = CONSTELLATIONS.length;

export class ConstellationUnlocker {
  private states: ConstellationState[];
  private onUnlockCallback: ((index: number) => void) | null = null;
  private onCompleteCallback: (() => void) | null = null;

  constructor() {
    this.states = CONSTELLATIONS.map(() => ({
      unlocked: false,
      unlockTime: 0,
      lineProgress: 0,
      completed: false,
    }));
  }

  onUnlock(cb: (index: number) => void): void {
    this.onUnlockCallback = cb;
  }

  onComplete(cb: () => void): void {
    this.onCompleteCallback = cb;
  }

  tryUnlock(collected: number, now: number): boolean {
    const idx = Math.floor(collected / FRAGMENTS_PER_CONSTELLATION) - 1;
    if (idx < 0 || idx >= CONSTELLATIONS.length) return false;
    const st = this.states[idx];
    if (st.unlocked) return false;
    st.unlocked = true;
    st.unlockTime = now;
    st.lineProgress = 0;
    if (this.onUnlockCallback) this.onUnlockCallback(idx);
    return true;
  }

  update(now: number, _dt: number): void {
    for (let i = 0; i < this.states.length; i++) {
      const st = this.states[i];
      if (!st.unlocked || st.completed) continue;
      const elapsed = now - st.unlockTime;
      const totalDuration = 2000;
      const lineCount = CONSTELLATIONS[i].connections.length;
      const perLine = totalDuration / lineCount;
      st.lineProgress = Math.min(elapsed / totalDuration, 1);
      if (st.lineProgress >= 1 && !st.completed) {
        st.completed = true;
        if (this.states.every(s => s.completed) && this.onCompleteCallback) {
          this.onCompleteCallback();
        }
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, now: number, w: number, h: number): void {
    for (let i = 0; i < CONSTELLATIONS.length; i++) {
      const def = CONSTELLATIONS[i];
      const st = this.states[i];
      if (!st.unlocked) continue;

      const stars = def.stars.map(s => ({ x: s.rx * w, y: s.ry * h }));

      const lineCount = def.connections.length;
      const progress = st.lineProgress;

      ctx.save();
      ctx.strokeStyle = 'rgba(180, 160, 255, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.shadowColor = 'rgba(180, 160, 255, 0.8)';
      ctx.shadowBlur = 8;

      for (let li = 0; li < lineCount; li++) {
        const lineStart = li / lineCount;
        const lineEnd = (li + 1) / lineCount;
        if (progress <= lineStart) break;

        const conn = def.connections[li];
        const a = stars[conn.from];
        const b = stars[conn.to];
        const t = Math.min((progress - lineStart) / (lineEnd - lineStart), 1);
        const easeT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(a.x + (b.x - a.x) * easeT, a.y + (b.y - a.y) * easeT);
        ctx.stroke();
      }
      ctx.restore();

      for (let si = 0; si < stars.length; si++) {
        const star = stars[si];
        const connectionDrawn = this.isStarVisible(def, si, progress);
        if (!connectionDrawn) continue;

        const blink = 0.5 + 0.5 * Math.sin(now * 0.003 + si * 1.7 + i * 2.3);
        const starAlpha = st.completed ? 0.7 + 0.3 * blink : 0.5 + 0.5 * blink;

        ctx.save();
        ctx.globalAlpha = starAlpha;
        const glow = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, 10);
        glow.addColorStop(0, '#ffffff');
        glow.addColorStop(0.4, 'rgba(180, 160, 255, 0.6)');
        glow.addColorStop(1, 'rgba(180, 160, 255, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(star.x, star.y, 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(star.x, star.y, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      if (st.completed || st.lineProgress > 0.3) {
        const nameAlpha = st.completed ? 0.8 : st.lineProgress;
        ctx.save();
        ctx.globalAlpha = nameAlpha;
        ctx.fillStyle = 'rgba(200, 180, 255, 0.9)';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        const firstStar = stars[0];
        ctx.fillText(def.name, firstStar.x, firstStar.y - 16);
        ctx.restore();
      }
    }
  }

  private isStarVisible(def: ConstellationDef, starIdx: number, progress: number): boolean {
    const lineCount = def.connections.length;
    for (let li = 0; li < lineCount; li++) {
      const lineStart = li / lineCount;
      if (progress <= lineStart) break;
      const conn = def.connections[li];
      if (conn.from === starIdx || conn.to === starIdx) return true;
    }
    return false;
  }

  getUnlockCount(): number {
    return this.states.filter(s => s.unlocked).length;
  }

  getCompletedCount(): number {
    return this.states.filter(s => s.completed).length;
  }

  getConstellationName(idx: number): string {
    return CONSTELLATIONS[idx]?.name ?? '';
  }

  reset(): void {
    this.states = CONSTELLATIONS.map(() => ({
      unlocked: false,
      unlockTime: 0,
      lineProgress: 0,
      completed: false,
    }));
  }
}
