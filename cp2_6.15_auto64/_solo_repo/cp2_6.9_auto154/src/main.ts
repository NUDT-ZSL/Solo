import * as THREE from 'three';
import { NebulaSystem, ColorTheme } from './nebula';
import { InteractionControls } from './controls';

class NebulaApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private nebula: NebulaSystem;
  private controls: InteractionControls;
  private clock: THREE.Clock;
  private container: HTMLElement;
  private animationId: number = 0;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );
    this.camera.position.set(0, 50, 150);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 1);
    this.container.appendChild(this.renderer.domElement);

    this.nebula = new NebulaSystem(20000);
    this.scene.add(this.nebula.points);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    this.controls = new InteractionControls(this.camera, this.renderer.domElement, {
      onThemeChange: (theme: ColorTheme) => this.nebula.setColorTheme(theme),
      onSizeChange: (size: number) => this.nebula.setParticleSize(size),
      onSpeedChange: (speed: number) => this.nebula.setRotationSpeed(speed),
      onParticleCountChange: (delta: number) => this.nebula.adjustParticleCount(delta)
    });

    window.addEventListener('resize', this.onResize.bind(this));

    this.showControlPanel();
  }

  private showControlPanel(): void {
    const panel = document.getElementById('control-panel');
    if (panel) {
      requestAnimationFrame(() => {
        panel.classList.remove('hidden');
      });
    }
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(this.animate.bind(this));

    const elapsedTime = this.clock.getElapsedTime() * 60;

    this.nebula.update(elapsedTime);
    this.controls.update();

    this.renderer.render(this.scene, this.camera);
  }

  public start(): void {
    this.animate();
  }

  public dispose(): void {
    cancelAnimationFrame(this.animationId);
    this.controls.dispose();
    this.nebula.dispose();
    this.renderer.dispose();
    window.removeEventListener('resize', this.onResize.bind(this));
  }
}

const app = new NebulaApp();
app.start();
