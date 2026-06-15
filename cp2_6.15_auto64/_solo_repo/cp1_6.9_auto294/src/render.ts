import type {
  Stone,
  StoneColor,
  InkDiffusion,
  Ripple,
  GridPos,
  BoardLayout
} from './game';
import { GameEngine } from './game';

const STONE_RADIUS = 12;
const CURSOR_RADIUS = 18;
const CURSOR_ALPHA = 0.5;

const COLORS = {
  paper: 'hsl(40, 10%, 95%)',
  gridLine: 'hsla(0, 0%, 40%, 0.3)',
  blackStone: '#1a1a1a',
  whiteStone: '#fafafa',
  blackHighlight: 'rgba(255,255,255,0.2)',
  whiteHighlight: 'rgba(255,255,255,0.5)',
  blackInkInner: 'rgba(40, 40, 40, ',
  blackInkOuter: 'rgba(180, 180, 180, ',
  whiteInkInner: 'rgba(210, 210, 210, ',
  whiteInkOuter: 'rgba(245, 240, 225, '
};

export interface HoverInfo {
  pos: GridPos | null;
  nextColor: StoneColor;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private layout: BoardLayout = { offsetX: 0, offsetY: 0, cellSize: 30 };
  private cssWidth: number = 0;
  private cssHeight: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('无法获取Canvas 2D上下文');
    }
    this.ctx = ctx;
  }

  public resize(width: number, height: number, dpr: number): void {
    this.cssWidth = width;
    this.cssHeight = height;
    this.canvas.width = Math.floor(width * dpr);
    this.canvas.height = Math.floor(height * dpr);
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);
  }

  public computeLayout(gridSize: number): BoardLayout {
    const minEdge = Math.min(this.cssWidth, this.cssHeight);
    const padding = 32;
    const available = Math.max(minEdge - padding * 2, 200);
    const cellSize = Math.floor(available / (gridSize - 1));
    const actualBoardSize = cellSize * (gridSize - 1);
    const offsetX = (this.cssWidth - actualBoardSize) / 2;
    const offsetY = (this.cssHeight - actualBoardSize) / 2;
    this.layout = { offsetX, offsetY, cellSize };
    return this.layout;
  }

  public getLayout(): BoardLayout {
    return this.layout;
  }

  public render(
    stones: Stone[],
    diffusions: InkDiffusion[],
    ripples: Ripple[],
    hover: HoverInfo,
    now: number
  ): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.cssWidth, this.cssHeight);

    this.drawPaperBackground();
    this.drawGrid(this.layout, 19);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const d of diffusions) {
      this.drawInkDiffusion(d, now);
    }
    ctx.restore();

    for (const s of stones) {
      this.drawStone(s, this.layout);
    }

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const r of ripples) {
      this.drawRipple(r, now);
    }
    ctx.restore();

    if (hover.pos) {
      this.drawHoverCursor(hover.pos, hover.nextColor, this.layout);
    }
  }

  private drawPaperBackground(): void {
    const ctx = this.ctx;
    ctx.fillStyle = COLORS.paper;
    ctx.fillRect(0, 0, this.cssWidth, this.cssHeight);
  }

  private drawGrid(layout: BoardLayout, size: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = COLORS.gridLine;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < size; i++) {
      const y = layout.offsetY + i * layout.cellSize + 0.5;
      ctx.moveTo(layout.offsetX, y);
      ctx.lineTo(layout.offsetX + (size - 1) * layout.cellSize, y);
    }
    for (let j = 0; j < size; j++) {
      const x = layout.offsetX + j * layout.cellSize + 0.5;
      ctx.moveTo(x, layout.offsetY);
      ctx.lineTo(x, layout.offsetY + (size - 1) * layout.cellSize);
    }
    ctx.stroke();
    ctx.restore();
  }

  private drawInkDiffusion(diffusion: InkDiffusion, now: number): void {
    const { radius, alpha } = GameEngine.getInkProgress(diffusion, now);
    const ctx = this.ctx;
    const isBlack = diffusion.color === 'black';
    const innerColor = isBlack ? COLORS.blackInkInner : COLORS.whiteInkInner;
    const outerColor = isBlack ? COLORS.blackInkOuter : COLORS.whiteInkOuter;

    const grad = ctx.createRadialGradient(
      diffusion.centerX,
      diffusion.centerY,
      0,
      diffusion.centerX,
      diffusion.centerY,
      Math.max(radius, 1)
    );
    grad.addColorStop(0, innerColor + (alpha * 0.9).toFixed(3) + ')');
    grad.addColorStop(0.4, innerColor + (alpha * 0.4).toFixed(3) + ')');
    grad.addColorStop(1, outerColor + '0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(diffusion.centerX, diffusion.centerY, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawStone(stone: Stone, layout: BoardLayout): void {
    const ctx = this.ctx;
    const cx = layout.offsetX + stone.pos.col * layout.cellSize;
    const cy = layout.offsetY + stone.pos.row * layout.cellSize;
    const r = STONE_RADIUS;

    ctx.save();
    ctx.globalAlpha = stone.opacity;

    const baseGrad = ctx.createRadialGradient(
      cx - r * 0.2,
      cy - r * 0.2,
      r * 0.1,
      cx,
      cy,
      r
    );
    if (stone.color === 'black') {
      baseGrad.addColorStop(0, '#4a4a4a');
      baseGrad.addColorStop(0.6, '#1a1a1a');
      baseGrad.addColorStop(1, '#0a0a0a');
    } else {
      baseGrad.addColorStop(0, '#ffffff');
      baseGrad.addColorStop(0.7, '#f5f5f0');
      baseGrad.addColorStop(1, '#e0e0d8');
    }

    ctx.fillStyle = baseGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = stone.color === 'black' ? 'rgba(0,0,0,0.6)' : 'rgba(120,120,120,0.4)';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    const highlightColor =
      stone.color === 'black' ? COLORS.blackHighlight : COLORS.whiteHighlight;
    const hlGrad = ctx.createRadialGradient(
      cx - r * 0.35,
      cy - r * 0.35,
      0,
      cx - r * 0.35,
      cy - r * 0.35,
      r * 0.9
    );
    hlGrad.addColorStop(0, highlightColor);
    hlGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hlGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawRipple(ripple: Ripple, now: number): void {
    const { innerR, outerR, alpha } = GameEngine.getRippleProgress(ripple, now);
    const ctx = this.ctx;
    const isBlack = ripple.color === 'black';
    const innerColor = isBlack ? COLORS.blackInkInner : COLORS.whiteInkInner;
    const outerColor = isBlack ? COLORS.blackInkOuter : COLORS.whiteInkOuter;

    if (outerR <= innerR) return;

    const grad = ctx.createRadialGradient(
      ripple.centerX,
      ripple.centerY,
      innerR,
      ripple.centerX,
      ripple.centerY,
      outerR
    );
    grad.addColorStop(0, outerColor + '0)');
    grad.addColorStop(0.5, innerColor + (alpha * 0.6).toFixed(3) + ')');
    grad.addColorStop(1, outerColor + '0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(ripple.centerX, ripple.centerY, outerR, 0, Math.PI * 2);
    ctx.arc(ripple.centerX, ripple.centerY, Math.max(innerR, 0), 0, Math.PI * 2, true);
    ctx.fill();
  }

  private drawHoverCursor(
    pos: GridPos,
    color: StoneColor,
    layout: BoardLayout
  ): void {
    const ctx = this.ctx;
    const cx = layout.offsetX + pos.col * layout.cellSize;
    const cy = layout.offsetY + pos.row * layout.cellSize;
    ctx.save();
    ctx.globalAlpha = CURSOR_ALPHA;
    ctx.fillStyle = color === 'black' ? '#1a1a1a' : '#fafafa';
    ctx.beginPath();
    ctx.arc(cx, cy, CURSOR_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  public async exportPng(
    stones: Stone[],
    diffusions: InkDiffusion[],
    ripples: Ripple[],
    gridSize: number,
    captureNow: number
  ): Promise<void> {
    const offCanvas = document.createElement('canvas');
    const scale = 2;
    offCanvas.width = Math.floor(this.cssWidth * scale);
    offCanvas.height = Math.floor(this.cssHeight * scale);
    const offCtx = offCanvas.getContext('2d');
    if (!offCtx) {
      throw new Error('无法创建离屏Canvas上下文');
    }
    offCtx.scale(scale, scale);

    offCtx.fillStyle = COLORS.paper;
    offCtx.fillRect(0, 0, this.cssWidth, this.cssHeight);

    this.drawGridToContext(offCtx, this.layout, gridSize);

    offCtx.save();
    offCtx.globalCompositeOperation = 'lighter';
    for (const d of diffusions) {
      this.drawInkDiffusionToContext(offCtx, d, captureNow);
    }
    offCtx.restore();

    for (const s of stones) {
      this.drawStoneToContext(offCtx, s, this.layout);
    }

    offCtx.save();
    offCtx.globalCompositeOperation = 'lighter';
    for (const r of ripples) {
      this.drawRippleToContext(offCtx, r, captureNow);
    }
    offCtx.restore();

    const dataUrl = offCanvas.toDataURL('image/png');
    this.downloadDataUrl(dataUrl, this.generateFilename());
  }

  private generateFilename(): string {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const ts =
      now.getFullYear().toString() +
      pad(now.getMonth() + 1) +
      pad(now.getDate()) +
      '_' +
      pad(now.getHours()) +
      pad(now.getMinutes()) +
      pad(now.getSeconds());
    return `ink_chess_${ts}.png`;
  }

  private downloadDataUrl(dataUrl: string, filename: string): void {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  private drawGridToContext(
    ctx: CanvasRenderingContext2D,
    layout: BoardLayout,
    size: number
  ): void {
    ctx.save();
    ctx.strokeStyle = COLORS.gridLine;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < size; i++) {
      const y = layout.offsetY + i * layout.cellSize + 0.5;
      ctx.moveTo(layout.offsetX, y);
      ctx.lineTo(layout.offsetX + (size - 1) * layout.cellSize, y);
    }
    for (let j = 0; j < size; j++) {
      const x = layout.offsetX + j * layout.cellSize + 0.5;
      ctx.moveTo(x, layout.offsetY);
      ctx.lineTo(x, layout.offsetY + (size - 1) * layout.cellSize);
    }
    ctx.stroke();
    ctx.restore();
  }

  private drawInkDiffusionToContext(
    ctx: CanvasRenderingContext2D,
    diffusion: InkDiffusion,
    now: number
  ): void {
    const { radius, alpha } = GameEngine.getInkProgress(diffusion, now);
    const isBlack = diffusion.color === 'black';
    const innerColor = isBlack ? COLORS.blackInkInner : COLORS.whiteInkInner;
    const outerColor = isBlack ? COLORS.blackInkOuter : COLORS.whiteInkOuter;

    const grad = ctx.createRadialGradient(
      diffusion.centerX,
      diffusion.centerY,
      0,
      diffusion.centerX,
      diffusion.centerY,
      Math.max(radius, 1)
    );
    grad.addColorStop(0, innerColor + (alpha * 0.9).toFixed(3) + ')');
    grad.addColorStop(0.4, innerColor + (alpha * 0.4).toFixed(3) + ')');
    grad.addColorStop(1, outerColor + '0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(diffusion.centerX, diffusion.centerY, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawStoneToContext(
    ctx: CanvasRenderingContext2D,
    stone: Stone,
    layout: BoardLayout
  ): void {
    const cx = layout.offsetX + stone.pos.col * layout.cellSize;
    const cy = layout.offsetY + stone.pos.row * layout.cellSize;
    const r = STONE_RADIUS;

    ctx.save();
    ctx.globalAlpha = stone.opacity;

    const baseGrad = ctx.createRadialGradient(
      cx - r * 0.2,
      cy - r * 0.2,
      r * 0.1,
      cx,
      cy,
      r
    );
    if (stone.color === 'black') {
      baseGrad.addColorStop(0, '#4a4a4a');
      baseGrad.addColorStop(0.6, '#1a1a1a');
      baseGrad.addColorStop(1, '#0a0a0a');
    } else {
      baseGrad.addColorStop(0, '#ffffff');
      baseGrad.addColorStop(0.7, '#f5f5f0');
      baseGrad.addColorStop(1, '#e0e0d8');
    }

    ctx.fillStyle = baseGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = stone.color === 'black' ? 'rgba(0,0,0,0.6)' : 'rgba(120,120,120,0.4)';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    const highlightColor =
      stone.color === 'black' ? COLORS.blackHighlight : COLORS.whiteHighlight;
    const hlGrad = ctx.createRadialGradient(
      cx - r * 0.35,
      cy - r * 0.35,
      0,
      cx - r * 0.35,
      cy - r * 0.35,
      r * 0.9
    );
    hlGrad.addColorStop(0, highlightColor);
    hlGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hlGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawRippleToContext(
    ctx: CanvasRenderingContext2D,
    ripple: Ripple,
    now: number
  ): void {
    const { innerR, outerR, alpha } = GameEngine.getRippleProgress(ripple, now);
    const isBlack = ripple.color === 'black';
    const innerColor = isBlack ? COLORS.blackInkInner : COLORS.whiteInkInner;
    const outerColor = isBlack ? COLORS.blackInkOuter : COLORS.whiteInkOuter;

    if (outerR <= innerR) return;

    const grad = ctx.createRadialGradient(
      ripple.centerX,
      ripple.centerY,
      innerR,
      ripple.centerX,
      ripple.centerY,
      outerR
    );
    grad.addColorStop(0, outerColor + '0)');
    grad.addColorStop(0.5, innerColor + (alpha * 0.6).toFixed(3) + ')');
    grad.addColorStop(1, outerColor + '0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(ripple.centerX, ripple.centerY, outerR, 0, Math.PI * 2);
    ctx.arc(ripple.centerX, ripple.centerY, Math.max(innerR, 0), 0, Math.PI * 2, true);
    ctx.fill();
  }
}
