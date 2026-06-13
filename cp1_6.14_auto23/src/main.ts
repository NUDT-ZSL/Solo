import { createSceneRenderer, SceneRenderer } from './sceneRenderer';
import { createUIController, UIController, UIControlState } from './uiController';
import { particleSystem, ParticleInfo } from './particleSystem';
import { createTerrainOverlay } from './terrainOverlay';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

class WindSculptApp {
  private renderer: SceneRenderer;
  private uiController: UIController;
  private controls: OrbitControls;
  private animationId: number = 0;
  private frameCount: number = 0;
  private fpsUpdateTime: number = 0;
  private lastFrameTime: number = 0;
  private isRunning: boolean = true;

  constructor() {
    this.renderer = createSceneRenderer('three-canvas');
    this.uiController = createUIController(this.renderer);
    this.controls = this.setupOrbitControls();
    createTerrainOverlay('terrain-canvas');
  }

  private setupOrbitControls(): OrbitControls {
    const camera = this.renderer.getCamera();
    const rendererDom = this.renderer.getRenderer().domElement;
    const controls = new OrbitControls(camera, rendererDom);

    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.5;
    controls.zoomSpeed = 0.8;
    controls.panSpeed = 0.5;
    controls.minDistance = 50;
    controls.maxDistance = 600;
    controls.maxPolarAngle = Math.PI / 2 + 0.3;
    controls.enablePan = false;

    controls.addEventListener('start', () => {
      const state = this.uiController.getState();
      (this.uiController as unknown as { state: UIControlState }).state.isDragging = true;
    });

    controls.addEventListener('end', () => {
      setTimeout(() => {
        const state = this.uiController.getState();
        (this.uiController as unknown as { state: UIControlState }).state.isDragging = false;
      }, 150);
    });

    return controls;
  }

  public async init(): Promise<void> {
    console.log('[WindSculpt] 初始化三维大气气流动态可视化应用...');

    await particleSystem.init(2000);
    this.uiController.init();

    this.setupCameraControlSync();

    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.startRenderLoop();

    console.log('[WindSculpt] 应用初始化完成');
    console.log(`[WindSculpt] 粒子数量: ${particleSystem.getParticleCount()}`);
    console.log(`[WindSculpt] 风速范围: 0-50 m/s`);
  }

  private setupCameraControlSync(): void {
    const originalToggleViewMode = this.renderer.toggleViewMode.bind(this.renderer);
    this.renderer.toggleViewMode = () => {
      this.controls.enabled = false;
      const result = originalToggleViewMode();
      setTimeout(() => {
        this.controls.target.set(0, 0, 0);
        this.controls.update();
        this.controls.enabled = true;
      }, 650);
      return result;
    };
  }

  private startRenderLoop(): void {
    const animate = () => {
      if (!this.isRunning) return;

      this.animationId = requestAnimationFrame(animate);

      const now = performance.now();
      const deltaTime = (now - this.lastFrameTime) / 1000;
      this.lastFrameTime = now;

      this.updateFPS(now);

      const isPlaying = this.uiController.isPlaying();
      const particleData = particleSystem.update(deltaTime, isPlaying);

      this.uiController.updateParticleData(particleData);

      this.renderer.updateParticles(particleData);

      const trailData = particleSystem.getAllTrailPositions();
      this.renderer.updateTrails(trailData);

      this.controls.update();

      this.renderer.renderFrame();
    };

    animate();
  }

  private updateFPS(currentTime: number): void {
    this.frameCount++;
    if (currentTime - this.fpsUpdateTime >= 1000) {
      const fps = this.frameCount;
      if (fps < 55) {
        console.warn(`[WindSculpt] FPS较低: ${fps}, 建议降低粒子密度`);
      }
      this.frameCount = 0;
      this.fpsUpdateTime = currentTime;
    }
  }

  public dispose(): void {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.controls.dispose();
    this.renderer.dispose();
  }
}

declare global {
  interface Window {
    windSculptApp?: WindSculptApp;
  }
}

const app = new WindSculptApp();
window.windSculptApp = app;

app.init().catch((error) => {
  console.error('[WindSculpt] 应用初始化失败:', error);
});

export default app;
