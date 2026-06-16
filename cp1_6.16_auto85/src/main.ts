import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { NebulaSystem } from './nebula';
import { ControlPanel, type ControlParams } from './controls';

class NebulaApplication {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private nebulaSystem: NebulaSystem;
  private controlPanel: ControlPanel;
  private clock: THREE.Clock;
  private container: HTMLElement;

  constructor() {
    this.clock = new THREE.Clock();
    this.container = document.getElementById('app') as HTMLElement;

    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();
    this.controls = this.createControls();

    this.nebulaSystem = new NebulaSystem();
    this.scene.add(this.nebulaSystem.nebulaGroup);
    this.scene.add(this.nebulaSystem.starsPoints);

    this.controlPanel = new ControlPanel(this.container);
    this.setupControlListeners();

    this.createGradientBackground();

    window.addEventListener('resize', this.onWindowResize.bind(this));

    this.animate();
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();
    return scene;
  }

  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      200
    );
    camera.position.set(0, 3, 12);
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
    renderer.setClearColor(0x0A0B1E, 1);
    document.getElementById('canvas-container')?.appendChild(renderer.domElement);
    return renderer;
  }

  private createControls(): OrbitControls {
    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enablePan = false;
    controls.minDistance = 2;
    controls.maxDistance = 20;
    controls.autoRotate = false;
    controls.rotateSpeed = 0.5;
    controls.zoomSpeed = 0.8;
    return controls;
  }

  private createGradientBackground(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#0A0B1E');
    gradient.addColorStop(1, '#000000');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const backgroundGeometry = new THREE.SphereGeometry(100, 32, 32);
    const backgroundMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.BackSide,
      depthWrite: false
    });
    const backgroundMesh = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
    this.scene.add(backgroundMesh);
  }

  private setupControlListeners(): void {
    const initialParams = this.controlPanel.getParams();
    this.nebulaSystem.setParticleSize(initialParams.particleSize);
    this.nebulaSystem.setSpeed(initialParams.speed);
    this.nebulaSystem.setColors(initialParams.colorStart, initialParams.colorEnd);
    this.nebulaSystem.setRotationMode(initialParams.rotationMode);

    this.controlPanel.onChange((params: Partial<ControlParams>) => {
      if (params.particleSize !== undefined) {
        this.nebulaSystem.setParticleSize(params.particleSize);
      }
      if (params.speed !== undefined) {
        this.nebulaSystem.setSpeed(params.speed);
      }
      if (params.colorStart !== undefined || params.colorEnd !== undefined) {
        const currentParams = this.controlPanel.getParams();
        this.nebulaSystem.setColors(currentParams.colorStart, currentParams.colorEnd);
      }
      if (params.rotationMode !== undefined) {
        this.nebulaSystem.setRotationMode(params.rotationMode);
      }
    });
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));

    const deltaTime = this.clock.getDelta();

    this.nebulaSystem.update(deltaTime);

    this.controls.update();

    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    this.nebulaSystem.dispose();
    this.renderer.dispose();
    window.removeEventListener('resize', this.onWindowResize.bind(this));
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new NebulaApplication();
});
