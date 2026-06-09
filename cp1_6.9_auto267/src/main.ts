import * as THREE from 'three';
import { CoralSystem } from './CoralSystem';

class Application {
  private readonly container: HTMLElement;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly coralSystem: CoralSystem;

  private readonly clock: THREE.Clock = new THREE.Clock();
  private animationFrameId: number | null = null;

  private readonly onResizeBound: () => void;

  constructor() {
    const containerEl = document.getElementById('app');
    if (!containerEl) {
      throw new Error('Container element #app not found');
    }
    this.container = containerEl;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x050510, 0.035);

    this.camera = this.createCamera();
    this.renderer = this.createRenderer();
    this.container.appendChild(this.renderer.domElement);

    this.setupLights();
    this.setupAmbientDecor();

    this.coralSystem = new CoralSystem(
      this.scene,
      this.camera,
      this.renderer.domElement
    );

    this.onResizeBound = this.onResize.bind(this);
    window.addEventListener('resize', this.onResizeBound);

    this.onResize();
  }

  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      200
    );
    camera.position.set(0, 2, 14);
    camera.lookAt(0, 0, 0);
    return camera;
  }

  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    return renderer;
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0x4060a0, 0.55);
    this.scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0x80a0ff, 0.7);
    keyLight.position.set(5, 8, 6);
    this.scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xff80c0, 0.35);
    rimLight.position.set(-6, 3, -5);
    this.scene.add(rimLight);

    const fillLight = new THREE.PointLight(0x60a0ff, 0.4, 25);
    fillLight.position.set(0, -3, 4);
    this.scene.add(fillLight);
  }

  private setupAmbientDecor(): void {
    const groundGeo = new THREE.CircleGeometry(20, 48);
    const groundMat = new THREE.MeshBasicMaterial({
      color: 0x080828,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -7;
    this.scene.add(ground);

    const causticTexture = this.createCausticTexture();
    const causticMat = new THREE.MeshBasicMaterial({
      map: causticTexture,
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const causticPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 20),
      causticMat
    );
    causticPlane.rotation.x = -Math.PI / 2;
    causticPlane.position.y = -6.9;
    this.scene.add(causticPlane);
  }

  private createCausticTexture(): THREE.Texture {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2
    );
    gradient.addColorStop(0, 'rgba(140, 180, 255, 1)');
    gradient.addColorStop(0.4, 'rgba(100, 150, 230, 0.5)');
    gradient.addColorStop(1, 'rgba(50, 80, 150, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    for (let i = 0; i < 120; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = 4 + Math.random() * 28;
      const opacity = 0.05 + Math.random() * 0.18;

      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(180, 210, 255, ${opacity})`);
      g.addColorStop(1, 'rgba(100, 150, 220, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(3, 2);
    return texture;
  }

  private onResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  public start(): void {
    this.clock.start();
    this.animate();
  }

  private animate(): void {
    this.animationFrameId = requestAnimationFrame(() => this.animate());

    const deltaTime = Math.min(this.clock.getDelta(), 0.05);

    this.coralSystem.update(deltaTime);
    this.updateCamera(deltaTime);

    this.renderer.render(this.scene, this.camera);
  }

  private updateCamera(deltaTime: number): void {
    const t = this.clock.elapsedTime;
    this.camera.position.x = Math.sin(t * 0.08) * 0.6;
    this.camera.position.y = 2 + Math.sin(t * 0.12) * 0.25;
    this.camera.lookAt(0, Math.sin(t * 0.06) * 0.3, 0);
  }

  public dispose(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    window.removeEventListener('resize', this.onResizeBound);

    this.coralSystem.dispose();

    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });

    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}

let app: Application | null = null;

function bootstrap(): void {
  try {
    app = new Application();
    app.start();
  } catch (err) {
    console.error('Failed to initialize application:', err);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}

window.addEventListener('beforeunload', () => {
  if (app) {
    app.dispose();
    app = null;
  }
});
