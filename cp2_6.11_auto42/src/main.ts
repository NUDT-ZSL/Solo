import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MeteorParticleSystem, type MeteorConfig } from './particleSystem';
import { UIControls } from './uiControls';

const BURST_DURATION = 3.0;
const BURST_MULTIPLIER = 2;

class App {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private clock: THREE.Clock;
  private loadingOverlay: HTMLElement;
  private fpsCounter: HTMLElement;

  private particleSystem!: MeteorParticleSystem;
  private uiControls!: UIControls;

  private currentConfig: MeteorConfig = {
    density: 15,
    direction: 270,
    speed: 15
  };

  private burstActive = false;
  private burstRemaining = 0;
  private baseDensity = 15;

  private frameCount = 0;
  private fpsElapsed = 0;
  private currentFps = 0;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.loadingOverlay = document.getElementById('loading-overlay')!;
    this.fpsCounter = document.getElementById('fps-counter')!;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 5, 60);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0);
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 0, 0);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 15;
    this.controls.maxDistance = 150;
    this.controls.enablePan = false;

    this.clock = new THREE.Clock();

    this.init();
  }

  private init(): void {
    this.setupStars();
    this.setupLights();

    this.particleSystem = new MeteorParticleSystem(this.scene, this.currentConfig);
    this.baseDensity = this.currentConfig.density;

    this.uiControls = new UIControls(
      (partial) => this.updateConfig(partial),
      () => this.triggerBurst()
    );

    window.addEventListener('resize', () => this.onResize());

    setTimeout(() => {
      this.loadingOverlay.classList.add('hidden');
      setTimeout(() => {
        this.loadingOverlay.style.display = 'none';
      }, 600);
    }, 500);

    this.animate();
  }

  private setupStars(): void {
    const starCount = 1500;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const radius = 80 + Math.random() * 120;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      const brightness = 0.4 + Math.random() * 0.6;
      colors[i * 3] = brightness;
      colors[i * 3 + 1] = brightness;
      colors[i * 3 + 2] = brightness * (0.8 + Math.random() * 0.2);
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true
    });

    const stars = new THREE.Points(geometry, material);
    this.scene.add(stars);
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0x1a1a3a, 0.3);
    this.scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xff8c00, 0.5, 100);
    pointLight.position.set(0, 20, 0);
    this.scene.add(pointLight);
  }

  public updateConfig(partial: Partial<MeteorConfig>): void {
    if (partial.density !== undefined) {
      this.currentConfig.density = partial.density;
      this.baseDensity = partial.density;
      if (this.burstActive) {
        this.particleSystem.updateConfig({
          ...this.currentConfig,
          density: this.baseDensity * BURST_MULTIPLIER
        });
      } else {
        this.particleSystem.updateConfig(this.currentConfig);
      }
    } else {
      Object.assign(this.currentConfig, partial);
      if (this.burstActive) {
        this.particleSystem.updateConfig({
          ...this.currentConfig,
          density: this.baseDensity * BURST_MULTIPLIER
        });
      } else {
        this.particleSystem.updateConfig(this.currentConfig);
      }
    }
  }

  private triggerBurst(): void {
    if (!this.burstActive) {
      this.burstActive = true;
      this.burstRemaining = BURST_DURATION;
      this.particleSystem.updateConfig({
        ...this.currentConfig,
        density: this.baseDensity * BURST_MULTIPLIER
      });
    } else {
      this.burstRemaining = BURST_DURATION;
    }
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private updateFpsCounter(dt: number): void {
    this.frameCount++;
    this.fpsElapsed += dt;

    if (this.fpsElapsed >= 0.5) {
      this.currentFps = Math.round(this.frameCount / this.fpsElapsed);
      const meteorCount = this.particleSystem.getActiveMeteorCount();
      const debrisCount = this.particleSystem.getActiveDebrisCount();
      this.fpsCounter.textContent = `FPS: ${this.currentFps} | 流星: ${meteorCount} | 碎片: ${debrisCount}`;
      this.frameCount = 0;
      this.fpsElapsed = 0;
    }
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const dt = Math.min(this.clock.getDelta(), 0.05);
    const time = this.clock.getElapsedTime();

    this.updateFpsCounter(dt);

    if (this.burstActive) {
      this.burstRemaining -= dt;
      if (this.burstRemaining <= 0) {
        this.burstActive = false;
        this.burstRemaining = 0;
        this.particleSystem.updateConfig({
          ...this.currentConfig,
          density: this.baseDensity
        });
      }
    }

    this.controls.update();
    this.particleSystem.update(dt, time);
    this.renderer.render(this.scene, this.camera);
  };
}

new App();
