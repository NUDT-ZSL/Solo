import type { DeformedPage } from './paper';

export interface PageRenderData {
  frontImage: HTMLImageElement | HTMLCanvasElement | null;
  backImage: HTMLImageElement | HTMLCanvasElement | null;
  pageNumber: number;
  totalPages: number;
}

export class CanvasRenderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private width: number;
  private height: number;
  private paperX: number;
  private paperY: number;
  private paperWidth: number;
  private paperHeight: number;
  private noiseCanvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not supported');
    this.ctx = ctx;
    this.width = canvas.width;
    this.height = canvas.height;
    this.paperX = 0;
    this.paperY = 0;
    this.paperWidth = canvas.width;
    this.paperHeight = canvas.height;
    this.noiseCanvas = this.generateNoise();
  }

  resize(canvasWidth: number, canvasHeight: number, paperWidth: number, paperHeight: number): void {
    this.canvas.width = canvasWidth;
    this.canvas.height = canvasHeight;
    this.width = canvasWidth;
    this.height = canvasHeight;
    this.paperWidth = paperWidth;
    this.paperHeight = paperHeight;
    this.paperX = (canvasWidth - paperWidth) / 2;
    this.paperY = (canvasHeight - paperHeight) / 2;
    this.noiseCanvas = this.generateNoise();
  }

  private generateNoise(): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const g = c.getContext('2d');
    if (!g) return c;
    const img = g.createImageData(256, 256);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 120 + Math.random() * 40;
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 24;
    }
    g.putImageData(img, 0, 0);
    return c;
  }

  render(deformed: DeformedPage | null, data: PageRenderData): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    ctx.save();
    ctx.translate(this.paperX, this.paperY);

    if (!deformed || deformed.progress < 0.005) {
      this.drawStaticPage(data.frontImage, data.pageNumber, data.totalPages);
      ctx.restore();
      return;
    }

    this.drawBasePage(data, deformed);
    this.drawBackFaceWithImage(deformed, data);
    this.drawFlippingPage(deformed, data);
    this.drawFoldHighlight(deformed);

    ctx.restore();
  }

  private drawStaticPage(img: HTMLImageElement | HTMLCanvasElement | null, page: number, total: number): void {
    const ctx = this.ctx;
    this.drawPaperShadow(0, 0, this.paperWidth, this.paperHeight, 1);
    this.drawPaperBackground(0, 0, this.paperWidth, this.paperHeight);

    if (img) {
      this.drawImageCover(img, 0, 0, this.paperWidth, this.paperHeight, 0);
    }
    this.drawPaperTexture(0, 0, this.paperWidth, this.paperHeight);
    this.drawPageNumber(page, total);
  }

  private drawBasePage(data: PageRenderData, deformed: DeformedPage): void {
    const ctx = this.ctx;
    const w = this.paperWidth;
    const h = this.paperHeight;

    this.drawPaperShadow(0, 0, w, h, 0.9 - deformed.progress * 0.2);

    ctx.save();
    ctx.beginPath();
    if (deformed.direction === 'next') {
      ctx.moveTo(deformed.foldStart.x, deformed.foldStart.y);
      ctx.bezierCurveTo(
        deformed.foldControl.x, deformed.foldControl.y,
        deformed.foldControl2.x, deformed.foldControl2.y,
        deformed.foldEnd.x, deformed.foldEnd.y
      );
      ctx.lineTo(w, h);
      ctx.lineTo(w, 0);
    } else {
      ctx.moveTo(0, 0);
      ctx.lineTo(0, h);
      ctx.lineTo(deformed.foldEnd.x, deformed.foldEnd.y);
      ctx.bezierCurveTo(
        deformed.foldControl2.x, deformed.foldControl2.y,
        deformed.foldControl.x, deformed.foldControl.y,
        deformed.foldStart.x, deformed.foldStart.y
      );
    }
    ctx.closePath();
    ctx.clip();

    this.drawPaperBackground(0, 0, w, h);
    const bgImg = deformed.direction === 'next' ? data.backImage : data.frontImage;
    if (bgImg) {
      this.drawImageCover(bgImg, 0, 0, w, h, 0);
    }
    this.drawPaperTexture(0, 0, w, h);

    const showPage = deformed.direction === 'next' ? data.pageNumber + 1 : data.pageNumber;
    this.drawPageNumber(showPage, data.totalPages);

    ctx.restore();
  }

  private drawFlippingPage(deformed: DeformedPage, data: PageRenderData): void {
    const ctx = this.ctx;
    const t = deformed.progress;

    ctx.save();
    ctx.beginPath();
    if (deformed.direction === 'next') {
      ctx.moveTo(deformed.topLeft.x, deformed.topLeft.y);
      ctx.lineTo(deformed.foldStart.x, deformed.foldStart.y);
      ctx.bezierCurveTo(
        deformed.foldControl.x, deformed.foldControl.y,
        deformed.foldControl2.x, deformed.foldControl2.y,
        deformed.foldEnd.x, deformed.foldEnd.y
      );
      ctx.lineTo(deformed.bottomLeft.x, deformed.bottomLeft.y);
    } else {
      ctx.moveTo(deformed.topRight.x, deformed.topRight.y);
      ctx.lineTo(deformed.foldEnd.x, deformed.foldEnd.y);
      ctx.bezierCurveTo(
        deformed.foldControl2.x, deformed.foldControl2.y,
        deformed.foldControl.x, deformed.foldControl.y,
        deformed.foldStart.x, deformed.foldStart.y
      );
      ctx.lineTo(deformed.bottomRight.x, deformed.bottomRight.y);
    }
    ctx.closePath();
    ctx.clip();

    const flipImg = deformed.direction === 'next' ? data.frontImage : data.backImage;
    this.drawPaperBackground(0, 0, this.paperWidth, this.paperHeight);
    if (flipImg) {
      this.drawImageCover(flipImg, 0, 0, this.paperWidth, this.paperHeight, deformed.desaturate);
    }
    this.drawPaperTexture(0, 0, this.paperWidth, this.paperHeight);

    const showPage = deformed.direction === 'next' ? data.pageNumber : data.pageNumber + 1;
    this.drawPageNumber(showPage, data.totalPages);

    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    const fadeGrad = ctx.createLinearGradient(
      deformed.direction === 'next' ? deformed.foldStart.x - 30 : deformed.foldStart.x,
      0,
      deformed.direction === 'next' ? deformed.foldStart.x + 30 : deformed.foldStart.x - 30,
      0
    );
    const shadowAlpha = Math.sin(t * Math.PI) * 0.35;
    fadeGrad.addColorStop(0, `rgba(0, 0, 0, 0)`);
    fadeGrad.addColorStop(0.45, `rgba(0, 0, 0, ${shadowAlpha})`);
    fadeGrad.addColorStop(0.55, `rgba(0, 0, 0, ${shadowAlpha * 0.8})`);
    fadeGrad.addColorStop(1, `rgba(0, 0, 0, 0)`);
    ctx.fillStyle = fadeGrad;
    ctx.fillRect(0, 0, this.paperWidth, this.paperHeight);
    ctx.restore();
  }

  private drawBackFaceWithImage(deformed: DeformedPage, data: PageRenderData): void {
    const ctx = this.ctx;
    const t = deformed.progress;
    if (t < 0.12) return;

    const backImg = deformed.direction === 'next' ? data.frontImage : data.backImage;

    ctx.save();
    ctx.beginPath();
    if (deformed.direction === 'next') {
      ctx.moveTo(deformed.backTopLeft.x, deformed.backTopLeft.y);
      ctx.quadraticCurveTo(
        deformed.backFoldControl.x, deformed.backFoldControl.y,
        deformed.backBottomLeft.x, deformed.backBottomLeft.y
      );
      ctx.lineTo(deformed.backBottomRight.x, deformed.backBottomRight.y);
      ctx.quadraticCurveTo(
        deformed.backFoldControl.x, deformed.backFoldControl.y,
        deformed.backTopRight.x, deformed.backTopRight.y
      );
    } else {
      ctx.moveTo(deformed.backTopLeft.x, deformed.backTopLeft.y);
      ctx.quadraticCurveTo(
        deformed.backFoldControl.x, deformed.backFoldControl.y,
        deformed.backBottomLeft.x, deformed.backBottomLeft.y
      );
      ctx.lineTo(deformed.backBottomRight.x, deformed.backBottomRight.y);
      ctx.quadraticCurveTo(
        deformed.backFoldControl.x, deformed.backFoldControl.y,
        deformed.backTopRight.x, deformed.backTopRight.y
      );
    }
    ctx.closePath();

    ctx.save();
    ctx.clip();

    if (backImg) {
      ctx.save();
      ctx.filter = 'blur(1.5px) brightness(0.55) saturate(0.6)';
      ctx.globalAlpha = 0.35;
      this.drawImageCover(backImg, 0, 0, this.paperWidth, this.paperHeight, 0);
      ctx.restore();
    }

    const overlayAlpha = Math.min(0.5, (t - 0.12) * 0.9);
    const paperGrad = ctx.createLinearGradient(
      deformed.foldStart.x, 0,
      deformed.direction === 'next' ? deformed.foldStart.x + 80 : deformed.foldStart.x - 80,
      0
    );
    paperGrad.addColorStop(0, `rgba(210, 210, 210, ${overlayAlpha * 0.9})`);
    paperGrad.addColorStop(0.5, `rgba(190, 190, 190, ${overlayAlpha * 0.7})`);
    paperGrad.addColorStop(1, `rgba(170, 170, 170, ${overlayAlpha * 0.4})`);
    ctx.fillStyle = paperGrad;
    ctx.fillRect(0, 0, this.paperWidth, this.paperHeight);

    ctx.restore();

    const edgeGrad = ctx.createLinearGradient(
      deformed.foldStart.x, 0,
      deformed.direction === 'next' ? deformed.foldStart.x + 20 : deformed.foldStart.x - 20,
      0
    );
    edgeGrad.addColorStop(0, `rgba(0, 0, 0, ${Math.min(0.4, t * 0.8)})`);
    edgeGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = edgeGrad;
    ctx.fill();

    ctx.restore();
  }

  private drawFoldHighlight(deformed: DeformedPage): void {
    const ctx = this.ctx;
    const t = deformed.progress;
    if (t < 0.02 || t > 0.98) return;

    ctx.save();
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    const grad = ctx.createLinearGradient(
      deformed.foldStart.x, deformed.foldStart.y,
      deformed.foldEnd.x, deformed.foldEnd.y
    );
    grad.addColorStop(0, 'rgba(255, 220, 130, 0)');
    grad.addColorStop(0.15, 'rgba(255, 200, 90, 0.8)');
    grad.addColorStop(0.5, 'rgba(255, 165, 50, 0.95)');
    grad.addColorStop(0.85, 'rgba(220, 120, 30, 0.7)');
    grad.addColorStop(1, 'rgba(180, 80, 20, 0)');
    ctx.strokeStyle = grad;

    ctx.beginPath();
    ctx.moveTo(deformed.foldStart.x, deformed.foldStart.y + 8);
    ctx.bezierCurveTo(
      deformed.foldControl.x, deformed.foldControl.y,
      deformed.foldControl2.x, deformed.foldControl2.y,
      deformed.foldEnd.x, deformed.foldEnd.y - 8
    );
    ctx.stroke();
    ctx.restore();
  }

  private drawPaperBackground(x: number, y: number, w: number, h: number): void {
    const ctx = this.ctx;
    const grad = ctx.createLinearGradient(x, y, x + w, y + h);
    grad.addColorStop(0, '#FFFFFF');
    grad.addColorStop(0.5, '#FBFAF7');
    grad.addColorStop(1, '#F3F0EA');
    ctx.fillStyle = grad;
    this.roundRect(ctx, x, y, w, h, 6);
    ctx.fill();
  }

  private drawPaperTexture(x: number, y: number, w: number, h: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.filter = 'contrast(1.2) opacity(0.35)';
    const pattern = ctx.createPattern(this.noiseCanvas, 'repeat');
    if (pattern) {
      ctx.fillStyle = pattern;
      ctx.fillRect(x, y, w, h);
    }
    ctx.restore();
  }

  private drawPaperShadow(x: number, y: number, w: number, h: number, intensity: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.shadowColor = `rgba(0, 0, 0, ${0.55 * intensity})`;
    ctx.shadowBlur = 32 * intensity;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 6 * intensity;
    ctx.fillStyle = '#FFFFFF';
    this.roundRect(ctx, x + 2, y + 2, w - 4, h - 4, 6);
    ctx.fill();
    ctx.restore();
  }

  private drawImageCover(
    img: HTMLImageElement | HTMLCanvasElement,
    x: number, y: number, w: number, h: number,
    desaturate: number
  ): void {
    const ctx = this.ctx;
    const iw = img instanceof HTMLImageElement ? img.naturalWidth : img.width;
    const ih = img instanceof HTMLImageElement ? img.naturalHeight : img.height;
    if (!iw || !ih) return;

    const scale = Math.max(w / iw, h / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = x + (w - dw) / 2;
    const dy = y + (h - dh) / 2;

    ctx.save();
    if (desaturate > 0.01) {
      const sat = Math.max(0.05, 1 - desaturate);
      const bright = 1 - desaturate * 0.15;
      ctx.filter = `saturate(${sat}) brightness(${bright})`;
    }
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.restore();
  }

  private drawPageNumber(page: number, total: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.font = '13px -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif';
    ctx.fillStyle = 'rgba(110, 110, 110, 0.6)';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`${page} / ${total}`, this.paperWidth - 16, this.paperHeight - 14);
    ctx.restore();
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
}
