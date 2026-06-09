import * as THREE from 'three';
import { WaveGenerator, type SelectionBox } from './waveGenerator';
import { InteractionSystem } from './interaction';
import { AppRenderer } from './renderer';

interface FrameStats {
  lastTime: number;
  frameCount: number;
  fps: number;
  frameAccum: number;
  fpsSamples: number[];
}

class StellarPulseApp {
  private canvas!: HTMLCanvasElement;
  private camera!: THREE.PerspectiveCamera;
  private waveGenerator!: WaveGenerator;
  private interaction!: InteractionSystem;
  private renderer!: AppRenderer;
  private rafId: number = 0;
  private running = false;

  private stats: FrameStats = {
    lastTime: 0,
    frameCount: 0,
    fps: 60,
    frameAccum: 0,
    fpsSamples: []
  };

  private maxFrameTime = 1 / 30;

  constructor() {
    this.init();
  }

  private init(): void {
    this.canvas = document.getElementById('three-canvas') as HTMLCanvasElement;
    if (!this.canvas) {
      console.error('[StellarPulse] Canvas element not found');
      return;
    }

    this.camera = new THREE.PerspectiveCamera(
      50,
      (this.canvas.clientWidth || window.innerWidth) / (this.canvas.clientHeight || window.innerHeight),
      0.1,
      200
    );
    this.camera.position.set(0, 4, 15);
    this.camera.lookAt(0, 0, 0);

    this.waveGenerator = new WaveGenerator();

    this.interaction = new InteractionSystem(this.canvas, this.camera, {
      onPulse: () => this.handlePulse(),
      onSelectionChanged: (box: SelectionBox) => this.handleSelectionChange(box),
      onResetSelection: () => this.handleResetSelection()
    });

    this.renderer = new AppRenderer(this.canvas, this.camera);

    this.bindGlobalEvents();
    this.start();
  }

  private bindGlobalEvents(): void {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.stats.lastTime = 0;
      }
    });
  }

  private handlePulse(): void {
    this.waveGenerator.triggerPulse();
  }

  private handleSelectionChange(_box: SelectionBox): void {
    // Selection box propagated via interaction.getLiveSelection / interaction.selectionBox
  }

  private handleResetSelection(): void {
    // Reset propagated via interaction state
  }

  private start(): void {
    if (this.running) return;
    this.running = true;
    this.stats.lastTime = performance.now() / 1000;
    this.loop();
  }

  public stop(): void {
    this.running = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }

  private loop = (): void => {
    if (!this.running) return;
    this.rafId = requestAnimationFrame(this.loop);

    const now = performance.now() / 1000;
    let delta = this.stats.lastTime > 0 ? (now - this.stats.lastTime) : 0.016;
    if (delta > this.maxFrameTime) delta = this.maxFrameTime;
    this.stats.lastTime = now;

    this.interaction.update(delta);
    const activeBox = this.interaction.selectionActive
      ? this.interaction.selectionBox
      : ({ active: false, xMin: 0, xMax: 0, yMin: 0, yMax: 0, zoomProgress: 0 } as SelectionBox);
    const waveOutput = this.waveGenerator.update(delta, activeBox);

    this.renderer.updateBuffers(waveOutput);
    this.renderer.render(this.interaction);

    this.collectFPS(delta);
  };

  private collectFPS(delta: number): void {
    this.stats.frameCount++;
    this.stats.frameAccum += delta;
    if (this.stats.frameAccum >= 0.5) {
      const instantFPS = this.stats.frameCount / this.stats.frameAccum;
      this.stats.fpsSamples.push(instantFPS);
      if (this.stats.fpsSamples.length > 20) this.stats.fpsSamples.shift();
      const sum = this.stats.fpsSamples.reduce((a, b) => a + b, 0);
      this.stats.fps = sum / this.stats.fpsSamples.length;
      this.stats.frameCount = 0;
      this.stats.frameAccum = 0;
    }
  }

  public getFPS(): number {
    return this.stats.fps;
  }

  public dispose(): void {
    this.stop();
    this.interaction.unbindEvents();
    this.renderer.dispose();
  }
}

// Boot application once DOM is ready
function boot(): void {
  (window as unknown as { __stellarPulse?: StellarPulseApp }).__stellarPulse = new StellarPulseApp();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
