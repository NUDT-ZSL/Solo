import { SonarWave, Frequency } from './SonarSystem';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface CellRenderInfo {
  type: number;
  revealed: boolean;
  hitCount: number;
}

export interface RenderState {
  level: number;
  score: number;
  mapSize: number;
  grid: CellRenderInfo[][];
  playerPos: { x: number; y: number };
  exitPos: { x: number; y: number };
  exitUnlocked: boolean;
  treasuresCollected: number;
  treasuresTotal: number;
  gamePhase: string;
  victoryTimer: number;
  offsetX: number;
  offsetY: number;
  cellSize: number;
}

const FREQ_COLORS: Record<Frequency, { r: number; g: number; b: number }> = {
  low: { r: 100, g: 180, b: 255 },
  mid: { r: 0, g: 230, b: 170 },
  high: { r: 200, g: 80, b: 255 },
};

export class MapRenderer {
  private ctx: CanvasRenderingContext2D;
  private cw = 0;
  private ch = 0;
  private time = 0;
  private reefCache: Map<string, number[][]> = new Map();

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  render(state: RenderState, waves: SonarWave[], particles: Particle[], dt: number): void {
    this.time += dt;
    const ctx = this.ctx;
    this.cw = ctx.canvas.width;
    this.ch = ctx.canvas.height;

    ctx.clearRect(0, 0, this.cw, this.ch);
    this.drawBackground();
    this.drawGrid(state);
    this.drawCells(state);
    this.drawExit(state);
    this.drawWaves(waves);
    this.drawPlayer(state);
    this.drawParticles(particles);
    if (state.gamePhase === 'victory') {
      this.drawVictory(state);
    }
  }

  private drawBackground(): void {
    const ctx = this.ctx;
    const grad = ctx.createLinearGradient(0, 0, this.cw * 0.3, this.ch);
    grad.addColorStop(0, '#080d28');
    grad.addColorStop(0.45, '#0c1235');
    grad.addColorStop(1, '#180a32');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.cw, this.ch);

