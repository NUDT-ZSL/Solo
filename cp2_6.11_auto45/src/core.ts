export const CANVAS_WIDTH = 32;
export const CANVAS_HEIGHT = 32;
export const MAX_HISTORY = 20;
export const MAX_FRAMES = 8;

export const PALETTE: string[] = [
  '#FF6B6B',
  '#4ECDC4',
  '#FFE66D',
  '#1A535C',
  '#FF9F1C',
  '#2EC4B6',
  '#E71D36',
  '#FFFFFF',
];

export type ToolType = 'pencil' | 'eraser' | 'fill' | 'eyedropper';
export type MirrorMode = 'none' | 'horizontal' | 'vertical' | 'both';
export type PencilSize = 1 | 2;
export type EraserSize = 2 | 4;

export interface Frame {
  id: number;
  pixels: Uint8Array;
}

interface HistoryEntry {
  pixels: Uint8Array;
}

interface FrameHistory {
  stack: HistoryEntry[];
  index: number;
}

interface EngineCallbacks {
  onFrameChange?: (frameIndex: number) => void;
  onFramesUpdate?: () => void;
  onPlayStateChange?: (playing: boolean) => void;
  onCurrentFramePixelsChange?: () => void;
}

export class PixelEngine {
  private frames: Frame[] = [];
  private currentFrameIndex: number = 0;
  private frameHistories: Map<number, FrameHistory> = new Map();
  private frameIdCounter: number = 0;

  private currentTool: ToolType = 'pencil';
  private currentColorIndex: number = 0;
  private mirrorMode: MirrorMode = 'none';
  private pencilSize: PencilSize = 1;
  private eraserSize: EraserSize = 2;

  private isDrawing: boolean = false;
  private lastPixelX: number = -1;
  private lastPixelY: number = -1;
  private fillStartX: number = -1;
  private fillStartY: number = -1;

  private isPlaying: boolean = false;
  private fps: number = 24;
  private playFrameIndex: number = 0;
  private lastFrameTime: number = 0;
  private rafId: number | null = null;

  private callbacks: EngineCallbacks = {};

  constructor(callbacks: EngineCallbacks = {}) {
    this.callbacks = callbacks;
    this.addFrame(true);
  }

  private createEmptyPixels(): Uint8Array {
    return new Uint8Array(CANVAS_WIDTH * CANVAS_HEIGHT).fill(255);
  }

  private clonePixels(src: Uint8Array): Uint8Array {
    return new Uint8Array(src);
  }

  private getPixelIndex(x: number, y: number): number {
    return y * CANVAS_WIDTH + x;
  }

  private isValidPixel(x: number, y: number): boolean {
    return x >= 0 && x < CANVAS_WIDTH && y >= 0 && y < CANVAS_HEIGHT;
  }

  private getHistory(frameId: number): FrameHistory {
    let history = this.frameHistories.get(frameId);
    if (!history) {
      history = { stack: [], index: 0 };
      this.frameHistories.set(frameId, history);
    }
    return history;
  }

  private initHistory(frameId: number, initialPixels: Uint8Array): void {
    const history = this.getHistory(frameId);
    history.stack = [{ pixels: this.clonePixels(initialPixels) }];
    history.index = 0;
  }

  private commitHistory(): void {
    const frame = this.frames[this.currentFrameIndex];
    if (!frame) return;
    const history = this.getHistory(frame.id);
    const current = history.stack[history.index];
    if (current && this.arePixelsEqual(current.pixels, frame.pixels)) return;
    history.stack = history.stack.slice(0, history.index + 1);
    history.stack.push({ pixels: this.clonePixels(frame.pixels) });
    if (history.stack.length > MAX_HISTORY + 1) {
      history.stack = history.stack.slice(-(MAX_HISTORY + 1));
    }
    history.index = history.stack.length - 1;
  }

  private arePixelsEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  beginOperation(): void {
  }

  undo(): boolean {
    const frame = this.frames[this.currentFrameIndex];
    if (!frame) return false;
    const history = this.getHistory(frame.id);
    if (history.index <= 0) return false;
    history.index--;
    const entry = history.stack[history.index];
    if (entry) {
      frame.pixels = this.clonePixels(entry.pixels);
      this.notifyPixelsChange();
      return true;
    }
    return false;
  }

