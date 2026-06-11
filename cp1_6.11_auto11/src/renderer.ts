import type { RenderCommand } from './brush';

export interface RendererState {
  canvas: HTMLCanvasElement;
  previewCanvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  previewCtx: CanvasRenderingContext2D;
  width: number;
  height: number;
  strokePaths: SVGPathData[];
}

export interface SVGPathData {
  d: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
}

export class Renderer {
  private canvas: HTMLCanvasElement;
  private previewCanvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private previewCtx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private strokePaths: SVGPathData[] = [];
  private textureCanvas: HTMLCanvasElement | null = null;

  constructor(canvas: HTMLCanvasElement, previewCanvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.previewCanvas = previewCanvas;
    this.ctx = canvas.getContext('2d')!;
    this.previewCtx = previewCanvas.getContext('2d')!;
    this.width = canvas.width;
    this.height = canvas.height;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
  }

  applyTexture(type: 'danxuan' | 'sajin' | 'yunlong'): void {
    this.textureCanvas = this.createTextureCanvas(type, this.width, this.height);
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.ctx.drawImage(this.textureCanvas, 0, 0);
  }

  private createTextureCanvas(type: string, w: number, h: number): HTMLCanvasElement {
    const tc = document.createElement('canvas');
    tc.width = w;
    tc.height = h;
    const tctx = tc.getContext('2d')!;

    tctx.fillStyle = '#F5E6CA';
    tctx.fillRect(0, 0, w, h);

    if (type === 'sajin') {
      for (let i = 0; i < 300; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const r = Math.random() * 2 + 0.5;
        tctx.beginPath();
        tctx.arc(x, y, r, 0, Math.PI * 2);
        tctx.fillStyle = `rgba(212, 175, 55, ${0.2 + Math.random() * 0.4})`;
        tctx.fill();
      }
    } else if (type === 'yunlong') {
      for (let i = 0; i < 80; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const rx = Math.random() * 40 + 20;
        const ry = Math.random() * 15 + 5;
        tctx.beginPath();
        tctx.ellipse(x, y, rx, ry, Math.random() * Math.PI, 0, Math.PI * 2);
        tctx.fillStyle = `rgba(200, 180, 150, ${0.05 + Math.random() * 0.1})`;
        tctx.fill();
      }
    } else {
      for (let i = 0; i < 500; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        tctx.fillStyle = `rgba(0, 0, 0, ${Math.random() * 0.02})`;
        tctx.fillRect(x, y, Math.random() * 3, Math.random() * 3);
      }
    }

    return tc;
  }

  render(command: RenderCommand): void {
    switch (command.type) {
      case 'stroke':
        this.renderStroke(command);
        break;
      case 'diffusion':
        this.renderDiffusion(command);
        break;
      case 'feibai':
        this.renderFeibai(command);
        break;
    }
  }

  renderPreview(commands: RenderCommand[]): void {
    this.previewCtx.clearRect(0, 0, this.width, this.height);
    for (const cmd of commands) {
      switch (cmd.type) {
        case 'stroke':
          this.drawStrokeOn(this.previewCtx, cmd);
          break;
        case 'diffusion':
          this.drawDiffusionOn(this.previewCtx, cmd);
          break;
        case 'feibai':
          this.drawFeibaiOn(this.previewCtx, cmd);
          break;
      }
    }
  }

  commitPreview(): void {
    this.ctx.drawImage(this.previewCanvas, 0, 0);
    this.previewCtx.clearRect(0, 0, this.width, this.height);
  }

  private renderStroke(cmd: RenderCommand): void {
    this.drawStrokeOn(this.ctx, cmd);
    if (cmd.points && cmd.points.length >= 2) {
      const p0 = cmd.points[0];
      const p1 = cmd.points[1];
      const d = `M ${p0.x} ${p0.y} L ${p1.x} ${p1.y}`;
      this.strokePaths.push({
        d,
        stroke: cmd.color,
        strokeWidth: cmd.width,
        opacity: cmd.opacity,
      });
    }
  }

