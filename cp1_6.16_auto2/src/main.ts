import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ParticleManager } from './ParticleManager';
import { ControlPanel } from './ControlPanel';

class StarfieldEditor {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private particleManager: ParticleManager;
  private controlPanel: ControlPanel;
  private cameraAnimProgress = 0;
  private cameraAnimDuration = 1;
  private cameraStartZ = 50;
  private cameraEndZ = 15;
  private isCameraAnimating = true;

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0A0A1A);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      200
    );
    this.camera.position.set(0, 0, this.cameraStartZ);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    document.body.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 50;
    this.controls.enabled = false;

    this.particleManager = new ParticleManager(this.scene);

    this.controlPanel = new ControlPanel((params, isPreset) => {
      this.particleManager.updateParams(params, isPreset);
    });

    window.addEventListener('resize', () => this.onResize());

    this.animate();
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const now = performance.now() / 1000;

    if (this.isCameraAnimating) {
      this.cameraAnimProgress += 1 / 60 / this.cameraAnimDuration;
      if (this.cameraAnimProgress >= 1) {
        this.cameraAnimProgress = 1;
        this.isCameraAnimating = false;
        this.controls.enabled = true;
      }

      const t = 1 - Math.pow(1 - this.cameraAnimProgress, 3);
      const z = this.cameraStartZ + (this.cameraEndZ - this.cameraStartZ) * t;
      this.camera.position.set(0, 0, z);
    }

    this.particleManager.update();
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}

new StarfieldEditor();
