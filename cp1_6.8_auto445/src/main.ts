import * as THREE from 'three';
import { ParticleSystem } from './particles';
import { InteractionHandler } from './interaction';
import { ControlPanel } from './controls';
import { createGradientTexture, COLOR_THEMES } from './utils';

class StardustCorridor {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private particleSystem: ParticleSystem;
  private interactionHandler: InteractionHandler;
  private clock: THREE.Clock;
  private backgroundMesh: THREE.Mesh;

  constructor() {
    this.clock = new THREE.Clock();

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    document.body.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      200
    );
    this.camera.position.set(0, 5, 30);

    const bgGeometry = new THREE.SphereGeometry(90, 32, 32);
    const bgTexture = createGradientTexture(
      COLOR_THEMES.nebula.bgTop,
      COLOR_THEMES.nebula.bgBottom
    );
    const bgMaterial = new THREE.MeshBasicMaterial({
      map: bgTexture,
      side: THREE.BackSide,
    });
    this.backgroundMesh = new THREE.Mesh(bgGeometry, bgMaterial);
    this.scene.add(this.backgroundMesh);

    const ambientLight = new THREE.AmbientLight(0x222244, 0.5);
    this.scene.add(ambientLight);

    this.particleSystem = new ParticleSystem(this.scene, 2500);

    this.interactionHandler = new InteractionHandler(
      this.camera,
      this.scene,
      this.renderer,
      this.particleSystem
    );

    new ControlPanel(this.particleSystem, this.interactionHandler);

    window.addEventListener('resize', this.onResize.bind(this));

    this.animate();
  }

  private onResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private animate() {
    requestAnimationFrame(this.animate.bind(this));

    const dt = Math.min(this.clock.getDelta(), 0.05);
    const cameraForward = this.interactionHandler.getCameraForward();

    this.interactionHandler.update();
    this.particleSystem.update(dt, cameraForward);

    this.renderer.render(this.scene, this.camera);
  }
}

new StardustCorridor();
