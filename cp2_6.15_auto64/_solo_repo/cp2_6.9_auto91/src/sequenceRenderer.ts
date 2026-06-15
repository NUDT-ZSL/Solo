import type { AlignmentResult, AlignmentCell, SequenceType } from './alignmentEngine';

const BASE_COLORS: Record<string, string> = {
  A: '#00FF88',
  T: '#FF6B6B',
  U: '#FF6B6B',
  C: '#4A90D9',
  G: '#FFD93D',
  '-': '#484f58',
};

const CONNECTION_COLORS: Record<'match' | 'mismatch' | 'gap', string> = {
  match: '#FFFFFF66',
  mismatch: '#FF4444',
  gap: '#FF8800',
};

const MIN_BASE_W = 4;
const MIN_BASE_H = 6;
const MAX_BASE_W = 12;
const MAX_BASE_H = 20;
const MIN_SCALE = 0.3;
const MAX_SCALE = 3;
const DEFAULT_SCALE = 1;
const GAP = 1;
const ROW_PADDING = 20;
const SEQ_ROW_GAP = 80;
const LABEL_HEIGHT = 30;

interface ViewState {
  offsetX: number;
  offsetY: number;
  scale: number;
  targetScale: number;
  animating: boolean;
  animStart: number;
  animDuration: number;
  animFromOffsetX: number;
  animFromOffsetY: number;
  animFromScale: number;
  animToOffsetX: number;
  animToOffsetY: number;
  animToScale: number;
}

export interface HoverInfo {
  seqIndex: 1 | 2;
  position: number;
  base: string;
  score: number;
  x: number;
  y: number;
}

export interface SequenceRendererOptions {
  onHover?: (info: HoverInfo | null) => void;
}

