import * as THREE from 'three';
import { CrystalSystem } from './CrystalSystem';
import { NetworkSystem } from './NetworkSystem';
import { InteractionSystem } from './interaction';

const DESKTOP_CRYSTAL_COUNT = 200;
const MOBILE_CRYSTAL_COUNT = 100;
const DESKTOP_CONNECTION_DISTANCE = 2.5;
const MOBILE_CONNECTION_DISTANCE = 1.5;
const MOBILE_BREAKPOINT = 768;

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;

  private crystalSystem: CrystalSystem;
  private networkSystem: NetworkSystem;
  private interactionSystem: InteractionSystem;

  private clock: THREE.Clock;
  private elapsedTime: number = 0;
  private isMobile: boolean = false;

  private ambientLight: THREE.AmbientLight;
  private pointLight1: THREE.PointLight;
  private pointLight2: THREE.PointLight;
  private pointLight3: THREE.PointLight;

  private disposed: boolean = false;
  private animationFrameId: number = 0;

  constructor() {
    this.container = document.getElementById('app') || document.body;
    this.isMobile = window.innerWidth < MOBILE_BREAKPOINT;

    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();
    this.container.appendChild(this.renderer.domElement);

    this.ambientLight = new THREE.AmbientLight(0x404080, 0.6);
    this.scene.add(this.ambientLight);

    this.pointLight1 = new THREE.PointLight(0x4060ff, 1.2, 50);
    this.pointLight1.position.set(10, 10, 10);
    this.scene.add(this.pointLight1);

    this.pointLight2 = new THREE.PointLight(0x8040ff, 1.0, 50);
    this.pointLight2.position.set(-10, -5, 10);
    this.scene.add(this.pointLight2);

    this.pointLight3 = new THREE.PointLight(0x40ffa0, 0.8, 50);
    this.pointLight3.position.set(0, -10, -10);
    this.scene.add(this.pointLight3);

    const crystalCount = this.isMobile ? MOBILE_CRYSTAL_COUNT : DESKTOP_CRYSTAL_COUNT;
    const connectionDistance = this.isMobile ? MOBILE_CONNECTION_DISTANCE : DESKTOP_CONNECTION_DISTANCE;

    this.crystalSystem = new CrystalSystem(this.scene);
    this.crystalSystem.init(crystalCount);

    this.networkSystem = new NetworkSystem(this.scene, connectionDistance);

    this.interactionSystem = new InteractionSystem(
      this.camera,
      this.crystalSystem,
      this.networkSystem,
      this.renderer,
      this.renderer.domElement
    );

    this.clock = new THREE.Clock();

    this.bindEvents();
    this.animate();
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();

    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, '#0a0a2e');
    gradient.addColorStop(1, '#1a1a3e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 256);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    scene.background = texture;

    scene.fog = new THREE.FogExp2(0x0a0a2e, 0.02);

    return scene;
  }

  private createCamera(): THREE.PerspectiveCamera {
    const aspect = window.innerWidth / window.innerHeight;
    const camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 200);
    camera.position.set(0, 2, 10);
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
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    return renderer;
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.onResize);
    window.addEventListener('beforeunload', this.onBeforeUnload);
  }

  private onResize = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const wasMobile = this.isMobile;
    this.isMobile = width < MOBILE_BREAKPOINT;

    if (wasMobile !== this.isMobile) {
      const crystalCount = this.isMobile ? MOBILE_CRYSTAL_COUNT : DESKTOP_CRYSTAL_COUNT;
      const connectionDistance = this.isMobile ? MOBILE_CONNECTION_DISTANCE : DESKTOP_CONNECTION_DISTANCE;

      this.crystalSystem.resize(crystalCount);
      this.networkSystem.setConnectionDistance(connectionDistance);
    }
  };

  private onBeforeUnload = (): void => {
    this.dispose();
  };

  private animate = (): void => {
    if (this.disposed) return;

    this.animationFrameId = requestAnimationFrame(this.animate);

    const deltaTime = Math.min(this.clock.getDelta(), 0.1);
    this.elapsedTime += deltaTime;

    this.interactionSystem.update(deltaTime);
    this.crystalSystem.update(deltaTime, this.elapsedTime);
    this.networkSystem.update(
      this.crystalSystem.getCrystals(),
      deltaTime,
      this.elapsedTime
    );

    this.updateLights();

    this.renderer.render(this.scene, this.camera);
  };

  private updateLights(): void {
    const t = this.elapsedTime * 0.3;
    this.pointLight1.position.x = Math.sin(t) * 12;
    this.pointLight1.position.z = Math.cos(t) * 12;
    this.pointLight1.position.y = Math.sin(t * 0.7) * 8;

    this.pointLight2.position.x = Math.cos(t * 0.5) * 10;
    this.pointLight2.position.z = Math.sin(t * 0.5) * 10;
    this.pointLight2.position.y = Math.cos(t * 1.3) * 6;

    this.pointLight3.position.x = Math.sin(t * 0.8) * 8;
    this.pointLight3.position.z = Math.cos(t * 0.8) * 8;
    this.pointLight3.position.y = Math.sin(t * 1.1) * 10;
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.animationFrameId);

    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('beforeunload', this.onBeforeUnload);

    this.interactionSystem.dispose();
    this.crystalSystem.dispose();
    this.networkSystem.dispose();

    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}

let app: App | null = null;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    app = new App();
  });
} else {
  app = new App();
}

export { App };
