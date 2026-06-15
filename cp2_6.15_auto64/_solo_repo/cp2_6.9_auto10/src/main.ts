import * as THREE from 'three';
import { SceneManager } from './sceneManager';
import { InteractionController, InteractionEvent } from './interaction';

class HolographicApp {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private sceneManager: SceneManager;
  private interactionController: InteractionController;

  private clock: THREE.Clock;
  private animationFrameId: number | null = null;
  private isRunning: boolean = false;

  private fpsFrames: number = 0;
  private fpsLastTime: number = 0;
  private fpsElement: HTMLElement | null = null;
  private particleCountElement: HTMLElement | null = null;
  private modeElement: HTMLElement | null = null;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    if (!this.container) {
      throw new Error('Canvas container not found');
    }

    this.clock = new THREE.Clock();

    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();
    this.container.appendChild(this.renderer.domElement);

    this.sceneManager = new SceneManager(this.scene, this.camera);
    this.interactionController = new InteractionController(this.container, this.camera);

    this.setupInteractionHandlers();
    this.setupDebugUI();
    this.setupResizeHandler();

    this.handleResize();
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0a1a, 0.035);
    return scene;
  }

  private createCamera(): THREE.PerspectiveCamera {
    const aspect = window.innerWidth / window.innerHeight;
    const camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 200);
    camera.position.set(0, 0, 12);
    camera.lookAt(0, 0, 0);
    return camera;
  }

  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x0a0a1a, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    const canvas = renderer.domElement;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.touchAction = 'none';

    return renderer;
  }

  private setupInteractionHandlers(): void {
    this.interactionController.on('transform', (event: InteractionEvent) => {
      this.sceneManager.handleInteractionEvent(event);
    });

    this.interactionController.on('select', (event: InteractionEvent) => {
      this.sceneManager.handleInteractionEvent(event);
    });

    this.interactionController.on('flick', (event: InteractionEvent) => {
      this.sceneManager.handleInteractionEvent(event);
    });

    this.interactionController.on('pulse', (event: InteractionEvent) => {
      this.sceneManager.handleInteractionEvent(event);
    });

    this.interactionController.on('trail', (event: InteractionEvent) => {
      this.sceneManager.handleInteractionEvent(event);
    });
  }

  private setupDebugUI(): void {
    this.fpsElement = document.getElementById('fps');
    this.particleCountElement = document.getElementById('particle-count');
    this.modeElement = document.getElementById('mode');

    if (this.particleCountElement) {
      this.particleCountElement.textContent = this.sceneManager.getParticleCount().toString();
    }
  }

  private setupResizeHandler(): void {
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('orientationchange', this.handleResize);
  }

  private handleResize = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.sceneManager.resize();
  };

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.clock.start();
    this.fpsLastTime = performance.now();
    this.animate();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private animate = (): void => {
    if (!this.isRunning) return;
    this.animationFrameId = requestAnimationFrame(this.animate);

    const deltaTime = Math.min(this.clock.getDelta(), 0.1);

    this.sceneManager.update(deltaTime);
    this.renderer.render(this.scene, this.camera);

    this.updateFPS();
  };

  private updateFPS(): void {
    this.fpsFrames++;
    const now = performance.now();
    if (now - this.fpsLastTime >= 1000) {
      if (this.fpsElement) {
        this.fpsElement.textContent = this.fpsFrames.toString();
      }
      if (this.modeElement) {
        this.modeElement.textContent = this.sceneManager.debugMode;
      }
      this.fpsFrames = 0;
      this.fpsLastTime = now;
    }
  }

  public dispose(): void {
    this.stop();
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('orientationchange', this.handleResize);

    this.interactionController.destroy();
    this.sceneManager.dispose();

    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}

let app: HolographicApp | null = null;

function initApp(): void {
  if (app) return;

  try {
    app = new HolographicApp();
    app.start();
    console.log('[Holographic] Application started successfully');
  } catch (error) {
    console.error('[Holographic] Failed to initialize:', error);
    const container = document.getElementById('canvas-container');
    if (container) {
      container.innerHTML = `
        <div style="color: #f72585; padding: 40px; text-align: center; font-family: sans-serif;">
          <h3 style="margin-bottom: 16px;">初始化失败</h3>
          <p style="opacity: 0.7;">${error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>
      `;
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

if (typeof window !== 'undefined') {
  (window as any).__holographicApp = {
    getApp: () => app,
    dispose: () => { if (app) { app.dispose(); app = null; } }
  };
}

export { HolographicApp };
export default HolographicApp;
