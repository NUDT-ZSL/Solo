import * as THREE from 'three';
import { StardustNetwork } from './stardustNetwork';
import { InteractionController } from './interactionController';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;

  private network!: StardustNetwork;
  private controller!: InteractionController;

  private clock: THREE.Clock;
  private startTime: number = 0;
  private lastFrameTime: number = 0;

  private frameCount: number = 0;
  private fpsAccumulator: number = 0;
  private currentFps: number = 60;

  private isRunning: boolean = true;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.clock = new THREE.Clock();

    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();

    this.container.appendChild(this.renderer.domElement);

    this.initModules();
    this.handleResize();

    window.addEventListener('resize', this.handleResize);
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();

    const topColor = new THREE.Color().setHSL(250 / 360, 0.7, 0.08);
    const bottomColor = new THREE.Color().setHSL(220 / 360, 0.8, 0.04);

    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = 2;
    bgCanvas.height = 512;
    const bgCtx = bgCanvas.getContext('2d')!;
    const gradient = bgCtx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#' + topColor.getHexString());
    gradient.addColorStop(1, '#' + bottomColor.getHexString());
    bgCtx.fillStyle = gradient;
    bgCtx.fillRect(0, 0, 2, 512);

    const bgTexture = new THREE.CanvasTexture(bgCanvas);
    bgTexture.colorSpace = THREE.SRGBColorSpace;
    scene.background = bgTexture;

    scene.fog = new THREE.FogExp2(
      new THREE.Color().setHSL(235 / 360, 0.6, 0.04),
      0.0008
    );

    return scene;
  }

  private createCamera(): THREE.PerspectiveCamera {
    const aspect = this.container.clientWidth / this.container.clientHeight;
    const camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 5000);
    camera.position.set(0, 0, 600);
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
    renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    return renderer;
  }

  private initModules(): void {
    this.network = new StardustNetwork(this.scene, this.camera);
    this.controller = new InteractionController(
      this.renderer.domElement,
      this.network,
      this.camera,
      () => this.getElapsedTime()
    );
  }

  public getElapsedTime(): number {
    return this.startTime + this.clock.getElapsedTime();
  }

  private handleResize = (): void => {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    if (this.controller) {
      this.controller.resize();
    }
  };

  private animate = (): void => {
    if (!this.isRunning) return;

    requestAnimationFrame(this.animate);

    const now = performance.now();
    const deltaTime = Math.min(0.1, (now - this.lastFrameTime) / 1000);
    this.lastFrameTime = now;

    this.frameCount++;
    this.fpsAccumulator += deltaTime;
    if (this.fpsAccumulator >= 0.5) {
      this.currentFps = this.frameCount / this.fpsAccumulator;
      this.frameCount = 0;
      this.fpsAccumulator = 0;
    }

    const elapsed = this.getElapsedTime();

    this.controller.update(deltaTime);
    this.network.update(elapsed, deltaTime);

    this.renderer.render(this.scene, this.camera);
  };

  public start(): void {
    this.startTime = performance.now() / 1000;
    this.lastFrameTime = performance.now();
    this.clock.start();
    this.animate();
  }

  public stop(): void {
    this.isRunning = false;
    this.clock.stop();
    window.removeEventListener('resize', this.handleResize);
    this.controller.dispose();
    this.renderer.dispose();
  }

  public getFps(): number {
    return this.currentFps;
  }
}

let app: App;

function bootstrap(): void {
  app = new App();
  app.start();

  console.log('%c星尘编织者 ✨ Stardust Weaver', 'color: #a0b0ff; font-size: 16px; font-weight: bold;');
  console.log('%c按住鼠标拖拽来编织星尘光带', 'color: #c0d0ff;');
  console.log('%c滚轮可以缩放视角', 'color: #c0d0ff;');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