    ctx.save();
    ctx.globalAlpha = 0.025;
    for (let i = 0; i < 30; i++) {
      const x = (this.time * 6 + i * 137.5) % this.cw;
      const y = (this.time * 4 + i * 89.3 + Math.sin(i) * 50) % this.ch;
      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = '#4488ff';
      ctx.fill();
    }
    ctx.restore();
  }

  private drawGrid(state: RenderState): void {
    const ctx = this.ctx;
    const { offsetX: ox, offsetY: oy, cellSize: cs, mapSize } = state;
    ctx.save();
    ctx.strokeStyle = 'rgba(25, 45, 95, 0.35)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= mapSize; i++) {
      ctx.beginPath();
      ctx.moveTo(ox + i * cs, oy);
      ctx.lineTo(ox + i * cs, oy + mapSize * cs);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ox, oy + i * cs);
      ctx.lineTo(ox + mapSize * cs, oy + i * cs);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawCells(state: RenderState): void {
    const { offsetX: ox, offsetY: oy, cellSize: cs, mapSize, grid } = state;
    for (let row = 0; row < mapSize; row++) {
      for (let col = 0; col < mapSize; col++) {
        const cell = grid[row][col];
        const x = ox + col * cs;
        const y = oy + row * cs;
        if (cell.type === 1) {
          this.drawObstacle(x, y, cs);
        } else if (cell.type === 2 && cell.revealed) {
          this.drawTreasure(x, y, cs, cell.hitCount);
        } else if (cell.type === 3 && cell.revealed) {
          this.drawReef(x, y, cs, row, col);
        }
      }
    }
  }

  private drawObstacle(x: number, y: number, cs: number): void {
    const ctx = this.ctx;
    const p = cs * 0.05;
    ctx.save();
    const g = ctx.createLinearGradient(x, y, x + cs, y + cs);
    g.addColorStop(0, '#18244e');
    g.addColorStop(1, '#0e1638');
    ctx.fillStyle = g;
    this.roundRect(x + p, y + p, cs - p * 2, cs - p * 2, 3);
    ctx.fill();
    ctx.strokeStyle = 'rgba(50, 80, 140, 0.45)';
    ctx.lineWidth = 1;
    this.roundRect(x + p, y + p, cs - p * 2, cs - p * 2, 3);
    ctx.stroke();
    ctx.restore();
  }

  private drawTreasure(x: number, y: number, cs: number, hitCount: number): void {
    const ctx = this.ctx;
    const cx = x + cs / 2;
    const cy = y + cs / 2;
    const sz = cs * 0.32;
    const glow = Math.min(1, hitCount / 3);
    const pulse = 0.8 + Math.sin(this.time * 3.5) * 0.2;

    ctx.save();
    ctx.shadowColor = `rgba(255,200,50,${glow * 0.75})`;
    ctx.shadowBlur = 14 * glow;
    ctx.fillStyle = `rgba(255,200,50,${(0.25 + glow * 0.5) * pulse})`;
    this.roundRect(cx - sz, cy - sz, sz * 2, sz * 2, 4);
    ctx.fill();
    ctx.strokeStyle = `rgba(255,220,80,${(0.4 + glow * 0.55) * pulse})`;
    ctx.lineWidth = 2;
    this.roundRect(cx - sz, cy - sz, sz * 2, sz * 2, 4);
    ctx.stroke();
    if (glow >= 1) {
      ctx.shadowBlur = 20;
      ctx.fillStyle = `rgba(255,240,150,${0.35 * pulse})`;
      this.roundRect(cx - sz * 0.5, cy - sz * 0.5, sz, sz, 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawReef(x: number, y: number, cs: number, row: number, col: number): void {
    const ctx = this.ctx;
    const cx = x + cs / 2;
    const cy = y + cs / 2;
    const key = `${row},${col}`;

    let pts = this.reefCache.get(key);
    if (!pts) {
      const sides = 5 + Math.floor(this.srand(row * 100 + col) * 4);
      pts = [];
      for (let i = 0; i < sides; i++) {
        const a = (i / sides) * Math.PI * 2 - Math.PI / 2;
        const r = cs * 0.22 + this.srand(row * 53 + col * 7 + i) * cs * 0.16;
        pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
      }
      this.reefCache.set(key, pts);
    }

    const pulse = 0.7 + Math.sin(this.time * 2.5 + row * 0.7 + col * 1.3) * 0.3;

    ctx.save();
    ctx.shadowColor = `rgba(255,60,80,${0.55 * pulse})`;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    ctx.fillStyle = `rgba(255,60,80,${0.2 * pulse})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(255,80,100,${0.45 * pulse})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  private drawExit(state: RenderState): void {
    const ctx = this.ctx;
    const { offsetX: ox, offsetY: oy, cellSize: cs, exitPos, exitUnlocked } = state;
    const cx = ox + exitPos.x * cs + cs / 2;
    const cy = oy + exitPos.y * cs + cs / 2;
    const pulse = exitUnlocked
      ? 0.55 + Math.sin(this.time * 4) * 0.45
      : 0.12 + Math.sin(this.time * 1.5) * 0.08;

    ctx.save();
    ctx.shadowColor = exitUnlocked
      ? `rgba(50,255,100,${pulse * 0.7})`
      : `rgba(100,100,150,${pulse * 0.4})`;
    ctx.shadowBlur = exitUnlocked ? 22 : 6;

    const sz = cs * 0.28;
    ctx.beginPath();
    ctx.moveTo(cx, cy - sz);
    ctx.lineTo(cx + sz, cy);
    ctx.lineTo(cx, cy + sz);
    ctx.lineTo(cx - sz, cy);
    ctx.closePath();

    ctx.fillStyle = exitUnlocked
      ? `rgba(50,255,100,${0.35 * pulse})`
      : `rgba(100,100,150,${0.12 * pulse})`;
    ctx.fill();
    ctx.strokeStyle = exitUnlocked
      ? `rgba(50,255,100,${0.65 * pulse})`
      : `rgba(100,100,150,${0.25 * pulse})`;
    ctx.lineWidth = 2;
    ctx.stroke();

    if (exitUnlocked) {
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(cx, cy, sz * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(100,255,150,${0.5 * pulse})`;
      ctx.fill();
    }
    ctx.restore();
  }

  private drawWaves(waves: SonarWave[]): void {
    for (const wave of waves) {
      const color = FREQ_COLORS[wave.frequency];
      if (wave.active && wave.opacity > 0.01) {
        this.drawWaveRing(wave.originX, wave.originY, wave.currentRadius, wave.opacity, color, wave.frequency, false);
      }
      for (const r of wave.reflections) {
        if (r.active && r.opacity > 0.01) {
          this.drawWaveRing(r.originX, r.originY, r.currentRadius, r.opacity * 0.65, color, wave.frequency, r.noiseOffset !== 0);
        }
      }
    }
  }

  private drawWaveRing(
    cx: number, cy: number, radius: number,
    opacity: number, color: { r: number; g: number; b: number },
    freq: Frequency, noisy: boolean
  ): void {
    if (radius < 1) return;
    const ctx = this.ctx;
    const lw = freq === 'low' ? 2.8 : freq === 'mid' ? 2.2 : 1.8;
    const alpha = opacity * 0.85;

    ctx.save();
    ctx.shadowColor = `rgba(${color.r},${color.g},${color.b},${alpha * 0.55})`;
    ctx.shadowBlur = 14;
    ctx.strokeStyle = `rgba(${color.r},${color.g},${color.b},${alpha})`;
    ctx.lineWidth = lw;

    ctx.beginPath();
    if (noisy) {
      const seg = 60;
      for (let i = 0; i <= seg; i++) {
        const a = (i / seg) * Math.PI * 2;
        const n = (Math.random() - 0.5) * 8;
        const px = cx + Math.cos(a) * (radius + n);
        const py = cy + Math.sin(a) * (radius + n);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
    } else {
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    }
    ctx.stroke();

    if (!noisy && radius > 6) {
      ctx.shadowBlur = 0;
      ctx.strokeStyle = `rgba(${color.r},${color.g},${color.b},${alpha * 0.25})`;
      ctx.lineWidth = lw * 0.35;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 0.96, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawPlayer(state: RenderState): void {
    const ctx = this.ctx;
    const { offsetX: ox, offsetY: oy, cellSize: cs, playerPos } = state;
    const cx = ox + playerPos.x * cs + cs / 2;
    const cy = oy + playerPos.y * cs + cs / 2;
    const r = cs * 0.24;
    const pulse = 0.85 + Math.sin(this.time * 3.2) * 0.15;

    ctx.save();
    ctx.shadowColor = 'rgba(80,200,255,0.75)';
    ctx.shadowBlur = 16;

    ctx.beginPath();
    ctx.arc(cx, cy, r * pulse, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(80,200,255,0.5)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(130,225,255,0.85)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(190,245,255,0.9)';
    ctx.fill();
    ctx.restore();
  }

  private drawParticles(particles: Particle[]): void {
    const ctx = this.ctx;
    for (const p of particles) {
      if (p.life <= 0) continue;
      const alpha = p.life / p.maxLife;
      const sz = p.size * (0.3 + alpha * 0.7);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 5;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, sz, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawVictory(state: RenderState): void {
    const ctx = this.ctx;
    const cx = this.cw / 2;
    const cy = this.ch / 2;
    const t = state.victoryTimer;

    ctx.save();
    ctx.fillStyle = `rgba(0,0,0,${Math.min(0.3, t * 0.15)})`;
    ctx.fillRect(0, 0, this.cw, this.ch);

    for (let i = 0; i < 4; i++) {
      const elapsed = t - i * 0.25;
      if (elapsed < 0) continue;
      const radius = elapsed * 180;
      const opacity = Math.max(0, 1 - elapsed * 0.4);
      ctx.shadowColor = `rgba(255,200,50,${opacity * 0.5})`;
      ctx.shadowBlur = 28;
      ctx.strokeStyle = `rgba(255,200,50,${opacity * 0.75})`;
      ctx.lineWidth = 4 - i * 0.8;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (t > 0.5) {
      const ta = Math.min(1, (t - 0.5) * 2);
      ctx.shadowBlur = 0;
      ctx.font = `bold ${Math.min(48, this.cw * 0.05)}px "Segoe UI", system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = `rgba(255,220,80,${ta})`;
      ctx.fillText('✦ 层通关 ✦', cx, cy);
    }
    ctx.restore();
  }

  clearCaches(): void {
    this.reefCache.clear();
  }

  private roundRect(x: number, y: number, w: number, h: number, r: number): void {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  private srand(seed: number): number {
    const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }
}
