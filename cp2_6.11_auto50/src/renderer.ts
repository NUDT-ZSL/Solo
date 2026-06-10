import { GameState, Talisman, ElementType, StoneWall } from './gameState';

interface Particle {
  active: boolean;
  x: number; y: number;
  vx: number; vy: number;
  radius: number;
  color: string;
  life: number; maxLife: number;
  kind: 'fire' | 'ice' | 'wind' | 'stone';
}

class ParticlePool {
  private store: Particle[];
  private alive: Particle[];

  constructor(cap: number) {
    this.store = [];
    this.alive = [];
    for (let i = 0; i < cap; i++) {
      this.store.push(this._blank());
    }
  }

  private _blank(): Particle {
    return { active: false, x: 0, y: 0, vx: 0, vy: 0, radius: 3, color: '#fff', life: 0.5, maxLife: 0.5, kind: 'fire' };
  }

  spawn(x: number, y: number, vx: number, vy: number, radius: number, color: string, life: number, kind: Particle['kind']): void {
    let p: Particle | undefined;
    for (const c of this.store) {
      if (!c.active) { p = c; break; }
    }
    if (!p) {
      this.alive.sort((a, b) => a.life - b.life);
      p = this.alive[0];
      if (!p) return;
    }
    p.active = true;
    p.x = x; p.y = y; p.vx = vx; p.vy = vy;
    p.radius = radius; p.color = color;
    p.life = life; p.maxLife = life; p.kind = kind;
    if (!this.alive.includes(p)) this.alive.push(p);
  }

  tick(dt: number): void {
    for (let i = this.alive.length - 1; i >= 0; i--) {
      const p = this.alive[i];
      p.x += p.vx;
      p.y += p.vy;
      switch (p.kind) {
        case 'fire': p.vy += 0.1; break;
        case 'wind': {
          const a = Math.atan2(p.vy, p.vx);
          const s = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
          p.vx = Math.cos(a + 0.08) * s;
          p.vy = Math.sin(a + 0.08) * s;
          break;
        }
        case 'stone': p.vy += 0.15; break;
      }
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        this.alive.splice(i, 1);
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.alive) {
      const a = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  count(): number { return this.alive.length; }

  clear(): void {
    for (const p of this.alive) p.active = false;
    this.alive.length = 0;
  }
}

const easeOut3 = (t: number) => 1 - Math.pow(1 - t, 3);

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private gs: GameState;
  private cell: number;
  private bx: number;
  private by: number;
  private bsize: number;
  private pool: ParticlePool;
  private t: number;
  private hover: { row: number; col: number } | null;
  private offCvs: HTMLCanvasElement;
  private offCtx: CanvasRenderingContext2D;
  private comboFlash: number;
  private bgDirty: boolean;

  constructor(canvas: HTMLCanvasElement, gs: GameState) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('no ctx');
    this.ctx = ctx;
    this.gs = gs;
    this.cell = 70;
    this.bx = 0; this.by = 0; this.bsize = 490;
    this.pool = new ParticlePool(200);
    this.t = 0;
    this.hover = null;
    this.comboFlash = 0;
    this.bgDirty = true;

    this.offCvs = document.createElement('canvas');
    const offCtx = this.offCvs.getContext('2d');
    if (!offCtx) throw new Error('no off ctx');
    this.offCtx = offCtx;

    this._resize();
    window.addEventListener('resize', () => { this.bgDirty = true; this._resize(); });
    gs.onCombo = () => { this.comboFlash = 0.5; };
  }

  private _resize(): void {
    const p = this.canvas.parentElement;
    if (!p) return;
    const w = p.clientWidth, h = p.clientHeight;
    this.canvas.width = w; this.canvas.height = h;
    this.offCvs.width = w; this.offCvs.height = h;
    this.bsize = Math.min(w * 0.5, 490);
    this.cell = this.bsize / GameState.GRID;
    this.bx = (w - this.bsize) / 2;
    this.by = (h - this.bsize) / 2 + 20;
  }

