import { AudioEngine, type AudioData } from './audio/AudioEngine';
import { SceneManager } from './scene/SceneManager';
import { UiController } from './ui/UiController';

class SonicCanvasApp {
  private audioEngine: AudioEngine;
  private sceneManager: SceneManager;
  private uiController: UiController;
  private canvasContainer: HTMLElement;
  private animationFrameId = 0;
  private lastTime = 0;
  private readonly MIN_FRAME_TIME = 1000 / 60;
  private fpsSmoothing = 0;

  constructor() {
    this.canvasContainer = document.getElementById('canvas-container')!;

    this.audioEngine = new AudioEngine();
    this.sceneManager = new SceneManager(this.canvasContainer);
    this.uiController = new UiController(this.audioEngine, this.sceneManager);

    this.audioEngine.setCallback((data: AudioData) => {
      this.onAudioData(data);
    });

    this.setupResizeHandler();
    this.bindVisibilityHandler();
    this.startAnimationLoop();
  }

  private onAudioData(data: AudioData): void {
    this.sceneManager.updateAudioData(data);
    this.uiController.updateAudioData(data.bpm, data.volume, data.waveform);
  }

  private setupResizeHandler(): void {
    let resizeTimeout: number | null = null;

    window.addEventListener('resize', () => {
      if (resizeTimeout !== null) {
        window.clearTimeout(resizeTimeout);
      }
      resizeTimeout = window.setTimeout(() => {
        this.handleResize();
      }, 100);
    });

    this.handleResize();
  }

  private handleResize(): void {
    const w = this.canvasContainer.clientWidth;
    const h = this.canvasContainer.clientHeight;
    if (w > 0 && h > 0) {
      this.sceneManager.resize(w, h);
    }
  }

  private bindVisibilityHandler(): void {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        cancelAnimationFrame(this.animationFrameId);
      } else {
        this.lastTime = performance.now();
        this.startAnimationLoop();
      }
    });
  }

  private startAnimationLoop(): void {
    this.lastTime = performance.now();

    const loop = (time: number) => {
      this.animationFrameId = requestAnimationFrame(loop);

      const delta = time - this.lastTime;
      if (delta < this.MIN_FRAME_TIME) {
        return;
      }

      const frameFps = 1000 / Math.max(1, delta);
      if (this.fpsSmoothing === 0) {
        this.fpsSmoothing = frameFps;
      } else {
        this.fpsSmoothing = this.fpsSmoothing * 0.95 + frameFps * 0.05;
      }

      this.sceneManager.update();
      this.lastTime = time;
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  dispose(): void {
    cancelAnimationFrame(this.animationFrameId);
    this.audioEngine.stop();
    this.uiController.dispose();
    this.sceneManager.dispose();
  }
}

let app: SonicCanvasApp | null = null;

function bootstrap(): void {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      app = new SonicCanvasApp();
    });
  } else {
    app = new SonicCanvasApp();
  }
}

bootstrap();

window.addEventListener('beforeunload', () => {
  if (app) {
    app.dispose();
    app = null;
  }
});
