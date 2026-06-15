import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { OceanScene } from './OceanScene';
import { PlanktonSystem } from './PlanktonSystem';
import { UIController } from './UIController';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private ocean: OceanScene;
  private plankton: PlanktonSystem;
  private ui: UIController;
  private clock: THREE.Clock;

  constructor() {
    const container = document.getElementById('app')!;

    this.scene = new THREE.Scene();
    this.setupBackground();

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      500
    );
    this.camera.position.set(0, 28, 50);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2.1;
    this.controls.minDistance = 10;
    this.controls.maxDistance = 100;
    this.controls.target.set(0, 0, 0);

    this.clock = new THREE.Clock();

    this.ocean = new OceanScene(this.scene);
    this.plankton = new PlanktonSystem(this.scene, this.ocean);
    this.ui = new UIController(
      this.scene,
      this.camera,
      this.renderer,
      this.plankton,
      this.ocean
    );

    window.addEventListener('resize', this.onResize);
    this.animate();
  }

  private setupBackground() {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#050a1e');
    gradient.addColorStop(0.35, '#0a1035');
    gradient.addColorStop(0.65, '#151050');
    gradient.addColorStop(1, '#1a0a3e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);
    const texture = new THREE.CanvasTexture(canvas);
    this.scene.background = texture;

    this.scene.fog = new THREE.FogExp2(0x0a0a2e, 0.006);
  }

  private onResize = () => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  private animate = () => {
    requestAnimationFrame(this.animate);
    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    const settings = this.ui.getSettings();

    this.ocean.update(elapsed, delta, settings.tideSpeed);
    this.plankton.update(
      elapsed,
      delta,
      settings.glowIntensity,
      settings.trailEnabled,
      settings.tideSpeed
    );
    this.ui.update();
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };
}

new App();
