import * as THREE from 'three';
import { AudioAnalyzer, type SpectrumData } from './audioAnalyzer';
import { ParticleSystem } from './particleSystem';

class App {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;
  private audioAnalyzer: AudioAnalyzer;
  private particleSystem: ParticleSystem | null = null;
  private pendingParticleSystem: ParticleSystem | null = null;
  private fadingOut: boolean = false;

  private cameraDistance: number = 25;
  private cameraTheta: number = 0;
  private cameraPhi: number = Math.PI / 4;
  private targetTheta: number = 0;
  private targetPhi: number = Math.PI / 4;
  private targetDistance: number = 25;
  private readonly defaultTheta: number = 0;
  private readonly defaultPhi: number = Math.PI / 4;
  private readonly defaultDistance: number = 25;

  private isDragging: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;

  private spectrumBarsContainer: HTMLElement;
  private spectrumBarElements: HTMLDivElement[] = [];
  private progressFill: HTMLElement;
  private progressBar: HTMLElement;
  private currentTimeEl: HTMLElement;
  private durationEl: HTMLElement;
  private statusEl: HTMLElement;
  private fileInput: HTMLInputElement;
  private uploadBtn: HTMLElement;

  private animationFrameId: number = 0;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.spectrumBarsContainer = document.getElementById('spectrum-bars')!;
    this.progressFill = document.getElementById('progress-fill')!;
    this.progressBar = document.getElementById('progress-bar')!;
    this.currentTimeEl = document.getElementById('current-time')!;
    this.durationEl = document.getElementById('duration')!;
    this.statusEl = document.getElementById('status')!;
    this.fileInput = document.getElementById('file-input') as HTMLInputElement;
    this.uploadBtn = document.getElementById('upload-btn')!;

    this.scene = new THREE.Scene();
    this.scene.background = null;

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

    this.clock = new THREE.Clock();
    this.audioAnalyzer = new AudioAnalyzer();

    this.setupFog();
    this.setupSpectrumBars();
    this.setupEventListeners();
    this.createInitialParticleSystem();