  redo(): boolean {
    const frame = this.frames[this.currentFrameIndex];
    if (!frame) return false;
    const history = this.getHistory(frame.id);
    if (history.index >= history.stack.length - 1) return false;
    history.index++;
    const entry = history.stack[history.index];
    if (entry) {
      frame.pixels = this.clonePixels(entry.pixels);
      this.notifyPixelsChange();
      return true;
    }
    return false;
  }

  canUndo(): boolean {
    const frame = this.frames[this.currentFrameIndex];
    if (!frame) return false;
    const history = this.getHistory(frame.id);
    return history.index > 0;
  }

  canRedo(): boolean {
    const frame = this.frames[this.currentFrameIndex];
    if (!frame) return false;
    const history = this.getHistory(frame.id);
    return history.index < history.stack.length - 1;
  }

  getUndoCount(): number {
    const frame = this.frames[this.currentFrameIndex];
    if (!frame) return 0;
    const history = this.getHistory(frame.id);
    return history.index;
  }

  getRedoCount(): number {
    const frame = this.frames[this.currentFrameIndex];
    if (!frame) return 0;
    const history = this.getHistory(frame.id);
    return history.stack.length - 1 - history.index;
  }

  setTool(tool: ToolType): void {
    this.currentTool = tool;
  }

  getTool(): ToolType {
    return this.currentTool;
  }

  setColorIndex(index: number): void {
    if (index >= 0 && index < PALETTE.length) {
      this.currentColorIndex = index;
    }
  }

  getColorIndex(): number {
    return this.currentColorIndex;
  }

  getColorHex(index: number): string {
    return PALETTE[index] || '#000000';
  }

  setMirrorMode(mode: MirrorMode): void {
    this.mirrorMode = mode;
  }

  getMirrorMode(): MirrorMode {
    return this.mirrorMode;
  }

  setPencilSize(size: PencilSize): void {
    this.pencilSize = size;
  }

  getPencilSize(): PencilSize {
    return this.pencilSize;
  }

  setEraserSize(size: EraserSize): void {
    this.eraserSize = size;
  }

  getEraserSize(): EraserSize {
    return this.eraserSize;
  }

  private getMirroredPixels(x: number, y: number): Array<{ x: number; y: number }> {
    const points: Array<{ x: number; y: number }> = [{ x, y }];
    if (this.mirrorMode === 'horizontal' || this.mirrorMode === 'both') {
      const mx = CANVAS_WIDTH - 1 - x;
      if (mx !== x) points.push({ x: mx, y });
    }
    if (this.mirrorMode === 'vertical' || this.mirrorMode === 'both') {
      const my = CANVAS_HEIGHT - 1 - y;
      if (my !== y) {
        points.forEach(p => {
          if (p.y !== my) points.push({ x: p.x, y: my });
        });
      }
    }
    return points.filter(p => this.isValidPixel(p.x, p.y));
  }

  private setPixelRaw(pixels: Uint8Array, x: number, y: number, colorIndex: number): void {
    if (this.isValidPixel(x, y)) {
      pixels[this.getPixelIndex(x, y)] = colorIndex;
    }
  }

  private drawPencil(x: number, y: number): void {
    const frame = this.frames[this.currentFrameIndex];
    if (!frame) return;
    const size = this.pencilSize;
    const half = Math.floor(size / 2);
    for (let dy = -half; dy <= half; dy++) {
      for (let dx = -half; dx <= half; dx++) {
        const px = x + dx;
        const py = y + dy;
        const points = this.getMirroredPixels(px, py);
        for (const p of points) {
          this.setPixelRaw(frame.pixels, p.x, p.y, this.currentColorIndex);
        }
      }
    }
  }

  private drawEraser(x: number, y: number): void {
    const frame = this.frames[this.currentFrameIndex];
    if (!frame) return;
    const size = this.eraserSize;
    const half = Math.floor(size / 2);
    for (let dy = -half; dy <= half; dy++) {
      for (let dx = -half; dx <= half; dx++) {
        const px = x + dx;
        const py = y + dy;
        const points = this.getMirroredPixels(px, py);
        for (const p of points) {
          this.setPixelRaw(frame.pixels, p.x, p.y, 255);
        }
      }
    }
  }

