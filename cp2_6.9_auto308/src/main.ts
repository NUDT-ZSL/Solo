import * as THREE from 'three';
import { CrystalGenerator, CrystalMesh } from './CrystalGenerator';
import { LightingManager } from './LightingManager';
import { InteractionController } from './InteractionController';
import { UIControls } from './UIControls';

class CrystalPrismUniverse {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;

  private crystalGenerator: CrystalGenerator;
  private lightingManager: LightingManager;
  private interactionController!: InteractionController;
  private uiControls!: UIControls;

  private crystals: CrystalMesh[] = [];

  private clock: THREE.Clock;
  private startTime: number = 0;

  private isRunning: boolean = false;
  private animationFrameId: number = 0;

  constructor() {
    this.container = document.getElementById('app')!;
    this.clock = new THREE.Clock();

    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();
    this.container.appendChild(this.renderer.domElement);

    this.createStars();

    this.crystalGenerator = new CrystalGenerator(this.scene);
    this.lightingManager = new LightingManager(this.scene);

    this.initCrystals();
    this.initInteraction();
    this.initUI();

    this.setupResize();
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();
    scene.background = null;
    scene.fog = new THREE.FogExp2(0x0B0C1A, 0.03);
    return scene;
  }

  private createCamera(): THREE.PerspectiveCamera {
    const aspect = window.innerWidth / window.innerHeight;
    const camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 100);
    camera.position.set(0, 6, 12);
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
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    return renderer;
  }

  private createStars(): void {
    const starCount = 1000;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    const color = new THREE.Color();

    for (let i = 0; i < starCount; i++) {
      const radius = 40 + Math.random() * 40;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      const brightness = 0.5 + Math.random() * 0.5;
      color.setHSL(0.6 + Math.random() * 0.2, 0.3, brightness);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });

    const stars = new THREE.Points(geometry, material);
    this.scene.add(stars);
  }

  private initCrystals(): void {
    const count = Math.floor(20 + Math.random() * 11);
    this.crystals = this.crystalGenerator.createCrystalCluster(count);
  }

  private initInteraction(): void {
    this.interactionController = new InteractionController(
      this.scene,
      this.camera,
      this.renderer,
      this.crystalGenerator,
      this.crystals
    );
  }

  private initUI(): void {
    this.uiControls = new UIControls({
      onRotationSpeedChange: (speed: number) => {
        this.interactionController.setRotationSpeed(speed);
      },
      onThemeChange: (theme: string) => {
        this.crystalGenerator.setTheme(theme);
      },
      onResetCamera: () => {
        this.interactionController.resetCamera(true);
      }
    });
  }

  private setupResize(): void {
    window.addEventListener('resize', this.onResize);
    this.onResize();
  }

  private onResize = (): void => {
    const width = Math.max(window.innerWidth, 1024);
    const height = Math.max(window.innerHeight, 768);

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  };

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.startTime = performance.now() / 1000;
    this.clock.start();
    this.animate();
  }

  stop(): void {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  private animate = (): void => {
    if (!this.isRunning) return;

    this.animationFrameId = requestAnimationFrame(this.animate);

    const dt = Math.min(this.clock.getDelta(), 0.05);
    const t = performance.now() / 1000 - this.startTime;

    this.lightingManager.update(t);
    this.interactionController.update(t, dt);

    this.renderer.render(this.scene, this.camera);
  };

  dispose(): void {
    this.stop();
    window.removeEventListener('resize', this.onResize);

    if (this.uiControls) {
      this.uiControls.dispose();
    }

    if (this.interactionController) {
      this.interactionController.dispose();
    }

    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry?.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      }
    });

    this.renderer.dispose();
  }
}

const app = new CrystalPrismUniverse();
app.start();

window.addEventListener('beforeunload', () => {
  app.dispose();
});
