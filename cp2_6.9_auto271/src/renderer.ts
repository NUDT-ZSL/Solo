import { GameEngine, PIECE_SYMBOLS, Piece, PIECE_VALUES } from './gameEngine';

const LIGHT_SQUARE = '#D4C9B3';
const DARK_SQUARE = '#4A3E34';
const GOLD_BORDER = '#C9A96E';
const PLAYER_PIECE = '#F0E6D0';
const AI_PIECE = '#8A7F70';
const GOLD_GLOW = '#FFD700';
const LEGAL_MOVE = '#00FF4455';
const DRAGON_START = '#FF4500';
const DRAGON_END = '#FF8C00';
const GRAVEYARD_BG = '#1A1A1A99';
const VITALITY_GREEN = '#00FF41';
const BUTTON_GRAY = '#5A5A5A';
const BUTTON_RED = '#FF3333';
const FLOW_COLOR = '#FF6600';

export class Renderer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  engine: GameEngine;

  cellSize: number = 60;
  boardX: number = 0;
  boardY: number = 0;
  graveyardWidth: number = 200;
  topBarHeight: number = 60;
  isCompact: boolean = false;
  hoverResign: boolean = false;
  hoverConfirm: boolean = false;
  hoverCancel: boolean = false;
  showConfirm: boolean = false;
  clickScale: { resign: number; confirm: number; cancel: number } = { resign: 1, confirm: 1, cancel: 1 };

  constructor(canvas: HTMLCanvasElement, engine: GameEngine) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context failed');
    this.ctx = ctx;
    this.engine = engine;
  }

  resize(): void {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const compact = vw < 960;
    this.isCompact = compact;
    this.cellSize = compact ? 40 : 60;
    this.graveyardWidth = compact ? 120 : 200;
    this.topBarHeight = compact ? 40 : 60;

    const boardPx = this.cellSize * 8;
    const totalW = boardPx + (compact ? 0 : this.graveyardWidth);
    const totalH = boardPx + this.topBarHeight + (compact ? this.graveyardWidth * 0.6 : 0);

    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = totalW * dpr;
    this.canvas.height = totalH * dpr;
    this.canvas.style.width = totalW + 'px';
    this.canvas.style.height = totalH + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  render(now: number): void {
    const ctx = this.ctx;
    const w = this.canvas.width / (window.devicePixelRatio || 1);
    const h = this.canvas.height / (window.devicePixelRatio || 1);

    ctx.clearRect(0, 0, w, h);

    this.drawBackground(w, h);

    const boardPx = this.cellSize * 8;
    this.boardX = this.isCompact ? (w - boardPx) / 2 : (w - boardPx - this.graveyardWidth) / 2;
    this.boardY = this.topBarHeight;

    this.drawTopBar(w);
    this.drawBoard(now);
    this.drawGraveyard(w, h);

    this.drawConfirmModal(w, h);
  }

  drawBackground(w: number, h: number): void {
    const ctx = this.ctx;
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h));
    g.addColorStop(0, '#1C1814');
    g.addColorStop(1, '#0D0A08');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  drawTopBar(w: number): void {
    const ctx = this.ctx;
    const barH = this.topBarHeight;
    const fontSize = this.isCompact ? 12 : 16;

    ctx.fillStyle = '#FFFFFF';
    ctx.font = `${fontSize}px 'Press Start 2P'`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    const turnText = `T${this.engine.turnCount}`;
    ctx.fillText(turnText, 20, barH / 2);

    ctx.textAlign = 'center';
    const pVit = this.engine.getTotalVitality('player');
    const aVit = this.engine.getTotalVitality('ai');
    ctx.fillStyle = VITALITY_GREEN;
    ctx.font = `${this.isCompact ? 10 : 12}px 'Press Start 2P'`;
    ctx.fillText(`P ${pVit} : ${aVit} A`, w / 2, barH / 2);

    const btnSize = (this.isCompact ? 32 : 40);
    const btnX = w - btnSize / 2 - 20;
    const btnY = barH / 2;
    const r = (this.isCompact ? 16 : 20) * this.clickScale.resign;
    ctx.beginPath();
    ctx.arc(btnX, btnY, r, 0, Math.PI * 2);
    const rg = ctx.createRadialGradient(btnX, btnY, 0, btnX, btnY, r);
    if (this.hoverResign) {
      rg.addColorStop(0, BUTTON_RED);
      rg.addColorStop(1, '#AA1111');
      ctx.shadowColor = BUTTON_RED;
      ctx.shadowBlur = 8;
    } else {
      rg.addColorStop(0, BUTTON_GRAY);
      rg.addColorStop(1, '#3A3A3A');
      ctx.shadowColor = GOLD_BORDER;
      ctx.shadowBlur = 0;
    }
    ctx.fillStyle = rg;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = GOLD_BORDER;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = `${this.isCompact ? 8 : 10}px 'Press Start 2P'`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('投', btnX, btnY);

    (this as any)._resignBtn = { x: btnX, y: btnY, r: this.isCompact ? 20 : 22 };
  }

  drawBoard(now: number): void {
    const ctx = this.ctx;
    const cs = this.cellSize;
    const bx = this.boardX;
    const by = this.boardY;
    const size = cs * 8;

    ctx.save();
    ctx.shadowColor = GOLD_BORDER;
    ctx.shadowBlur = 2;
    ctx.strokeStyle = GOLD_BORDER;
    ctx.lineWidth = 2;
    ctx.strokeRect(bx - 1, by - 1, size + 2, size + 2);
    ctx.restore();

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const x = bx + c * cs;
        const y = by + r * cs;
        const isLight = (r + c) % 2 === 0;
        ctx.fillStyle = this.engine.dragonBreath[r][c]
          ? (() => {
            const g = ctx.createLinearGradient(x, y, x + cs, y + cs);
            g.addColorStop(0, DRAGON_START);
            g.addColorStop(1, DRAGON_END);
            return g;
          })()
          : (isLight ? LIGHT_SQUARE : DARK_SQUARE);
        ctx.fillRect(x, y, cs, cs);

        if (this.engine.dragonBreath[r][c]) {
          this.drawDragonFlow(x, y, cs, now);
        }
      }
    }

    for (const m of this.engine.legalMoves) {
      const x = bx + m.toCol * cs;
      const y = by + m.toRow * cs;
      ctx.fillStyle = LEGAL_MOVE;
      ctx.fillRect(x, y, cs, cs);
      if (m.captured) {
        ctx.strokeStyle = '#FF333388';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, cs - 2, cs - 2);
      }
    }

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = this.engine.board[r][c];
        if (p) this.drawPiece(p, now);
      }
    }

    for (const a of this.engine.capturedAnimations) {
      this.drawCapturedAnim(a);
    }

    for (const p of this.engine.particles) {
      const alpha = p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      const x = bx + (p.x + 0.5) * cs;
      const y = by + (p.y + 0.5) * cs;
      ctx.beginPath();
      ctx.arc(x, y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (this.engine.aiThinking) {
      const t = (now % 1000) / 1000;
      const dots = '.'.repeat(Math.floor(t * 3) + 1);
      ctx.save();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `${this.isCompact ? 10 : 12}px 'Press Start 2P'`;
      ctx.textAlign = 'center';
      const alpha = 0.5 + 0.5 * Math.sin(now / 100);
      ctx.globalAlpha = alpha;
      ctx.fillText(`思考中${dots}`, bx + size / 2, by + 20);
      ctx.restore();
    }
  }

  drawDragonFlow(x: number, y: number, cs: number, now: number): void {
    const ctx = this.ctx;
    const period = 1500;
    const t = (now % period) / period;
    const perimeter = cs * 4;
    const offset = t * perimeter;

    const pts: [number, number][] = [];
    for (let i = 0; i < 4; i++) {
      let d = (offset + i * (perimeter / 4)) % perimeter;
      let px: number, py: number;
      if (d < cs) { px = x + d; py = y; }
      else if (d < cs * 2) { px = x + cs; py = y + (d - cs); }
      else if (d < cs * 3) { px = x + cs - (d - cs * 2); py = y + cs; }
      else { px = x; py = y + cs - (d - cs * 3); }
      pts.push([px, py]);
    }

    ctx.save();
    for (const [px, py] of pts) {
      ctx.fillStyle = FLOW_COLOR;
      ctx.shadowColor = FLOW_COLOR;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawPiece(p: Piece, now: number): void {
    const ctx = this.ctx;
    const cs = this.cellSize;
    const bx = this.boardX;
    const by = this.boardY;
    const cx = bx + p.col * cs + cs / 2;
    const cy = by + p.row * cs + cs / 2;
    const radius = cs * 0.42;

    const isSelected = this.engine.selected?.piece.id === p.id;
    if (isSelected) {
      const pulse = 0.5 + 0.5 * Math.sin(now / 250);
      ctx.save();
      ctx.strokeStyle = GOLD_GLOW;
      ctx.lineWidth = 2;
      ctx.shadowColor = GOLD_GLOW;
      ctx.shadowBlur = 8 + 4 * pulse;
      ctx.globalAlpha = 0.6 + 0.4 * pulse;
      ctx.beginPath();
      ctx.arc(cx, cy + radius + 3, 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.fillStyle = p.owner === 'player' ? PLAYER_PIECE : AI_PIECE;
    ctx.shadowColor = '#00000088';
    ctx.shadowBlur = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#00000044';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = p.owner === 'player' ? '#333333' : '#111111';
    const symSize = this.isCompact ? 18 : 28;
    ctx.font = `${symSize}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(PIECE_SYMBOLS[p.type], cx, cy + 1);
    ctx.restore();

    if (p.vitality < 5) {
      ctx.save();
      ctx.fillStyle = p.vitality > 2 ? VITALITY_GREEN : '#FF4444';
      ctx.font = `${this.isCompact ? 7 : 9}px 'Press Start 2P'`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText(String(p.vitality), cx + radius - 2, cy + radius - 1);
      ctx.restore();
    }
  }

  drawCapturedAnim(a: { piece: Piece; startX: number; startY: number; endX: number; endY: number; progress: number; rotation: number }): void {
    const ctx = this.ctx;
    const cs = this.cellSize;
    const bx = this.boardX;
    const by = this.boardY;
    const t = a.progress;
    const ease = 1 - Math.pow(1 - t, 2);
    const cx = bx + (a.startX + (a.endX - a.startX) * ease + 0.5) * cs;
    const cy = by + (a.startY + (a.endY - a.startY) * ease + 0.5) * cs;
    const scale = 1 - t * 0.5;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(a.rotation);
    ctx.scale(scale, scale);
    const radius = cs * 0.42;
    ctx.globalAlpha = 1 - t;
    ctx.fillStyle = a.piece.owner === 'player' ? PLAYER_PIECE : AI_PIECE;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = a.piece.owner === 'player' ? '#333333' : '#111111';
    ctx.font = `${this.isCompact ? 18 : 28}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(PIECE_SYMBOLS[a.piece.type], 0, 1);
    ctx.restore();
  }

  drawGraveyard(w: number, h: number): void {
    const ctx = this.ctx;
    const cs = this.cellSize;
    const size = cs * 8;
    let gx: number, gy: number, gw: number, gh: number;

    if (this.isCompact) {
      gx = this.boardX;
      gy = this.boardY + size + 10;
      gw = size;
      gh = this.graveyardWidth * 0.5;
    } else {
      gx = this.boardX + size + 10;
      gy = this.boardY;
      gw = this.graveyardWidth - 10;
      gh = size;
    }

    ctx.save();
    ctx.fillStyle = GRAVEYARD_BG;
    ctx.fillRect(gx, gy, gw, gh);
    ctx.strokeStyle = GOLD_BORDER + '66';
    ctx.lineWidth = 1;
    ctx.strokeRect(gx, gy, gw, gh);

    ctx.fillStyle = '#C9A96E';
    ctx.font = `${this.isCompact ? 8 : 10}px 'Press Start 2P'`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    const halfH = gh / 2;
    ctx.fillText('AI阵亡', gx + 8, gy + 8);
    ctx.fillText('玩家阵亡', gx + 8, gy + halfH + 8);

    this.drawGraveyardPieces(this.engine.aiCaptured, gx + 8, gy + 24, gw - 16, halfH - 32);
    this.drawGraveyardPieces(this.engine.playerCaptured, gx + 8, gy + halfH + 24, gw - 16, halfH - 32);
    ctx.restore();
  }

  drawGraveyardPieces(pieces: Piece[], x: number, y: number, w: number, h: number): void {
    if (pieces.length === 0) return;
    const ctx = this.ctx;
    const ps = Math.min(20, w / 8, h);
    let cx = x, cy = y;
    for (const p of pieces) {
      const rad = ps * 0.42;
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = p.owner === 'player' ? PLAYER_PIECE : AI_PIECE;
      ctx.beginPath();
      ctx.arc(cx + rad, cy + rad, rad, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = p.owner === 'player' ? '#333333' : '#111111';
      ctx.font = `${ps * 0.6}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(PIECE_SYMBOLS[p.type], cx + rad, cy + rad + 1);
      ctx.restore();
      cx += ps + 2;
      if (cx + ps > x + w) { cx = x; cy += ps + 2; }
    }
  }

  drawConfirmModal(w: number, h: number): void {
    if (!this.showConfirm) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = '#000000AA';
    ctx.fillRect(0, 0, w, h);

    const mw = this.isCompact ? 260 : 340;
    const mh = this.isCompact ? 140 : 180;
    const mx = (w - mw) / 2;
    const my = (h - mh) / 2;

    ctx.fillStyle = '#1C1814';
    ctx.fillRect(mx, my, mw, mh);
    ctx.strokeStyle = GOLD_BORDER;
    ctx.lineWidth = 2;
    ctx.strokeRect(mx, my, mw, mh);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = `${this.isCompact ? 10 : 14}px 'Press Start 2P'`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('确认认输?', w / 2, my + mh * 0.3);

    const btnW = this.isCompact ? 80 : 100;
    const btnH = this.isCompact ? 28 : 36;
    const by = my + mh * 0.65;

    const drawBtn = (label: string, bx: number, hov: boolean, scaleKey: 'confirm' | 'cancel', color: string) => {
      ctx.save();
      const s = this.clickScale[scaleKey];
      ctx.translate(bx, by);
      ctx.scale(s, s);
      ctx.fillStyle = hov ? color : BUTTON_GRAY;
      ctx.shadowColor = hov ? color : 'transparent';
      ctx.shadowBlur = hov ? 6 : 0;
      ctx.fillRect(-btnW / 2, -btnH / 2, btnW, btnH);
      ctx.strokeStyle = GOLD_BORDER;
      ctx.lineWidth = 2;
      ctx.strokeRect(-btnW / 2, -btnH / 2, btnW, btnH);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `${this.isCompact ? 8 : 10}px 'Press Start 2P'`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, 0, 0);
      ctx.restore();
    };

    const cx1 = mx + mw * 0.3;
    const cx2 = mx + mw * 0.7;
    drawBtn('确定', cx1, this.hoverConfirm, 'confirm', '#FF3333');
    drawBtn('取消', cx2, this.hoverCancel, 'cancel', '#4488FF');

    (this as any)._confirmBtn = { x: cx1 - btnW / 2, y: by - btnH / 2, w: btnW, h: btnH };
    (this as any)._cancelBtn = { x: cx2 - btnW / 2, y: by - btnH / 2, w: btnW, h: btnH };
    ctx.restore();
  }

  handleClick(mx: number, my: number): 'resign' | 'confirm' | 'cancel' | 'board' | null {
    const self = this as any;

    if (this.showConfirm) {
      const cb = self._confirmBtn;
      const xb = self._cancelBtn;
      if (cb && mx >= cb.x && mx <= cb.x + cb.w && my >= cb.y && my <= cb.y + cb.h) return 'confirm';
      if (xb && mx >= xb.x && mx <= xb.x + xb.w && my >= xb.y && my <= xb.y + xb.h) return 'cancel';
      return null;
    }

    const rb = self._resignBtn;
    if (rb) {
      const dx = mx - rb.x, dy = my - rb.y;
      if (dx * dx + dy * dy <= rb.r * rb.r) return 'resign';
    }
    return 'board';
  }

  getBoardCell(mx: number, my: number): { row: number; col: number } | null {
    const cs = this.cellSize;
    const bx = this.boardX;
    const by = this.boardY;
    const size = cs * 8;
    if (mx < bx || mx >= bx + size || my < by || my >= by + size) return null;
    return {
      col: Math.floor((mx - bx) / cs),
      row: Math.floor((my - by) / cs)
    };
  }

  updateHover(mx: number, my: number): void {
    const self = this as any;
    this.hoverResign = false;
    this.hoverConfirm = false;
    this.hoverCancel = false;

    if (this.showConfirm) {
      const cb = self._confirmBtn;
      const xb = self._cancelBtn;
      if (cb) this.hoverConfirm = mx >= cb.x && mx <= cb.x + cb.w && my >= cb.y && my <= cb.y + cb.h;
      if (xb) this.hoverCancel = mx >= xb.x && mx <= xb.x + xb.w && my >= xb.y && my <= xb.y + xb.h;
      return;
    }

    const rb = self._resignBtn;
    if (rb) {
      const dx = mx - rb.x, dy = my - rb.y;
      this.hoverResign = dx * dx + dy * dy <= rb.r * rb.r;
    }
  }
}