export class SequenceRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private seq1: string = '';
  private seq2: string = '';
  private alignment: AlignmentResult | null = null;
  private dpr: number;
  private view: ViewState;
  private isDragging: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  private hoverInfo: HoverInfo | null = null;
  private onHover?: (info: HoverInfo | null) => void;
  private rafId: number = 0;

  constructor(canvas: HTMLCanvasElement, options: SequenceRendererOptions = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.dpr = window.devicePixelRatio || 1;
    this.onHover = options.onHover;
    this.view = {
      offsetX: 0,
      offsetY: 0,
      scale: DEFAULT_SCALE,
      targetScale: DEFAULT_SCALE,
      animating: false,
      animStart: 0,
      animDuration: 0,
      animFromOffsetX: 0,
      animFromOffsetY: 0,
      animFromScale: DEFAULT_SCALE,
      animToOffsetX: 0,
      animToOffsetY: 0,
      animToScale: DEFAULT_SCALE,
    };
    this.setupCanvas();
    this.bindEvents();
    this.animate();
  }

  private setupCanvas(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * this.dpr;
    this.canvas.height = rect.height * this.dpr;
    this.ctx.scale(this.dpr, this.dpr);
  }

  public resize(): void {
    this.setupCanvas();
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', this.onMouseDown);
    this.canvas.addEventListener('mousemove', this.onMouseMove);
    this.canvas.addEventListener('mouseup', this.onMouseUp);
    this.canvas.addEventListener('mouseleave', this.onMouseLeave);
    this.canvas.addEventListener('wheel', this.onWheel, { passive: false });
    window.addEventListener('resize', this.onWindowResize);
  }

  public destroy(): void {
    cancelAnimationFrame(this.rafId);
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    this.canvas.removeEventListener('mousemove', this.onMouseMove);
    this.canvas.removeEventListener('mouseup', this.onMouseUp);
    this.canvas.removeEventListener('mouseleave', this.onMouseLeave);
    this.canvas.removeEventListener('wheel', this.onWheel);
    window.removeEventListener('resize', this.onWindowResize);
  }

  private onWindowResize = (): void => {
    this.resize();
  };

  private onMouseDown = (e: MouseEvent): void => {
    this.isDragging = true;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
    this.view.animating = false;
  };

  private onMouseUp = (): void => {
    if (this.isDragging) {
      this.isDragging = false;
      this.bounceBack();
    }
  };

  private onMouseLeave = (): void => {
    this.isDragging = false;
    this.setHover(null);
  };

  private onMouseMove = (e: MouseEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    if (this.isDragging) {
      const dx = e.clientX - this.lastMouseX;
      const dy = e.clientY - this.lastMouseY;
      this.view.offsetX += dx;
      this.view.offsetY += dy;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    } else {
      this.updateHover(mx, my);
    }
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newScale = Math.min(
      MAX_SCALE,
      Math.max(MIN_SCALE, this.view.scale * zoomFactor)
    );

    if (newScale === this.view.scale) return;

    const scaleRatio = newScale / this.view.scale;
    const newOffsetX = mx - (mx - this.view.offsetX) * scaleRatio;
    const newOffsetY = my - (my - this.view.offsetY) * scaleRatio;

    this.startAnimation(
      this.view.offsetX,
      this.view.offsetY,
      this.view.scale,
      newOffsetX,
      newOffsetY,
      newScale,
      200
    );
  };

  private startAnimation(
    fromX: number,
    fromY: number,
    fromScale: number,
    toX: number,
    toY: number,
    toScale: number,
    duration: number
  ): void {
    this.view.animFromOffsetX = fromX;
    this.view.animFromOffsetY = fromY;
    this.view.animFromScale = fromScale;
    this.view.animToOffsetX = toX;
    this.view.animToOffsetY = toY;
    this.view.animToScale = toScale;
    this.view.targetScale = toScale;
    this.view.animStart = performance.now();
    this.view.animDuration = duration;
    this.view.animating = true;
  }

  private easeOutQuad(t: number): number {
    return t * (2 - t);
  }

  private bounceBack(): void {
    const maxLen = Math.max(this.seq1.length, this.seq2.length);
    const baseW = this.getBaseWidth();
    const totalW = maxLen * (baseW + GAP) + ROW_PADDING * 2;
    const totalH = LABEL_HEIGHT * 2 + SEQ_ROW_GAP + this.getBaseHeight() * 2 + ROW_PADDING * 2;

    const canvasWidth = this.canvas.width / this.dpr;
    const canvasHeight = this.canvas.height / this.dpr;

    let targetX = this.view.offsetX;
    let targetY = this.view.offsetY;

    if (totalW * this.view.scale <= canvasWidth) {
      targetX = (canvasWidth - totalW * this.view.scale) / 2;
    } else {
      const minX = canvasWidth - totalW * this.view.scale - ROW_PADDING * this.view.scale;
      const maxX = ROW_PADDING * this.view.scale;
      if (this.view.offsetX > maxX) targetX = maxX;
      if (this.view.offsetX < minX) targetX = minX;
    }

    if (totalH * this.view.scale <= canvasHeight) {
      targetY = (canvasHeight - totalH * this.view.scale) / 2;
    } else {
      const minY = canvasHeight - totalH * this.view.scale - ROW_PADDING * this.view.scale;
      const maxY = ROW_PADDING * this.view.scale;
      if (this.view.offsetY > maxY) targetY = maxY;
      if (this.view.offsetY < minY) targetY = minY;
    }

    if (targetX !== this.view.offsetX || targetY !== this.view.offsetY) {
      this.startAnimation(
        this.view.offsetX,
        this.view.offsetY,
        this.view.scale,
        targetX,
        targetY,
        this.view.scale,
        300
      );
    }
  }

  private animate = (): void => {
    if (this.view.animating) {
      const now = performance.now();
      const elapsed = now - this.view.animStart;
      const t = Math.min(1, elapsed / this.view.animDuration);
      const easeT = this.easeOutQuad(t);

      this.view.offsetX =
        this.view.animFromOffsetX +
        (this.view.animToOffsetX - this.view.animFromOffsetX) * easeT;
      this.view.offsetY =
        this.view.animFromOffsetY +
        (this.view.animToOffsetY - this.view.animFromOffsetY) * easeT;
      this.view.scale =
        this.view.animFromScale +
        (this.view.animToScale - this.view.animFromScale) * easeT;

      if (t >= 1) {
        this.view.animating = false;
      }
    }
    this.render();
    this.rafId = requestAnimationFrame(this.animate);
  };

  public setSequences(seq1: string, seq2: string, _seqType: SequenceType): void {
    this.seq1 = seq1;
    this.seq2 = seq2;
    this.centerView();
  }

  public setAlignment(alignment: AlignmentResult | null): void {
    this.alignment = alignment;
    this.centerView();
  }

  private centerView(): void {
    const maxLen = Math.max(this.seq1.length, this.seq2.length);
    const baseW = this.getBaseWidth();
    const totalW = maxLen * (baseW + GAP) + ROW_PADDING * 2;
    const totalH = LABEL_HEIGHT * 2 + SEQ_ROW_GAP + this.getBaseHeight() * 2 + ROW_PADDING * 2;

    const canvasWidth = this.canvas.width / this.dpr;
    const canvasHeight = this.canvas.height / this.dpr;

    this.view.scale = DEFAULT_SCALE;
    this.view.targetScale = DEFAULT_SCALE;
    this.view.offsetX = Math.max(0, (canvasWidth - totalW) / 2);
    this.view.offsetY = Math.max(0, (canvasHeight - totalH) / 2);
    this.view.animating = false;
  }

  private getBaseWidth(): number {
    const t = (this.view.scale - MIN_SCALE) / (MAX_SCALE - MIN_SCALE);
    return MIN_BASE_W + (MAX_BASE_W - MIN_BASE_W) * Math.max(0, Math.min(1, t));
  }

  private getBaseHeight(): number {
    const t = (this.view.scale - MIN_SCALE) / (MAX_SCALE - MIN_SCALE);
    return MIN_BASE_H + (MAX_BASE_H - MIN_BASE_H) * Math.max(0, Math.min(1, t));
  }

  private getGap(): number {
    return Math.max(1, GAP * (0.5 + this.view.scale * 0.5));
  }

  private updateHover(mx: number, my: number): void {
    const scale = this.view.scale;
    const baseW = this.getBaseWidth();
    const baseH = this.getBaseHeight();
    const gap = this.getGap();
    const y1 = LABEL_HEIGHT + ROW_PADDING;
    const y2 = y1 + baseH + SEQ_ROW_GAP;

    const worldX = (mx - this.view.offsetX) / scale;
    const worldY = (my - this.view.offsetY) / scale;

    let hit: HoverInfo | null = null;

    if (worldY >= y1 && worldY <= y1 + baseH) {
      const idx = Math.floor((worldX - ROW_PADDING) / (baseW + gap));
      if (idx >= 0 && idx < this.seq1.length) {
        const cellStart = ROW_PADDING + idx * (baseW + gap);
        if (worldX >= cellStart && worldX <= cellStart + baseW) {
          hit = {
            seqIndex: 1,
            position: idx,
            base: this.seq1[idx],
            score: this.getCellScore(1, idx),
            x: cellStart * scale + this.view.offsetX,
            y: y1 * scale + this.view.offsetY,
          };
        }
      }
    } else if (worldY >= y2 && worldY <= y2 + baseH) {
      const idx = Math.floor((worldX - ROW_PADDING) / (baseW + gap));
      if (idx >= 0 && idx < this.seq2.length) {
        const cellStart = ROW_PADDING + idx * (baseW + gap);
        if (worldX >= cellStart && worldX <= cellStart + baseW) {
          hit = {
            seqIndex: 2,
            position: idx,
            base: this.seq2[idx],
            score: this.getCellScore(2, idx),
            x: cellStart * scale + this.view.offsetX,
            y: y2 * scale + this.view.offsetY,
          };
        }
      }
    }

    this.setHover(hit);
  }

  private getCellScore(seqIndex: 1 | 2, position: number): number {
    if (!this.alignment) return 0;
    for (const cell of this.alignment.path) {
      if (seqIndex === 1 && cell.i - 1 === position) return cell.score;
      if (seqIndex === 2 && cell.j - 1 === position) return cell.score;
    }
    return 0;
  }

  private setHover(info: HoverInfo | null): void {
    const changed =
      (info === null) !== (this.hoverInfo === null) ||
      (info && this.hoverInfo &&
        (info.seqIndex !== this.hoverInfo.seqIndex ||
          info.position !== this.hoverInfo.position));
    if (changed) {
      this.hoverInfo = info;
      if (this.onHover) this.onHover(info);
    } else {
      this.hoverInfo = info;
    }
  }

  private drawBase(
    x: number,
    y: number,
    base: string,
    w: number,
    h: number,
    highlighted: boolean
  ): void {
    const ctx = this.ctx;
    const color = BASE_COLORS[base.toUpperCase()] || '#484f58';
    const scale = highlighted ? 1.5 : 1;
    const actualW = w * scale;
    const actualH = h * scale;
    const offsetX = (w - actualW) / 2;
    const offsetY = (h - actualH) / 2;

    ctx.fillStyle = color;
    ctx.fillRect(x + offsetX, y + offsetY, actualW, actualH);

    if (scale > 1) {
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + offsetX, y + offsetY, actualW, actualH);
    }

    if (w >= 10 && h >= 16) {
      ctx.fillStyle = '#000000';
      ctx.font = `bold ${Math.floor(h * 0.55)}px 'Courier New', monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(base.toUpperCase(), x + w / 2, y + h / 2 + 1);
    }
  }

  private drawConnection(
    cell: AlignmentCell,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    w: number,
    h: number
  ): void {
    const ctx = this.ctx;
    let type: 'match' | 'mismatch' | 'gap' = cell.state === 'match' ? 'match' : cell.state === 'mismatch' ? 'mismatch' : 'gap';

    ctx.strokeStyle = CONNECTION_COLORS[type];
    ctx.lineWidth = 2;

    if (type === 'gap') {
      ctx.setLineDash([4, 4]);
    } else {
      ctx.setLineDash([]);
    }

    ctx.beginPath();
    ctx.moveTo(x1 + w / 2, y1 + h);
    ctx.lineTo(x2 + w / 2, y2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  private render(): void {
    const ctx = this.ctx;
    const canvasWidth = this.canvas.width / this.dpr;
    const canvasHeight = this.canvas.height / this.dpr;

    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    if (this.seq1.length === 0 && this.seq2.length === 0) {
      ctx.fillStyle = '#484f58';
      ctx.font = '16px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('请输入两条DNA/RNA序列进行比对', canvasWidth / 2, canvasHeight / 2);
      return;
    }

    ctx.save();
    ctx.translate(this.view.offsetX, this.view.offsetY);
    ctx.scale(this.view.scale, this.view.scale);

    const baseW = this.getBaseWidth();
    const baseH = this.getBaseHeight();
    const gap = this.getGap();
    const y1 = LABEL_HEIGHT + ROW_PADDING;
    const y2 = y1 + baseH + SEQ_ROW_GAP;

    ctx.fillStyle = '#8b949e';
    ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('序列 1 (Sequence 1)', ROW_PADDING, ROW_PADDING);
    ctx.fillText('序列 2 (Sequence 2)', ROW_PADDING, y1 + baseH + SEQ_ROW_GAP - LABEL_HEIGHT + ROW_PADDING);

    const hoverSeqIdx = this.hoverInfo?.seqIndex;
    const hoverPos = this.hoverInfo?.position;

    for (let i = 0; i < this.seq1.length; i++) {
      const x = ROW_PADDING + i * (baseW + gap);
      const highlighted = hoverSeqIdx === 1 && hoverPos === i;
      this.drawBase(x, y1, this.seq1[i], baseW, baseH, highlighted);
    }

    for (let i = 0; i < this.seq2.length; i++) {
      const x = ROW_PADDING + i * (baseW + gap);
      const highlighted = hoverSeqIdx === 2 && hoverPos === i;
      this.drawBase(x, y2, this.seq2[i], baseW, baseH, highlighted);
    }

    if (this.alignment && this.alignment.path.length > 0) {
      for (const cell of this.alignment.path) {
        if (cell.state === 'gap_seq1') continue;
        if (cell.state === 'gap_seq2') continue;
        const pos1 = cell.i - 1;
        const pos2 = cell.j - 1;
        if (pos1 < 0 || pos2 < 0) continue;
        const x1 = ROW_PADDING + pos1 * (baseW + gap);
        const x2 = ROW_PADDING + pos2 * (baseW + gap);
        this.drawConnection(cell, x1, y1, x2, y2, baseW, baseH);
      }
    }

    ctx.restore();
  }

  public exportImage(): HTMLCanvasElement {
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = 1024;
    exportCanvas.height = 768;
    const exportCtx = exportCanvas.getContext('2d')!;

    exportCtx.fillStyle = '#0d1117';
    exportCtx.fillRect(0, 0, 1024, 768);

    const maxLen = Math.max(this.seq1.length, this.seq2.length, 1);
    const padding = 60;
    const availableW = 1024 - padding * 2;
    const baseW = Math.max(4, Math.min(12, availableW / maxLen - 1));
    const baseH = baseW * 1.6;
    const gap = 1;
    const y1 = 80;
    const y2 = y1 + baseH + 100;

    exportCtx.fillStyle = '#8b949e';
    exportCtx.font = '14px -apple-system, BlinkMacSystemFont, sans-serif';
    exportCtx.textAlign = 'left';
    exportCtx.fillText(`序列 1: ${this.seq1.length} bp | 序列 2: ${this.seq2.length} bp`, padding, 40);
    if (this.alignment) {
      exportCtx.fillText(
        `比对得分: ${this.alignment.score} | 匹配: ${this.alignment.matches} | 错配: ${this.alignment.mismatches} | 缺口: ${this.alignment.gaps}`,
        padding,
        60
      );
    }
    exportCtx.fillText('序列 1', padding, y1 - 25);
    exportCtx.fillText('序列 2', padding, y2 - 25);

    for (let i = 0; i < this.seq1.length; i++) {
      const x = padding + i * (baseW + gap);
      const color = BASE_COLORS[this.seq1[i].toUpperCase()] || '#484f58';
      exportCtx.fillStyle = color;
      exportCtx.fillRect(x, y1, baseW, baseH);
      if (baseW >= 10) {
        exportCtx.fillStyle = '#000000';
        exportCtx.font = `bold ${Math.floor(baseH * 0.55)}px 'Courier New', monospace`;
        exportCtx.textAlign = 'center';
        exportCtx.textBaseline = 'middle';
        exportCtx.fillText(this.seq1[i].toUpperCase(), x + baseW / 2, y1 + baseH / 2 + 1);
      }
    }

    for (let i = 0; i < this.seq2.length; i++) {
      const x = padding + i * (baseW + gap);
      const color = BASE_COLORS[this.seq2[i].toUpperCase()] || '#484f58';
      exportCtx.fillStyle = color;
      exportCtx.fillRect(x, y2, baseW, baseH);
      if (baseW >= 10) {
        exportCtx.fillStyle = '#000000';
        exportCtx.font = `bold ${Math.floor(baseH * 0.55)}px 'Courier New', monospace`;
        exportCtx.textAlign = 'center';
        exportCtx.textBaseline = 'middle';
        exportCtx.fillText(this.seq2[i].toUpperCase(), x + baseW / 2, y2 + baseH / 2 + 1);
      }
    }

    if (this.alignment) {
      for (const cell of this.alignment.path) {
        if (cell.state === 'gap_seq1' || cell.state === 'gap_seq2') continue;
        const pos1 = cell.i - 1;
        const pos2 = cell.j - 1;
        if (pos1 < 0 || pos2 < 0) continue;
        const x1 = padding + pos1 * (baseW + gap);
        const x2 = padding + pos2 * (baseW + gap);
        const isMatch = cell.state === 'match';
        const lineColor = isMatch ? '#FFFFFF66' : '#FF4444';
        exportCtx.strokeStyle = lineColor;
        exportCtx.lineWidth = 2;
        exportCtx.setLineDash([]);
        exportCtx.beginPath();
        exportCtx.moveTo(x1 + baseW / 2, y1 + baseH);
        exportCtx.lineTo(x2 + baseW / 2, y2);
        exportCtx.stroke();
      }
      exportCtx.setLineDash([]);
    }

    return exportCanvas;
  }
}
