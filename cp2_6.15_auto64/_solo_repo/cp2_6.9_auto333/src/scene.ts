import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class SceneManager {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  clock: THREE.Clock;
  fps: number = 0;
  private frameCount: number = 0;
  private lastFpsTime: number = 0;
  private container: HTMLElement | null = null;
  private animationCallbacks: Array<(delta: number) => void> = [];

  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera();
    this.renderer = new THREE.WebGLRenderer();
    this.controls = new OrbitControls(this.camera, document.createElement('div'));
    this.clock = new THREE.Clock();
  }

  init(container: HTMLElement): void {
    this.container = container;

    this.scene.background = null;
    this.scene.fog = null;

    const { clientWidth, clientHeight } = container;

    this.camera.fov = 50;
    this.camera.aspect = clientWidth / clientHeight;
    this.camera.near = 0.1;
    this.camera.far = 100;
    this.camera.position.set(0, 0.5, 3.2);
    this.camera.lookAt(0, 0, 0);
    this.camera.updateProjectionMatrix();

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(clientWidth, clientHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 0.5;
    this.controls.maxDistance = 5;
    this.controls.enablePan = true;
    this.controls.panSpeed = 0.8;
    this.controls.rotateSpeed = 0.8;
    this.controls.zoomSpeed = 0.8;
    this.controls.target.set(0, 0, 0);
    this.controls.update();

    this.renderer.domElement.addEventListener('keydown', (e) => {
      this.controls.enablePan = e.shiftKey;
    });
    this.renderer.domElement.addEventListener('keyup', (e) => {
      if (!e.shiftKey) this.controls.enablePan = true;
    });
    window.addEventListener('keydown', (e) => {
      this.controls.enablePan = e.shiftKey;
    });
    window.addEventListener('keyup', (e) => {
      this.controls.enablePan = true;
    });

    window.addEventListener('resize', () => this.onResize());

    this.startAnimationLoop();
  }

  onResize(): void {
    if (!this.container) return;
    const { clientWidth, clientHeight } = this.container;
    this.camera.aspect = clientWidth / clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(clientWidth, clientHeight);
  }

  onAnimate(callback: (delta: number) => void): void {
    this.animationCallbacks.push(callback);
  }

  resetCamera(): void {
    this.camera.position.set(0, 0.5, 3.2);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  private startAnimationLoop(): void {
    this.lastFpsTime = performance.now();

    const animate = () => {
      requestAnimationFrame(animate);

      const delta = this.clock.getDelta();

      this.controls.update();

      for (const cb of this.animationCallbacks) {
        cb(delta);
      }

      this.renderer.render(this.scene, this.camera);

      this.frameCount++;
      const now = performance.now();
      if (now - this.lastFpsTime >= 500) {
        this.fps = Math.round((this.frameCount * 1000) / (now - this.lastFpsTime));
        this.frameCount = 0;
        this.lastFpsTime = now;
      }
    };

    animate();
  }
}
