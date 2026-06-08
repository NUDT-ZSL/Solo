import { PIXEL_SIZE, PREVIEW_SCALE, PixelEditor } from './editor';

export class Animator {
  private previewCanvas: HTMLCanvasElement;
  private previewCtx: CanvasRenderingContext2D;
  private editor: PixelEditor;
  private previewInfoEl: HTMLElement;

  private isPlaying: boolean = false;
  private speed: number = 1.0;
  private frameDuration: number = 200;
  private loop: boolean = true;
  private currentFrameIndex: number = 0;
  private lastFrameTime: number = 0;
  private rafId: number | null = null;

  onPlayStateChange?: (playing: boolean) => void;
  onFrameChange?: (index: number) => void;

  constructor(
    previewCanvasId: string,
    previewInfoId: string,
    editor: PixelEditor
  ) {
    const canvas = document.getElementById(previewCanvasId);
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new Error(`Preview canvas ${previewCanvasId} not found`);
    }
    this.previewCanvas = canvas;
    this.previewCtx = canvas.getContext('2d')!;
    this.previewCtx.imageSmoothingEnabled = false;

    const info = document.getElementById(previewInfoId);
    if (!info) throw new Error(`Preview info ${previewInfoId} not found`);
    this.previewInfoEl = info;

    this.editor = editor;
    this.updateResponsiveCanvas();
    this.renderPreview();
    window.addEventListener('resize', () => this.updateResponsiveCanvas());
  }

  private updateResponsiveCanvas(): void {
    if (window.innerWidth <= 768) {
      this.previewCanvas.width = PIXEL_SIZE * 4;
      this.previewCanvas.height = PIXEL_SIZE * 4;
    } else {
      this.previewCanvas.width = PIXEL_SIZE * PREVIEW_SCALE;
      this.previewCanvas.height = PIXEL_SIZE * PREVIEW_SCALE;
    }
    this.previewCtx.imageSmoothingEnabled = false;
    this.renderPreview();
  }

  private getPreviewScale(): number {
    return this.previewCanvas.width / PIXEL_SIZE;
  }

  setSpeed(speed: number): void {
    this.speed = Math.max(0.5, Math.min(2.0, speed));
  }

  getSpeed(): number {
    return this.speed;
  }

  setFrameDuration(ms: number): void {
    this.frameDuration = Math.max(100, Math.min(500, ms));
  }

  getFrameDuration(): number {
    return this.frameDuration;
  }

  setLoop(loop: boolean): void {
    this.loop = loop;
  }

  isLooping(): boolean {
    return this.loop;
  }

  play(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.lastFrameTime = performance.now();
    this.onPlayStateChange?.(true);
    this.animationLoop();
  }

  pause(): void {
    this.isPlaying = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.onPlayStateChange?.(false);
  }

  toggle(): void {
    if (this.isPlaying) this.pause();
    else this.play();
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  nextFrame(): void {
    this.pause();
    this.advanceFrame();
    this.editor.selectFrame(this.currentFrameIndex);
  }

  prevFrame(): void {
    this.pause();
    const frames = this.editor.getFrames();
    this.currentFrameIndex--;
    if (this.currentFrameIndex < 0) {
      this.currentFrameIndex = frames.length - 1;
    }
    this.renderPreview();
    this.editor.selectFrame(this.currentFrameIndex);
  }

  goToFrame(index: number): void {
    const frames = this.editor.getFrames();
    if (index < 0 || index >= frames.length) return;
    this.currentFrameIndex = index;
    this.renderPreview();
    this.updateInfo();
  }

  private advanceFrame(): void {
    const frames = this.editor.getFrames();
    this.currentFrameIndex++;

    if (this.currentFrameIndex >= frames.length) {
      if (this.loop) {
        this.currentFrameIndex = 0;
      } else {
        this.currentFrameIndex = frames.length - 1;
        this.pause();
        return;
      }
    }

    this.renderPreview();
    this.updateInfo();
    this.onFrameChange?.(this.currentFrameIndex);
  }

  private animationLoop = (): void => {
    if (!this.isPlaying) return;

    const now = performance.now();
    const elapsed = now - this.lastFrameTime;
    const effectiveDuration = this.frameDuration / this.speed;

    if (elapsed >= effectiveDuration) {
      this.lastFrameTime = now - (elapsed % effectiveDuration);
      this.advanceFrame();
    }

    this.rafId = requestAnimationFrame(this.animationLoop);
  };

  renderPreview(): void {
    this.previewCtx.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
    const frames = this.editor.getFrames();
    if (frames.length === 0) return;

    if (this.currentFrameIndex >= frames.length) {
      this.currentFrameIndex = 0;
    }

    const scale = this.getPreviewScale();
    this.editor.renderFrameToContext(this.previewCtx, this.currentFrameIndex, scale);
    this.updateInfo();
  }

  private updateInfo(): void {
    this.previewInfoEl.textContent = `当前帧: ${this.currentFrameIndex + 1}`;
  }

  refresh(): void {
    this.renderPreview();
  }
}