  private renderDiffusion(cmd: RenderCommand): void {
    this.drawDiffusionOn(this.ctx, cmd);
  }

  private renderFeibai(cmd: RenderCommand): void {
    this.drawFeibaiOn(this.ctx, cmd);
  }

  private drawStrokeOn(ctx: CanvasRenderingContext2D, cmd: RenderCommand): void {
    if (!cmd.points || cmd.points.length < 2) return;
    ctx.save();
    ctx.globalAlpha = cmd.opacity;
    ctx.strokeStyle = cmd.color;
    ctx.lineWidth = cmd.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(cmd.points[0].x, cmd.points[0].y);
    if (cmd.points.length === 2) {
      const mx = (cmd.points[0].x + cmd.points[1].x) / 2;
      const my = (cmd.points[0].y + cmd.points[1].y) / 2;
      ctx.quadraticCurveTo(cmd.points[0].x, cmd.points[0].y, mx, my);
      ctx.lineTo(cmd.points[1].x, cmd.points[1].y);
    } else {
      for (let i = 1; i < cmd.points.length; i++) {
        ctx.lineTo(cmd.points[i].x, cmd.points[i].y);
      }
    }
    ctx.stroke();
    ctx.restore();
  }

  private drawDiffusionOn(ctx: CanvasRenderingContext2D, cmd: RenderCommand): void {
    if (!cmd.radius) return;
    ctx.save();
    ctx.globalAlpha = cmd.opacity;
    const gradient = ctx.createRadialGradient(cmd.x, cmd.y, 0, cmd.x, cmd.y, cmd.radius);
    gradient.addColorStop(0, cmd.color);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cmd.x, cmd.y, cmd.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawFeibaiOn(ctx: CanvasRenderingContext2D, cmd: RenderCommand): void {
    if (!cmd.feibaiPoints) return;
    ctx.save();
    for (const fp of cmd.feibaiPoints) {
      ctx.globalAlpha = fp.opacity;
      ctx.fillStyle = cmd.color;
      ctx.beginPath();
      ctx.arc(fp.x, fp.y, fp.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  clear(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.previewCtx.clearRect(0, 0, this.width, this.height);
    this.strokePaths = [];
    if (this.textureCanvas) {
      this.ctx.drawImage(this.textureCanvas, 0, 0);
    }
  }

  getImageData(): ImageData {
    return this.ctx.getImageData(0, 0, this.width, this.height);
  }

  putImageData(data: ImageData): void {
    this.ctx.putImageData(data, 0, 0);
    this.strokePaths = [];
  }

  getCanvasDataURL(): string {
    return this.canvas.toDataURL('image/png');
  }

  getSVGPaths(): SVGPathData[] {
    return [...this.strokePaths];
  }

  getFullCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  getCombinedDataURL(): string {
    const combined = document.createElement('canvas');
    combined.width = this.width;
    combined.height = this.height;
    const cctx = combined.getContext('2d')!;
    if (this.textureCanvas) {
      cctx.drawImage(this.textureCanvas, 0, 0);
    } else {
      cctx.fillStyle = '#F5E6CA';
      cctx.fillRect(0, 0, this.width, this.height);
    }
    cctx.drawImage(this.canvas, 0, 0);
    return combined.toDataURL('image/png');
  }

  private redrawAll(): void {
    const imageData = this.ctx.getImageData(0, 0, this.width, this.height);
    this.ctx.clearRect(0, 0, this.width, this.height);
    if (this.textureCanvas) {
      this.ctx.drawImage(this.textureCanvas, 0, 0);
    }
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = this.width;
    tempCanvas.height = this.height;
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.putImageData(imageData, 0, 0);
    this.ctx.drawImage(tempCanvas, 0, 0);
  }

  resize(width: number, height: number): void {
    const imageData = this.getImageData();
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    this.previewCanvas.width = width;
    this.previewCanvas.height = height;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    if (this.textureCanvas) {
      this.textureCanvas = this.createTextureCanvas('danxuan', width, height);
      this.ctx.drawImage(this.textureCanvas, 0, 0);
    }
    this.ctx.putImageData(imageData, 0, 0);
  }
}