  update(dt: number): void {
    this.t += dt;
    if (this.comboFlash > 0) this.comboFlash -= dt;
    this.pool.tick(dt);
  }

  render(): void {
    const ctx = this.ctx;
    const w = this.canvas.width, h = this.canvas.height;

    if (this.bgDirty) {
      const g = this.offCtx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#0B0B2B'); g.addColorStop(1, '#1A0A3A');
      this.offCtx.fillStyle = g;
      this.offCtx.fillRect(0, 0, w, h);
      this.bgDirty = false;
    }
    ctx.drawImage(this.offCvs, 0, 0);

    this._drawBoard(ctx);
    this._drawFx(ctx);
    this._drawTalismans(ctx);
    this.pool.draw(ctx);
    this._drawPopups(ctx);
    this._drawHUD(ctx);

    if (this.comboFlash > 0) {
      ctx.save();
      ctx.globalAlpha = (this.comboFlash / 0.5) * 0.3;
      ctx.fillStyle = '#FFD700';
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
  }

  private _drawBoard(ctx: CanvasRenderingContext2D): void {
    const x = this.bx, y = this.by, sz = this.bsize, cs = this.cell;
    ctx.save();
    ctx.shadowColor = '#C5A55A80'; ctx.shadowBlur = 8;
    ctx.fillStyle = '#1C1C3A';
    ctx.fillRect(x - 2, y - 2, sz + 4, sz + 4);
    ctx.restore();

    ctx.strokeStyle = '#2A2A5A'; ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let i = 0; i <= GameState.GRID; i++) {
      ctx.moveTo(x + i * cs, y); ctx.lineTo(x + i * cs, y + sz);
      ctx.moveTo(x, y + i * cs); ctx.lineTo(x + sz, y + i * cs);
    }
    ctx.stroke();

    ctx.strokeStyle = '#1A1A2E'; ctx.lineWidth = 2;
    ctx.strokeRect(x, y, sz, sz);
  }

