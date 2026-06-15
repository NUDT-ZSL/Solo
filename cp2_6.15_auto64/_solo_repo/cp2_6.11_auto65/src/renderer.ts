import type { TimelineEvent, Particle } from './types';
import { hexToRgb } from './animation';
import { formatShortDate, minDate, maxDate } from './dateUtils';

const TIMELINE_Y = 80;
const TIMELINE_HEIGHT = 2;
const GRID_COLOR = '#1C2128';
const GRID_SPACING = 40;
const TIMELINE_LINE_COLOR = '#30363D';
const CARD_Y = 40;
const CARD_HEIGHT = 40;

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  r = Math.min(r, w / 2, h / 2);
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

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dpr: number;
  private cardWidth: number;
  private isMobile: boolean;
  private cardW: number;
  private cardH: number;
  private offscreenBg: HTMLCanvasElement | null = null;
  private bgDirty = true;

  constructor(canvas: HTMLCanvasElement, cardWidth: number = 80, isMobile: boolean = false) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.dpr = Math.max(1, window.devicePixelRatio || 1);
    this.cardWidth = cardWidth;
    this.isMobile = isMobile;
    this.cardW = isMobile ? 60 : cardWidth;
    this.cardH = isMobile ? 30 : CARD_HEIGHT;
  }

  private setupCanvasSize(cssWidth: number, cssHeight: number): void {
    this.canvas.style.width = cssWidth + 'px';
    this.canvas.style.height = cssHeight + 'px';
    this.canvas.width = Math.floor(cssWidth * this.dpr);
    this.canvas.height = Math.floor(cssHeight * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.bgDirty = true;
  }

  private getCssSize(): { w: number; h: number } {
    return { w: this.canvas.clientWidth, h: this.canvas.clientHeight };
  }

  private buildOffscreenBackground(w: number, h: number): void {
    this.offscreenBg = document.createElement('canvas');
    this.offscreenBg.width = w;
    this.offscreenBg.height = h;
    const bgCtx = this.offscreenBg.getContext('2d')!;

    const bgGrad = bgCtx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#0D1117');
    bgGrad.addColorStop(1, '#161B22');
    bgCtx.fillStyle = bgGrad;
    bgCtx.fillRect(0, 0, w, h);

    bgCtx.strokeStyle = GRID_COLOR + '80';
    bgCtx.lineWidth = 0.5;
    for (let x = GRID_SPACING; x < w; x += GRID_SPACING) {
      bgCtx.beginPath();
      bgCtx.moveTo(x, 0);
      bgCtx.lineTo(x, h);
      bgCtx.stroke();
    }
    for (let y = GRID_SPACING; y < h; y += GRID_SPACING) {
      bgCtx.beginPath();
      bgCtx.moveTo(0, y);
      bgCtx.lineTo(w, y);
      bgCtx.stroke();
    }

    bgCtx.save();
    bgCtx.shadowColor = TIMELINE_LINE_COLOR;
    bgCtx.shadowBlur = 6;
    bgCtx.strokeStyle = TIMELINE_LINE_COLOR;
    bgCtx.lineWidth = TIMELINE_HEIGHT;
    bgCtx.beginPath();
    bgCtx.moveTo(0, TIMELINE_Y);
    bgCtx.lineTo(w, TIMELINE_Y);
    bgCtx.stroke();
    bgCtx.restore();

    this.bgDirty = false;
  }

  public render(
    events: TimelineEvent[],
    particles: Particle[],
    playbackDate: Date | null,
    filterMarkers?: { minX: number; maxX: number }
  ): void {
    const { w, h } = this.getCssSize();

    if (this.bgDirty || !this.offscreenBg || this.offscreenBg.width !== w || this.offscreenBg.height !== h) {
      this.buildOffscreenBackground(w, h);
    }

    this.ctx.drawImage(this.offscreenBg!, 0, 0);
    this.renderFilterRange(filterMarkers, w, h);
    this.renderPlaybackCursor(playbackDate, events, w);
    this.renderTimelineTicks(events, w);
    this.renderParticles(particles);
    this.renderCards(events);
  }

  private renderParticles(particles: Particle[]): void {
    const colorBuckets: Map<string, Particle[]> = new Map();
    for (const p of particles) {
      if (p.opacity < 0.02 || p.size < 0.2) continue;
      const bucket = colorBuckets.get(p.color) ?? [];
      bucket.push(p);
      colorBuckets.set(p.color, bucket);
    }

    for (const [color, bucket] of colorBuckets) {
      const rgb = hexToRgb(color);
      this.ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},1)`;
      this.ctx.beginPath();
      for (const p of bucket) {
        this.ctx.globalAlpha = p.opacity;
        this.ctx.moveTo(p.x + p.size, p.y);
        this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      }
      this.ctx.fill();
      this.ctx.globalAlpha = 1;
    }
  }

  private renderCards(events: TimelineEvent[]): void {
    for (const event of events) {
      if (event.visibility < 0.02) continue;
      const w = this.cardW * event.cardScale;
      const h = this.cardH * event.cardScale;
      if (w < 2 || h < 2) continue;
      const x = event.position + (this.cardW - w) / 2;
      const y = CARD_Y + (this.cardH - h) / 2;
      const alpha = event.visibility;

      this.ctx.save();
      this.ctx.globalAlpha = alpha;

      const shadowOffset = event.isDragging ? -4 : -2;
      this.ctx.shadowColor = event.isDragging ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.3)';
      this.ctx.shadowBlur = event.isDragging ? 16 : 8;
      this.ctx.shadowOffsetY = -shadowOffset;

      roundRect(this.ctx, x, y, w, h, this.isMobile ? 6 : 8);
      this.ctx.fillStyle = event.color;
      this.ctx.fill();

      if (event.flashProgress > 0) {
        this.ctx.shadowColor = 'rgba(255,255,255,0.9)';
        this.ctx.shadowBlur = 20 * event.flashProgress;
        this.ctx.strokeStyle = `rgba(255,255,255,${event.flashProgress})`;
        this.ctx.lineWidth = 2;
        roundRect(this.ctx, x, y, w, h, this.isMobile ? 6 : 8);
        this.ctx.stroke();
      }
      this.ctx.shadowBlur = 0;

      if (w > 20 && h > 12) {
        const rgb = hexToRgb(event.color);
        const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
        this.ctx.fillStyle = brightness > 140 ? '#0D1117' : '#FFFFFF';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        const nameSize = this.isMobile ? 9 : 11;
        this.ctx.font = `500 ${nameSize}px 'Space Grotesk', sans-serif`;
        const maxNameLen = this.isMobile ? 6 : 10;
        const displayName = event.name.length > maxNameLen ? event.name.slice(0, maxNameLen) + '…' : event.name;
        const dateStr = formatShortDate(event.date);
        const dateSize = this.isMobile ? 7 : 9;
        this.ctx.font = `500 ${nameSize}px 'Space Grotesk', sans-serif`;
        const nameY = y + h * 0.35;
        this.ctx.fillText(displayName, x + w / 2, nameY);
        this.ctx.fillStyle = brightness > 140 ? 'rgba(13,17,23,0.7)' : 'rgba(255,255,255,0.75)';
        this.ctx.font = `400 ${dateSize}px 'JetBrains Mono', monospace`;
        this.ctx.fillText(dateStr, x + w / 2, y + h * 0.72);
      }

      this.ctx.restore();
    }
  }

  private renderTimelineTicks(events: TimelineEvent[], w: number): void {
    if (events.length === 0) return;

    const dates = events.map((e) => e.date);
    const minD = minDate(dates);
    const maxD = maxDate(dates);
    const paddingL = 80;
    const paddingR = 40;

    const y = TIMELINE_Y + 12;
    this.ctx.fillStyle = '#8B949E';
    this.ctx.font = `400 ${this.isMobile ? 9 : 10}px 'JetBrains Mono', monospace`;
    this.ctx.textAlign = 'center';

    const midDate = new Date((minD.getTime() + maxD.getTime()) / 2);
    const spanMs = maxD.getTime() - minD.getTime();
    const usableW = w - paddingL - paddingR;
    const posOf = (d: Date) => paddingL + ((d.getTime() - minD.getTime()) / spanMs) * usableW;

    this.ctx.fillText(formatShortDate(minD), posOf(minD), y);
    this.ctx.fillText(formatShortDate(midDate), posOf(midDate), y);
    this.ctx.fillText(formatShortDate(maxD), posOf(maxD), y);

    for (const event of events) {
      const evX = event.targetPosition + this.cardW / 2;
      this.ctx.strokeStyle = event.color + (event.visibility < 0.5 ? '40' : 'CC');
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(evX, TIMELINE_Y + 2);
      this.ctx.lineTo(evX, TIMELINE_Y + 8);
      this.ctx.stroke();
    }
  }

  private renderPlaybackCursor(date: Date | null, events: TimelineEvent[], w: number): void {
    if (!date || events.length === 0) return;

    const dates = events.map((e) => e.date);
    const minD = minDate(dates);
    const maxD = maxDate(dates);
    const paddingL = 80;
    const paddingR = 40;
    const spanMs = maxD.getTime() - minD.getTime();
    const usableW = w - paddingL - paddingR;
    let x: number;
    if (spanMs <= 0) {
      x = paddingL + usableW / 2;
    } else {
      const t = (date.getTime() - minD.getTime()) / spanMs;
      x = paddingL + Math.max(0, Math.min(1, t)) * usableW;
    }

    const grad = this.ctx.createLinearGradient(x, 0, x, 500);
    grad.addColorStop(0, 'rgba(88,166,255,0)');
    grad.addColorStop(0.2, 'rgba(88,166,255,0.4)');
    grad.addColorStop(0.5, 'rgba(88,166,255,0.6)');
    grad.addColorStop(0.8, 'rgba(88,166,255,0.4)');
    grad.addColorStop(1, 'rgba(88,166,255,0)');
    this.ctx.strokeStyle = grad;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(x, 0);
    this.ctx.lineTo(x, 500);
    this.ctx.stroke();

    this.ctx.fillStyle = '#58A6FF';
    this.ctx.beginPath();
    this.ctx.arc(x, TIMELINE_Y, 5, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private renderFilterRange(markers: { minX: number; maxX: number } | undefined, w: number, h: number): void {
    if (!markers) return;

    this.ctx.fillStyle = 'rgba(13,17,23,0.55)';
    this.ctx.fillRect(0, 0, markers.minX, h);
    this.ctx.fillRect(markers.maxX, 0, w - markers.maxX, h);

    this.ctx.strokeStyle = 'rgba(88,166,255,0.3)';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(markers.minX, 2, markers.maxX - markers.minX, h - 4);
  }

  public exportHiRes(events: TimelineEvent[], particles: Particle[]): string {
    const EXPORT_CSS_W = 1920;
    const EXPORT_CSS_H = 1080;
    const EXPORT_DPR = Math.max(2, this.dpr);
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = Math.floor(EXPORT_CSS_W * EXPORT_DPR);
    exportCanvas.height = Math.floor(EXPORT_CSS_H * EXPORT_DPR);
    const ectx = exportCanvas.getContext('2d')!;

    const { w: cssW, h: cssH } = this.getCssSize();
    const srcW = cssW || 800;
    const srcH = cssH || 500;
    const scaleX = EXPORT_CSS_W / srcW;
    const scaleY = EXPORT_CSS_H / srcH;

    ectx.setTransform(EXPORT_DPR, 0, 0, EXPORT_DPR, 0, 0);
    ectx.scale(scaleX, scaleY);

    const bgGrad = ectx.createLinearGradient(0, 0, 0, srcH);
    bgGrad.addColorStop(0, '#0D1117');
    bgGrad.addColorStop(1, '#161B22');
    ectx.fillStyle = bgGrad;
    ectx.fillRect(0, 0, srcW, srcH);

    ectx.strokeStyle = GRID_COLOR + '80';
    ectx.lineWidth = 0.5;
    for (let x = GRID_SPACING; x < srcW; x += GRID_SPACING) {
      ectx.beginPath();
      ectx.moveTo(x, 0);
      ectx.lineTo(x, srcH);
      ectx.stroke();
    }
    for (let y = GRID_SPACING; y < srcH; y += GRID_SPACING) {
      ectx.beginPath();
      ectx.moveTo(0, y);
      ectx.lineTo(srcW, y);
      ectx.stroke();
    }

    ectx.save();
    ectx.shadowColor = TIMELINE_LINE_COLOR;
    ectx.shadowBlur = 6;
    ectx.strokeStyle = TIMELINE_LINE_COLOR;
    ectx.lineWidth = TIMELINE_HEIGHT;
    ectx.beginPath();
    ectx.moveTo(0, TIMELINE_Y);
    ectx.lineTo(srcW, TIMELINE_Y);
    ectx.stroke();
    ectx.restore();

    const savedCtx = this.ctx;
    (this as any).ctx = ectx;
    try {
      this.renderParticles(particles);
      this.renderCards(events);
    } finally {
      (this as any).ctx = savedCtx;
    }

    return exportCanvas.toDataURL('image/png');
  }
}
