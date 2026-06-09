import * as THREE from 'three';
import { NetworkSystem } from './network.js';
import { InteractionSystem } from './interaction.js';

class CrystalUniverseApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private network: NetworkSystem;
  private interaction: InteractionSystem;
  private container: HTMLElement;
  private clock: THREE.Clock;
  private elapsedTime: number = 0;
  private starField: THREE.Points;
  private animationId: number | null = null;

  constructor() {
    this.container = document.getElementById('app') || document.body;
    this.clock = new THREE.Clock();

    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();
    this.starField = this.createStarField();
    this.scene.add(this.starField);

    this.network = new NetworkSystem();
    this.network.generate(this.scene);

    console.log(`晶格宇宙已生成: ${this.network.getNodeCount()} 个节点, ${this.network.getEdgeCount()} 条连接线`);

    this.interaction = new InteractionSystem(
      this.camera,
      this.renderer,
      this.scene,
      this.network,
      this.container
    );

    this.setupLights();
    this.handleResize();
    window.addEventListener('resize', this.handleResize.bind(this));
    this.container.appendChild(this.renderer.domElement);
    this.start();
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0a1a, 0.008);
    return scene;
  }

  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(25, 20, 35);
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
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    return renderer;
  }

  private createStarField(): THREE.Points {
    const starCount = 2000;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      const radius = 80 + Math.random() * 120;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      const brightness = 0.5 + Math.random() * 0.5;
      const hue = 0.6 + Math.random() * 0.2;
      const color = new THREE.Color().setHSL(hue, 0.3, brightness);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      sizes[i] = 0.3 + Math.random() * 0.7;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.8,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    return new THREE.Points(geometry, material);
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0x404060, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0x8888ff, 0.4);
    directionalLight.position.set(10, 20, 15);
    this.scene.add(directionalLight);

    const pointLight1 = new THREE.PointLight(0x6666ff, 0.8, 60);
    pointLight1.position.set(-15, 10, -10);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xff8866, 0.6, 50);
    pointLight2.position.set(15, -10, 10);
    this.scene.add(pointLight2);
  }

  private handleResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  private start(): void {
    this.animate();
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(this.animate.bind(this));

    const deltaTime = Math.min(this.clock.getDelta(), 0.1);
    this.elapsedTime += deltaTime;
    const currentTime = performance.now() / 1000;

    this.starField.rotation.y += deltaTime * 0.005;

    this.network.update(deltaTime, this.elapsedTime);

    this.interaction.update(deltaTime, this.elapsedTime, currentTime);

    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    this.interaction.dispose();
    this.renderer.dispose();
    window.removeEventListener('resize', this.handleResize.bind(this));
  }
}

let app: CrystalUniverseApp | null = null;

window.addEventListener('DOMContentLoaded', () => {
  app = new CrystalUniverseApp();
});

window.addEventListener('beforeunload', () => {
  if (app) {
    app.dispose();
  }
});