  private drawLine(x0: number, y0: number, x1: number, y1: number): void {
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    let x = x0;
    let y = y0;
    while (true) {
      if (this.currentTool === 'eraser') {
        this.drawEraser(x, y);
      } else {
        this.drawPencil(x, y);
      }
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }
  }

  fillRect(x1: number, y1: number, x2: number, y2: number): void {
    const frame = this.frames[this.currentFrameIndex];
    if (!frame) return;
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const points = this.getMirroredPixels(x, y);
        for (const p of points) {
          this.setPixelRaw(frame.pixels, p.x, p.y, this.currentColorIndex);
        }
      }
    }
    this.commitHistory();
    this.notifyPixelsChange();
  }

  pickColor(x: number, y: number): number | null {
    const frame = this.frames[this.currentFrameIndex];
    if (!frame || !this.isValidPixel(x, y)) return null;
    const colorIdx = frame.pixels[this.getPixelIndex(x, y)];
    if (colorIdx < PALETTE.length) {
      this.currentColorIndex = colorIdx;
      return colorIdx;
    }
    return null;
  }

  handleMouseDown(x: number, y: number): void {
    if (!this.isValidPixel(x, y)) return;
    if (this.currentTool === 'eyedropper') {
      this.pickColor(x, y);
      this.notifyPixelsChange();
      return;
    }
    if (this.currentTool === 'fill') {
      if (this.fillStartX === -1) {
        this.fillStartX = x;
        this.fillStartY = y;
      } else {
        this.beginOperation();
        this.fillRect(this.fillStartX, this.fillStartY, x, y);
        this.fillStartX = -1;
        this.fillStartY = -1;
      }
      return;
    }
    this.beginOperation();
    this.isDrawing = true;
    this.lastPixelX = x;
    this.lastPixelY = y;
    if (this.currentTool === 'eraser') {
      this.drawEraser(x, y);
    } else {
      this.drawPencil(x, y);
    }
    this.notifyPixelsChange();
  }

  handleMouseMove(x: number, y: number): void {
    if (!this.isDrawing) return;
    if (!this.isValidPixel(x, y)) return;
    if (this.currentTool === 'pencil' || this.currentTool === 'eraser') {
      this.drawLine(this.lastPixelX, this.lastPixelY, x, y);
      this.lastPixelX = x;
      this.lastPixelY = y;
      this.notifyPixelsChange();
    }
  }

  handleMouseUp(): void {
    if (this.isDrawing) {
      this.commitHistory();
    }
    this.isDrawing = false;
    this.lastPixelX = -1;
    this.lastPixelY = -1;
  }

  getCurrentFramePixels(): Uint8Array | null {
    const frame = this.frames[this.currentFrameIndex];
    return frame ? frame.pixels : null;
  }

  getFramePixels(index: number): Uint8Array | null {
    const frame = this.frames[index];
    return frame ? frame.pixels : null;
  }

  getFrameCount(): number {
    return this.frames.length;
  }

  getCurrentFrameIndex(): number {
    return this.currentFrameIndex;
  }

  setCurrentFrameIndex(index: number): void {
    if (index >= 0 && index < this.frames.length) {
      this.currentFrameIndex = index;
      this.notifyFrameChange();
      this.notifyPixelsChange();
    }
  }

  addFrame(copyCurrent: boolean = false): boolean {
    if (this.frames.length >= MAX_FRAMES) return false;
    const newFrame: Frame = {
      id: this.frameIdCounter++,
      pixels: copyCurrent && this.frames[this.currentFrameIndex]
        ? this.clonePixels(this.frames[this.currentFrameIndex].pixels)
        : this.createEmptyPixels(),
    };
    this.initHistory(newFrame.id, newFrame.pixels);
    this.frames.push(newFrame);
    this.currentFrameIndex = this.frames.length - 1;
    this.notifyFramesUpdate();
    this.notifyFrameChange();
    this.notifyPixelsChange();
    return true;
  }

  deleteFrame(index: number): boolean {
    if (this.frames.length <= 1) return false;
    if (index < 0 || index >= this.frames.length) return false;
    const frame = this.frames[index];
    this.frameHistories.delete(frame.id);
    this.frames.splice(index, 1);
    if (this.currentFrameIndex >= this.frames.length) {
      this.currentFrameIndex = this.frames.length - 1;
    }
    this.notifyFramesUpdate();
    this.notifyFrameChange();
    this.notifyPixelsChange();
    return true;
  }

  duplicateFrame(index: number): boolean {
    if (this.frames.length >= MAX_FRAMES) return false;
    if (index < 0 || index >= this.frames.length) return false;
    const source = this.frames[index];
    const newFrame: Frame = {
      id: this.frameIdCounter++,
      pixels: this.clonePixels(source.pixels),
    };
    this.initHistory(newFrame.id, newFrame.pixels);
    this.frames.splice(index + 1, 0, newFrame);
    this.currentFrameIndex = index + 1;
    this.notifyFramesUpdate();
    this.notifyFrameChange();
    this.notifyPixelsChange();
    return true;
  }

  moveFrame(fromIndex: number, toIndex: number): boolean {
    if (fromIndex < 0 || fromIndex >= this.frames.length) return false;
    if (toIndex < 0 || toIndex >= this.frames.length) return false;
    if (fromIndex === toIndex) return true;
    const [frame] = this.frames.splice(fromIndex, 1);
    this.frames.splice(toIndex, 0, frame);
    if (this.currentFrameIndex === fromIndex) {
      this.currentFrameIndex = toIndex;
    } else if (fromIndex < this.currentFrameIndex && toIndex >= this.currentFrameIndex) {
      this.currentFrameIndex--;
    } else if (fromIndex > this.currentFrameIndex && toIndex <= this.currentFrameIndex) {
      this.currentFrameIndex++;
    }
    this.notifyFramesUpdate();
    this.notifyFrameChange();
    return true;
  }

  getFrames(): Frame[] {
    return this.frames;
  }

  setFps(fps: number): void {
    if (fps >= 1 && fps <= 30) {
      this.fps = fps;
    }
  }

  getFps(): number {
    return this.fps;
  }

  play(): void {
    if (this.isPlaying || this.frames.length < 2) return;
    this.isPlaying = true;
    this.playFrameIndex = 0;
    this.lastFrameTime = performance.now();
    this.notifyPlayStateChange();
    this.loop();
  }

  pause(): void {
    this.isPlaying = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.notifyPlayStateChange();
    this.notifyPixelsChange();
  }

  togglePlay(): void {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  private loop = (): void => {
    if (!this.isPlaying) return;
    this.rafId = requestAnimationFrame(this.loop);
    const now = performance.now();
    const frameDuration = 1000 / this.fps;
    if (now - this.lastFrameTime >= frameDuration) {
      this.playFrameIndex = (this.playFrameIndex + 1) % this.frames.length;
      this.lastFrameTime = now;
      this.notifyPixelsChange();
    }
  };

  getPlayFrameIndex(): number {
    return this.playFrameIndex;
  }

  getPixelsForDisplay(): Uint8Array | null {
    if (this.isPlaying) {
      const frame = this.frames[this.playFrameIndex];
      return frame ? frame.pixels : null;
    }
    const frame = this.frames[this.currentFrameIndex];
    return frame ? frame.pixels : null;
  }

  countPixels(frameIndex?: number): { filled: number; total: number } {
    const idx = frameIndex ?? this.currentFrameIndex;
    const frame = this.frames[idx];
    if (!frame) return { filled: 0, total: CANVAS_WIDTH * CANVAS_HEIGHT };
    let filled = 0;
    for (let i = 0; i < frame.pixels.length; i++) {
      if (frame.pixels[i] < PALETTE.length) filled++;
    }
    return { filled, total: CANVAS_WIDTH * CANVAS_HEIGHT };
  }

  renderToCanvas(canvas: HTMLCanvasElement, scale: number = 1): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pixels = this.getPixelsForDisplay();
    if (!pixels) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < CANVAS_HEIGHT; y++) {
      for (let x = 0; x < CANVAS_WIDTH; x++) {
        const idx = this.getPixelIndex(x, y);
        const colorIdx = pixels[idx];
        if (colorIdx < PALETTE.length) {
          ctx.fillStyle = PALETTE[colorIdx];
          ctx.fillRect(x * scale, y * scale, scale, scale);
        }
      }
    }
  }

  exportSpriteSheet(): HTMLCanvasElement | null {
    const frameCount = this.frames.length;
    if (frameCount === 0) return null;
    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_WIDTH * frameCount;
    canvas.height = CANVAS_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.frames.forEach((frame, i) => {
      const offscreen = document.createElement('canvas');
      offscreen.width = CANVAS_WIDTH;
      offscreen.height = CANVAS_HEIGHT;
      const offCtx = offscreen.getContext('2d');
      if (!offCtx) return;
      for (let y = 0; y < CANVAS_HEIGHT; y++) {
        for (let x = 0; x < CANVAS_WIDTH; x++) {
          const idx = this.getPixelIndex(x, y);
          const colorIdx = frame.pixels[idx];
          if (colorIdx < PALETTE.length) {
            offCtx.fillStyle = PALETTE[colorIdx];
            offCtx.fillRect(x, y, 1, 1);
          }
        }
      }
      ctx.drawImage(offscreen, i * CANVAS_WIDTH, 0);
    });
    return canvas;
  }

  exportGif(): Blob | null {
    const frameCount = this.frames.length;
    if (frameCount === 0) return null;
    const palette: number[][] = [];
    for (let i = 0; i < PALETTE.length; i++) {
      const hex = PALETTE[i];
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      palette.push([r, g, b]);
    }
    const transparentIndex = 8;
    while (palette.length < 256) palette.push([0, 0, 0]);

    const delay = Math.round(100 / this.fps);

    const parts: Uint8Array[] = [];

    const signature = new Uint8Array(6);
    signature.set([71, 73, 70, 56, 57, 97]);
    parts.push(signature);

    const lsd = new Uint8Array(7);
    lsd[0] = CANVAS_WIDTH & 0xff;
    lsd[1] = (CANVAS_WIDTH >> 8) & 0xff;
    lsd[2] = CANVAS_HEIGHT & 0xff;
    lsd[3] = (CANVAS_HEIGHT >> 8) & 0xff;
    lsd[4] = 0xf7;
    lsd[5] = 0;
    lsd[6] = 0;
    parts.push(lsd);

    const gct = new Uint8Array(256 * 3);
    for (let i = 0; i < 256; i++) {
      gct[i * 3] = palette[i][0];
      gct[i * 3 + 1] = palette[i][1];
      gct[i * 3 + 2] = palette[i][2];
    }
    parts.push(gct);

    const appExt = new Uint8Array(19);
    appExt[0] = 0x21;
    appExt[1] = 0xff;
    appExt[2] = 11;
    appExt.set([78, 69, 84, 83, 67, 65, 80, 69, 50, 46, 48], 3);
    appExt[14] = 3;
    appExt[15] = 1;
    appExt[16] = 0;
    appExt[17] = 0;
    appExt[18] = 0;
    parts.push(appExt);

    for (let fi = 0; fi < frameCount; fi++) {
      const frame = this.frames[fi];
      const gce = new Uint8Array(8);
      gce[0] = 0x21;
      gce[1] = 0xf9;
      gce[2] = 4;
      gce[3] = 0x01 | 0x04;
      gce[4] = delay & 0xff;
      gce[5] = (delay >> 8) & 0xff;
      gce[6] = transparentIndex;
      gce[7] = 0;
      parts.push(gce);

      const imageData = new Uint8Array(CANVAS_WIDTH * CANVAS_HEIGHT);
      for (let i = 0; i < frame.pixels.length; i++) {
        imageData[i] = frame.pixels[i] < PALETTE.length ? frame.pixels[i] : transparentIndex;
      }

      const imgDesc = new Uint8Array(10);
      imgDesc[0] = 0x2c;
      imgDesc[1] = 0;
      imgDesc[2] = 0;
      imgDesc[3] = 0;
      imgDesc[4] = 0;
      imgDesc[5] = CANVAS_WIDTH & 0xff;
      imgDesc[6] = (CANVAS_WIDTH >> 8) & 0xff;
      imgDesc[7] = CANVAS_HEIGHT & 0xff;
      imgDesc[8] = (CANVAS_HEIGHT >> 8) & 0xff;
      imgDesc[9] = 0;
      parts.push(imgDesc);

      const lzwMin = 8;
      const encoded = lzwEncode(imageData, lzwMin);
      const lzwMinByte = new Uint8Array([lzwMin]);
      parts.push(lzwMinByte);
      parts.push(encoded);
    }

    const trailer = new Uint8Array([0x3b]);
    parts.push(trailer);

    const totalLength = parts.reduce((sum, p) => sum + p.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const part of parts) {
      result.set(part, offset);
      offset += part.length;
    }

    return new Blob([result], { type: 'image/gif' });
  }

  private notifyFrameChange(): void {
    if (this.callbacks.onFrameChange) {
      this.callbacks.onFrameChange(this.currentFrameIndex);
    }
  }

  private notifyFramesUpdate(): void {
    if (this.callbacks.onFramesUpdate) {
      this.callbacks.onFramesUpdate();
    }
  }

  private notifyPlayStateChange(): void {
    if (this.callbacks.onPlayStateChange) {
      this.callbacks.onPlayStateChange(this.isPlaying);
    }
  }

  private notifyPixelsChange(): void {
    if (this.callbacks.onCurrentFramePixelsChange) {
      this.callbacks.onCurrentFramePixelsChange();
    }
  }
}

