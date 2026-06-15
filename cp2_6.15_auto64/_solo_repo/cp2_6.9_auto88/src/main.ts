import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { AudioAnalyzer } from './audioAnalyzer';
import { ParticleSystem } from './particleSystem';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private particleSystem: ParticleSystem;
  private audioAnalyzer: AudioAnalyzer;
  private clock: THREE.Clock;
  private spectrumCanvas: HTMLCanvasElement;
  private spectrumCtx: CanvasRenderingContext2D;
  private statusEl: HTMLElement;

  constructor() {
    const container = document.getElementById('canvas-container')!;
    this.spectrumCanvas = document.getElementById('spectrum-canvas') as HTMLCanvasElement;
    this.spectrumCtx = this.spectrumCanvas.getContext('2d')!;
    this.statusEl = document.getElementById('status')!;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a14);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      5000
    );
    this.camera.position.set(0, 0, 350);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;
    this.controls.minDistance = 100;
    this.controls.maxDistance = 400;
    this.controls.enablePan = false;

    this.setupLights();

    this.particleSystem = new ParticleSystem();
    this.scene.add(this.particleSystem.points);
    this.particleSystem.createBackgroundStars(this.scene);

    this.audioAnalyzer = new AudioAnalyzer();
    this.clock = new THREE.Clock();

    this.setupEventListeners();
    this.animate();
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 1, 1000);
    const lightDistance = 400;
    pointLight.position.set(
      lightDistance * Math.sin(Math.PI / 4) * Math.cos(Math.PI / 4),
      lightDistance * Math.cos(Math.PI / 4),
      lightDistance * Math.sin(Math.PI / 4) * Math.sin(Math.PI / 4)
    );
    pointLight.castShadow = true;
    pointLight.shadow.mapSize.width = 1024;
    pointLight.shadow.mapSize.height = 1024;
    this.scene.add(pointLight);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.onWindowResize());

    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    const uploadBtn = document.getElementById('upload-btn')!;

    uploadBtn.addEventListener('click', () => {
      fileInput.click();
    });

    fileInput.addEventListener('change', async (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        this.statusEl.textContent = '正在加载音频...';
        try {
          await this.audioAnalyzer.loadFromFile(target.files[0]);
          this.statusEl.textContent = `正在播放: ${target.files[0].name}`;
        } catch (err) {
          this.statusEl.textContent = '加载失败，请尝试其他文件';
          console.error(err);
        }
      }
    });

    for (let i = 1; i <= 3; i++) {
      const btn = document.getElementById(`sample${i}`)!;
      btn.addEventListener('click', async () => {
        this.statusEl.textContent = `正在加载示例 ${i}...`;
        try {
          await this.audioAnalyzer.loadFromSample(i - 1);
          this.statusEl.textContent = `正在播放: 示例 ${i}`;
        } catch (err) {
          this.statusEl.textContent = '加载失败';
          console.error(err);
        }
      });
    }
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private drawSpectrum(bands: number[]): void {
    const ctx = this.spectrumCtx;
    const width = this.spectrumCanvas.width;
    const height = this.spectrumCanvas.height;
    const barCount = 32;
    const gap = 2;
    const totalGap = gap * (barCount - 1);
    const barWidth = (width - totalGap) / barCount;

    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < barCount; i++) {
      const value = bands[i] || 0;
      const barHeight = Math.max(2, value * height);
      const x = i * (barWidth + gap);
      const y = height - barHeight;

      const normalizedIndex = i / barCount;
      let hue: number;
      if (normalizedIndex < 0.33) {
        hue = 10 + normalizedIndex * 30;
      } else if (normalizedIndex < 0.66) {
        hue = 100 + (normalizedIndex - 0.33) * 120;
      } else {
        hue = 200 + (normalizedIndex - 0.66) * 120;
      }

      ctx.globalAlpha = 0.6;
      const gradient = ctx.createLinearGradient(x, y, x, height);
      gradient.addColorStop(0, `hsla(${hue}, 80%, 70%, 0.8)`);
      gradient.addColorStop(1, `hsla(${hue}, 80%, 40%, 0.4)`);
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, barWidth, barHeight);
    }
    ctx.globalAlpha = 1;
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const deltaTime = Math.min(this.clock.getDelta(), 0.1);

    const spectrum = this.audioAnalyzer.getFrequencyData();
    const bands = this.audioAnalyzer.getBands();

    this.particleSystem.update(spectrum, bands, deltaTime);

    const spectrumBands = this.audioAnalyzer.getSpectrumBands(32);
    this.drawSpectrum(spectrumBands);

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };
}

new App();
