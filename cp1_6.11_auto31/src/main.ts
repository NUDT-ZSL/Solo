import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { AudioAnalyzer, RecordState } from './audioAnalyzer';
import { ParticleRingSystem } from './particleRing';
import { Controls } from './controls';

class App {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private orbitControls: OrbitControls;
  private particleSystem: ParticleRingSystem;
  private audioAnalyzer: AudioAnalyzer;
  private controls: Controls;
  private clock: THREE.Clock;
  private spectrumCanvas: HTMLCanvasElement;
  private spectrumCtx: CanvasRenderingContext2D;
  private isResetting: boolean = false;
  private resetStartTime: number = 0;
  private resetDuration: number = 500;
  private resetFromPos: THREE.Vector3 = new THREE.Vector3();
  private readonly initialCameraPos = new THREE.Vector3(0, 50, 200);
  private readonly initialTarget = new THREE.Vector3(0, 0, 0);
  private currentFrequencyBands: number[] = [];
  private ringCount: number = 5;

  constructor() {
    const canvas = document.getElementById('scene') as HTMLCanvasElement;
    this.spectrumCanvas = document.getElementById('spectrum-preview') as HTMLCanvasElement;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x0a0a1a, 1);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x0a0a1a, 0.003);

    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 2000);
    this.camera.position.copy(this.initialCameraPos);
    this.camera.lookAt(this.initialTarget);

    this.orbitControls = new OrbitControls(this.camera, canvas);
    this.orbitControls.enableDamping = true;
    this.orbitControls.dampingFactor = 0.08;
    this.orbitControls.target.copy(this.initialTarget);
    this.orbitControls.update();

    this.addAmbientEffects();

    this.particleSystem = new ParticleRingSystem(this.scene);
    this.particleSystem.setRingCount(this.ringCount);
    this.particleSystem.setParticleCount(150);

    this.audioAnalyzer = new AudioAnalyzer();
    this.controls = new Controls();
    this.clock = new THREE.Clock();

    this.spectrumCtx = this.spectrumCanvas.getContext('2d')!;
    this.spectrumCanvas.style.display = 'none';

    this.setupCallbacks();
    this.handleResize();
    window.addEventListener('resize', () => this.handleResize());

    this.animate();
  }

  private addAmbientEffects(): void {
    const ambientLight = new THREE.AmbientLight(0x111133, 0.5);
    this.scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x00bfff, 1, 500);
    pointLight.position.set(0, 100, 0);
    this.scene.add(pointLight);

    const starGeometry = new THREE.BufferGeometry();
    const starCount = 800;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      starPositions[i * 3] = (Math.random() - 0.5) * 1200;
      starPositions[i * 3 + 1] = (Math.random() - 0.5) * 800;
      starPositions[i * 3 + 2] = (Math.random() - 0.5) * 1200;
    }
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMaterial = new THREE.PointsMaterial({
      size: 1.2,
      color: 0x444466,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: true,
    });
    const stars = new THREE.Points(starGeometry, starMaterial);
    this.scene.add(stars);
  }

  private setupCallbacks(): void {
    this.audioAnalyzer.onStateChangeCallback((state: RecordState) => {
      this.controls.setRecordState(state);
      if (state === 'recording') {
        this.spectrumCanvas.style.display = 'block';
      } else {
        this.spectrumCanvas.style.display = 'none';
      }
    });

    this.audioAnalyzer.onSpectrumCallback((data: Uint8Array) => {
      this.drawSpectrumPreview(data);
    });

    this.controls.onRecordCallback(() => {
      const state = this.audioAnalyzer.getState();
      switch (state) {
        case 'idle':
          this.audioAnalyzer.startRecording();
          break;
        case 'recording':
          this.audioAnalyzer.stopRecording();
          setTimeout(() => {
            this.generateSculpture();
          }, 100);
          break;
        case 'redo':
          this.audioAnalyzer.reset();
          this.currentFrequencyBands = [];
          this.particleSystem.setFrequencyBands([]);
          this.audioAnalyzer.startRecording();
          break;
      }
    });

    this.controls.onParamsChangeCallback((params) => {
      this.ringCount = params.ringCount;
      this.particleSystem.setParticleCount(params.particleDensity);
      this.particleSystem.setRingCount(params.ringCount);
      this.audioAnalyzer.setRingCount(params.ringCount);
      if (this.currentFrequencyBands.length > 0) {
        const bands = this.recalculateBands(this.ringCount);
        this.particleSystem.setFrequencyBands(bands);
      }
    });

    this.controls.onResetCameraCallback(() => {
      this.startCameraReset();
    });
  }

  private async generateSculpture(): Promise<void> {
    const bands = this.audioAnalyzer.getFrequencyBandsFromBuffer(this.ringCount);
    this.currentFrequencyBands = bands;
    this.particleSystem.setFrequencyBands(bands);
  }

  private recalculateBands(ringCount: number): number[] {
    if (!this.audioAnalyzer.hasRecordedData()) return new Array(ringCount).fill(0);
    return this.audioAnalyzer.getFrequencyBandsFromBuffer(ringCount);
  }

  private drawSpectrumPreview(data: Uint8Array): void {
    const canvas = this.spectrumCanvas;
    const ctx = this.spectrumCtx;
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    const barCount = data.length;
    const angleStep = (Math.PI * 2) / barCount;
    const cx = w / 2;
    const cy = h / 2;
    const baseRadius = Math.min(w, h) * 0.42;
    const maxBarHeight = Math.min(w, h) * 0.08;

    for (let i = 0; i < barCount; i++) {
      const angle = i * angleStep - Math.PI / 2;
      const amplitude = data[i] / 255;
      const barHeight = amplitude * maxBarHeight;

      const x1 = cx + baseRadius * Math.cos(angle);
      const y1 = cy + baseRadius * Math.sin(angle);
      const x2 = cx + (baseRadius + barHeight) * Math.cos(angle);
      const y2 = cy + (baseRadius + barHeight) * Math.sin(angle);

      const t = i / barCount;
      let r: number, g: number, b: number;
      if (t < 0.5) {
        const s = t * 2;
        r = Math.floor(0 + s * 0);
        g = Math.floor(0 + s * 191);
        b = Math.floor(139 + s * 116);
      } else {
        const s = (t - 0.5) * 2;
        r = Math.floor(255);
        g = Math.floor(69 + s * 148);
        b = Math.floor(0);
      }

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = `rgba(${r},${g},${b},0.7)`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  private startCameraReset(): void {
    this.isResetting = true;
    this.resetStartTime = performance.now();
    this.resetFromPos.copy(this.camera.position);
    this.orbitControls.enabled = false;
  }

  private updateCameraReset(): void {
    if (!this.isResetting) return;

    const elapsed = performance.now() - this.resetStartTime;
    let t = Math.min(elapsed / this.resetDuration, 1);
    t = 1 - Math.pow(1 - t, 3);

    this.camera.position.lerpVectors(this.resetFromPos, this.initialCameraPos, t);
    this.orbitControls.target.lerp(this.initialTarget, t * 0.15);
    this.orbitControls.update();

    if (t >= 1) {
      this.isResetting = false;
      this.orbitControls.target.copy(this.initialTarget);
      this.orbitControls.enabled = true;
      this.orbitControls.update();
    }
  }

  private handleResize(): void {
    const viewport = document.getElementById('viewport')!;
    const w = viewport.clientWidth;
    const h = viewport.clientHeight;

    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);

    this.spectrumCanvas.width = w;
    this.spectrumCanvas.height = h;
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();
    const clampedDelta = Math.min(delta, 0.05);

    this.updateCameraReset();
    this.particleSystem.update(clampedDelta);

    if (!this.isResetting) {
      this.orbitControls.update();
    }

    this.renderer.render(this.scene, this.camera);
  }
}

new App();