function lzwEncode(data: Uint8Array, minCodeSize: number): Uint8Array {
  const clearCode = 1 << minCodeSize;
  const eoiCode = clearCode + 1;
  let codeSize = minCodeSize + 1;
  let nextCode = eoiCode + 1;
  let dictionary: Map<string, number> = new Map();
  for (let i = 0; i < clearCode; i++) {
    dictionary.set(String.fromCharCode(i), i);
  }

  const outputBytes: number[] = [];
  let bitBuffer = 0;
  let bitCount = 0;
  let subBlockStart = 0;

  outputBytes.push(0);
  subBlockStart = outputBytes.length;

  function writeCode(code: number): void {
    bitBuffer |= code << bitCount;
    bitCount += codeSize;
    while (bitCount >= 8) {
      const byte = bitBuffer & 0xff;
      outputBytes.push(byte);
      bitBuffer >>= 8;
      bitCount -= 8;
      if (outputBytes.length - subBlockStart >= 255) {
        outputBytes[subBlockStart - 1] = 255;
        subBlockStart = outputBytes.length;
        outputBytes.push(0);
      }
    }
  }

  writeCode(clearCode);

  let current = '';
  for (let i = 0; i < data.length; i++) {
    const byte = data[i];
    const char = String.fromCharCode(byte);
    const combined = current + char;
    if (dictionary.has(combined)) {
      current = combined;
    } else {
      const code = dictionary.get(current);
      if (code !== undefined) writeCode(code);
      if (nextCode < 4096) {
        dictionary.set(combined, nextCode++);
        if (nextCode > (1 << codeSize) && codeSize < 12) {
          codeSize++;
        }
      }
      current = char;
    }
  }

  if (current !== '') {
    const code = dictionary.get(current);
    if (code !== undefined) writeCode(code);
  }

  writeCode(eoiCode);

  while (bitCount > 0) {
    const byte = bitBuffer & 0xff;
    outputBytes.push(byte);
    bitBuffer >>= 8;
    bitCount -= 8;
    if (outputBytes.length - subBlockStart >= 255) {
      outputBytes[subBlockStart - 1] = 255;
      subBlockStart = outputBytes.length;
      outputBytes.push(0);
    }
  }

  const lastBlockLen = outputBytes.length - subBlockStart;
  if (lastBlockLen > 0) {
    outputBytes[subBlockStart - 1] = lastBlockLen;
  } else {
    outputBytes.splice(subBlockStart - 1, 1);
  }

  return new Uint8Array(outputBytes);
}
