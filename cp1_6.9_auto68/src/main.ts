import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GeometryManager } from './geometryManager';
import { InteractionManager } from './interaction';
import { UIController } from './UIController';

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function makeSpaceBackground(): THREE.Texture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, '#0B0C10');
  grad.addColorStop(1, '#1F2833');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const starCount = 140;
  for (let i = 0; i < starCount; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = Math.random() * 1.4 + 0.2;
    const alpha = 0.25 + Math.random() * 0.6;
    const hue = 15 + Math.random() * 20;
    ctx.fillStyle = `hsla(${hue}, 70%, ${65 + Math.random() * 25}%, ${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 40; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = Math.random() * 0.6 + 0.1;
    const hue = 200 + Math.random() * 60;
    ctx.fillStyle = `hsla(${hue}, 85%, 75%, ${0.2 + Math.random() * 0.45})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createDeepSpaceScene(): THREE.Scene {
  const scene = new THREE.Scene();
  scene.background = makeSpaceBackground();
  scene.fog = new THREE.FogExp2(0x0b0c10, 0.025);
  return scene;
}

class App {
  private container: HTMLElement;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private geometryManager!: GeometryManager;
  private interactionManager!: InteractionManager;
  private uiController!: UIController;
  private clock: THREE.Clock;
  private running = false;
  private rafId = 0;
  private colorSpeedMul = 1;
  private fadeInDuration = 2;
  private fadeInElapsed = 0;
  private resizeObserver: ResizeObserver | null = null;

  constructor(container: HTMLElement, uiHost: HTMLElement) {
    this.container = container;
    this.clock = new THREE.Clock();
    this.initThree();
    this.initGeometry();
    this.initInteraction();
    this.initUI(uiHost);
    this.observeResize();
  }

  private initThree(): void {
    this.scene = createDeepSpaceScene();

    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(52, w / h, 0.1, 200);
    this.camera.position.set(0, 2.2, 12.5);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(w, h, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 4;
    this.controls.maxDistance = 32;
    this.controls.zoomSpeed = 0.7;
    this.controls.rotateSpeed = 0.55;
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  private initGeometry(): void {
    this.geometryManager = new GeometryManager(this.scene);
    this.geometryManager.init();
    this.geometryManager.setFadeInProgress(0);
  }

  private initInteraction(): void {
    this.interactionManager = new InteractionManager(
      this.scene,
      this.camera,
      this.renderer,
      this.geometryManager
    );
  }

  private initUI(host: HTMLElement): void {
    this.uiController = new UIController(host, {
      onThicknessChange: (px) => {
        this.geometryManager.setLineThickness(px);
      },
      onColorSpeedChange: (mul) => {
        this.colorSpeedMul = mul;
      },
      onRotationSpeedChange: (rad) => {
        this.geometryManager.setRotationSpeed(rad);
      }
    });
    this.uiController.mount();
    const defaults = this.uiController.getDefaultValues();
    this.geometryManager.setLineThickness(defaults.thickness);
    this.geometryManager.setRotationSpeed(defaults.rotationSpeed);
    this.colorSpeedMul = defaults.colorSpeed;
  }

  private observeResize(): void {
    const onResize = () => {
      const w = this.container.clientWidth || window.innerWidth;
      const h = this.container.clientHeight || window.innerHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h, false);
    };
    window.addEventListener('resize', onResize);
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(onResize);
      this.resizeObserver.observe(this.container);
    }
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.clock.start();
    this.loop();
  }

  stop(): void {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }

  private loop = (): void => {
    if (!this.running) return;
    this.rafId = requestAnimationFrame(this.loop);

    const delta = Math.min(this.clock.getDelta(), 0.05);
    const elapsed = this.clock.getElapsedTime();

    if (this.fadeInElapsed < this.fadeInDuration) {
      this.fadeInElapsed = Math.min(this.fadeInElapsed + delta, this.fadeInDuration);
      const t = easeInOutCubic(this.fadeInElapsed / this.fadeInDuration);
      this.geometryManager.setFadeInProgress(t);
    }

    this.controls.update();
    this.interactionManager.update(delta);
    this.geometryManager.update(delta, elapsed, this.colorSpeedMul);

    this.renderer.render(this.scene, this.camera);
  };

  dispose(): void {
    this.stop();
    this.uiController.unmount();
    this.interactionManager.dispose();
    if (this.resizeObserver) this.resizeObserver.disconnect();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}

function boot(): void {
  const container = document.getElementById('canvas-container');
  const uiHost = document.getElementById('ui-panel-host');
  if (!container || !uiHost) {
    console.error('[LightCone] 未找到DOM容器');
    return;
  }
  const app = new App(container, uiHost);
  app.start();

  (window as unknown as { __lightConeApp?: App }).__lightConeApp = app;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}

export { App, boot };
