export const PIXEL_SIZE = 32;
export const SCALE = 16;
export const THUMB_SCALE = 3;
export const PREVIEW_SCALE = 6;

export const PALETTE: string[] = [
  '#000000', '#ffffff', '#ff6b6b', '#ffa94d',
  '#ffd43b', '#a9e34b', '#51cf66', '#20c997',
  '#22b8cf', '#339af0', '#5c7cfa', '#845ef7',
  '#cc5de8', '#f06595', '#868e96', '#495057'
];

const ERASER = 'eraser';

export type FrameData = (string | null)[][];

export interface AnimationData {
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  frames: FrameData[];
}

export function createEmptyFrame(): FrameData {
  const frame: FrameData = [];
  for (let y = 0; y < PIXEL_SIZE; y++) {
    frame[y] = [];
    for (let x = 0; x < PIXEL_SIZE; x++) {
      frame[y][x] = null;
    }
  }
  return frame;
}

export class PixelEditor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private framesContainer: HTMLElement;
  private frames: FrameData[] = [];
  private currentFrameIndex: number = 0;
  private currentColor: string = PALETTE[2];
  private showGrid: boolean = true;
  private isDrawing: boolean = false;
  private paletteGrid: HTMLElement;
  private pixelInfoEl: HTMLElement;
  private frameInfoEl: HTMLElement;
  private thumbCanvases: HTMLCanvasElement[] = [];

  onFrameChange?: (index: number) => void;
  onFramesUpdate?: () => void;

  constructor(
    canvasId: string,
    paletteId: string,
    framesContainerId: string,
    pixelInfoId: string,
    frameInfoId: string
  ) {
    const canvas = document.getElementById(canvasId);
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new Error(`Canvas ${canvasId} not found`);
    }
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false;

    const palette = document.getElementById(paletteId);
    if (!palette) throw new Error(`Palette ${paletteId} not found`);
    this.paletteGrid = palette;

    const framesEl = document.getElementById(framesContainerId);
    if (!framesEl) throw new Error(`Frames container ${framesContainerId} not found`);
    this.framesContainer = framesEl;

    const pixelInfo = document.getElementById(pixelInfoId);
    if (!pixelInfo) throw new Error(`Pixel info ${pixelInfoId} not found`);
    this.pixelInfoEl = pixelInfo;

    const frameInfo = document.getElementById(frameInfoId);
    if (!frameInfo) throw new Error(`Frame info ${frameInfoId} not found`);
    this.frameInfoEl = frameInfo;

    this.initPalette();
    this.bindCanvasEvents();
  }

  private initPalette(): void {
    this.paletteGrid.innerHTML = '';
    PALETTE.forEach((color, index) => {
      const swatch = document.createElement('div');
      swatch.className = 'color-swatch';
      swatch.style.backgroundColor = color;
      swatch.dataset.color = color;
      swatch.title = color;
      if (index === 2) swatch.classList.add('active');
      swatch.addEventListener('click', () => this.selectColor(color, swatch));
      this.paletteGrid.appendChild(swatch);
    });

    const eraser = document.createElement('div');
    eraser.className = 'color-swatch eraser';
    eraser.dataset.color = ERASER;
    eraser.title = '橡皮擦';
    eraser.addEventListener('click', () => this.selectColor(ERASER, eraser));
    this.paletteGrid.appendChild(eraser);
  }

  private selectColor(color: string, element: HTMLElement): void {
    this.currentColor = color;
    const swatches = this.paletteGrid.querySelectorAll('.color-swatch');
    swatches.forEach(s => s.classList.remove('active'));
    element.classList.add('active');
  }

  private bindCanvasEvents(): void {
    this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('mouseup', () => { this.isDrawing = false; });
    this.canvas.addEventListener('mouseleave', () => { this.isDrawing = false; });

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.handleMouseDown(touch as unknown as MouseEvent);
    });
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.handleMouseMove(touch as unknown as MouseEvent);
    });
    this.canvas.addEventListener('touchend', () => { this.isDrawing = false; });
  }

  private getPixelPos(e: MouseEvent): { x: number; y: number } | null {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;

    const x = Math.floor(canvasX / SCALE);
    const y = Math.floor(canvasY / SCALE);

    if (x < 0 || x >= PIXEL_SIZE || y < 0 || y >= PIXEL_SIZE) {
      return null;
    }
    return { x, y };
  }

  private handleMouseDown(e: MouseEvent): void {
    const pos = this.getPixelPos(e);
    if (!pos) return;
    this.isDrawing = true;
    this.paintPixel(pos.x, pos.y);
  }

  private handleMouseMove(e: MouseEvent): void {
    const pos = this.getPixelPos(e);
    if (!pos) {
      this.pixelInfoEl.textContent = '像素: -';
      return;
    }

    const frame = this.frames[this.currentFrameIndex];
    const color = frame[pos.y][pos.x] || '透明';
    this.pixelInfoEl.textContent = `像素: (${pos.x}, ${pos.y}) - ${color}`;

    if (this.isDrawing) {
      this.paintPixel(pos.x, pos.y);
    }
  }

  private paintPixel(x: number, y: number): void {
    const frame = this.frames[this.currentFrameIndex];
    const color = this.currentColor === ERASER ? null : this.currentColor;
    if (frame[y][x] === color) return;

    frame[y][x] = color;
    this.renderPixel(x, y);
    this.updateThumbnail(this.currentFrameIndex);
    this.onFramesUpdate?.();
  }

  private renderPixel(x: number, y: number): void {
    const frame = this.frames[this.currentFrameIndex];
    const color = frame[y][x];
    if (color) {
      this.ctx.fillStyle = color;
      this.ctx.fillRect(x * SCALE, y * SCALE, SCALE, SCALE);
    } else {
      this.ctx.clearRect(x * SCALE, y * SCALE, SCALE, SCALE);
    }
    if (this.showGrid) {
      this.drawPixelGrid(x, y);
    }
  }

  private drawPixelGrid(x: number, y: number): void {
    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(136, 136, 136, 0.25)';
    this.ctx.lineWidth = 1;

    const isGridLine = (n: number) => n % 16 === 0;

    if (isGridLine(x)) {
      this.ctx.beginPath();
      this.ctx.setLineDash([4, 4]);
      this.ctx.strokeStyle = 'rgba(203, 166, 247, 0.35)';
      this.ctx.moveTo(x * SCALE, y * SCALE);
      this.ctx.lineTo(x * SCALE, y * SCALE + SCALE);
      this.ctx.stroke();
    }
    if (isGridLine(y)) {
      this.ctx.beginPath();
      this.ctx.setLineDash([4, 4]);
      this.ctx.strokeStyle = 'rgba(203, 166, 247, 0.35)';
      this.ctx.moveTo(x * SCALE, y * SCALE);
      this.ctx.lineTo(x * SCALE + SCALE, y * SCALE);
      this.ctx.stroke();
    }
    this.ctx.restore();
  }

  setFrames(frames: FrameData[]): void {
    this.frames = frames;
    this.thumbCanvases = [];
    this.buildThumbnails();
    this.selectFrame(0);
    this.updateFrameInfo();
  }

  getFrames(): FrameData[] {
    return this.frames;
  }

  getCurrentFrameIndex(): number {
    return this.currentFrameIndex;
  }

  getCurrentFrame(): FrameData {
    return this.frames[this.currentFrameIndex];
  }

  selectFrame(index: number): void {
    if (index < 0 || index >= this.frames.length) return;
    this.currentFrameIndex = index;
    this.render();
    this.highlightThumbnail(index);
    this.updateFrameInfo();
    this.onFrameChange?.(index);
  }

  nextFrame(): void {
    let next = this.currentFrameIndex + 1;
    if (next >= this.frames.length) next = 0;
    this.selectFrame(next);
  }

  prevFrame(): void {
    let prev = this.currentFrameIndex - 1;
    if (prev < 0) prev = this.frames.length - 1;
    this.selectFrame(prev);
  }

  setShowGrid(show: boolean): void {
    this.showGrid = show;
    this.render();
  }

  render(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const frame = this.frames[this.currentFrameIndex];
    if (!frame) return;

    for (let y = 0; y < PIXEL_SIZE; y++) {
      for (let x = 0; x < PIXEL_SIZE; x++) {
        const color = frame[y][x];
        if (color) {
          this.ctx.fillStyle = color;
          this.ctx.fillRect(x * SCALE, y * SCALE, SCALE, SCALE);
        }
      }
    }

    if (this.showGrid) {
      this.drawFullGrid();
    }
  }

  private drawFullGrid(): void {
    this.ctx.save();
    this.ctx.lineWidth = 1;

    for (let i = 0; i <= PIXEL_SIZE; i++) {
      if (i % 16 === 0) {
        this.ctx.strokeStyle = 'rgba(203, 166, 247, 0.35)';
        this.ctx.setLineDash([4, 4]);
      } else {
        this.ctx.strokeStyle = 'rgba(136, 136, 136, 0.15)';
        this.ctx.setLineDash([]);
      }

      this.ctx.beginPath();
      this.ctx.moveTo(i * SCALE, 0);
      this.ctx.lineTo(i * SCALE, PIXEL_SIZE * SCALE);
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.moveTo(0, i * SCALE);
      this.ctx.lineTo(PIXEL_SIZE * SCALE, i * SCALE);
      this.ctx.stroke();
    }
    this.ctx.restore();
  }

  private buildThumbnails(): void {
    this.framesContainer.innerHTML = '';
    this.frames.forEach((_, index) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'frame-thumb';
      wrapper.addEventListener('click', () => this.selectFrame(index));

      const thumbCanvas = document.createElement('canvas');
      thumbCanvas.width = PIXEL_SIZE * THUMB_SCALE;
      thumbCanvas.height = PIXEL_SIZE * THUMB_SCALE;
      const thumbCtx = thumbCanvas.getContext('2d')!;
      thumbCtx.imageSmoothingEnabled = false;

      const frameLabel = document.createElement('div');
      frameLabel.className = 'frame-index';
      frameLabel.textContent = `${index + 1}`;

      wrapper.appendChild(thumbCanvas);
      wrapper.appendChild(frameLabel);
      this.framesContainer.appendChild(wrapper);
      this.thumbCanvases.push(thumbCanvas);
      this.updateThumbnail(index);
    });
  }

  updateThumbnail(index: number): void {
    const canvas = this.thumbCanvases[index];
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const frame = this.frames[index];
    for (let y = 0; y < PIXEL_SIZE; y++) {
      for (let x = 0; x < PIXEL_SIZE; x++) {
        const color = frame[y][x];
        if (color) {
          ctx.fillStyle = color;
          ctx.fillRect(x * THUMB_SCALE, y * THUMB_SCALE, THUMB_SCALE, THUMB_SCALE);
        }
      }
    }
  }

  updateAllThumbnails(): void {
    this.frames.forEach((_, i) => this.updateThumbnail(i));
  }

  private highlightThumbnail(index: number): void {
    const thumbs = this.framesContainer.querySelectorAll('.frame-thumb');
    thumbs.forEach((t, i) => {
      if (i === index) t.classList.add('active');
      else t.classList.remove('active');
    });
  }

  private updateFrameInfo(): void {
    this.frameInfoEl.textContent = `帧: ${this.currentFrameIndex + 1} / ${this.frames.length}`;
  }

  renderFrameToContext(
    ctx: CanvasRenderingContext2D,
    frameIndex: number,
    scale: number,
    offsetX: number = 0,
    offsetY: number = 0
  ): void {
    const frame = this.frames[frameIndex];
    if (!frame) return;

    for (let y = 0; y < PIXEL_SIZE; y++) {
      for (let x = 0; x < PIXEL_SIZE; x++) {
        const color = frame[y][x];
        if (color) {
          ctx.fillStyle = color;
          ctx.fillRect(
            offsetX + x * scale,
            offsetY + y * scale,
            scale,
            scale
          );
        }
      }
    }
  }

  exportSpriteSheetPNG(): void {
    const spriteCanvas = document.createElement('canvas');
    spriteCanvas.width = PIXEL_SIZE * this.frames.length;
    spriteCanvas.height = PIXEL_SIZE;
    const ctx = spriteCanvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    this.frames.forEach((_, i) => {
      this.renderFrameToContext(ctx, i, 1, i * PIXEL_SIZE, 0);
    });

    spriteCanvas.toBlob((blob) => {
      if (!blob) return;
      this.downloadBlob(blob, 'pixel-animation.png');
    }, 'image/png');
  }

  exportAnimationJSON(): void {
    const data: AnimationData = {
      frameWidth: PIXEL_SIZE,
      frameHeight: PIXEL_SIZE,
      frameCount: this.frames.length,
      frames: this.frames
    };

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    this.downloadBlob(blob, 'pixel-animation.json');
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
