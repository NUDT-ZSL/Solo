import * as THREE from 'three';
import { AudioAnalyzer, type AudioData } from './audioAnalyzer';
import { WaveformBuilder, type WaveformStyle } from './waveformBuilder';
import { EffectManager } from './effectManager';

const TARGET_FPS = 60;
const FRAME_INTERVAL = 1000 / TARGET_FPS;

class SoundWaveSurferApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private canvas: HTMLCanvasElement;

  private audioAnalyzer: AudioAnalyzer;
  private waveformBuilder: WaveformBuilder;
  private effectManager: EffectManager;

  private currentStyle: WaveformStyle = 'mountain';
  private lastFrameTime: number = 0;
  private frameAccumulator: number = 0;

  private ringProgressEl: SVGPathElement | null = null;
  private ringCircumference: number = 0;
  private decibelValueEl: HTMLElement | null = null;
  private navDecibelValueEl: HTMLElement | null = null;
  private fileNameEl: HTMLElement | null = null;
  private mobileMinimapPopup: HTMLElement | null = null;

  constructor() {
    this.canvas = document.getElementById('three-canvas') as HTMLCanvasElement;

    this.scene = new THREE.Scene();
    this.setupBackground();

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    this.camera.position.set(0, 5, 15);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.audioAnalyzer = new AudioAnalyzer();
    this.waveformBuilder = new WaveformBuilder();
    this.scene.add(this.waveformBuilder.points);

    this.effectManager = new EffectManager(this.scene, this.camera, this.waveformBuilder);
    this.effectManager.setupPointerControls(this.canvas);

    this.setupUI();
    this.setupLighting();

    window.addEventListener('resize', this.onResize.bind(this));
  }

  private setupBackground(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, '#0a0a1a');
    gradient.addColorStop(1, '#14142a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 256);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    this.scene.background = texture;
  }

  private setupLighting(): void {
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambient);

    const directional = new THREE.DirectionalLight(0x8899ff, 0.8);
    directional.position.set(5, 10, 7);
    this.scene.add(directional);

    const pointLight = new THREE.PointLight(0xa78bfa, 0.6, 30);
    pointLight.position.set(-5, 5, -5);
    this.scene.add(pointLight);
  }

  private setupUI(): void {
    const app = document.getElementById('app')!;

    const controlPanel = document.createElement('div');
    controlPanel.className = 'control-panel';
    controlPanel.innerHTML = `
      <div class="panel-title">SoundWaveSurfer</div>
      <div class="upload-btn-wrapper">
        <label class="upload-btn" for="audio-file-input">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          上传音频
        </label>
        <input type="file" id="audio-file-input" class="file-input" accept="audio/*" />
        <div class="file-name">未选择文件</div>
      </div>
      <div class="style-section">
        <div class="section-label">可视化风格</div>
        <div class="style-buttons">
          <button class="style-btn active" data-style="mountain">山脉</button>
          <button class="style-btn" data-style="ocean">海洋</button>
          <button class="style-btn" data-style="nebula">星云</button>
        </div>
      </div>
      <div class="decibel-section">
        <div class="section-label">实时音量</div>
        <div class="decibel-ring">
          <svg viewBox="0 0 80 80">
            <defs>
              <linearGradient id="decibelGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#06b6d4;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#a78bfa;stop-opacity:1" />
              </linearGradient>
            </defs>
            <circle class="ring-bg" cx="40" cy="40" r="33"></circle>
            <path class="ring-progress" cx="40" cy="40" r="33"
              d="M 40 7 A 33 33 0 1 1 39.9 7"
              fill="none" stroke-linecap="round"></path>
          </svg>
          <div class="decibel-value">-60</div>
          <div class="decibel-unit">dB</div>
        </div>
      </div>
    `;
    app.appendChild(controlPanel);

    const minimap = document.createElement('div');
    minimap.className = 'minimap';
    minimap.innerHTML = `<div class="minimap-label">小地图</div>`;
    app.appendChild(minimap);
    this.effectManager.setupMinimap(minimap);

    const topNav = document.createElement('div');
    topNav.className = 'top-nav';
    topNav.innerHTML = `
      <div class="nav-title">🌊 SWS</div>
      <label class="nav-upload-btn" for="nav-audio-file-input">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="17 8 12 3 7 8"></polyline>
          <line x1="12" y1="3" x2="12" y2="15"></line>
        </svg>
        上传
      </label>
      <input type="file" id="nav-audio-file-input" class="file-input" accept="audio/*" />
      <button class="nav-style-btn active" data-style="mountain">山脉</button>
      <button class="nav-style-btn" data-style="ocean">海洋</button>
      <button class="nav-style-btn" data-style="nebula">星云</button>
      <div class="nav-decibel">🔊 <span class="nav-decibel-value">-60</span>dB</div>
    `;
    app.appendChild(topNav);

    const minimapFab = document.createElement('div');
    minimapFab.className = 'minimap-fab';
    minimapFab.innerHTML = `
      <svg viewBox="0 0 24 24">
        <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
      </svg>
    `;
    app.appendChild(minimapFab);

    const mobileMinimap = document.createElement('div');
    mobileMinimap.className = 'mobile-minimap-popup';
    app.appendChild(mobileMinimap);
    this.mobileMinimapPopup = mobileMinimap;
    this.effectManager.setupMinimap(mobileMinimap);

    minimapFab.addEventListener('click', () => {
      mobileMinimap.classList.toggle('show');
    });

    const fileInput = document.getElementById('audio-file-input') as HTMLInputElement;
    const navFileInput = document.getElementById('nav-audio-file-input') as HTMLInputElement;
    fileInput.addEventListener('change', (e) => this.onFileSelected(e as Event));
    navFileInput.addEventListener('change', (e) => this.onFileSelected(e as Event));

    document.querySelectorAll('.style-btn, .nav-style-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const style = (e.currentTarget as HTMLElement).dataset.style as WaveformStyle;
        this.setStyle(style);
      });
    });

    this.ringProgressEl = controlPanel.querySelector('.ring-progress') as SVGPathElement;
    this.ringCircumference = 2 * Math.PI * 33;
    if (this.ringProgressEl) {
      this.ringProgressEl.style.strokeDasharray = this.ringCircumference.toString();
      this.ringProgressEl.style.strokeDashoffset = this.ringCircumference.toString();
    }
    this.decibelValueEl = controlPanel.querySelector('.decibel-value') as HTMLElement;
    this.navDecibelValueEl = topNav.querySelector('.nav-decibel-value') as HTMLElement;
    this.fileNameEl = controlPanel.querySelector('.file-name') as HTMLElement;

    this.effectManager.setOnCameraChange(() => {
      this.renderer.render(this.scene, this.camera);
    });
  }

  private async onFileSelected(e: Event): Promise<void> {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (this.fileNameEl) {
      this.fileNameEl.textContent = file.name;
    }

    try {
      await this.audioAnalyzer.loadFile(file);
      await this.audioAnalyzer.play();
    } catch (err) {
      console.error('Failed to load audio:', err);
      alert('音频加载失败，请尝试其他文件');
    }
  }

  private setStyle(style: WaveformStyle): void {
    if (style === this.currentStyle) return;
    this.currentStyle = style;
    this.waveformBuilder.setStyle(style);

    document.querySelectorAll('.style-btn, .nav-style-btn').forEach((btn) => {
      const btnStyle = (btn as HTMLElement).dataset.style as WaveformStyle;
      if (btnStyle === style) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  private updateDecibelRing(db: number): void {
    const normalized = Math.max(0, Math.min(1, (db + 60) / 60));
    if (this.ringProgressEl) {
      const offset = this.ringCircumference * (1 - normalized);
      this.ringProgressEl.style.strokeDashoffset = offset.toString();
    }
    const displayDb = Math.round(db);
    if (this.decibelValueEl) {
      this.decibelValueEl.textContent = displayDb.toString();
    }
    if (this.navDecibelValueEl) {
      this.navDecibelValueEl.textContent = displayDb.toString();
    }
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  start(): void {
    this.lastFrameTime = performance.now();
    this.animate();
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const now = performance.now();
    const deltaMs = now - this.lastFrameTime;
    this.lastFrameTime = now;
    this.frameAccumulator += deltaMs;

    if (this.frameAccumulator < FRAME_INTERVAL) {
      return;
    }

    const steps = Math.floor(this.frameAccumulator / FRAME_INTERVAL);
    this.frameAccumulator -= steps * FRAME_INTERVAL;
    const deltaTime = (steps * FRAME_INTERVAL) / 1000;

    const audioData: AudioData = this.audioAnalyzer.getAudioData();
    this.waveformBuilder.update(audioData, deltaTime);
    this.effectManager.update(deltaTime);
    this.updateDecibelRing(audioData.decibel);

    this.renderer.render(this.scene, this.camera);
  };

  dispose(): void {
    this.audioAnalyzer.stop();
    this.waveformBuilder.dispose();
    this.effectManager.dispose();
    this.renderer.dispose();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const app = new SoundWaveSurferApp();
  app.start();
  (window as any).__sws_app = app;
});
