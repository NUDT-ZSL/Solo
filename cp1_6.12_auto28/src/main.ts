import * as THREE from 'three';
import { ParticleSystem } from './particleSystem';
import { Controls } from './controls';
import { UI } from './ui';

class StarForge {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private particleSystem: ParticleSystem;
  private controls: Controls;
  private ui: UI;
  private clock: THREE.Clock;
  private backgroundMesh: THREE.Mesh;

  constructor() {
    const container = document.getElementById('canvas-container')!;

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      2000,
    );
    this.camera.position.set(0, 120, 350);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 1);
    container.appendChild(this.renderer.domElement);

    this.backgroundMesh = this.createBackground();
    this.scene.add(this.backgroundMesh);

    this.particleSystem = new ParticleSystem(5000);
    this.scene.add(this.particleSystem.points);

    this.controls = new Controls(this.camera, this.renderer.domElement, this.particleSystem);

    this.ui = new UI(this.particleSystem, this.controls);

    this.clock = new THREE.Clock();

    window.addEventListener('resize', this.onResize.bind(this));

    this.animate();
  }

  private createBackground(): THREE.Mesh {
    const bgGeo = new THREE.SphereGeometry(900, 32, 32);
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 360);
    gradient.addColorStop(0, '#0a0a2e');
    gradient.addColorStop(0.5, '#060618');
    gradient.addColorStop(1, '#000000');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const bgMat = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.BackSide,
    });

    return new THREE.Mesh(bgGeo, bgMat);
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));

    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    this.particleSystem.update(delta);
    this.controls.update(performance.now());

    this.backgroundMesh.rotation.y = elapsed * 0.005;

    this.renderer.render(this.scene, this.camera);
  }
}

function bootstrap(): void {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new StarForge(), { once: true });
  } else {
    new StarForge();
  }
}

bootstrap();
