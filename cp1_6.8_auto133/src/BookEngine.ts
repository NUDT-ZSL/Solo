import type { BookPage, FlipState, FlipDirection, FlipParams } from './types';

interface RenderedPage {
  canvas: HTMLCanvasElement;
  pageId: number;
}

export class BookEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private pageWidth: number;
  private pageHeight: number;
  private pages: BookPage[] = [];
  private renderedPages: RenderedPage[] = [];
  private currentPage: number = 0;
  private flipState: FlipState = 'idle';
  private flipDirection: FlipDirection | null = null;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private dragCurrentX: number = 0;
  private dragCurrentY: number = 0;
  private flipProgress: number = 0;
  private animationId: number = 0;
  private fontSize: number = 18;
  private onFlipComplete?: (direction: FlipDirection) => void;
  private onFlipProgress?: (progress: number) => void;
  private onCurrentPageChange?: (page: number) => void;
  private targetFlipProgress: number = 0;
  private isForward: boolean = true;
  private dpr: number = 1;

  constructor(config: {
    canvas: HTMLCanvasElement;
    pageWidth: number;
    pageHeight: number;
    onFlipComplete?: (direction: FlipDirection) => void;
    onFlipProgress?: (progress: number) => void;
    onCurrentPageChange?: (page: number) => void;
  }) {
    this.canvas = config.canvas;
    this.ctx = this.canvas.getContext('2d')!;
    this.pageWidth = config.pageWidth;
    this.pageHeight = config.pageHeight;
    this.onFlipComplete = config.onFlipComplete;
    this.onFlipProgress = config.onFlipProgress;
    this.onCurrentPageChange = config.onCurrentPageChange;
    this.dpr = window.devicePixelRatio || 1;
    this.setupCanvas();
    this.bindEvents();
  }

  private setupCanvas() {
    this.canvas.width = this.pageWidth * this.dpr;
    this.canvas.height = this.pageHeight * this.dpr;
    this.canvas.style.width = `${this.pageWidth}px`;
    this.canvas.style.height = `${this.pageHeight}px`;
    this.ctx.scale(this.dpr, this.dpr);
  }

  resize(width: number, height: number) {
    this.pageWidth = width;
    this.pageHeight = height;
    this.setupCanvas();
    this.renderAllPages();
    this.render();
  }

  loadPages(pages: BookPage[]) {
    this.pages = pages;
    this.renderAllPages();
    this.render();
  }

  setPage(page: number) {
    this.currentPage = Math.max(0, Math.min(page, this.pages.length - 1));
    this.render();
  }

  getCurrentPage(): number {
    return this.currentPage;
  }

  setFontSize(size: number) {
    this.fontSize = size;
    this.renderAllPages();
    this.render();
  }

  flipTo(direction: FlipDirection) {
    if (this.flipState !== 'idle') return;
    if (direction === 'next' && this.currentPage >= this.pages.length - 1) return;
    if (direction === 'prev' && this.currentPage <= 0) return;

    this.flipDirection = direction;
    this.flipState = 'animating';
    this.flipProgress = 0;
    this.isForward = direction === 'next';
    this.targetFlipProgress = 1;
    this.dragStartX = direction === 'next' ? this.pageWidth : 0;
    this.dragStartY = this.pageHeight / 2;
    this.dragCurrentX = this.dragStartX;
    this.dragCurrentY = this.dragStartY;
    this.animate();
  }

  goToPage(page: number) {
    if (page < 0 || page >= this.pages.length) return;
    this.currentPage = page;
    this.flipState = 'idle';
    this.flipProgress = 0;
    this.render();
    this.onCurrentPageChange?.(this.currentPage);
  }

  private renderAllPages() {
    this.renderedPages = this.pages.map((page) => {
      const offscreen = document.createElement('canvas');
      offscreen.width = this.pageWidth * this.dpr;
      offscreen.height = this.pageHeight * this.dpr;
      const offCtx = offscreen.getContext('2d')!;
      offCtx.scale(this.dpr, this.dpr);
      this.renderPageContent(offCtx, page);
      return { canvas: offscreen, pageId: page.id };
    });
  }

  private renderPageContent(ctx: CanvasRenderingContext2D, page: BookPage) {
    const w = this.pageWidth;
    const h = this.pageHeight;

    ctx.fillStyle = '#FFF8E1';
    ctx.fillRect(0, 0, w, h);

    const pageGradient = ctx.createLinearGradient(0, 0, w, 0);
    pageGradient.addColorStop(0, 'rgba(0,0,0,0.03)');
    pageGradient.addColorStop(0.05, 'rgba(0,0,0,0)');
    pageGradient.addColorStop(0.95, 'rgba(0,0,0,0)');
    pageGradient.addColorStop(1, 'rgba(0,0,0,0.03)');
    ctx.fillStyle = pageGradient;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = '#D4A84B';
    ctx.lineWidth = 1.5;
    const margin = 24;
    ctx.strokeRect(margin, margin, w - margin * 2, h - margin * 2);

    ctx.beginPath();
    ctx.moveTo(margin + 8, margin + 8);
    ctx.lineTo(w - margin - 8, margin + 8);
    ctx.lineTo(w - margin - 8, h - margin - 8);
    ctx.lineTo(margin + 8, h - margin - 8);
    ctx.closePath();
    ctx.strokeStyle = 'rgba(212,168,75,0.3)';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    if (page.illustrationUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const imgW = w - margin * 4;
        const imgH = (h - margin * 4) * 0.4;
        ctx.drawImage(img, margin * 2, margin * 2 + 20, imgW, imgH);
        this.renderPageText(ctx, page.text, margin * 2, margin * 2 + imgH + 40, w - margin * 4, h - margin * 2 - imgH - 60);
      };
      img.src = page.illustrationUrl;
    } else {
      this.renderPageText(ctx, page.text, margin * 2 + 12, margin * 2 + 16, w - margin * 4 - 24, h - margin * 4 - 16);
    }

    ctx.fillStyle = '#D4A84B';
    ctx.font = '12px serif';
    ctx.textAlign = 'center';
    ctx.fillText(`— ${page.id} —`, w / 2, h - margin - 6);
  }

  private renderPageText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    maxHeight: number
  ) {
    ctx.fillStyle = '#3E2723';
    ctx.font = `${this.fontSize}px "Noto Serif SC", "SimSun", serif`;
    ctx.textAlign = 'left';

    const lineHeight = this.fontSize * 1.9;
    const chars = text.split('');
    let line = '';
    let currentY = y;
    const lines: string[] = [];

    for (const char of chars) {
      const testLine = line + char;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && line !== '') {
        lines.push(line);
        line = char;
      } else {
        line = testLine;
      }
    }
    if (line) lines.push(line);

    for (const l of lines) {
      if (currentY + lineHeight > y + maxHeight) break;
      ctx.fillText(l, x, currentY);
      currentY += lineHeight;
    }
  }

  private render() {
    const ctx = this.ctx;
    const w = this.pageWidth;
    const h = this.pageHeight;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#5D4037';
    ctx.fillRect(0, 0, w, h);

    if (this.flipState === 'idle' || this.flipProgress === 0) {
      this.renderStaticPage(ctx);
      return;
    }

    this.renderFlipAnimation(ctx);
  }

  private renderStaticPage(ctx: CanvasRenderingContext2D) {
    const w = this.pageWidth;
    const h = this.pageHeight;
    const page = this.renderedPages[this.currentPage];
    if (!page) return;

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = 5;
    ctx.shadowOffsetY = 5;
    ctx.drawImage(page.canvas, 0, 0, w, h);
    ctx.restore();

    this.renderLampLight(ctx);
  }

  private renderLampLight(ctx: CanvasRenderingContext2D) {
    const w = this.pageWidth;
    const h = this.pageHeight;

    const lampGrad = ctx.createRadialGradient(w * 0.3, -h * 0.1, 0, w * 0.3, -h * 0.1, h * 0.9);
    lampGrad.addColorStop(0, 'rgba(255,220,150,0.12)');
    lampGrad.addColorStop(0.5, 'rgba(255,220,150,0.04)');
    lampGrad.addColorStop(1, 'rgba(255,220,150,0)');
    ctx.fillStyle = lampGrad;
    ctx.fillRect(0, 0, w, h);

    const edgeGrad = ctx.createLinearGradient(0, h * 0.7, 0, h);
    edgeGrad.addColorStop(0, 'rgba(62,39,35,0)');
    edgeGrad.addColorStop(1, 'rgba(62,39,35,0.15)');
    ctx.fillStyle = edgeGrad;
    ctx.fillRect(0, 0, w, h);
  }

  private renderFlipAnimation(ctx: CanvasRenderingContext2D) {
    const w = this.pageWidth;
    const h = this.pageHeight;
    const progress = this.flipProgress;
    const direction = this.flipDirection!;

    const nextPageIndex = direction === 'next' ? this.currentPage + 1 : this.currentPage - 1;
    const nextPage = this.renderedPages[nextPageIndex];
    const currentPage = this.renderedPages[this.currentPage];
    if (!currentPage || !nextPage) return;

    if (direction === 'next') {
      this.renderNextFlip(ctx, progress, currentPage, nextPage);
    } else {
      this.renderPrevFlip(ctx, progress, currentPage, nextPage);
    }

    this.renderLampLight(ctx);
  }

  private renderNextFlip(
    ctx: CanvasRenderingContext2D,
    progress: number,
    currentPage: RenderedPage,
    nextPage: RenderedPage
  ) {
    const w = this.pageWidth;
    const h = this.pageHeight;

    ctx.save();
    ctx.drawImage(nextPage.canvas, 0, 0, w, h);
    ctx.restore();

    const foldX = w * (1 - progress);
    const curlWidth = Math.max(30, 80 * (1 - progress));

    ctx.save();

    const cp1x = foldX + curlWidth * 0.3;
    const cp1y = 0;
    const cp2x = foldX + curlWidth * 0.3;
    const cp2y = h;
    const endX = foldX;
    const endY = h;

    ctx.beginPath();
    ctx.moveTo(foldX, 0);
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
    ctx.lineTo(0, h);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.clip();

    ctx.drawImage(currentPage.canvas, 0, 0, w, h);

    const shadowGrad = ctx.createLinearGradient(foldX, 0, foldX + curlWidth, 0);
    shadowGrad.addColorStop(0, 'rgba(0,0,0,0.2)');
    shadowGrad.addColorStop(0.3, 'rgba(0,0,0,0.08)');
    shadowGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = shadowGrad;
    ctx.fillRect(foldX, 0, curlWidth, h);

    ctx.restore();

    this.renderCurlFold(ctx, foldX, curlWidth, progress);
  }

  private renderPrevFlip(
    ctx: CanvasRenderingContext2D,
    progress: number,
    currentPage: RenderedPage,
    prevPage: RenderedPage
  ) {
    const w = this.pageWidth;
    const h = this.pageHeight;

    ctx.save();
    ctx.drawImage(currentPage.canvas, 0, 0, w, h);
    ctx.restore();

    const foldX = w * progress;
    const curlWidth = Math.max(30, 80 * (1 - progress));

    ctx.save();

    const cp1x = foldX - curlWidth * 0.3;
    const cp1y = 0;
    const cp2x = foldX - curlWidth * 0.3;
    const cp2y = h;
    const endX = foldX;
    const endY = h;

    ctx.beginPath();
    ctx.moveTo(foldX, 0);
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
    ctx.lineTo(w, h);
    ctx.lineTo(w, 0);
    ctx.closePath();
    ctx.clip();

    ctx.drawImage(prevPage.canvas, 0, 0, w, h);

    const shadowGrad = ctx.createLinearGradient(foldX, 0, foldX - curlWidth, 0);
    shadowGrad.addColorStop(0, 'rgba(0,0,0,0.2)');
    shadowGrad.addColorStop(0.3, 'rgba(0,0,0,0.08)');
    shadowGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = shadowGrad;
    ctx.fillRect(foldX - curlWidth, 0, curlWidth, h);

    ctx.restore();

    this.renderCurlFoldBack(ctx, foldX, curlWidth, progress);
  }

  private renderCurlFold(
    ctx: CanvasRenderingContext2D,
    foldX: number,
    curlWidth: number,
    progress: number
  ) {
    const h = this.pageHeight;
    const w = this.pageWidth;
    const foldWidth = Math.min(curlWidth * 0.4, 20);

    ctx.save();

    const cp1x = foldX + curlWidth * 0.3;
    const cp2x = foldX + curlWidth * 0.3;

    ctx.beginPath();
    ctx.moveTo(foldX, 0);
    ctx.bezierCurveTo(cp1x, 0, cp2x, h, foldX, h);
    ctx.lineTo(foldX + foldWidth, h);
    ctx.bezierCurveTo(cp1x + foldWidth * 0.5, h, cp1x + foldWidth * 0.5, 0, foldX + foldWidth, 0);
    ctx.closePath();

    const foldGrad = ctx.createLinearGradient(foldX, 0, foldX + foldWidth, 0);
    foldGrad.addColorStop(0, 'rgba(255,248,225,0.9)');
    foldGrad.addColorStop(0.3, 'rgba(240,230,200,0.7)');
    foldGrad.addColorStop(1, 'rgba(200,180,150,0.5)');
    ctx.fillStyle = foldGrad;
    ctx.fill();

    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = -3;
    ctx.shadowOffsetY = 0;
    ctx.strokeStyle = 'rgba(150,130,100,0.4)';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    ctx.restore();
  }

  private renderCurlFoldBack(
    ctx: CanvasRenderingContext2D,
    foldX: number,
    curlWidth: number,
    progress: number
  ) {
    const h = this.pageHeight;
    const foldWidth = Math.min(curlWidth * 0.4, 20);

    ctx.save();

    const cp1x = foldX - curlWidth * 0.3;
    const cp2x = foldX - curlWidth * 0.3;

    ctx.beginPath();
    ctx.moveTo(foldX, 0);
    ctx.bezierCurveTo(cp1x, 0, cp2x, h, foldX, h);
    ctx.lineTo(foldX - foldWidth, h);
    ctx.bezierCurveTo(cp1x - foldWidth * 0.5, h, cp1x - foldWidth * 0.5, 0, foldX - foldWidth, 0);
    ctx.closePath();

    const foldGrad = ctx.createLinearGradient(foldX, 0, foldX - foldWidth, 0);
    foldGrad.addColorStop(0, 'rgba(255,248,225,0.9)');
    foldGrad.addColorStop(0.3, 'rgba(240,230,200,0.7)');
    foldGrad.addColorStop(1, 'rgba(200,180,150,0.5)');
    ctx.fillStyle = foldGrad;
    ctx.fill();

    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 0;
    ctx.strokeStyle = 'rgba(150,130,100,0.4)';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    ctx.restore();
  }

  private animate() {
    if (this.flipState !== 'animating') return;

    const speed = 0.04;
    if (this.isForward) {
      this.flipProgress += speed;
      if (this.flipProgress >= 1) {
        this.flipProgress = 1;
        this.completeFlip();
        return;
      }
    } else {
      this.flipProgress -= speed;
      if (this.flipProgress <= 0) {
        this.flipProgress = 0;
        this.completeFlip();
        return;
      }
    }

    this.onFlipProgress?.(this.flipProgress);
    this.render();
    this.animationId = requestAnimationFrame(() => this.animate());
  }

  private completeFlip() {
    if (this.flipDirection === 'next' && this.currentPage < this.pages.length - 1) {
      this.currentPage++;
    } else if (this.flipDirection === 'prev' && this.currentPage > 0) {
      this.currentPage--;
    }

    this.flipState = 'idle';
    this.flipProgress = 0;
    this.flipDirection = null;
    this.render();
    this.onCurrentPageChange?.(this.currentPage);
    if (this.flipDirection) {
      this.onFlipComplete?.(this.flipDirection);
    }
  }

  private bindEvents() {
    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.onMouseUp.bind(this));
    this.canvas.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    this.canvas.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    this.canvas.addEventListener('touchend', this.onTouchEnd.bind(this));
  }

  private getCanvasPos(e: MouseEvent | Touch): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (this.pageWidth / rect.width),
      y: (e.clientY - rect.top) * (this.pageHeight / rect.height),
    };
  }

  private onMouseDown(e: MouseEvent) {
    if (this.flipState !== 'idle') return;
    const pos = this.getCanvasPos(e);
    this.startDrag(pos.x, pos.y);
  }

  private onMouseMove(e: MouseEvent) {
    if (this.flipState !== 'dragging') return;
    const pos = this.getCanvasPos(e);
    this.updateDrag(pos.x, pos.y);
  }

  private onMouseUp(_e: MouseEvent) {
    if (this.flipState !== 'dragging') return;
    this.endDrag();
  }

  private onTouchStart(e: TouchEvent) {
    if (this.flipState !== 'idle') return;
    e.preventDefault();
    const pos = this.getCanvasPos(e.touches[0]);
    this.startDrag(pos.x, pos.y);
  }

  private onTouchMove(e: TouchEvent) {
    if (this.flipState !== 'dragging') return;
    e.preventDefault();
    const pos = this.getCanvasPos(e.touches[0]);
    this.updateDrag(pos.x, pos.y);
  }

  private onTouchEnd(_e: TouchEvent) {
    if (this.flipState !== 'dragging') return;
    this.endDrag();
  }

  private startDrag(x: number, y: number) {
    this.dragStartX = x;
    this.dragStartY = y;
    this.dragCurrentX = x;
    this.dragCurrentY = y;

    if (x > this.pageWidth * 0.7 && this.currentPage < this.pages.length - 1) {
      this.flipDirection = 'next';
      this.flipState = 'dragging';
      this.flipProgress = 0;
    } else if (x < this.pageWidth * 0.3 && this.currentPage > 0) {
      this.flipDirection = 'prev';
      this.flipState = 'dragging';
      this.flipProgress = 0;
    }
  }

  private updateDrag(x: number, _y: number) {
    this.dragCurrentX = x;
    this.dragCurrentY = _y;

    if (this.flipDirection === 'next') {
      const dx = this.dragStartX - x;
      this.flipProgress = Math.max(0, Math.min(1, dx / (this.pageWidth * 0.8)));
    } else if (this.flipDirection === 'prev') {
      const dx = x - this.dragStartX;
      this.flipProgress = Math.max(0, Math.min(1, dx / (this.pageWidth * 0.8)));
    }

    this.onFlipProgress?.(this.flipProgress);
    this.render();
  }

  private endDrag() {
    const threshold = 0.3;

    if (this.flipProgress > threshold) {
      this.flipState = 'animating';
      this.targetFlipProgress = 1;
      this.isForward = true;
      this.animate();
    } else {
      this.flipState = 'animating';
      this.targetFlipProgress = 0;
      this.isForward = false;
      this.animateReverse();
    }
  }

  private animateReverse() {
    if (this.flipState !== 'animating') return;

    const speed = 0.05;
    this.flipProgress -= speed;

    if (this.flipProgress <= 0) {
      this.flipProgress = 0;
      this.flipState = 'idle';
      this.flipDirection = null;
      this.render();
      return;
    }

    this.render();
    this.animationId = requestAnimationFrame(() => this.animateReverse());
  }

  destroy() {
    cancelAnimationFrame(this.animationId);
    this.canvas.removeEventListener('mousedown', this.onMouseDown.bind(this));
    this.canvas.removeEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.removeEventListener('mouseup', this.onMouseUp.bind(this));
    this.canvas.removeEventListener('mouseleave', this.onMouseUp.bind(this));
    this.canvas.removeEventListener('touchstart', this.onTouchStart.bind(this));
    this.canvas.removeEventListener('touchmove', this.onTouchMove.bind(this));
    this.canvas.removeEventListener('touchend', this.onTouchEnd.bind(this));
  }
}
