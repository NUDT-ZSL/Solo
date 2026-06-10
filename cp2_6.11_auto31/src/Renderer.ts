import {
  GameState,
  GridCoord,
  Piece,
  Viewport,
  GRID_SIZE,
  RHOMBUS_SIZE,
  RHOMBUS_STEP,
  COLORS,
} from './types';
import { GameEngine } from './GameEngine';

const TILT_X = 15 * Math.PI / 180;
const TILT_Y = 5 * Math.PI / 180;
const CAMERA_DISTANCE = 3000;
const FOCAL_LENGTH = 2000;
const FLOAT_AMPLITUDE = 3;
const FLOAT_SPEED = 2;
const FLOAT_BASE_HEIGHT = 20;

export interface UIElement {
  rect: { x: number; y: number; w: number; h: number };
  onClick: () => void;
  type: 'button' | 'modal';
  id: string;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private engine: GameEngine;
  private offscreenBoard: HTMLCanvasElement | null = null;
  private offscreenCtx: CanvasRenderingContext2D | null = null;
  private boardDirty = true;
  public uiElements: UIElement[] = [];
  public viewport: Viewport = {
    width: 0,
    height: 0,
    dpr: 1,
    isMobile: false,
    scale: 1,
    boardCenterX: 0,
    boardCenterY: 0,
  };