  private _drawFx(ctx: CanvasRenderingContext2D): void {
    for (const e of this.gs.iceEffects) {
      const x = this.bx + e.col * this.cell, y = this.by + e.row * this.cell, s = this.cell;
      const a = e.life / e.maxLife;
      ctx.strokeStyle = `rgba(224,255,255,${a})`; ctx.lineWidth = 1;
      ctx.strokeRect(x + 1, y + 1, s - 2, s - 2);
      ctx.fillStyle = `rgba(224,255,255,${a * 0.15})`;
      ctx.fillRect(x + 1, y + 1, s - 2, s - 2);
    }
    for (const sp of this.gs.lavaSpots) {
      const cx = this.bx + (sp.x + 0.5) * this.cell, cy = this.by + (sp.y + 0.5) * this.cell;
      const r = (20 / 70) * this.cell, a = sp.life / sp.maxLife;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, `rgba(255,69,0,${a * 0.6})`);
      g.addColorStop(0.5, `rgba(255,140,0,${a * 0.4})`);
      g.addColorStop(1, 'rgba(255,69,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    }
    for (const w of this.gs.stoneWalls) this._drawWall(ctx, w);
  }

  private _drawWall(ctx: CanvasRenderingContext2D, w: StoneWall): void {
    const cx = this.bx + (w.col + 0.5) * this.cell, cy = this.by + (w.row + 0.5) * this.cell;
    const a = w.isCollapsing ? Math.max(0, w.life / 0.5) : 1;
    ctx.fillStyle = `rgba(92,64,51,${a})`;
    if (w.direction === 'horizontal') {
      const ww = (20 / 70) * this.cell;
      ctx.fillRect(cx - ww / 2, cy - 1, ww, 2);
    } else {
      const hh = (20 / 70) * this.cell;
      ctx.fillRect(cx - 1, cy - hh / 2, 2, hh);
    }
    if (w.isCollapsing && Math.random() < 0.3) {
      const ang = Math.random() * Math.PI * 2, spd = 0.5 + Math.random();
      this.pool.spawn(cx, cy, Math.cos(ang) * spd, Math.sin(ang) * spd + 0.5, 2 + Math.random(), '#5C4033', 0.5, 'stone');
    }
  }

  private _drawTalismans(ctx: CanvasRenderingContext2D): void {
    for (let r = 0; r < GameState.GRID; r++)
      for (let c = 0; c < GameState.GRID; c++) {
        const t = this.gs.grid[r][c];
        if (t) this._drawOne(ctx, t);
      }
  }

  private _drawOne(ctx: CanvasRenderingContext2D, t: Talisman): void {
    let prog = 0;
    if (t.isMoving) prog = easeOut3(Math.min(1, t.moveProgress));
    const cr = t.startRow + (t.targetRow - t.startRow) * prog;
    const cc = t.startCol + (t.targetCol - t.startCol) * prog;
    const cx = this.bx + (cc + 0.5) * this.cell;
    const cy = this.by + (cr + 0.5) * this.cell;
    let sz = this.cell * 0.8;

    if (t.isRemoving) {
      sz *= 1 - t.removeProgress * 0.5;
      this._emitParticles(t.element, cx, cy);
    }
    if (t.isNew) sz *= 0.5 + t.newProgress * 0.5;

    const sel = this.gs.selectedTalisman?.id === t.id;
    const hov = this.hover?.row === t.row && this.hover?.col === t.col;
    if (hov && !t.isRemoving) sz *= 1.1;
    if (sel) this._drawGlow(ctx, cx, cy, sz);

    this._drawBody(ctx, t.element, cx, cy, sz);
    this._drawIcon(ctx, t.element, cx, cy, sz);
  }

  private _drawGlow(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    const g = size * 0.65, rot = this.t * Math.PI;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 2;
    ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 10;
    const pts = [{ x: -g, y: -g }, { x: g, y: -g }, { x: g, y: g }, { x: -g, y: g }];
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = pts[i], b = pts[(i + 1) % 4];
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      if (i === 0) ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo(mx, my, b.x, b.y);
    }
    ctx.closePath(); ctx.stroke();
    ctx.restore(); ctx.shadowBlur = 0;
  }

  private _drawBody(ctx: CanvasRenderingContext2D, el: ElementType, x: number, y: number, sz: number): void {
    const col = GameState.COLORS[el];
    const h = sz / 2, r = Math.min(8, h);
    ctx.save(); ctx.translate(x, y);
    const gr = ctx.createLinearGradient(-h, -h, h, h);
    gr.addColorStop(0, this._lt(col, 30)); gr.addColorStop(1, this._dk(col, 30));
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.moveTo(-h + r, -h);
    ctx.lineTo(h - r, -h); ctx.quadraticCurveTo(h, -h, h, -h + r);
    ctx.lineTo(h, h - r); ctx.quadraticCurveTo(h, h, h - r, h);
    ctx.lineTo(-h + r, h); ctx.quadraticCurveTo(-h, h, -h, h - r);
    ctx.lineTo(-h, -h + r); ctx.quadraticCurveTo(-h, -h, -h + r, -h);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = this._lt(col, 50); ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();
  }

