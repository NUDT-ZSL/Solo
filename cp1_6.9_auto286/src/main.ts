import * as THREE from 'three';
import { ParticleSystem } from './particleSystem';
import { InteractionManager } from './interaction';

class App {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private particleSystem: ParticleSystem;
  private interaction: InteractionManager;
  private clock: THREE.Clock;
  private animationId: number | null = null;
  private rotationY = 0;
  private autoRotateSpeed = 0.0003;

  constructor() {
    this.container = document.getElementById('app') as HTMLElement;
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();

    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 10000);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0);
    this.container.appendChild(this.renderer.domElement);

    this.particleSystem = new ParticleSystem();
    this.scene.add(this.particleSystem.group);

    this.interaction = new InteractionManager(
      this.container,
      this.camera,
      this.particleSystem,
      {
        onRotationChange: (deltaY: number) => {
          this.rotationY += deltaY;
        },
        onFlowSpeedChange: (speed: number) => {
          this.particleSystem.setFlowSpeed(speed);
        },
        onClickSphere: (worldPoint: THREE.Vector3) => {
          this.particleSystem.triggerRipple(worldPoint);
          this.particleSystem.startClustering(worldPoint);
        },
        onZoomChange: (_zoom: number) => {
        },
      }
    );

    window.addEventListener('resize', this.onResize);
    this.start();
  }

  private onResize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private start() {
    const animate = () => {
      this.animationId = requestAnimationFrame(animate);
      const dt = Math.min(0.05, this.clock.getDelta());

      this.rotationY += this.autoRotateSpeed * dt * 60;
      this.particleSystem.group.rotation.y = this.rotationY;

      this.interaction.update(dt);
      this.particleSystem.update(dt);

      this.renderer.render(this.scene, this.camera);
    };
    animate();
  }

  public dispose() {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    window.removeEventListener('resize', this.onResize);
    this.interaction.dispose();
    this.particleSystem.dispose();
    this.renderer.dispose();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
