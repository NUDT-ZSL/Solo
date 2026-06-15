import * as THREE from 'three';
import { MagneticField } from './field';
import { InteractionManager } from './interaction';

class App {
  private container!: HTMLElement;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private clock!: THREE.Clock;
  private magneticField!: MagneticField;
  private interaction!: InteractionManager;
  private animationId: number = 0;
  private running: boolean = false;

  private lastHoverPoint: THREE.Vector3 = new THREE.Vector3();
  private hoverCooldown: number = 0;

  constructor() {
    this.init();
  }

  private init(): void {
    this.container = document.getElementById('app') || document.body;
    this.clock = new THREE.Clock();

    this.createScene();
    this.createCamera();
    this.createRenderer();
    this.createLights();
    this.createMagneticField();
    this.createInteraction();

    window.addEventListener('resize', this.onWindowResize);
    document.addEventListener('visibilitychange', this.onVisibilityChange);

    this.onWindowResize();
    this.running = true;
    this.animate();
  }

  private createScene(): void {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
    this.scene.fog = new THREE.FogExp2(0x000008, 0.02);
  }

  private createCamera(): void {
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 100);
    this.camera.position.set(7, 5, 7);
    this.camera.lookAt(0, 0, 0);
  }

  private createRenderer(): void {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    this.container.appendChild(this.renderer.domElement);

    this.renderer.domElement.style.cursor = 'grab';
  }

  private createLights(): void {
    const ambient = new THREE.AmbientLight(0x4488ff, 0.15);
    this.scene.add(ambient);

    const northLight = new THREE.PointLight(0x6688ff, 0.8, 15, 2);
    northLight.position.set(0, 3, 0);
    this.scene.add(northLight);

    const southLight = new THREE.PointLight(0xff6666, 0.8, 15, 2);
    southLight.position.set(0, -3, 0);
    this.scene.add(southLight);

    const rimLight = new THREE.DirectionalLight(0x88aaff, 0.3);
    rimLight.position.set(5, 5, 5);
    this.scene.add(rimLight);
  }

  private createMagneticField(): void {
    this.magneticField = new MagneticField(this.scene);
    this.magneticField.init();
  }

  private createInteraction(): void {
    this.interaction = new InteractionManager(
      this.camera,
      this.renderer.domElement,
      this.magneticField
    );

    const dom = this.renderer.domElement;
    dom.addEventListener('mousedown', () => {
      dom.style.cursor = this.interaction.isPanning ? 'grabbing' : 'grabbing';
    });
    dom.addEventListener('mouseup', () => {
      dom.style.cursor = 'grab';
    });
    dom.addEventListener('mouseleave', () => {
      dom.style.cursor = 'grab';
      this.magneticField.clearHighlights();
    });

    dom.addEventListener('click', (e: MouseEvent) => {
      if (this.hoverCooldown <= 0) {
        const hoverPoint = this.interaction.getHoverPoint();
        this.magneticField.createShockWave(hoverPoint);
        this.hoverCooldown = 0.2;
      }
    });
  }

  private onWindowResize = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  };

  private onVisibilityChange = (): void => {
    if (document.hidden) {
      this.running = false;
      cancelAnimationFrame(this.animationId);
    } else {
      if (!this.running) {
        this.running = true;
        this.clock.start();
        this.animate();
      }
    }
  };

  private animate = (): void => {
    if (!this.running) return;

    this.animationId = requestAnimationFrame(this.animate);

    let delta = this.clock.getDelta();
    delta = Math.min(delta, 0.05);

    if (this.hoverCooldown > 0) {
      this.hoverCooldown -= delta;
    }

    this.update(delta);
    this.render();
  };

  private update(delta: number): void {
    this.magneticField.update(delta);
    this.interaction.update(delta);
  }

  private render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    this.running = false;
    cancelAnimationFrame(this.animationId);

    window.removeEventListener('resize', this.onWindowResize);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);

    this.interaction.dispose();
    this.magneticField.dispose();

    this.renderer.dispose();

    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}

let app: App | null = null;

window.addEventListener('DOMContentLoaded', () => {
  app = new App();
});

window.addEventListener('beforeunload', () => {
  if (app) {
    app.dispose();
    app = null;
  }
});
