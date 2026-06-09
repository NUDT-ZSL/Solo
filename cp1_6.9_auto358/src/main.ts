import * as THREE from 'three';
import { SceneManager } from './sceneManager';

class Application {
  private sceneManager: SceneManager;
  private container: HTMLElement;
  private fpsCounter: HTMLElement;
  private frameCount: number = 0;
  private lastFpsUpdate: number = 0;

  constructor() {
    this.container = document.getElementById('app')!;
    this.fpsCounter = document.getElementById('fps-counter')!;

    this.sceneManager = new SceneManager(this.container);
    this.init();
  }

  private init(): void {
    this.sceneManager.init();
    this.setupEventListeners();
    this.startRenderLoop();
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => {
      this.sceneManager.handleResize();
    });
  }

  private startRenderLoop(): void {
    const animate = (timestamp: number) => {
      requestAnimationFrame(animate);
      this.updateFPS(timestamp);
      this.sceneManager.update(timestamp);
      this.sceneManager.render();
    };
    requestAnimationFrame(animate);
  }

  private updateFPS(timestamp: number): void {
    this.frameCount++;
    if (timestamp - this.lastFpsUpdate >= 1000) {
      this.fpsCounter.textContent = `FPS: ${this.frameCount}`;
      this.frameCount = 0;
      this.lastFpsUpdate = timestamp;
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Application();
});
