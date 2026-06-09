import * as THREE from 'three';
import { ParticleSystem, PRESSURE_LAYERS } from './particleSystem';
import { OrbitControls } from './controls';

class WindFieldApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private particleSystem: ParticleSystem;
  private controls: OrbitControls;
  private clock: THREE.Clock;
  private container: HTMLElement;
  private layerLabel: HTMLElement;
  private speedNumber: HTMLElement;
  private speedBarMask: HTMLElement;
  private animationId: number = 0;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.layerLabel = document.getElementById('layer-label')!;
    this.speedNumber = document.getElementById('speed-number')!;
    this.speedBarMask = document.getElementById('speed-bar-mask')!;
    this.clock = new THREE.Clock();

    this.scene = this.initScene();
    this.camera = this.initCamera();
    this.renderer = this.initRenderer();
    this.container.appendChild(this.renderer.domElement);

    this.particleSystem = new ParticleSystem(this.scene);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement, {
      onLayerSwitch: (index: number) => this.handleLayerSwitch(index),
      onSpeedChange: (delta: number) => this.handleSpeedChange(delta)
    });

    this.addGlobeReference();
    this.updateUI();

    window.addEventListener('resize', this.onResize);
    this.animate();
  }

  private initScene(): THREE.Scene {
    const scene = new THREE.Scene();
    scene.background = null;
    return scene;
  }

  private initCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );
    camera.position.set(0, 0, 350);
    camera.lookAt(0, 0, 0);
    return camera;
  }

  private initRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    return renderer;
  }

  private addGlobeReference(): void {
    const geometry = new THREE.SphereGeometry(180, 64, 64);
    const material = new THREE.MeshBasicMaterial({
      color: 0x0a1628,
      transparent: true,
      opacity: 0.4,
      wireframe: false
    });
    const globe = new THREE.Mesh(geometry, material);
    this.scene.add(globe);

    const wireframeGeo = new THREE.SphereGeometry(181, 32, 16);
    const wireframeMat = new THREE.MeshBasicMaterial({
      color: 0x1a3a5c,
      wireframe: true,
      transparent: true,
      opacity: 0.15
    });
    const wireframe = new THREE.Mesh(wireframeGeo, wireframeMat);
    this.scene.add(wireframe);
  }

  private handleLayerSwitch(layerIndex: number): void {
    this.particleSystem.switchLayer(layerIndex);
    this.updateUI();
  }

  private handleSpeedChange(delta: number): void {
    const newSpeed = this.particleSystem.getSpeedFactor() + delta;
    this.particleSystem.setSpeedFactor(newSpeed);
  }

  private updateUI(): void {
    const currentLayer = this.particleSystem.getCurrentLayer();
    const layer = PRESSURE_LAYERS[currentLayer];
    this.layerLabel.textContent = layer.name;
  }

  private updateSpeedUI(): void {
    const maxSpeed = this.particleSystem.maxSpeed;
    this.speedNumber.textContent = maxSpeed.toFixed(2);

    const normalizedSpeed = Math.min(maxSpeed / 1.5, 1.0);
    const maskHeight = (1 - normalizedSpeed) * 100;
    this.speedBarMask.style.height = `${maskHeight}%`;
  }

  private onResize = (): void => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();
    this.particleSystem.update(delta);
    this.updateSpeedUI();

    this.renderer.render(this.scene, this.camera);
  };

  public dispose(): void {
    cancelAnimationFrame(this.animationId);
    window.removeEventListener('resize', this.onResize);
    this.particleSystem.dispose();
    this.controls.dispose();
    this.renderer.dispose();
  }
}

let app: WindFieldApp | null = null;

window.addEventListener('DOMContentLoaded', () => {
  app = new WindFieldApp();
});

window.addEventListener('beforeunload', () => {
  if (app) {
    app.dispose();
    app = null;
  }
});
