import type { ViewState, RenderedEvent, HoverInfo, EventCategory } from './types';
import { CATEGORY_COLORS, CATEGORY_LABELS } from './types';
import { easeOutCubic } from './eventManager';

export interface RenderState {
  viewState: ViewState;
  events: RenderedEvent[];
  hoverInfo: HoverInfo;
  hoveredEvent: RenderedEvent | undefined;
  expandedEvent: RenderedEvent | undefined;
  visibleCount: number;
}

export class TimelineEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;
  private dpr = 1;

  private width = 0;
  private height = 0;

  private readonly PADDING_LEFT = 100;
  private readonly PADDING_RIGHT = 100;

  private readonly BG_COLOR = '#F5F2ED';
  private readonly GRID_THICK_COLOR = '#F0EDE8';

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取Canvas 2D上下文');
    this.ctx = ctx;

    this.offscreenCanvas = document.createElement('canvas');
    const offCtx = this.offscreenCanvas.getContext('2d');
    if (!offCtx) throw new Error('无法获取离屏Canvas上下文');
    this.offscreenCtx = offCtx;

    this.dpr = window.devicePixelRatio || 1;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;

    this.canvas.width = Math.floor(width * this.dpr);
    this.canvas.height = Math.floor(height * this.dpr);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    this.offscreenCanvas.width = Math.floor(width * this.dpr);
    this.offscreenCanvas.height = Math.floor(height * this.dpr);
    this.offscreenCtx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  render(state: RenderState): void {
    const { viewState, events, hoverInfo, hoveredEvent, expandedEvent } = state;
    const ctx = this.offscreenCtx;

    ctx.clearRect(0, 0, this.width, this.height);

    this.drawBackground(ctx);
    this.drawTimelineAxis(ctx, viewState);
    this.drawGrid(ctx, viewState);
    this.drawCenterTimeline(ctx);
    this.drawEventConnections(ctx, events);
    this.drawEventNodes(ctx, events);

    if (expandedEvent && expandedEvent.expandProgress > 0.01) {
      this.drawExpandedCard(ctx, expandedEvent);
    }

    if (hoveredEvent && hoverInfo.opacity > 0.01) {
      this.drawHoverTooltip(ctx, hoveredEvent, hoverInfo);
    }

    this.ctx.clearRect(0, 0, this.width, this.height);
    this.ctx.drawImage(this.offscreenCanvas, 0, 0, this.width, this.height);
  }

  exportScreenshot(): string {
    const exportWidth = 1920;
    const exportHeight = 1080;
    const scaleX = exportWidth / this.width;
    const scaleY = exportHeight / this.height;
    const scale = Math.min(scaleX, scaleY);

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = exportWidth;
    exportCanvas.height = exportHeight;
    const ectx = exportCanvas.getContext('2d');
    if (!ectx) return this.canvas.toDataURL('image/png');

    ectx.fillStyle = this.BG_COLOR;
    ectx.fillRect(0, 0, exportWidth, exportHeight);

    const offsetX = (exportWidth - this.width * scale) / 2;
    const offsetY = (exportHeight - this.height * scale) / 2;
    ectx.drawImage(this.canvas, offsetX, offsetY, this.width * scale, this.height * scale);

    return exportCanvas.toDataURL('image/png');
  }

  private drawBackground(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = this.BG_COLOR;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawCenterTimeline(ctx: CanvasRenderingContext2D): void {
    const centerY = this.height * 0.5;
    ctx.strokeStyle = '#D8D3CC';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.PADDING_LEFT, centerY);
    ctx.lineTo(this.width - this.PADDING_RIGHT, centerY);
    ctx.stroke();
  }

  private drawGrid(ctx: CanvasRenderingContext2D, viewState: ViewState): void {
    const { startYear, endYear } = viewState.range;
    const yearSpan = endYear - startYear;
    const timelineWidth = this.width - this.PADDING_LEFT - this.PADDING_RIGHT;
    const top = this.height * 0.15;
    const bottom = this.height * 0.85;
    const centerY = this.height * 0.5;

    const isMobile = this.width < 768;
    const labelFontSize = isMobile ? 10 : 12;

    const hundredYearStep = this.computeGridStep(yearSpan, 100);
    const tenYearStep = this.computeGridStep(yearSpan, 10);

    const firstHundredYear = Math.ceil(startYear / hundredYearStep) * hundredYearStep;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${labelFontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`;

    for (let year = firstHundredYear; year <= endYear; year += hundredYearStep) {
      const rel = (year - startYear) / yearSpan;
      const x = this.PADDING_LEFT + rel * timelineWidth + viewState.offsetX;
      if (x < this.PADDING_LEFT - 50 || x > this.width - this.PADDING_RIGHT + 50) continue;

      ctx.strokeStyle = 'rgba(200, 195, 188, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom);
      ctx.stroke();

      ctx.fillStyle = '#888888';
      ctx.fillText(`${year}年`, x, top - 18);
      ctx.fillText(`${year}年`, x, bottom + 18);
    }

    if (tenYearStep > 0 && yearSpan / tenYearStep < 200) {
      const firstTenYear = Math.ceil(startYear / tenYearStep) * tenYearStep;
      for (let year = firstTenYear; year <= endYear; year += tenYearStep) {
        if (year % hundredYearStep === 0) continue;
        const rel = (year - startYear) / yearSpan;
        const x = this.PADDING_LEFT + rel * timelineWidth + viewState.offsetX;
        if (x < this.PADDING_LEFT - 10 || x > this.width - this.PADDING_RIGHT + 10) continue;

        ctx.strokeStyle = 'rgba(200, 195, 188, 0.2)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(x, centerY - 10);
        ctx.lineTo(x, centerY + 10);
        ctx.stroke();
      }
    }
  }

  private computeGridStep(yearSpan: number, baseStep: number): number {
    const roughSteps = yearSpan / baseStep;
    if (roughSteps <= 30) return baseStep;
    if (roughSteps <= 60) return baseStep * 2;
    if (roughSteps <= 150) return baseStep * 5;
    return baseStep * 10;
  }

  private drawEventConnections(ctx: CanvasRenderingContext2D, events: RenderedEvent[]): void {
    const centerY = this.height * 0.5;

    for (const ev of events) {
      if (ev.visibilityProgress < 0.05) continue;
      ctx.globalAlpha = ev.visibilityProgress * 0.5;
      ctx.strokeStyle = CATEGORY_COLORS[ev.category];
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(ev.screenX, centerY);
      ctx.lineTo(ev.screenX, ev.screenY);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  private drawEventNodes(ctx: CanvasRenderingContext2D, events: RenderedEvent[]): void {
    for (const ev of events) {
      if (ev.visibilityProgress < 0.05) continue;

      const hoverScale = 1 + 0.5 * ev.hoverProgress;
      const radius = ev.radius * hoverScale;
      const expandScale = 1 + 0.2 * ev.expandProgress;
      const finalRadius = radius * expandScale;

      const color = CATEGORY_COLORS[ev.category];

      ctx.globalAlpha = ev.visibilityProgress;

      ctx.shadowColor = color;
      ctx.shadowBlur = 8 + 6 * ev.hoverProgress;

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(ev.screenX, ev.screenY, finalRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ev.screenX, ev.screenY, finalRadius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  private drawHoverTooltip(
    ctx: CanvasRenderingContext2D,
    event: RenderedEvent,
    hoverInfo: HoverInfo
  ): void {
    const maxWidth = 200;
    const paddingX = 12;
    const paddingY = 10;
    const labelFontSize = 13;
    const titleFontSize = 13;

    ctx.font = `${titleFontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
    const titleLines = this.wrapText(ctx, event.title, maxWidth - paddingX * 2);
    const yearText = `${event.year}年`;

    ctx.font = `600 ${labelFontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
    const yearMetrics = ctx.measureText(yearText);
    ctx.font = `${titleFontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
    const lineHeight = labelFontSize * 1.6;
    const contentHeight = lineHeight + titleLines.length * lineHeight;

    const boxWidth = maxWidth;
    const boxHeight = contentHeight + paddingY * 2;

    let tooltipX = hoverInfo.mouseX + 16;
    let tooltipY = hoverInfo.mouseY - boxHeight - 12;

    if (tooltipX + boxWidth > this.width - 10) {
      tooltipX = hoverInfo.mouseX - boxWidth - 16;
    }
    if (tooltipY < 10) {
      tooltipY = hoverInfo.mouseY + 16;
    }

    ctx.globalAlpha = hoverInfo.opacity;

    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;
    this.roundRect(ctx, tooltipX, tooltipY, boxWidth, boxHeight, 8);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    const color = CATEGORY_COLORS[event.category];
    ctx.fillStyle = color;
    ctx.fillRect(tooltipX, tooltipY, 3, boxHeight);

    ctx.fillStyle = color;
    ctx.font = `600 ${labelFontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(yearText, tooltipX + paddingX, tooltipY + paddingY);

    ctx.fillStyle = '#333333';
    ctx.font = `${titleFontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
    let textY = tooltipY + paddingY + lineHeight;
    for (const line of titleLines) {
      ctx.fillText(line, tooltipX + paddingX, textY);
      textY += lineHeight;
    }

    ctx.globalAlpha = 1;
  }

  private drawExpandedCard(ctx: CanvasRenderingContext2D, event: RenderedEvent): void {
    const t = easeOutCubic(event.expandProgress);
    const isMobile = this.width < 768;
    const cardWidth = isMobile ? Math.min(this.width - 20, this.width * 0.95) : 300;
    const paddingX = 16;
    const paddingY = 16;
    const titleFontSize = isMobile ? 15 : 16;
    const descFontSize = isMobile ? 12 : 13;
    const metaFontSize = isMobile ? 11 : 12;
    const borderRadius = 12;

    const color = CATEGORY_COLORS[event.category];

    let cardX = event.screenX - cardWidth / 2;
    let cardY = event.screenY + event.radius + 14;

    if (cardX < 10) cardX = 10;
    if (cardX + cardWidth > this.width - 10) cardX = this.width - cardWidth - 10;

    const descLines = this.wrapText(ctx, this.truncateDescription(event.description, 150), cardWidth - paddingX * 2);
    const lineHeight = descFontSize * 1.65;
    const starsText = '★'.repeat(event.importance) + '☆'.repeat(5 - event.importance);

    const baseHeight = titleFontSize * 1.4 + metaFontSize * 2.2 + 16;
    const descHeight = descLines.length * lineHeight;
    const categoryHeight = metaFontSize * 1.8;
    const cardHeight = baseHeight + descHeight + categoryHeight + paddingY * 2;

    const scale = 0.8 + 0.2 * t;
    const centerX = cardX + cardWidth / 2;
    const centerY = cardY + 10;

    ctx.save();
    ctx.globalAlpha = t;
    ctx.translate(centerX, centerY);
    ctx.scale(scale, scale);
    ctx.translate(-centerX, -centerY);

    ctx.fillStyle = '#FAFAFA';
    ctx.strokeStyle = '#DDDDDD';
    ctx.lineWidth = 1;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;
    this.roundRect(ctx, cardX, cardY, cardWidth, cardHeight, borderRadius);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    ctx.fillStyle = color;
    ctx.fillRect(cardX, cardY, 4, cardHeight);

    let textY = cardY + paddingY;
    ctx.fillStyle = '#1A1A1A';
    ctx.font = `600 ${titleFontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const titleLines = this.wrapText(ctx, event.title, cardWidth - paddingX * 2);
    for (const line of titleLines) {
      ctx.fillText(line, cardX + paddingX + 4, textY);
      textY += titleFontSize * 1.4;
    }

    textY += 4;
    ctx.fillStyle = '#888888';
    ctx.font = `${metaFontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
    ctx.fillText(`${event.year}年`, cardX + paddingX + 4, textY);
    textY += metaFontSize * 1.8;

    ctx.fillStyle = '#FFB300';
    ctx.font = `${metaFontSize + 2}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
    ctx.fillText(starsText, cardX + paddingX + 4, textY);
    textY += metaFontSize * 1.8;

    ctx.fillStyle = color;
    ctx.font = `500 ${metaFontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
    const catLabel = CATEGORY_LABELS[event.category];
    const catWidth = ctx.measureText(catLabel).width + 14;
    this.roundRect(ctx, cardX + paddingX + 4, textY, catWidth, metaFontSize * 1.6, 4);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.textBaseline = 'middle';
    ctx.fillText(catLabel, cardX + paddingX + 4 + 7, textY + metaFontSize * 0.8);
    textY += metaFontSize * 1.8 + 8;

    ctx.fillStyle = '#555555';
    ctx.font = `${descFontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
    ctx.textBaseline = 'top';
    for (const line of descLines) {
      ctx.fillText(line, cardX + paddingX + 4, textY);
      textY += lineHeight;
    }

    ctx.restore();
    ctx.globalAlpha = 1;
  }

  private drawTimelineAxis(ctx: CanvasRenderingContext2D, viewState: ViewState): void {
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ): void {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  private wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const lines: string[] = [];
    let currentLine = '';
    for (const char of text) {
      const testLine = currentLine + char;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && currentLine.length > 0) {
        lines.push(currentLine);
        currentLine = char;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  }

  private truncateDescription(text: string, maxChars: number): string {
    if (text.length <= maxChars) return text;
    return text.slice(0, maxChars) + '...';
  }

  getTimelineWidth(): number {
    return this.width - this.PADDING_LEFT - this.PADDING_RIGHT;
  }

  getYearToPixelFn(viewState: ViewState): (year: number) => number {
    const { startYear, endYear } = viewState.range;
    const yearSpan = endYear - startYear;
    const timelineWidth = this.getTimelineWidth();
    return (year: number) => {
      const rel = (year - startYear) / yearSpan;
      return this.PADDING_LEFT + rel * timelineWidth + viewState.offsetX;
    };
  }
}
