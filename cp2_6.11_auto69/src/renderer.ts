import type { DeformedPage, Point } from './paper';

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

    if (!deformed || deformed.progress === 0) {
      this.drawStaticPage(data.frontImage, data.pageNumber, data.totalPages);
      ctx.restore();
      return;
    }

    this.drawBasePage(data, deformed);
    this.drawFlippingPage(deformed, data);

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
      ctx.lineTo(w, 0);
      ctx.lineTo(w, h);
      ctx.lineTo(deformed.foldEnd.x, deformed.foldEnd.y);
    } else {
      ctx.moveTo(0, 0);
      ctx.lineTo(deformed.foldStart.x, deformed.foldStart.y);
      ctx.lineTo(deformed.foldEnd.x, deformed.foldEnd.y);
      ctx.lineTo(0, h);
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

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(deformed.topLeft.x, deformed.topLeft.y);
    ctx.quadraticCurveTo(deformed.foldControl.x, deformed.foldControl.y, deformed.topRight.x, deformed.topRight.y);
    ctx.lineTo(deformed.bottomRight.x, deformed.bottomRight.y);
    ctx.quadraticCurveTo(deformed.foldControl.x, deformed.foldControl.y, deformed.bottomLeft.x, deformed.bottomLeft.y);
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
    this.drawBackFace(deformed);
    this.drawFoldHighlight(deformed);
  }

  private drawBackFace(deformed: DeformedPage): void {
    const ctx = this.ctx;
    const t = deformed.progress;
    if (t < 0.15) return;

    ctx.save();
    ctx.beginPath();
    if (deformed.direction === 'next') {
      ctx.moveTo(deformed.backTopLeft.x, deformed.backTopLeft.y);
      ctx.quadraticCurveTo(
        deformed.backTopLeft.x + (deformed.backTopRight.x - deformed.backTopLeft.x) * 0.5 + t * 8,
        this.paperHeight / 2,
        deformed.backBottomLeft.x,
        deformed.backBottomLeft.y
      );
      ctx.lineTo(deformed.backBottomRight.x, deformed.backBottomRight.y);
      ctx.quadraticCurveTo(
        deformed.backTopRight.x + (deformed.backBottomRight.x - deformed.backTopRight.x) * 0.5 - t * 8,
        this.paperHeight / 2,
        deformed.backTopRight.x,
        deformed.backTopRight.y
      );
    } else {
      ctx.moveTo(deformed.backTopLeft.x, deformed.backTopLeft.y);
      ctx.quadraticCurveTo(
        deformed.backTopLeft.x + (deformed.backTopRight.x - deformed.backTopLeft.x) * 0.5 - t * 8,
        this.paperHeight / 2,
        deformed.backBottomLeft.x,
        deformed.backBottomLeft.y
      );
      ctx.lineTo(deformed.backBottomRight.x, deformed.backBottomRight.y);
      ctx.quadraticCurveTo(
        deformed.backTopRight.x + (deformed.backBottomRight.x - deformed.backTopRight.x) * 0.5 + t * 8,
        this.paperHeight / 2,
        deformed.backTopRight.x,
        deformed.backTopRight.y
      );
    }
    ctx.closePath();

    const alpha = Math.min(0.55, (t - 0.15) * 0.9);
    const gradient = ctx.createLinearGradient(
      deformed.foldStart.x, 0,
      deformed.direction === 'next' ? deformed.foldStart.x + 60 : deformed.foldStart.x - 60,
      0
    );
    gradient.addColorStop(0, `rgba(220, 220, 220, ${alpha})`);
    gradient.addColorStop(1, `rgba(180, 180, 180, ${alpha * 0.5})`);
    ctx.fillStyle = gradient;
    ctx.filter = 'blur(0.8px)';
    ctx.fill();
    ctx.filter = 'none';
    ctx.restore();
  }

  private drawFoldHighlight(deformed: DeformedPage): void {
    const ctx = this.ctx;
    const t = deformed.progress;
    if (t < 0.03 || t > 0.97) return;

    ctx.save();
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    const grad = ctx.createLinearGradient(
      deformed.foldStart.x, deformed.foldStart.y,
      deformed.foldEnd.x, deformed.foldEnd.y
    );
    grad.addColorStop(0, 'rgba(255, 200, 90, 0.0)');
    grad.addColorStop(0.2, 'rgba(255, 200, 90, 0.75)');
    grad.addColorStop(0.5, 'rgba(255, 160, 50, 0.95)');
    grad.addColorStop(0.8, 'rgba(220, 110, 30, 0.7)');
    grad.addColorStop(1, 'rgba(180, 80, 20, 0.0)');
    ctx.strokeStyle = grad;

    ctx.beginPath();
    ctx.moveTo(deformed.foldStart.x, deformed.foldStart.y + 6);
    ctx.quadraticCurveTo(
      deformed.foldControl.x,
      deformed.foldControl.y,
      deformed.foldEnd.x,
      deformed.foldEnd.y - 6
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
      ctx.filter = `saturate(${1 - desaturate}) brightness(${1 - desaturate * 0.1})`;
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
