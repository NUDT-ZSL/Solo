import { TimelineLayout, NodeLayout, LayoutMode } from './TimelineEngine';

const NODE_RADIUS = 14;
const GLOW_LAYERS = 4;
const GOLD = '#c9a84c';
const GOLD_BRIGHT = '#f0d878';
const LINE_COLOR = '#3d3522';
const BG_DARK = '#0a0a0f';

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

export class CanvasRenderer {
  private ctx: CanvasRenderingContext2D;
  private dpr: number;
  private width: number;
  private height: number;

  constructor(private canvas: HTMLCanvasElement) {
    this.dpr = window.devicePixelRatio || 1;
    this.ctx = canvas.getContext('2d')!;
    this.width = 0;
    this.height = 0;
  }

  resize(w: number, h: number): void {
    this.width = w;
    this.height = h;
    this.canvas.width = w * this.dpr;
    this.canvas.height = h * this.dpr;
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  render(layout: TimelineLayout, mode: LayoutMode): void {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.clearRect(0, 0, w, h);
    this.drawBackground(ctx, w, h);
    this.drawTimelineLine(ctx, layout, mode);
    this.drawNodes(ctx, layout, mode);
  }

  private drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    ctx.fillStyle = BG_DARK;
    ctx.fillRect(0, 0, w, h);

    const grad = ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.6);
    grad.addColorStop(0, 'rgba(60, 48, 20, 0.15)');
    grad.addColorStop(0.5, 'rgba(30, 24, 10, 0.08)');
    grad.addColorStop(1, 'rgba(10, 10, 15, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    const grad2 = ctx.createRadialGradient(w * 0.2, h * 0.8, 0, w * 0.2, h * 0.8, w * 0.4);
    grad2.addColorStop(0, 'rgba(201, 168, 76, 0.04)');
    grad2.addColorStop(1, 'rgba(10, 10, 15, 0)');
    ctx.fillStyle = grad2;
    ctx.fillRect(0, 0, w, h);
  }

  private drawTimelineLine(ctx: CanvasRenderingContext2D, layout: TimelineLayout, mode: LayoutMode): void {
    const isH = mode === 'horizontal';
    const startX = isH ? Math.max(50, layout.lineStartX) : layout.lineStartX;
    const startY = isH ? layout.lineStartY : Math.max(50, layout.lineStartY);
    const endX = isH ? Math.min(this.width - 50, layout.lineEndX) : layout.lineEndX;
    const endY = isH ? layout.lineEndY : Math.min(this.height - 50, layout.lineEndY);

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);

    const lineGrad = ctx.createLinearGradient(startX, startY, endX, endY);
    lineGrad.addColorStop(0, 'rgba(201, 168, 76, 0.1)');
    lineGrad.addColorStop(0.3, 'rgba(201, 168, 76, 0.35)');
    lineGrad.addColorStop(0.7, 'rgba(201, 168, 76, 0.35)');
    lineGrad.addColorStop(1, 'rgba(201, 168, 76, 0.1)');

    ctx.strokeStyle = lineGrad;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = 'rgba(240, 216, 120, 0.08)';
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.restore();
  }

  private drawNodes(ctx: CanvasRenderingContext2D, layout: TimelineLayout, mode: LayoutMode): void {
    for (const node of layout.nodes) {
      this.drawSingleNode(ctx, node, mode);
    }
  }

  private drawSingleNode(ctx: CanvasRenderingContext2D, node: NodeLayout, mode: LayoutMode): void {
    const { currentX: x, currentY: y, pulsePhase, scale, opacity, hoverScale, event } = node;
    if (opacity < 0.01 || scale < 0.01) return;

    const effectiveScale = scale * hoverScale;
    const pulse = 1 + Math.sin(pulsePhase) * 0.15;
    const r = NODE_RADIUS * effectiveScale * pulse;
    const rgb = hexToRgb(event.color || GOLD);

    ctx.save();
    ctx.globalAlpha = opacity;

    for (let i = GLOW_LAYERS; i >= 1; i--) {
      const glowR = r + i * 8 * pulse;
      const alpha = (0.06 / i) * hoverScale;
      ctx.beginPath();
      ctx.arc(x, y, glowR, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(x, y, r + 2, 0, Math.PI * 2);
    const outerGrad = ctx.createRadialGradient(x, y, r * 0.5, x, y, r + 2);
    outerGrad.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.9)`);
    outerGrad.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`);
    ctx.fillStyle = outerGrad;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    const innerGrad = ctx.createRadialGradient(x - r * 0.2, y - r * 0.2, 0, x, y, r);
    innerGrad.addColorStop(0, `rgba(255, 255, 255, 0.3)`);
    innerGrad.addColorStop(0.5, event.color || GOLD);
    innerGrad.addColorStop(1, `rgba(${Math.max(0, rgb.r - 40)}, ${Math.max(0, rgb.g - 40)}, ${Math.max(0, rgb.b - 20)}, 1)`);
    ctx.fillStyle = innerGrad;
    ctx.fill();

    this.drawIcon(ctx, x, y, r * 0.6, event.icon);

    const isH = mode === 'horizontal';
    const labelY = isH ? y + r + 18 : y - r - 10;
    const labelX = isH ? x : x + r + 20;

    ctx.save();
    ctx.font = '11px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8)`;
    const yearLabel = event.isBCE ? `公元前${event.year}年` : `${event.year}年`;
    if (isH) {
      ctx.fillText(yearLabel, x, y + r + 16);
      ctx.font = '12px "Segoe UI", sans-serif';
      ctx.fillStyle = 'rgba(220, 210, 190, 0.85)';
      ctx.fillText(event.title, x, y + r + 32);
    } else {
      ctx.textAlign = 'left';
      ctx.fillText(yearLabel, x + r + 14, y - 8);
      ctx.font = '12px "Segoe UI", sans-serif';
      ctx.fillStyle = 'rgba(220, 210, 190, 0.85)';
      ctx.fillText(event.title, x + r + 14, y + 6);
    }
    ctx.restore();

    ctx.restore();
  }

  private drawIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, icon: string): void {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = `${size}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icon, cx, cy);
    ctx.restore();
  }
}
