import * as THREE from 'three';
import { Nebula, NebulaConfig } from './nebula';
import { Controls } from './controls';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private nebula: Nebula;
  private controls: Controls;
  private clock: THREE.Clock;
  private container: HTMLElement;

  private statsEl: {
    fps: HTMLElement;
    particles: HTMLElement;
    rotation: HTMLElement;
  };

  private frameCount: number = 0;
  private lastStatsUpdate: number = 0;
  private currentFps: number = 0;

  constructor() {
    this.container = document.getElementById('app')!;
    this.clock = new THREE.Clock();

    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();
    this.container.appendChild(this.renderer.domElement);

    this.renderer.domElement.style.cursor = 'grab';

    const nebulaConfig: NebulaConfig = {
      particleCount: 15000,
      colorStops: [
        { position: -1, color: 0x9B59B6 },
        { position: 0, color: 0x3498DB },
        { position: 1, color: 0xE91E63 }
      ],
      driftSpeed: 0.01
    };
    this.nebula = new Nebula(nebulaConfig);
    this.scene.add(this.nebula.points);

    this.controls = new Controls(this.camera, this.renderer.domElement);

    this.statsEl = {
      fps: document.getElementById('stat-fps')!,
      particles: document.getElementById('stat-particles')!,
      rotation: document.getElementById('stat-rotation')!
    };

    this.setupUI();
    this.setupResize();
    this.hideLoading();

    this.statsEl.particles.textContent = this.nebula.getParticleCount().toLocaleString();

    this.animate = this.animate.bind(this);
    this.animate();
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    return scene;
  }

  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 2, 12);
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
    return renderer;
  }

  private setupUI(): void {
    const rotationSlider = document.getElementById('slider-rotation') as HTMLInputElement;
    const driftSlider = document.getElementById('slider-drift') as HTMLInputElement;
    const sizeSlider = document.getElementById('slider-size') as HTMLInputElement;

    const rotationVal = document.getElementById('val-rotation')!;
    const driftVal = document.getElementById('val-drift')!;
    const sizeVal = document.getElementById('val-size')!;

    rotationSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      rotationVal.textContent = value.toFixed(3);
      this.nebula.setRotationSpeed(value);
    });

    driftSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      driftVal.textContent = value.toFixed(2);
      this.nebula.setDriftAmplitude(value);
    });

    sizeSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      sizeVal.textContent = value.toFixed(1);
      this.nebula.setSizeScale(value);
    });

    const mobileToggle = document.getElementById('mobile-toggle')!;
    const controlPanel = document.getElementById('control-panel')!;

    mobileToggle.addEventListener('click', () => {
      controlPanel.classList.toggle('hidden-mobile');
    });
  }

  private setupResize(): void {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  private hideLoading(): void {
    const loading = document.getElementById('loading');
    if (loading) {
      setTimeout(() => {
        loading.classList.add('hidden');
        setTimeout(() => loading.remove(), 600);
      }, 300);
    }
  }

  private updateStats(currentTime: number): void {
    this.frameCount++;

    if (currentTime - this.lastStatsUpdate >= 1000) {
      this.currentFps = this.frameCount;
      this.frameCount = 0;
      this.lastStatsUpdate = currentTime;

      this.statsEl.fps.textContent = this.currentFps.toString();
      this.statsEl.rotation.textContent = this.nebula.getRotationDegrees().toFixed(1) + '°';
    }
  }

  private animate(): void {
    requestAnimationFrame(this.animate);

    const delta = Math.min(this.clock.getDelta(), 0.1);

    this.nebula.update(delta);
    this.controls.update(delta);

    this.renderer.render(this.scene, this.camera);

    this.updateStats(performance.now());
  }

  public dispose(): void {
    this.nebula.dispose();
    this.controls.dispose();
    this.renderer.dispose();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
