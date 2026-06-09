import { GameState, CellType, TrailParticle, EffectParticle, Crystal, VineGrowth } from '../types';
import { ParticleSystem } from './particles';

const BG_COLOR = '#0A1F0A';
const VINE_BASE_COLOR = '#B0E57C';
const VINE_BODY_COLOR = 'rgba(120, 220, 90, 0.85)';
const VINE_STROKE_COLOR = '#2E6B1C';
const CRYSTAL_COLOR_BASE = '#7FD8FF';
const CRYSTAL_ACTIVATED = '#B4FFD6';
const WALL_COLOR_1 = '#1C3A1C';
const WALL_COLOR_2 = '#12301A';
const TRAP_COLOR = '#6B3D2E';
const TRAP_TOOTH = '#C24F35';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private offscreen: HTMLCanvasElement | null = null;
  private offCtx: CanvasRenderingContext2D | null = null;
  private lastGridKey = '';
  private time: number = 0;

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;
  }

  resize(width: number, height: number, dpr = 1): void {
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.offscreen = null;
    this.lastGridKey = '';
  }

  render(state: GameState, particles: ParticleSystem, dt: number): void {
    this.time += dt;
    const { ctx } = this;
    const W = this.canvas.clientWidth;
    const H = this.canvas.clientHeight;
    const mazePxW = state.gridSize * state.cellSize;
    const mazePxH = state.gridSize * state.cellSize;
    const offsetX = (W - mazePxW) / 2;
    const offsetY = (H - mazePxH) / 2;

    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, W, H);

    this.drawAmbientVignette(W, H);
    this.renderStaticLayer(state, offsetX, offsetY);
    this.renderVineGrowths(state, offsetX, offsetY);
    this.renderCrystals(state, offsetX, offsetY);
    this.renderExit(state, offsetX, offsetY);
    this.renderSeed(state, offsetX, offsetY);

    ctx.save();
    ctx.translate(offsetX, offsetY);
    this.renderTrail(particles.trail);
    this.renderEffects(particles.effects);
    ctx.restore();

    this.renderOverlay(state, W, H);
  }

  private gridKey(state: GameState): string {
    let s = `${state.gridSize}|${state.cellSize}|`;
    for (let y = 0; y < state.gridSize; y++) {
      for (let x = 0; x < state.gridSize; x++) {
        s += state.grid[y][x];
      }
    }
    return s;
  }

  private ensureOffscreen(state: GameState): void {
    const key = this.gridKey(state);
    if (this.offscreen && this.lastGridKey === key) return;
    const mazePx = state.gridSize * state.cellSize;
    this.offscreen = document.createElement('canvas');
    this.offscreen.width = mazePx;
    this.offscreen.height = mazePx;
    const octx = this.offscreen.getContext('2d');
    if (!octx) return;
    this.paintMazeWalls(octx, state);
    this.paintExistingVines(octx, state);
    this.offCtx = octx;
    this.lastGridKey = key;
  }

  private paintMazeWalls(octx: CanvasRenderingContext2D, state: GameState): void {
    const { gridSize, cellSize: S } = state;
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const t = state.grid[y][x];
        const px = x * S;
        const py = y * S;
        if (t === CellType.WALL) {
          this.drawMossWall(octx, px, py, S, x, y);
        } else if (t === CellType.TRAP) {
          this.drawMossWall(octx, px, py, S, x, y);
          this.drawTrapTeeth(octx, px, py, S);
        } else if (t === CellType.EMPTY) {
          octx.fillStyle = 'rgba(5, 20, 8, 0.5)';
          octx.fillRect(px, py, S, S);
        }
      }
    }
  }

  private paintExistingVines(octx: CanvasRenderingContext2D, state: GameState): void {
    const { gridSize, cellSize: S } = state;
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const t = state.grid[y][x];
        if (t === CellType.VINE || t === CellType.START) {
          const px = x * S;
          const py = y * S;
          this.drawVineBase(octx, px, py, S);
          this.drawVineStrip(octx, px, py, S);
        }
      }
    }
  }

  private drawMossWall(
    octx: CanvasRenderingContext2D,
    px: number,
    py: number,
    S: number,
    gx: number,
    gy: number,
  ): void {
    const grad = octx.createLinearGradient(px, py, px + S, py + S);
    grad.addColorStop(0, WALL_COLOR_1);
    grad.addColorStop(1, WALL_COLOR_2);
    octx.fillStyle = grad;
    octx.fillRect(px, py, S, S);

    const seed = (gx * 73856093) ^ (gy * 19349663);
    let rng = Math.abs(Math.sin(seed)) * 10000;
    const rand = () => {
      rng = Math.abs(Math.sin(rng)) * 10000;
      return rng - Math.floor(rng);
    };
    const dots = Math.floor((S * S) / 60);
    for (let i = 0; i < dots; i++) {
      const rx = px + rand() * S;
      const ry = py + rand() * S;
      const rs = 0.8 + rand() * 2.2;
      const hue = 80 + rand() * 40;
      const light = 15 + rand() * 20;
      octx.fillStyle = `hsla(${hue}, 45%, ${light}%, 0.75)`;
      octx.beginPath();
      octx.arc(rx, ry, rs, 0, Math.PI * 2);
      octx.fill();
    }

    octx.strokeStyle = 'rgba(6, 30, 10, 0.55)';
    octx.lineWidth = 1;
    octx.strokeRect(px + 0.5, py + 0.5, S - 1, S - 1);
  }

  private drawTrapTeeth(octx: CanvasRenderingContext2D, px: number, py: number, S: number): void {
    const teeth = 6;
    const tw = S / teeth;
    octx.fillStyle = TRAP_TOOTH;
    for (let side = 0; side < 4; side++) {
      octx.beginPath();
      if (side === 0) {
        for (let i = 0; i < teeth; i++) {
          const bx = px + i * tw;
          octx.moveTo(bx, py);
          octx.lineTo(bx + tw / 2, py + S * 0.22);
          octx.lineTo(bx + tw, py);
        }
      } else if (side === 1) {
        for (let i = 0; i < teeth; i++) {
          const bx = px + i * tw;
          octx.moveTo(bx, py + S);
          octx.lineTo(bx + tw / 2, py + S * 0.78);
          octx.lineTo(bx + tw, py + S);
        }
      } else if (side === 2) {
        for (let i = 0; i < teeth; i++) {
          const by = py + i * tw;
          octx.moveTo(px, by);
          octx.lineTo(px + S * 0.22, by + tw / 2);
          octx.lineTo(px, by + tw);
        }
      } else {
        for (let i = 0; i < teeth; i++) {
          const by = py + i * tw;
          octx.moveTo(px + S, by);
          octx.lineTo(px + S * 0.78, by + tw / 2);
          octx.lineTo(px + S, by + tw);
        }
      }
      octx.closePath();
      octx.fill();
    }
    octx.strokeStyle = TRAP_COLOR;
    octx.lineWidth = 1.5;
    octx.strokeRect(px + 2, py + 2, S - 4, S - 4);
  }

  private drawVineBase(octx: CanvasRenderingContext2D, px: number, py: number, S: number): void {
    octx.fillStyle = VINE_BASE_COLOR + 'CC';
    octx.fillRect(px, py, S, S);
  }

  private drawVineStrip(octx: CanvasRenderingContext2D, px: number, py: number, S: number): void {
    const cx = px + S / 2;
    const cy = py + S / 2;
    octx.strokeStyle = VINE_STROKE_COLOR;
    octx.lineWidth = 1.5;
    const pad = S * 0.12;
    octx.strokeRect(px + pad, py + pad, S - pad * 2, S - pad * 2);
    octx.fillStyle = VINE_BODY_COLOR;
    const r = S * 0.18;
    octx.beginPath();
    octx.roundRect(cx - r, cy - r, r * 2, r * 2, r * 0.6);
    octx.fill();
  }

  private renderStaticLayer(state: GameState, ox: number, oy: number): void {
    this.ensureOffscreen(state);
    if (this.offscreen) {
      this.ctx.drawImage(this.offscreen, ox, oy);
    }
  }

  private renderVineGrowths(state: GameState, ox: number, oy: number): void {
    const { cellSize: S } = state;
    for (const g of state.vineGrowths) {
      this.drawGrowingVine(ox + g.x * S, oy + g.y * S, S, g.progress);
    }
  }

  private drawGrowingVine(px: number, py: number, S: number, progress: number): void {
    const ctx = this.ctx;
    const p = Math.max(0, Math.min(1, progress));
    const alpha = 0.2 + p * 0.8;
    const cx = px + S / 2;
    const cy = py + S / 2;

    ctx.fillStyle = `rgba(176, 229, 124, ${alpha * 0.8})`;
    ctx.fillRect(px, py, S, S);

    const half = (S / 2) * p;
    ctx.fillStyle = VINE_BODY_COLOR.replace('0.85', `${alpha}`);
    ctx.fillRect(cx - half, cy - S * 0.06, half * 2, S * 0.12);
    ctx.fillRect(cx - S * 0.06, cy - half, S * 0.12, half * 2);

    ctx.strokeStyle = VINE_STROKE_COLOR;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = alpha;
    const pad = S * 0.12;
    const inner = (S - pad * 2) * p;
    ctx.strokeRect(cx - inner / 2, cy - inner / 2, inner, inner);
    ctx.globalAlpha = 1;

    if (p < 1) {
      const ringR = (S / 2) * p;
      const glowAlpha = (1 - p) * 0.7;
      const g = ctx.createRadialGradient(cx, cy, ringR * 0.2, cx, cy, ringR * 1.4);
      g.addColorStop(0, `rgba(200, 255, 140, ${glowAlpha})`);
      g.addColorStop(1, 'rgba(200, 255, 140, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(px, py, S, S);
    }
  }

  private renderCrystals(state: GameState, ox: number, oy: number): void {
    const { cellSize: S } = state;
    for (const c of state.crystals) {
      this.drawCrystal(ox + c.x * S, oy + c.y * S, S, c, this.time);
    }
  }

  private drawCrystal(
    px: number,
    py: number,
    S: number,
    c: Crystal,
    t: number,
  ): void {
    const ctx = this.ctx;
    const cx = px + S / 2;
    const cy = py + S / 2;
    const pulse = 0.75 + 0.25 * Math.sin(t * 3 + c.glowPhase);
    const color = c.activated ? CRYSTAL_ACTIVATED : CRYSTAL_COLOR_BASE;
    const glowR = S * (c.activated ? 0.9 : 0.75) * pulse;

    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
    g.addColorStop(0, `${color}AA`);
    g.addColorStop(0.5, `${color}44`);
    g.addColorStop(1, `${color}00`);
    ctx.fillStyle = g;
    ctx.fillRect(px - S * 0.2, py - S * 0.2, S * 1.4, S * 1.4);

    const r = S * 0.28;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(t * (c.activated ? 1.2 : 0.6));
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(r * 0.7, -r * 0.2);
    ctx.lineTo(r * 0.7, r * 0.4);
    ctx.lineTo(0, r);
    ctx.lineTo(-r * 0.7, r * 0.4);
    ctx.lineTo(-r * 0.7, -r * 0.2);
    ctx.closePath();
    const cg = ctx.createLinearGradient(0, -r, 0, r);
    cg.addColorStop(0, c.activated ? '#E6FFF2' : '#D0F5FF');
    cg.addColorStop(1, color);
    ctx.fillStyle = cg;
    ctx.fill();
    ctx.strokeStyle = c.activated ? '#78E5B3' : '#5FBFD9';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-r * 0.3, -r * 0.5);
    ctx.lineTo(-r * 0.05, r * 0.3);
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  private renderExit(state: GameState, ox: number, oy: number): void {
    if (!state.exitActive || !state.exitPos) return;
    const { cellSize: S } = state;
    const px = ox + state.exitPos.x * S;
    const py = oy + state.exitPos.y * S;
    const cx = px + S / 2;
    const cy = py + S / 2;
    const t = this.time;

    const huePhase = 0.5 + 0.5 * Math.sin(t * (Math.PI * 2) / 1.5);
    const r1 = Math.floor(255);
    const g1 = Math.floor(215 + 40 * (1 - huePhase));
    const b1 = Math.floor(0 + 50 * huePhase);
    const color1 = `rgb(${r1},${g1},${b1})`;
    const color2 = `#FFA500`;

    const pulse = 0.7 + 0.3 * Math.sin(t * 5);
    const glowR = S * 1.1 * pulse;
    const g = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
    g.addColorStop(0, `${color1}CC`);
    g.addColorStop(0.5, `${color2}66`);
    g.addColorStop(1, `${color2}00`);
    this.ctx.fillStyle = g;
    this.ctx.fillRect(px - S, py - S, S * 3, S * 3);

    this.ctx.save();
    this.ctx.translate(cx, cy);
    for (let ring = 0; ring < 3; ring++) {
      this.ctx.save();
      this.ctx.rotate(t * (1.4 + ring * 0.6) * (ring % 2 === 0 ? 1 : -1));
      const inner = S * (0.15 + ring * 0.13);
      const outer = S * (0.28 + ring * 0.11);
      this.ctx.strokeStyle = ring === 0 ? color1 : color2;
      this.ctx.globalAlpha = 0.7 - ring * 0.18;
      this.ctx.lineWidth = 2.2;
      this.ctx.beginPath();
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
        const rad = inner + (outer - inner) * (0.5 + 0.5 * Math.sin(a * 4 + ring));
        const x = Math.cos(a) * rad;
        const y = Math.sin(a) * rad;
        if (a === 0) this.ctx.moveTo(x, y);
        else this.ctx.lineTo(x, y);
      }
      this.ctx.closePath();
      this.ctx.stroke();
      this.ctx.restore();
    }
    this.ctx.restore();
  }

  private renderSeed(state: GameState, ox: number, oy: number): void {
    const { seed, cellSize: S } = state;
    const px = ox + seed.renderX * S + S / 2;
    const py = oy + seed.renderY * S + S / 2;

    const glowR = 40;
    const g = this.ctx.createRadialGradient(px, py, 0, px, py, glowR);
    g.addColorStop(0, 'rgba(200, 255, 140, 0.55)');
    g.addColorStop(0.4, 'rgba(168, 255, 120, 0.25)');
    g.addColorStop(1, 'rgba(168, 255, 120, 0)');
    this.ctx.fillStyle = g;
    this.ctx.fillRect(px - glowR, py - glowR, glowR * 2, glowR * 2);

    const r = 8;
    const cg = this.ctx.createRadialGradient(px - r * 0.3, py - r * 0.3, 1, px, py, r);
    cg.addColorStop(0, '#FFFFFF');
    cg.addColorStop(0.35, '#D8FFA8');
    cg.addColorStop(1, '#5ABF46');
    this.ctx.fillStyle = cg;
    this.ctx.beginPath();
    this.ctx.arc(px, py, r, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.strokeStyle = 'rgba(90, 191, 70, 0.9)';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();
  }

  private renderTrail(trail: TrailParticle[]): void {
    const ctx = this.ctx;
    for (const p of trail) {
      const a = Math.max(0, p.life / p.maxLife);
      const t = p.colorPhase;
      const r1 = 168, g1 = 255, b1 = 120;
      const r2 = 240, g2 = 230, b2 = 140;
      const rr = Math.round(r1 + (r2 - r1) * t);
      const gg = Math.round(g1 + (g2 - g1) * t);
      const bb = Math.round(b1 + (b2 - b1) * t);
      const size = Math.max(0.5, p.size * p.sizeJitter);
      ctx.fillStyle = `rgba(${rr},${gg},${bb},${a * 0.9})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private renderEffects(effects: EffectParticle[]): void {
    const ctx = this.ctx;
    for (const p of effects) {
      const a = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = `hsla(${p.hue}, ${p.saturation}%, ${p.lightness}%, ${a})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.3, p.size * (0.4 + a * 0.6)), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawAmbientVignette(W: number, H: number): void {
    const ctx = this.ctx;
    const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0, 10, 2, 0.65)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  private renderOverlay(state: GameState, W: number, H: number): void {
    const ctx = this.ctx;
    if (state.phase === 'transition') {
      const p = Math.max(0, Math.min(1, state.transitionProgress));
      const edge = p;
      const grad = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * (0.5 - edge * 0.55), W / 2, H / 2, Math.max(W, H) * 0.75);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, '#000000');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    } else if (state.phase === 'levelBanner') {
      const t = state.bannerTimer;
      const alpha = t > 1.5 ? Math.max(0, (2 - t) / 0.5) : Math.min(1, t / 0.4);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = 'rgba(255, 215, 0, 0.12)';
      ctx.fillRect(0, H / 2 - 70, W, 140);
      ctx.font = 'bold 52px system-ui, "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#FFE57F';
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 20;
      ctx.fillText(`第 ${state.level} 关`, W / 2, H / 2);
      ctx.restore();
    }
  }
}