  private _drawIcon(ctx: CanvasRenderingContext2D, el: ElementType, x: number, y: number, sz: number): void {
    const s = sz * 0.2;
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = '#FFF'; ctx.strokeStyle = '#FFF';
    ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    switch (el) {
      case 'fire': {
        ctx.beginPath();
        ctx.moveTo(0, -s); ctx.quadraticCurveTo(s * 1.2, -s * 0.5, s * 0.6, s * 0.4);
        ctx.quadraticCurveTo(s, s, 0, s * 1.2);
        ctx.quadraticCurveTo(-s, s, -s * 0.6, s * 0.4);
        ctx.quadraticCurveTo(-s * 1.2, -s * 0.5, 0, -s);
        ctx.fill();
        ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-s * 0.4, -s * 0.4);
        ctx.quadraticCurveTo(0, -s * 0.8, s * 0.4, -s * 0.4);
        ctx.quadraticCurveTo(s * 0.2, s * 0.1, 0, s * 0.2);
        ctx.quadraticCurveTo(-s * 0.2, s * 0.1, -s * 0.4, -s * 0.4);
        ctx.stroke();
        break;
      }
      case 'water': {
        ctx.beginPath();
        ctx.moveTo(0, -s); ctx.quadraticCurveTo(s * 1.5, 0, 0, s * 1.5);
        ctx.quadraticCurveTo(-s * 1.5, 0, 0, -s);
        ctx.fill();
        ctx.strokeStyle = '#E0FFFF'; ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-s * 0.6, -s * 0.2);
        ctx.quadraticCurveTo(-s * 0.3, -s * 0.4, 0, -s * 0.2);
        ctx.quadraticCurveTo(s * 0.3, 0, s * 0.6, -s * 0.2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-s * 0.5, s * 0.4);
        ctx.quadraticCurveTo(-s * 0.2, s * 0.2, s * 0.2, s * 0.4);
        ctx.quadraticCurveTo(s * 0.5, s * 0.6, s * 0.6, s * 0.4);
        ctx.stroke();
        break;
      }
      case 'wind': {
        for (let i = 0; i < 3; i++) {
          const rr = s * (0.6 + i * 0.5);
          const sa = -Math.PI / 2 + i * 0.5;
          ctx.beginPath();
          ctx.arc(0, 0, rr, sa, sa + Math.PI * 1.2);
          ctx.lineWidth = 2; ctx.stroke();
        }
        const ea = -Math.PI / 2 + Math.PI * 1.2;
        const tx = Math.cos(ea) * s * 1.6, ty = Math.sin(ea) * s * 1.6;
        ctx.beginPath();
        ctx.moveTo(tx, ty); ctx.lineTo(tx - s * 0.3, ty - s * 0.2);
        ctx.lineTo(tx - s * 0.1, ty + s * 0.3); ctx.closePath(); ctx.fill();
        break;
      }
      case 'earth': {
        ctx.beginPath();
        ctx.moveTo(0, -s); ctx.lineTo(s * 1.5, 0);
        ctx.lineTo(0, s); ctx.lineTo(-s * 1.5, 0); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#D2B48C'; ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-s * 0.5, -s * 0.4); ctx.lineTo(s * 0.5, -s * 0.4);
        ctx.moveTo(-s * 0.7, s * 0.2); ctx.lineTo(s * 0.7, s * 0.2);
        ctx.moveTo(-s * 0.3, s * 0.7); ctx.lineTo(s * 0.3, s * 0.7);
        ctx.stroke();
        break;
      }
    }
    ctx.restore();
  }

  private _emitParticles(el: ElementType, x: number, y: number): void {
    if (Math.random() > 0.6) return;
    switch (el) {
      case 'fire': {
        const cols = ['#FF4500', '#FF8C00', '#FFD700', '#FF6347'];
        for (let i = 0; i < 3; i++) {
          const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 2;
          this.pool.spawn(x, y, Math.cos(a) * sp, Math.sin(a) * sp - 1, 3 + Math.random() * 3, cols[i % cols.length], 0.8, 'fire');
        }
        break;
      }
      case 'water': {
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI * 2 * i) / 6 + Math.random() * 0.3, sp = 1 + Math.random();
          this.pool.spawn(x, y, Math.cos(a) * sp, Math.sin(a) * sp, 2 + Math.random() * 2, '#E0FFFF', 0.6, 'ice');
        }
        break;
      }
      case 'wind': {
        for (let i = 0; i < 4; i++) {
          const a = Math.random() * Math.PI * 2, sp = 1.5 + Math.random() * 1.5;
          this.pool.spawn(x, y, Math.cos(a) * sp, Math.sin(a) * sp, 2 + Math.random() * 2, '#90EE90', 0.7, 'wind');
        }
        break;
      }
      case 'earth': {
        for (let i = 0; i < 4; i++) {
          const a = Math.random() * Math.PI * 2, sp = 1 + Math.random() * 2;
          this.pool.spawn(x, y, Math.cos(a) * sp, Math.sin(a) * sp + 0.5, 2 + Math.random() * 3, '#8B4513', 0.5, 'stone');
        }
        break;
      }
    }
  }

  private _drawPopups(ctx: CanvasRenderingContext2D): void {
    for (const p of this.gs.scorePopups) {
      const x = this.bx + (p.x + 0.5) * this.cell, y = this.by + (p.y + 0.5) * this.cell;
      const pr = 1 - p.life / p.maxLife, a = p.life / p.maxLife;
      const sc = 1 + pr * 0.3, oy = -pr * 30;
      ctx.save(); ctx.translate(x, y + oy); ctx.scale(sc, sc);
      ctx.globalAlpha = a; ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 20px Microsoft YaHei,sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 10;
      ctx.fillText(p.isCombo ? `+${p.score} x2!` : `+${p.score}`, 0, 0);
      ctx.restore();
    }
  }

  private _drawHUD(ctx: CanvasRenderingContext2D): void {
    const cx = this.canvas.width / 2, ty = this.by - 60;
    this._drawTimer(ctx, cx - 80, ty);
    this._drawScore(ctx, cx + 40, ty);
  }

  private _drawTimer(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const rad = 20, pr = this.gs.timeLeft / GameState.DURATION;
    ctx.save(); ctx.translate(x, y);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, rad, 0, Math.PI * 2); ctx.stroke();
    const rv = Math.floor(255 * (1 - pr)), gv = Math.floor(255 * pr);
    const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, rad);
    gr.addColorStop(0, `rgb(${rv},${gv},0)`);
    gr.addColorStop(1, `rgb(${Math.floor(rv * 0.8)},${Math.floor(gv * 0.8)},0)`);
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.arc(0, 0, rad - 2, -Math.PI / 2, -Math.PI / 2 + pr * Math.PI * 2);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#FFF'; ctx.font = 'bold 16px Microsoft YaHei,sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(Math.ceil(this.gs.timeLeft).toString(), 0, 0);
    ctx.restore();
  }

  private _drawScore(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.save(); ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 18px Microsoft YaHei,sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 5;
    ctx.fillText(`得分: ${this.gs.score}`, x, y);
    ctx.restore();
  }

  setHover(r: number | null, c: number | null): void {
    this.hover = (r === null || c === null) ? null : { row: r, col: c };
  }

  hitTest(cx: number, cy: number): { row: number; col: number } | null {
    const rect = this.canvas.getBoundingClientRect();
    const x = cx - rect.left - this.bx, y = cy - rect.top - this.by;
    if (x < 0 || x >= this.bsize || y < 0 || y >= this.bsize) return null;
    const col = Math.floor(x / this.cell), row = Math.floor(y / this.cell);
    if (row >= 0 && row < GameState.GRID && col >= 0 && col < GameState.GRID) return { row, col };
    return null;
  }

  private _lt(c: string, p: number): string {
    const n = parseInt(c.slice(1), 16), a = Math.round(2.55 * p);
    const R = Math.min(255, (n >> 16) + a), G = Math.min(255, ((n >> 8) & 0xFF) + a), B = Math.min(255, (n & 0xFF) + a);
    return `#${((1 << 24) | (R << 16) | (G << 8) | B).toString(16).slice(1)}`;
  }

  private _dk(c: string, p: number): string {
    const n = parseInt(c.slice(1), 16), a = Math.round(2.55 * p);
    const R = Math.max(0, (n >> 16) - a), G = Math.max(0, ((n >> 8) & 0xFF) - a), B = Math.max(0, (n & 0xFF) - a);
    return `#${((1 << 24) | (R << 16) | (G << 8) | B).toString(16).slice(1)}`;
  }

  getCanvas(): HTMLCanvasElement { return this.canvas; }
}