    this.animate();
  }

  private setupFog(): void {
    const fogColor = new THREE.Color(0x0B0B2B);
    this.scene.fog = new THREE.Fog(fogColor, 30, 50);
  }

  private setupSpectrumBars(): void {
    const barCount = 32;
    for (let i = 0; i < barCount; i++) {
      const bar = document.createElement('div');
      bar.className = 'spectrum-bar';
      this.spectrumBarsContainer.appendChild(bar);
      this.spectrumBarElements.push(bar);
    }
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onWindowResize.bind(this));

    this.renderer.domElement.addEventListener('mousedown', this.onMouseDown.bind(this));
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
    window.addEventListener('mouseup', this.onMouseUp.bind(this));

    this.renderer.domElement.addEventListener('wheel', this.onWheel.bind(this), { passive: false });

    window.addEventListener('keydown', this.onKeyDown.bind(this));

    this.uploadBtn.addEventListener('click', () => this.fileInput.click());
    this.fileInput.addEventListener('change', this.onFileSelected.bind(this));

    this.progressBar.addEventListener('click', this.onProgressClick.bind(this));
  }

  private createInitialParticleSystem(): void {
    this.particleSystem = new ParticleSystem({ count: 3000, radius: 20 });
    this.particleSystem.addToScene(this.scene);
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private onMouseDown(e: MouseEvent): void {
    this.isDragging = true;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.isDragging) return;

    const deltaX = e.clientX - this.lastMouseX;
    const deltaY = e.clientY - this.lastMouseY;

    this.targetTheta -= deltaX * 0.005;

    this.targetPhi -= deltaY * 0.005;
    const minPhi = Math.PI / 4;
    const maxPhi = (3 * Math.PI) / 4;
    this.targetPhi = Math.max(minPhi, Math.min(maxPhi, this.targetPhi));

    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
  }

  private onMouseUp(): void {
    this.isDragging = false;
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();

    const delta = e.deltaY * 0.01;
    this.targetDistance += delta;
    this.targetDistance = Math.max(5, Math.min(40, this.targetDistance));
  }

  private onKeyDown(e: KeyboardEvent): void {
    switch (e.code) {
      case 'Space':
        e.preventDefault();
        if (this.particleSystem) {
          this.particleSystem.togglePause();
          const status = this.particleSystem.isPaused() ? '已暂停' : '运行中';
          if (!this.audioAnalyzer.audio) {
            this.statusEl.textContent = `粒子系统：${status}`;
          }
        }
        break;

      case 'KeyR':
        this.targetTheta = this.defaultTheta;
        this.targetPhi = this.defaultPhi;
        this.targetDistance = this.defaultDistance;
        break;

      case 'ArrowUp':
        e.preventDefault();
        if (this.particleSystem) {
          const newOpacity = this.particleSystem.getOpacity() + 0.1;
          this.particleSystem.setOpacity(newOpacity);
        }
        break;

      case 'ArrowDown':
        e.preventDefault();
        if (this.particleSystem) {
          const newOpacity = this.particleSystem.getOpacity() - 0.1;
          this.particleSystem.setOpacity(newOpacity);
        }
        break;
    }
  }

  private onFileSelected(e: Event): void {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    this.statusEl.textContent = `正在加载：${file.name}...`;

    this.switchParticleSystem();

    this.audioAnalyzer
      .loadFile(file)
      .then(() => {
        return this.audioAnalyzer.play();
      })
      .then(() => {
        this.statusEl.textContent = `正在播放：${file.name}`;
      })
      .catch((err) => {
        console.error('音频加载失败:', err);
        this.statusEl.textContent = '加载失败，请重试';
      });

    input.value = '';
  }

  private switchParticleSystem(): void {
    if (!this.particleSystem) return;

    if (this.fadingOut && this.pendingParticleSystem) {
      this.pendingParticleSystem.removeFromScene(this.scene);
      this.pendingParticleSystem.dispose();
      this.pendingParticleSystem = null;
    }

    this.fadingOut = true;
    this.particleSystem.fadeOut(1.0);

    const newSystem = new ParticleSystem({ count: 3000, radius: 20 });
    newSystem.material.opacity = 0;
    newSystem.addToScene(this.scene);
    this.pendingParticleSystem = newSystem;
  }

  private checkFadeComplete(): void {
    if (!this.fadingOut || !this.particleSystem || !this.pendingParticleSystem) return;

    if (this.particleSystem.isFadedOut()) {
      this.particleSystem.removeFromScene(this.scene);
      this.particleSystem.dispose();
      this.particleSystem = this.pendingParticleSystem;
      this.pendingParticleSystem = null;
      this.particleSystem.fadeIn(1.0);
      this.fadingOut = false;
    }
  }

  private onProgressClick(e: MouseEvent): void {
    if (!this.audioAnalyzer.audio || !this.audioAnalyzer.duration) return;

    const rect = this.progressBar.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = x / rect.width;
    const time = ratio * this.audioAnalyzer.duration;
    this.audioAnalyzer.seek(time);
  }

  private updateCameraPosition(): void {
    const r = this.cameraDistance;
    const theta = this.cameraTheta;
    const phi = this.cameraPhi;

    this.camera.position.x = r * Math.sin(phi) * Math.cos(theta);
    this.camera.position.y = r * Math.cos(phi);
    this.camera.position.z = r * Math.sin(phi) * Math.sin(theta);

    this.camera.lookAt(0, 0, 0);
  }

  private interpolateCamera(deltaTime: number): void {
    const lerpFactor = 1 - Math.pow(0.001, deltaTime);

    this.cameraTheta += (this.targetTheta - this.cameraTheta) * lerpFactor;
    this.cameraPhi += (this.targetPhi - this.cameraPhi) * lerpFactor;
    this.cameraDistance += (this.targetDistance - this.cameraDistance) * lerpFactor;

    this.updateCameraPosition();
  }

  private updateSpectrumUI(spectrum: SpectrumData): void {
    for (let i = 0; i < this.spectrumBarElements.length; i++) {
      const bar = this.spectrumBarElements[i];
      const value = spectrum.bars[i] ?? 0;
      const height = Math.max(2, value * 80);
      bar.style.height = `${height}px`;
    }
  }

  private updateProgressUI(): void {
    const current = this.audioAnalyzer.currentTime;
    const duration = this.audioAnalyzer.duration;

    if (duration > 0) {
      const progress = (current / duration) * 100;
      this.progressFill.style.width = `${progress}%`;
      this.currentTimeEl.textContent = this.formatTime(current);
      this.durationEl.textContent = this.formatTime(duration);
    }
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  private animate(): void {
    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));

    const deltaTime = Math.min(this.clock.getDelta(), 0.1);
    const elapsedTime = this.clock.getElapsedTime();

    this.interpolateCamera(deltaTime);

    const spectrum = this.audioAnalyzer.getSpectrum();

    if (this.particleSystem) {
      this.particleSystem.update(deltaTime, elapsedTime, spectrum.bands);
    }

    if (this.pendingParticleSystem) {
      this.pendingParticleSystem.update(deltaTime, elapsedTime, spectrum.bands);
    }

    this.checkFadeComplete();

    this.updateSpectrumUI(spectrum);
    this.updateProgressUI();

    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    cancelAnimationFrame(this.animationFrameId);

    window.removeEventListener('resize', this.onWindowResize.bind(this));
    window.removeEventListener('mousemove', this.onMouseMove.bind(this));
    window.removeEventListener('mouseup', this.onMouseUp.bind(this));
    window.removeEventListener('keydown', this.onKeyDown.bind(this));

    if (this.particleSystem) {
      this.particleSystem.removeFromScene(this.scene);
      this.particleSystem.dispose();
    }

    if (this.pendingParticleSystem) {
      this.pendingParticleSystem.removeFromScene(this.scene);
      this.pendingParticleSystem.dispose();
    }

    this.audioAnalyzer.dispose();
    this.renderer.dispose();
  }
}

let app: App | null = null;

window.addEventListener('DOMContentLoaded', () => {
  app = new App();
});

window.addEventListener('beforeunload', () => {
  if (app) {
    app.dispose();
    app = null;
  }
});
