import * as THREE from 'three';
import { FieldCore } from './core/FieldCore';
import { ParticleSystem } from './core/ParticleSystem';
import { ControlPanel } from './ui/ControlPanel';
import { EventBus } from './events/EventBus';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;
  private fieldCore: FieldCore;
  private particleSystem: ParticleSystem;
  private controlPanel: ControlPanel;

  private cameraAngleY: number = 0;
  private cameraAngleX: number = 0;
  private cameraDistance: number = 10;
  private isDragging: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  private minPitch: number = -Math.PI / 4;
  private maxPitch: number = Math.PI / 4;
  private minDistance: number = 2;
  private maxDistance: number = 15;

  private clock: THREE.Clock;
  private particleCountEl: HTMLElement;
  private fpsCounterEl: HTMLElement;
  private frameCount: number = 0;
  private fpsTime: number = 0;
  private currentFps: number = 0;
  private performanceDegraded: boolean = false;
  private fpsCheckInterval: number = 0;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.particleCountEl = document.getElementById('particle-count')!;
    this.fpsCounterEl = document.getElementById('fps-counter')!;

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.updateCameraPosition();

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0);
    this.container.appendChild(this.renderer.domElement);

    this.fieldCore = new FieldCore();
    this.scene.add(this.fieldCore.getObject3D());

    this.particleSystem = new ParticleSystem(this.scene, this.fieldCore);

    this.controlPanel = new ControlPanel();
    this.fieldCore.setIntensity(this.controlPanel.getIntensity());
    this.fieldCore.setColorSpeed(this.controlPanel.getColorSpeed());

    this.clock = new THREE.Clock();

    this.setupEventListeners();
    this.animate();
  }

  private updateCameraPosition(): void {
    const x = this.cameraDistance * Math.sin(this.cameraAngleY) * Math.cos(this.cameraAngleX);
    const y = this.cameraDistance * Math.sin(this.cameraAngleX);
    const z = this.cameraDistance * Math.cos(this.cameraAngleY) * Math.cos(this.cameraAngleX);
    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 0, 0);
  }

  private setupEventListeners(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const deltaX = e.clientX - this.lastMouseX;
      const deltaY = e.clientY - this.lastMouseY;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;

      this.cameraAngleY -= deltaX * 0.005;
      this.cameraAngleX += deltaY * 0.005;
      this.cameraAngleX = Math.max(this.minPitch, Math.min(this.maxPitch, this.cameraAngleX));
      this.updateCameraPosition();
    });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY * 0.01;
      this.cameraDistance += delta;
      this.cameraDistance = Math.max(this.minDistance, Math.min(this.maxDistance, this.cameraDistance));
      this.updateCameraPosition();
    }, { passive: false });

    canvas.addEventListener('click', (e) => {
      this.particleSystem.handleClick(e, this.camera);
    });

    window.addEventListener('resize', () => {
      this.onWindowResize();
    });

    EventBus.on('intensityChanged', (value: number) => {
      this.fieldCore.setIntensity(value);
    });

    EventBus.on('colorSpeedChanged', (value: number) => {
      this.fieldCore.setColorSpeed(value);
    });
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.fieldCore.updateWindowSize(window.innerWidth, window.innerHeight);
    this.particleSystem.rebuild();
  }

  private updateFPS(deltaTime: number): void {
    this.frameCount++;
    this.fpsTime += deltaTime;
    this.fpsCheckInterval += deltaTime;

    if (this.fpsTime >= 0.5) {
      this.currentFps = Math.round(this.frameCount / this.fpsTime);
      this.fpsCounterEl.textContent = this.currentFps.toString();
      this.frameCount = 0;
      this.fpsTime = 0;
    }

    if (this.fpsCheckInterval >= 3 && !this.performanceDegraded) {
      if (this.currentFps < 45 && this.currentFps > 0) {
        this.performanceDegraded = true;
        this.fieldCore.applyPerformanceDegradation();
        this.particleSystem.rebuild();
      }
      this.fpsCheckInterval = 0;
    }
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const deltaTime = Math.min(this.clock.getDelta(), 0.1);

    this.fieldCore.update(deltaTime);
    this.particleSystem.update(deltaTime);

    this.updateFPS(deltaTime);

    const activeParticles = this.particleSystem.getActiveParticleCount();
    const totalParticles = this.particleSystem.getTotalParticleCount();
    this.particleCountEl.textContent = `${activeParticles} / ${totalParticles}`;

    this.renderer.render(this.scene, this.camera);
  };
}

new App();
