import * as THREE from 'three';
import { AudioProcessor } from './audioProcessor';
import { TerrainGenerator, ColorTheme } from './terrainGenerator';
import { ParticleSystem } from './particleSystem';
import { UIController } from './uiController';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private audioProcessor: AudioProcessor;
  private terrainGenerator: TerrainGenerator;
  private particleSystem: ParticleSystem;
  private uiController: UIController;
  private waveformCanvas: HTMLCanvasElement;
  private waveformCtx: CanvasRenderingContext2D;
  private container: HTMLElement;
  private clock: THREE.Clock;
  private frameCount: number = 0;
  private lastFpsTime: number = 0;
  private fpsCounter: HTMLElement;
  private animationId: number | null = null;
  private isRunning: boolean = false;
  private isPaused: boolean = false;

  constructor() {
    this.container = document.getElementById('canvas-container') as HTMLElement;
    this.waveformCanvas = document.getElementById('waveform-canvas') as HTMLCanvasElement;
    this.waveformCtx = this.waveformCanvas.getContext('2d') as CanvasRenderingContext2D;
    this.fpsCounter = document.getElementById('fps-counter') as HTMLElement;
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 12, 18);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0);
    this.container.appendChild(this.renderer.domElement);

    this.setupLights();
    this.setupStars();

    this.audioProcessor = new AudioProcessor();
    this.terrainGenerator = new TerrainGenerator(this.scene);
    this.particleSystem = new ParticleSystem(this.scene, this.camera, 300);
    this.uiController = new UIController();

    this.bindEvents();
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    this.scene.add(directionalLight);

    const pointLight1 = new THREE.PointLight(0x6366f1, 0.5, 50);
    pointLight1.position.set(-10, 5, -10);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xa855f7, 0.5, 50);
    pointLight2.position.set(10, 5, 10);
    this.scene.add(pointLight2);
  }

  private setupStars(): void {
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 1000;
    const positions = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const radius = 50 + Math.random() * 50;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.cos(phi) * 0.5 + 10;
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }

    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const starMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.1,
      transparent: true,
      opacity: 0.6
    });

    const stars = new THREE.Points(starGeometry, starMaterial);
    this.scene.add(stars);
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => this.onResize());

    this.uiController.onStart(() => {
      this.start();
    });

    this.uiController.onGainChange((value: number) => {
      this.audioProcessor.setGain(value);
    });

    this.uiController.onRotationSpeedChange((value: number) => {
      this.terrainGenerator.setRotationSpeed(value);
    });

    this.uiController.onParticleCountChange((value: number) => {
      this.particleSystem.setCount(value);
    });

    this.uiController.onThemeChange((theme: ColorTheme) => {
      this.terrainGenerator.setColorTheme(theme);
      this.particleSystem.setColorTheme(theme);
    });

    this.container.addEventListener('mousemove', (e: MouseEvent) => {
      const rect = this.container.getBoundingClientRect();
      this.particleSystem.setMousePosition(e.clientX, e.clientY, rect);
    });

    this.container.addEventListener('mouseenter', () => {
      this.particleSystem.setMouseActive(true);
    });

    this.container.addEventListener('mouseleave', () => {
      this.particleSystem.setMouseActive(false);
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.isPaused = true;
      } else {
        this.isPaused = false;
        this.audioProcessor.resume();
      }
    });
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  async start(): Promise<void> {
    try {
      await this.audioProcessor.init();
      this.uiController.hideStartOverlay();
      this.isRunning = true;
      this.animate();
    } catch (error) {
      this.uiController.showStartError('无法访问麦克风，请检查权限设置');
      console.error('启动失败:', error);
    }
  }

  private animate(): void {
    if (!this.isRunning) return;

    this.animationId = requestAnimationFrame(() => this.animate());

    if (this.isPaused) return;

    const time = this.clock.getElapsedTime();
    const frequencyData = this.audioProcessor.getFrequencyData();
    const volume = this.audioProcessor.getVolume();

    this.terrainGenerator.update(frequencyData, volume, time);
    this.particleSystem.update(volume, frequencyData, time);

    this.renderer.render(this.scene, this.camera);

    this.drawWaveform();

    this.updateFPS();
  }

  private drawWaveform(): void {
    const ctx = this.waveformCtx;
    const width = this.waveformCanvas.width;
    const height = this.waveformCanvas.height;

    ctx.clearRect(0, 0, width, height);

    const waveformData = this.audioProcessor.getWaveformData();
    const sliceWidth = width / waveformData.length;

    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, '#ff6b6b');
    gradient.addColorStop(0.5, '#4ecdc4');
    gradient.addColorStop(1, '#45b7d1');

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#4ecdc4';

    ctx.beginPath();

    for (let i = 0; i < waveformData.length; i++) {
      const v = waveformData[i] / 128.0;
      const y = (v * height) / 2;

      if (i === 0) {
        ctx.moveTo(i * sliceWidth, y);
      } else {
        ctx.lineTo(i * sliceWidth, y);
      }
    }

    ctx.stroke();

    ctx.shadowBlur = 0;
  }

  private updateFPS(): void {
    this.frameCount++;
    const now = performance.now();

    if (now - this.lastFpsTime >= 1000) {
      const fps = Math.round(this.frameCount * 1000 / (now - this.lastFpsTime));
      this.fpsCounter.textContent = `FPS: ${fps}`;
      this.frameCount = 0;
      this.lastFpsTime = now;
    }
  }

  init(): void {
    this.uiController.hideLoading();
  }

  destroy(): void {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.audioProcessor.destroy();
    this.renderer.dispose();
  }
}

const app = new App();

window.addEventListener('DOMContentLoaded', () => {
  app.init();
});