  constructor(canvas: HTMLCanvasElement, engine: GameEngine) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;
    this.engine = engine;
    this.resize();
  }

  public resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const isMobile = w < 768;
    const dpr = isMobile ? Math.min(1.5, window.devicePixelRatio || 1) : (window.devicePixelRatio || 1);
    const scale = isMobile ? 0.7 : 1;

    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.viewport = {
      width: w,
      height: h,
      dpr,
      isMobile,
      scale,
      boardCenterX: isMobile ? w * 0.5 : w * 0.4,
      boardCenterY: isMobile ? h * 0.42 : h * 0.5,
    };

    if (this.offscreenBoard) {
      this.offscreenBoard.width = this.canvas.width;
      this.offscreenBoard.height = this.canvas.height;
    }
    this.boardDirty = true;
  }

  public ensureOffscreen(): CanvasRenderingContext2D {
    if (!this.offscreenBoard) {
      this.offscreenBoard = document.createElement('canvas');
      this.offscreenBoard.width = this.canvas.width;
      this.offscreenBoard.height = this.canvas.height;
    }
    if (!this.offscreenCtx) {
      const c = this.offscreenBoard.getContext('2d');
      if (!c) throw new Error('Offscreen ctx failed');
      this.offscreenCtx = c;
    }
    return this.offscreenCtx;
  }

  public boardToScreen(gx: number, gy: number, extraZ: number = 0): { x: number; y: number; scale: number } {
    const s = this.viewport.scale;
    const cosY = Math.cos(TILT_Y);
    const sinY = Math.sin(TILT_Y);
    const cosX = Math.cos(TILT_X);
    const sinX = Math.sin(TILT_X);

    let x = gx;
    let y = gy;
    let z = 0 + extraZ;

    let x1 = x * cosY + z * sinY;
    let z1 = -x * sinY + z * cosY;
    let y1 = y;

    let y2 = y1 * cosX - z1 * sinX;
    let z2 = y1 * sinX + z1 * cosX;
    let x2 = x1;

    const cameraZ = CAMERA_DISTANCE;
    const perspectiveScale = FOCAL_LENGTH / (cameraZ - z2);

    return {
      x: this.viewport.boardCenterX + x2 * s * perspectiveScale,
      y: this.viewport.boardCenterY + y2 * s * perspectiveScale,
      scale: perspectiveScale,
    };
  }

  public screenToBoard(sx: number, sy: number): { x: number; y: number } {
    const s = this.viewport.scale;
    const dx = (sx - this.viewport.boardCenterX) / s;
    const dy = (sy - this.viewport.boardCenterY) / s;

    const cosY = Math.cos(TILT_Y);
    const sinY = Math.sin(TILT_Y);
    const cosX = Math.cos(TILT_X);
    const sinX = Math.sin(TILT_X);

    const gx = dx / cosY;
    const z = -gx * sinY;
    const gy = (dy + z * sinX) / cosX;
    return { x: gx, y: gy };
  }

  public worldGridPoint(c: GridCoord): { x: number; y: number; scale: number } {
    const cos30 = Math.cos(Math.PI / 6);
    const sin30 = Math.sin(Math.PI / 6);
    const gx = RHOMBUS_STEP * (cos30 * c.q + cos30 * 0.5 * c.r);
    const gy = RHOMBUS_STEP * (sin30 * c.r);
    return this.boardToScreen(gx, gy);
  }

  public getPieceRenderPos(piece: Piece, time: number): { x: number; y: number; scale: number; floatOffset: number } {
    const floatOffset = FLOAT_BASE_HEIGHT + FLOAT_AMPLITUDE * Math.sin(time * FLOAT_SPEED + piece.flowPhase);
    if (piece.isMoving && piece.movePath.length > 0) {
      const from = this.engine.gridToWorld(piece.position);
      const toCoord = piece.movePath[0];
      const to = this.engine.gridToWorld(toCoord);
      const t = piece.moveProgress;
      const gx = from.x + (to.x - from.x) * t;
      const gy = from.y + (to.y - from.y) * t;
      const result = this.boardToScreen(gx, gy);
      return { ...result, floatOffset };
    }
    const result = this.worldGridPoint(piece.position);
    return { ...result, floatOffset };
  }

  public render(state: GameState): void {
    const ctx = this.ctx;
    const vp = this.viewport;

    const grad = ctx.createLinearGradient(0, 0, vp.width, vp.height);
    grad.addColorStop(0, COLORS.deepPurple);
    grad.addColorStop(1, COLORS.mirrorSilver);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, vp.width, vp.height);

    this.drawBackgroundStars(ctx, state.time);

    ctx.save();
    this.drawBoardCached(ctx, state);
    ctx.restore();

    ctx.save();
    this.drawValidMoves(ctx, state);
    ctx.restore();

    ctx.save();
    this.drawAfterimages(ctx, state);
    ctx.restore();

    ctx.save();
    this.drawPieces(ctx, state);
    ctx.restore();

    ctx.save();
    this.drawFragments(ctx, state);
    this.drawParticles(ctx, state);
    ctx.restore();

    ctx.save();
    this.drawStatePanel(ctx, state);
    ctx.restore();

    if (state.showSurrenderModal) {
      this.drawSurrenderModal(ctx, state);
    }

    if (state.winner) {
      this.drawVictory(ctx, state);
    }
  }

  private drawBackgroundStars(ctx: CanvasRenderingContext2D, time: number): void {
    const { width, height } = this.viewport;
    ctx.save();
    for (let i = 0; i < 60; i++) {
      const x = ((i * 137.5) % width);
      const y = ((i * 97.3) % height);
      const tw = 0.3 + 0.3 * Math.sin(time * 2 + i);
      ctx.fillStyle = `rgba(180,200,255,${tw})`;
      ctx.fillRect(x, y, 1.5, 1.5);
    }
    ctx.restore();
  }

  private drawBoardCached(ctx: CanvasRenderingContext2D, _state: GameState): void {
    this.drawBoardGrids(ctx);
  }

  private drawBoardGrids(ctx: CanvasRenderingContext2D): void {
    const cos30 = Math.cos(Math.PI / 6);
    const halfSize = RHOMBUS_SIZE / 2;

    for (let q = 0; q < GRID_SIZE; q++) {
      for (let r = 0; r < GRID_SIZE; r++) {
        const gx = RHOMBUS_STEP * (cos30 * q + cos30 * 0.5 * r);
        const gy = RHOMBUS_STEP * (0.5 * r);
        const cx = gx;
        const cy = gy;

        const c1 = this.boardToScreen(cx - cos30 * halfSize, cy - 0 * halfSize);
        const c2 = this.boardToScreen(cx, cy - halfSize);
        const c3 = this.boardToScreen(cx + cos30 * halfSize, cy);
        const c4 = this.boardToScreen(cx, cy + halfSize);

        ctx.save();
        const isCenter = (q === 6 && r === 6);
        ctx.shadowColor = isCenter ? COLORS.techBlue : 'rgba(74,144,217,0.3)';
        ctx.shadowBlur = isCenter ? 14 : 5;
        ctx.beginPath();
        ctx.moveTo(c1.x, c1.y);
        ctx.lineTo(c2.x, c2.y);
        ctx.lineTo(c3.x, c3.y);
        ctx.lineTo(c4.x, c4.y);
        ctx.closePath();

        const fillGrad = ctx.createLinearGradient(c1.x, c1.y, c3.x, c3.y);
        fillGrad.addColorStop(0, 'rgba(74,144,217,0.04)');
        fillGrad.addColorStop(0.5, 'rgba(255,255,255,0.02)');
        fillGrad.addColorStop(1, 'rgba(74,144,217,0.06)');
        ctx.fillStyle = fillGrad;
        ctx.fill();

        ctx.strokeStyle = COLORS.gridLine;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  private drawValidMoves(ctx: CanvasRenderingContext2D, state: GameState): void {
    const cos30 = Math.cos(Math.PI / 6);
    const halfSize = RHOMBUS_SIZE / 2;

    for (const mv of state.validMoves) {
      const sp = this.worldGridPoint(mv);
      const corners = [
        { x: -cos30 * halfSize, y: 0 },
        { x: 0, y: -halfSize },
        { x: cos30 * halfSize, y: 0 },
        { x: 0, y: halfSize },
      ].map(c => {
        const gx = this.engine.gridToWorld(mv).x + c.x;
        const gy = this.engine.gridToWorld(mv).y + c.y;
        return this.boardToScreen(gx, gy);
      });

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(corners[0].x, corners[0].y);
      for (let i = 1; i < corners.length; i++) ctx.lineTo(corners[i].x, corners[i].y);
      ctx.closePath();
      ctx.fillStyle = 'rgba(0,255,136,0.18)';
      ctx.shadowColor = COLORS.energyGreen;
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,255,136,0.5)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      ctx.save();
      void sp;
      ctx.restore();
    }

    for (const aid of state.validAttacks) {
      const piece = state.pieces.find(p => p.id === aid);
      if (!piece) continue;
      const pos = this.worldGridPoint(piece.position);
      ctx.save();
      ctx.beginPath();
      ctx.arc(pos.x, pos.y - 14, 24, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(217,74,74,0.7)';
      ctx.lineWidth = 2;
      ctx.shadowColor = COLORS.warningRed;
      ctx.shadowBlur = 12;
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawPieces(ctx: CanvasRenderingContext2D, state: GameState): void {
    const sorted = [...state.pieces]
      .filter(p => p.hp > 0)
      .sort((a, b) => (a.position.r + a.position.q * 0.1) - (b.position.r + b.position.q * 0.1));

    for (const piece of sorted) {
      this.drawSinglePiece(ctx, piece, state);
    }
  }

  private drawSinglePiece(ctx: CanvasRenderingContext2D, piece: Piece, state: GameState): void {
    const pos = this.getPieceRenderPos(piece, state.time);
    const isSelected = state.selectedPieceId === piece.id;
    const color = piece.faction === 'blue' ? COLORS.techBlue : COLORS.warningRed;
    const pieceSize = 20 * pos.scale;

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(pos.x, pos.y + 8 * pos.scale, 18 * pos.scale, 6 * pos.scale, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fill();
    ctx.restore();

    if (isSelected) {
      ctx.save();
      const pulse = 0.5 + 0.5 * Math.sin(state.time * 4);
      ctx.beginPath();
      ctx.arc(pos.x, pos.y - pos.floatOffset, 26 * pos.scale + pulse * 3, 0, Math.PI * 2);
      ctx.strokeStyle = piece.faction === 'blue' ? 'rgba(74,144,217,0.7)' : 'rgba(217,74,74,0.7)';
      ctx.lineWidth = 2;
      ctx.shadowColor = color;
      ctx.shadowBlur = 16;
      ctx.stroke();
      ctx.restore();
    }

    if (piece.attackPulsePhase > 0) {
      const p = 1 - piece.attackPulsePhase;
      const rad = (15 + p * 30) * pos.scale;
      ctx.save();
      ctx.beginPath();
      ctx.arc(pos.x, pos.y - pos.floatOffset, rad, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(217,74,74,${1 - p})`;
      ctx.lineWidth = 3;
      ctx.shadowColor = COLORS.warningRed;
      ctx.shadowBlur = 20;
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(pos.x, pos.y - pos.floatOffset);
    ctx.scale(pos.scale, pos.scale);
    this.drawOctahedron(ctx, 20, color, piece.flowPhase);
    ctx.restore();

    ctx.save();
    ctx.font = 'bold 14px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeStyle = 'rgba(0,0,0,0.9)';
    ctx.lineWidth = 3;
    ctx.fillStyle = '#ffffff';
    const txt = String(piece.hp);
    const by = pos.y - pos.floatOffset - 28;
    ctx.strokeText(txt, pos.x, by);
    ctx.fillText(txt, pos.x, by);
    ctx.restore();
  }

  private drawOctahedron(
    ctx: CanvasRenderingContext2D,
    size: number,
    color: string,
    flowPhase: number
  ): void {
    const top = { x: 0, y: -size };
    const bottom = { x: 0, y: size };
    const fl = { x: -size * 0.8, y: 0 };
    const fr = { x: size * 0.8, y: 0 };
    const ml = { x: -size * 0.3, y: -size * 0.15 };
    const mr = { x: size * 0.3, y: size * 0.15 };

    const rgb = this.hexToRgb(color);
    const makeRgba = (a: number) => `rgba(${rgb.r},${rgb.g},${rgb.b},${a})`;

    const faces = [
      { pts: [top, ml, mr], shade: 0.9 },
      { pts: [top, mr, fr], shade: 0.7 },
      { pts: [top, fl, ml], shade: 0.6 },
      { pts: [bottom, ml, fl], shade: 0.5 },
      { pts: [bottom, mr, ml], shade: 0.8 },
      { pts: [bottom, fr, mr], shade: 0.55 },
    ];

    for (const f of faces) {
      ctx.beginPath();
      ctx.moveTo(f.pts[0].x, f.pts[0].y);
      for (let i = 1; i < f.pts.length; i++) ctx.lineTo(f.pts[i].x, f.pts[i].y);
      ctx.closePath();
      ctx.fillStyle = makeRgba(0.55 * f.shade);
      ctx.fill();
    }

    const flowPos = (flowPhase / (Math.PI * 2)) % 1;
    const flowY = -size + size * 2 * flowPos;
    const flowWidth = size * 0.7;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.lineTo(fl.x, fl.y);
    ctx.lineTo(bottom.x, bottom.y);
    ctx.lineTo(fr.x, fr.y);
    ctx.closePath();
    ctx.clip();

    ctx.globalCompositeOperation = 'screen';

    for (let layer = 0; layer < 3; layer++) {
      const layerAlpha = 0.25 + layer * 0.2;
      const layerWidth = flowWidth * (1 - layer * 0.15);
      const g = ctx.createLinearGradient(0, flowY - layerWidth, 0, flowY + layerWidth);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.5, `rgba(255,255,255,${layerAlpha})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(fl.x - 5, flowY - layerWidth, fr.x - fl.x + 10, layerWidth * 2);
    }

    const edgeVertGrad = ctx.createLinearGradient(0, flowY - flowWidth * 0.7, 0, flowY + flowWidth * 0.7);
    edgeVertGrad.addColorStop(0, 'rgba(255,255,255,0)');
    edgeVertGrad.addColorStop(0.5, 'rgba(255,255,255,0.9)');
    edgeVertGrad.addColorStop(1, 'rgba(255,255,255,0)');

    const edgeWidth = size * 0.25;

    ctx.save();
    ctx.beginPath();
    ctx.rect(fl.x, flowY - flowWidth, edgeWidth, flowWidth * 2);
    ctx.clip();
    ctx.fillStyle = edgeVertGrad;
    ctx.fillRect(fl.x, flowY - flowWidth, edgeWidth, flowWidth * 2);
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.rect(fr.x - edgeWidth, flowY - flowWidth, edgeWidth, flowWidth * 2);
    ctx.clip();
    ctx.fillStyle = edgeVertGrad;
    ctx.fillRect(fr.x - edgeWidth, flowY - flowWidth, edgeWidth, flowWidth * 2);
    ctx.restore();

    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();

    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.lineTo(fl.x, fl.y);
    ctx.lineTo(bottom.x, bottom.y);
    ctx.lineTo(fr.x, fr.y);
    ctx.closePath();
    ctx.strokeStyle = makeRgba(1);
    ctx.lineWidth = 2;
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.lineTo(bottom.x, bottom.y);
    ctx.moveTo(fl.x, fl.y);
    ctx.lineTo(fr.x, fr.y);
    ctx.strokeStyle = makeRgba(0.6);
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.save();
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.lineTo(fl.x, fl.y);
    ctx.lineTo(bottom.x, bottom.y);
    ctx.lineTo(fr.x, fr.y);
    ctx.closePath();
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  private drawAfterimages(ctx: CanvasRenderingContext2D, state: GameState): void {
    for (const img of state.afterimages) {
      const sp = this.boardToScreen(img.worldX, img.worldY);
      const color = img.faction === 'blue' ? COLORS.techBlue : COLORS.warningRed;
      ctx.save();
      ctx.globalAlpha = img.opacity * 0.6;
      ctx.translate(sp.x, sp.y - 10);
      ctx.scale(sp.scale, sp.scale);
      this.drawOctahedron(ctx, 16, color, state.time * 2);
      ctx.restore();
    }
  }

  private drawFragments(ctx: CanvasRenderingContext2D, state: GameState): void {
    for (const f of state.fragments) {
      const sp = this.boardToScreen(f.x, f.y);
      ctx.save();
      ctx.translate(sp.x, sp.y - 8);
      ctx.rotate(f.rotation);
      ctx.scale(sp.scale, sp.scale);
      ctx.globalAlpha = f.opacity;
      ctx.fillStyle = f.color;
      ctx.shadowColor = f.color;
      ctx.shadowBlur = 6;
      ctx.fillRect(-f.size / 2, -f.size / 2, f.size, f.size * 0.7);
      ctx.restore();
    }
  }

  private drawParticles(ctx: CanvasRenderingContext2D, state: GameState): void {
    for (const p of state.particles) {
      const sp = this.boardToScreen(p.x, p.y);
      const a = Math.max(0, p.lifetime / p.maxLifetime);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y - 6, p.size * sp.scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    let h = hex.replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const n = parseInt(h, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  private drawStatePanel(ctx: CanvasRenderingContext2D, state: GameState): void {
    const vp = this.viewport;
    this.uiElements = [];

    if (vp.isMobile) {
      this.drawMobilePanel(ctx, state);
      return;
    }

    const panelW = 220;
    const panelX = vp.width - panelW - 20;
    const boardTop = vp.boardCenterY - 350 * vp.scale;
    const boardBot = vp.boardCenterY + 350 * vp.scale;
    const panelH = Math.min(vp.height - 80, boardBot - boardTop + 20);
    const panelY = Math.max(60, boardTop);

    ctx.save();
    ctx.shadowColor = 'rgba(74,144,217,0.25)';
    ctx.shadowBlur = 20;
    this.drawGlassPanel(ctx, panelX, panelY, panelW, panelH);
    ctx.restore();

    let y = panelY + 20;
    const cx = panelX + panelW / 2;

    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = COLORS.techBlue;
    ctx.shadowBlur = 8;
    ctx.fillText('镜影战场', cx, y);
    ctx.shadowBlur = 0;
    y += 28;

    ctx.textAlign = 'left';
    ctx.font = '13px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText(`回合 ${state.turnNumber}`, panelX + 16, y); y += 20;

    const factionLabel = state.currentFaction === 'blue' ? '蓝方行动' : (state.phase === 'ai_thinking' ? '红方思考中...' : '红方行动');
    ctx.fillStyle = state.currentFaction === 'blue' ? COLORS.techBlue : COLORS.warningRed;
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(factionLabel, panelX + 16, y); y += 24;

    const blueAlive = state.pieces.filter(p => p.faction === 'blue' && p.hp > 0).length;
    const redAlive = state.pieces.filter(p => p.faction === 'red' && p.hp > 0).length;

    ctx.font = '13px sans-serif';
    ctx.fillStyle = COLORS.techBlue;
    ctx.fillText(`● 蓝方: ${blueAlive}/15`, panelX + 16, y); y += 18;
    ctx.fillStyle = COLORS.warningRed;
    ctx.fillText(`● 红方: ${redAlive}/15`, panelX + 16, y); y += 22;

    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.moveTo(panelX + 16, y);
    ctx.lineTo(panelX + panelW - 16, y);
    ctx.stroke();
    y += 14;

    ctx.font = '13px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText('棋子属性', panelX + 16, y); y += 20;

    const sel = state.pieces.find(p => p.id === state.selectedPieceId);
    if (sel) {
      const props: [string, string, string][] = [
        ['阵营', sel.faction === 'blue' ? '蓝方' : '红方', sel.faction === 'blue' ? COLORS.techBlue : COLORS.warningRed],
        ['生命', `${sel.hp}/${sel.maxHp}`, '#ffffff'],
        ['攻击', String(sel.attack), '#ffffff'],
        ['防御', String(sel.defense), '#ffffff'],
        ['移动', String(sel.moveRange), '#ffffff'],
        ['攻击范围', String(sel.attackRange), '#ffffff'],
        ['冷却', String(sel.skillCooldown), '#ffffff'],
      ];
      for (const [k, v, c] of props) {
        ctx.font = '12px sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.fillText(k, panelX + 16, y);
        ctx.fillStyle = c;
        ctx.textAlign = 'right';
        ctx.fillText(v, panelX + panelW - 16, y);
        ctx.textAlign = 'left';
        y += 18;
      }
    } else {
      ctx.font = '12px sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillText('点击己方棋子查看', panelX + 16, y);
      y += 14;
      ctx.fillText('详细属性', panelX + 16, y);
      y += 14;
    }

    y = panelY + panelH - 120;
    const btnW = panelW - 32;
    const btnH = 36;
    const bx = panelX + 16;

    this.drawGradientButton(ctx, bx, y, btnW, btnH, '结束回合', state.currentFaction === 'red' || !!state.winner);
    this.uiElements.push({
      rect: { x: bx, y, w: btnW, h: btnH },
      onClick: () => this.engine.endTurn(),
      type: 'button',
      id: 'end_turn',
    });
    y += 46;

    this.drawOutlineButton(ctx, bx, y, btnW, btnH, '投降', !!state.winner);
    this.uiElements.push({
      rect: { x: bx, y, w: btnW, h: btnH },
      onClick: () => this.engine.showSurrender(),
      type: 'button',
      id: 'surrender',
    });
  }

  private drawMobilePanel(ctx: CanvasRenderingContext2D, state: GameState): void {
    const vp = this.viewport;
    const panelH = 110;
    const panelY = vp.height - panelH - 8;
    const panelX = 12;
    const panelW = vp.width - 24;

    ctx.save();
    this.drawGlassPanel(ctx, panelX, panelY, panelW, panelH);
    ctx.restore();

    ctx.font = 'bold 14px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.fillText(`回合 ${state.turnNumber}`, panelX + 14, panelY + 24);

    const factionLabel = state.currentFaction === 'blue' ? '蓝方' : '红方';
    ctx.fillStyle = state.currentFaction === 'blue' ? COLORS.techBlue : COLORS.warningRed;
    ctx.fillText(factionLabel, panelX + 110, panelY + 24);

    const blueAlive = state.pieces.filter(p => p.faction === 'blue' && p.hp > 0).length;
    const redAlive = state.pieces.filter(p => p.faction === 'red' && p.hp > 0).length;
    ctx.font = '12px sans-serif';
    ctx.fillStyle = COLORS.techBlue;
    ctx.fillText(`蓝 ${blueAlive}`, panelX + 180, panelY + 24);
    ctx.fillStyle = COLORS.warningRed;
    ctx.fillText(`红 ${redAlive}`, panelX + 230, panelY + 24);

    const btnW = 100, btnH = 36;
    const by = panelY + 54;
    this.drawGradientButton(ctx, panelX + 14, by, btnW, btnH, '结束回合', state.currentFaction === 'red' || !!state.winner);
    this.uiElements.push({ rect: { x: panelX + 14, y: by, w: btnW, h: btnH }, onClick: () => this.engine.endTurn(), type: 'button', id: 'end_turn' });

    this.drawOutlineButton(ctx, panelX + 14 + btnW + 12, by, btnW, btnH, '投降', !!state.winner);
    this.uiElements.push({ rect: { x: panelX + 14 + btnW + 12, y: by, w: btnW, h: btnH }, onClick: () => this.engine.showSurrender(), type: 'button', id: 'surrender' });
  }

  private drawGlassPanel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    const r = 12;
    const blurAmount = 12;
    const pad = blurAmount * 2;

    ctx.save();
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

    ctx.save();
    ctx.clip();

    const srcX = Math.max(0, x - pad);
    const srcY = Math.max(0, y - pad);
    const srcW = Math.min(this.viewport.width - srcX, w + pad * 2);
    const srcH = Math.min(this.viewport.height - srcY, h + pad * 2);

    if (srcW > 0 && srcH > 0) {
      ctx.filter = `blur(${blurAmount}px)`;
      ctx.drawImage(
        ctx.canvas,
        srcX, srcY, srcW, srcH,
        srcX, srcY, srcW, srcH
      );
      ctx.filter = 'none';
    }
    ctx.restore();

    const bgGrad = ctx.createLinearGradient(x, y, x, y + h);
    bgGrad.addColorStop(0, 'rgba(255,255,255,0.12)');
    bgGrad.addColorStop(1, 'rgba(255,255,255,0.06)');
    ctx.fillStyle = bgGrad;
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  private drawGradientButton(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number,
    label: string,
    disabled: boolean
  ): void {
    const r = 8;
    ctx.save();
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

    const grad = ctx.createLinearGradient(x, y, x, y + h);
    if (disabled) {
      grad.addColorStop(0, '#33373d');
      grad.addColorStop(1, '#22262b');
    } else {
      grad.addColorStop(0, '#3A6ABA');
      grad.addColorStop(1, '#1A3A6A');
    }
    ctx.fillStyle = grad;
    ctx.shadowColor = disabled ? 'rgba(0,0,0,0.3)' : 'rgba(74,144,217,0.4)';
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = disabled ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = disabled ? 'rgba(255,255,255,0.35)' : '#ffffff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w / 2, y + h / 2 + 1);
    ctx.restore();
  }

  private drawOutlineButton(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number,
    label: string,
    disabled: boolean
  ): void {
    const r = 8;
    ctx.save();
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

    ctx.fillStyle = 'rgba(217,74,74,0.08)';
    ctx.fill();
    ctx.strokeStyle = disabled ? 'rgba(255,255,255,0.15)' : 'rgba(217,74,74,0.6)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.fillStyle = disabled ? 'rgba(255,255,255,0.35)' : COLORS.warningRed;
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w / 2, y + h / 2 + 1);
    ctx.restore();
  }

  private drawSurrenderModal(ctx: CanvasRenderingContext2D, state: GameState): void {
    const vp = this.viewport;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, 0, vp.width, vp.height);
    ctx.restore();

    const shake = state.modalShakePhase * 4;
    const dx = (Math.random() - 0.5) * shake;
    const dy = (Math.random() - 0.5) * shake;

    const mw = 320, mh = 200;
    const mx = vp.width / 2 - mw / 2 + dx;
    const my = vp.height / 2 - mh / 2 + dy;

    ctx.save();
    ctx.shadowColor = 'rgba(217,74,74,0.4)';
    ctx.shadowBlur = 24;
    this.drawGlassPanel(ctx, mx, my, mw, mh);
    ctx.restore();

    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = COLORS.warningRed;
    ctx.shadowColor = COLORS.warningRed;
    ctx.shadowBlur = 8;
    ctx.fillText('确认投降?', mx + mw / 2, my + 60);
    ctx.shadowBlur = 0;

    ctx.font = '13px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText('本局将立即判负', mx + mw / 2, my + 92);

    const bw = 120, bh = 38;
    this.drawOutlineButton(ctx, mx + 28, my + 136, bw, bh, '确认投降', false);
    this.uiElements.push({ rect: { x: mx + 28, y: my + 136, w: bw, h: bh }, onClick: () => this.engine.confirmSurrender(), type: 'button', id: 'confirm_surrender' });

    this.drawGradientButton(ctx, mx + mw - 28 - bw, my + 136, bw, bh, '取消', false);
    this.uiElements.push({ rect: { x: mx + mw - 28 - bw, y: my + 136, w: bw, h: bh }, onClick: () => this.engine.cancelSurrender(), type: 'button', id: 'cancel_surrender' });
  }

  private drawVictory(ctx: CanvasRenderingContext2D, state: GameState): void {
    const vp = this.viewport;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, vp.width, vp.height);
    ctx.restore();

    const isBlue = state.winner === 'blue';
    const color = isBlue ? COLORS.techBlue : COLORS.warningRed;
    const label = isBlue ? '蓝方胜利' : '红方胜利';

    ctx.save();
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 30;
    const pulse = 1 + 0.05 * Math.sin(state.time * 3);
    ctx.translate(vp.width / 2, vp.height / 2 - 30);
    ctx.scale(pulse, pulse);
    ctx.fillText(label, 0, 0);
    ctx.restore();

    const bw = 160, bh = 42;
    const bx = vp.width / 2 - bw / 2;
    const by = vp.height / 2 + 40;
    this.drawGradientButton(ctx, bx, by, bw, bh, '再来一局', false);
    this.uiElements.push({ rect: { x: bx, y: by, w: bw, h: bh }, onClick: () => this.engine.restart(), type: 'button', id: 'restart' });
  }

  public markBoardDirty(): void {
    this.boardDirty = true;
  }
}
