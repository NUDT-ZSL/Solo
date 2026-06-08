import { FrameData, GRID_SIZE } from './FrameEditor';

export type TransitionMode = 'normal' | 'fade' | 'flash';

export interface AnimationPlayerState {
  isPlaying: boolean;
  currentFrame: number;
  fps: number;
  loop: boolean;
  transitionMode: TransitionMode;
  transitionProgress: number;
}

export class AnimationPlayer {
  private frames: FrameData[] = [];
  private currentFrame: number = 0;
  private isPlaying: boolean = false;
  private fps: number = 8;
  private loop: boolean = true;
  private transitionMode: TransitionMode = 'normal';
  private lastFrameTime: number = 0;
  private animFrameId: number | null = null;
  private transitionProgress: number = 0;
  private onFrameChangeCallbacks: Set<(state: AnimationPlayerState) => void> =
    new Set();

  subscribe(callback: (state: AnimationPlayerState) => void): () => void {
    this.onFrameChangeCallbacks.add(callback);
    return () => this.onFrameChangeCallbacks.delete(callback);
  }

  private notify() {
    const state = this.getState();
    this.onFrameChangeCallbacks.forEach((cb) => cb(state));
  }

  getState(): AnimationPlayerState {
    return {
      isPlaying: this.isPlaying,
      currentFrame: this.currentFrame,
      fps: this.fps,
      loop: this.loop,
      transitionMode: this.transitionMode,
      transitionProgress: this.transitionProgress,
    };
  }

  setFrames(frames: FrameData[]) {
    this.frames = frames;
    if (this.currentFrame >= frames.length) {
      this.currentFrame = 0;
    }
    this.notify();
  }

  play() {
    if (this.frames.length <= 1) return;
    this.isPlaying = true;
    this.lastFrameTime = performance.now();
    this.transitionProgress = 0;
    this.tick();
    this.notify();
  }

  pause() {
    this.isPlaying = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.notify();
  }

  stop() {
    this.pause();
    this.currentFrame = 0;
    this.transitionProgress = 0;
    this.notify();
  }

  togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  setFps(fps: number) {
    this.fps = Math.max(1, Math.min(30, fps));
    this.notify();
  }

  setLoop(loop: boolean) {
    this.loop = loop;
    this.notify();
  }

  setTransitionMode(mode: TransitionMode) {
    this.transitionMode = mode;
    this.notify();
  }

  setCurrentFrame(index: number) {
    if (index >= 0 && index < this.frames.length) {
      this.currentFrame = index;
      this.transitionProgress = 0;
      this.notify();
    }
  }

  private tick = () => {
    if (!this.isPlaying) return;

    const now = performance.now();
    const frameDuration = 1000 / this.fps;
    const elapsed = now - this.lastFrameTime;

    if (this.transitionMode === 'normal') {
      if (elapsed >= frameDuration) {
        this.advanceFrame();
        this.lastFrameTime = now;
      }
    } else {
      const transitionDuration = frameDuration * 0.3;
      const holdDuration = frameDuration - transitionDuration;

      if (elapsed < holdDuration) {
        this.transitionProgress = 0;
      } else if (elapsed < frameDuration) {
        this.transitionProgress = (elapsed - holdDuration) / transitionDuration;
      } else {
        this.advanceFrame();
        this.lastFrameTime = now;
        this.transitionProgress = 0;
      }
    }

    this.notify();
    this.animFrameId = requestAnimationFrame(this.tick);
  };

  private advanceFrame() {
    const nextFrame = this.currentFrame + 1;
    if (nextFrame >= this.frames.length) {
      if (this.loop) {
        this.currentFrame = 0;
      } else {
        this.currentFrame = this.frames.length - 1;
        this.pause();
        return;
      }
    } else {
      this.currentFrame = nextFrame;
    }
  }

  renderToCanvas(
    canvas: HTMLCanvasElement,
    pixelSize: number,
    editorRenderFn: (frame: FrameData, canvas: HTMLCanvasElement, pixelSize: number) => void
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx || this.frames.length === 0) return;

    const width = GRID_SIZE * pixelSize;
    const height = GRID_SIZE * pixelSize;
    canvas.width = width;
    canvas.height = height;
    ctx.imageSmoothingEnabled = false;

    const currentFrameData = this.frames[this.currentFrame];

    if (this.transitionMode === 'normal' || this.transitionProgress === 0 || this.currentFrame === 0) {
      editorRenderFn(currentFrameData, canvas, pixelSize);
    } else if (this.transitionMode === 'fade') {
      const prevFrameData = this.frames[this.currentFrame - 1] || this.frames[this.frames.length - 1];

      editorRenderFn(prevFrameData, canvas, pixelSize);
      ctx.globalAlpha = this.transitionProgress;
      editorRenderFn(currentFrameData, canvas, pixelSize);
      ctx.globalAlpha = 1.0;
    } else if (this.transitionMode === 'flash') {
      editorRenderFn(currentFrameData, canvas, pixelSize);
      const flashIntensity = Math.sin(this.transitionProgress * Math.PI);
      ctx.fillStyle = `rgba(255, 255, 255, ${flashIntensity * 0.7})`;
      ctx.fillRect(0, 0, width, height);
    }
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  getCurrentFrameIndex(): number {
    return this.currentFrame;
  }

  getFps(): number {
    return this.fps;
  }

  getTransitionMode(): TransitionMode {
    return this.transitionMode;
  }

  getLoop(): boolean {
    return this.loop;
  }
}
