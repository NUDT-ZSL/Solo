import * as THREE from 'three';
import { WaveSystem } from './waveSystem';
import { InteractionManager } from './interaction';

class NeuroWaveApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private waveSystem: WaveSystem;
  private interaction: InteractionManager;
  private container: HTMLElement;

  private clock: THREE.Clock;
  private frameId: number = 0;
  private running: boolean = true;

  private fpsFrames: number = 0;
  private fpsLastTime: number = 0;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.clock = new THREE.Clock();

    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();
    this.waveSystem = new WaveSystem();
    this.interaction = new InteractionManager(this.camera, this.waveSystem, this.container);

    this.scene.add(this.waveSystem.group);
    this.container.appendChild(this.renderer.domElement);

    this.setupUI();
    this.setupStats();
    this.handleResize();

    window.addEventListener('resize', this.handleResize.bind(this));
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();

    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#1a1a4a');
    gradient.addColorStop(1, '#0a0a2a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);

    const bgTexture = new THREE.CanvasTexture(canvas);
    bgTexture.needsUpdate = true;
    scene.background = bgTexture;

    scene.fog = new THREE.FogExp2(0x0a0a2a, 0.015);

    return scene;
  }

  private createCamera(): THREE.PerspectiveCamera {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 200);
    camera.position.set(0, 12, 22);
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
    renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    renderer.setClearColor(0x0a0a2a, 1);

    return renderer;
  }

  private setupUI(): void {
    const container = document.getElementById('wave-sources')!;
    container.innerHTML = '';

    for (let i = 0; i < this.waveSystem.sources.length; i++) {
      const source = this.waveSystem.sources[i];
      const sourceEl = document.createElement('div');
      sourceEl.className = 'wave-source' + (source.active ? ' active' : '');
      sourceEl.id = `wave-source-${i}`;

      sourceEl.innerHTML = `
        <div class="wave-source-header">
          <div class="wave-source-name">
            <div class="source-dot"></div>
            <span>波源 ${i + 1}</span>
          </div>
          <button class="toggle-btn" id="toggle-btn-${i}">${source.active ? '关闭' : '开启'}</button>
        </div>
        <div class="slider-group">
          <div class="slider-label">
            <span>频率</span>
            <span class="slider-value" id="freq-value-${i}">${source.frequency.toFixed(2)}Hz</span>
          </div>
          <input type="range" id="freq-slider-${i}" min="0.1" max="3.0" step="0.01" value="${source.frequency}">
        </div>
        <div class="slider-group">
          <div class="slider-label">
            <span>振幅</span>
            <span class="slider-value" id="amp-value-${i}">${source.amplitude.toFixed(2)}</span>
          </div>
          <input type="range" id="amp-slider-${i}" min="0.2" max="2.0" step="0.01" value="${source.amplitude}">
        </div>
      `;

      container.appendChild(sourceEl);

      const toggleBtn = document.getElementById(`toggle-btn-${i}`)!;
      toggleBtn.addEventListener('click', () => {
        this.waveSystem.toggleSource(i);
        const isActive = this.waveSystem.sources[i].active;
        if (isActive) {
          sourceEl.classList.add('active');
          toggleBtn.textContent = '关闭';
        } else {
          sourceEl.classList.remove('active');
          toggleBtn.textContent = '开启';
        }
      });

      const freqSlider = document.getElementById(`freq-slider-${i}`) as HTMLInputElement;
      const freqValue = document.getElementById(`freq-value-${i}`)!;
      freqSlider.addEventListener('input', () => {
        const freq = parseFloat(freqSlider.value);
        this.waveSystem.setSourceFrequency(i, freq);
        freqValue.textContent = `${freq.toFixed(2)}Hz`;
      });

      const ampSlider = document.getElementById(`amp-slider-${i}`) as HTMLInputElement;
      const ampValue = document.getElementById(`amp-value-${i}`)!;
      ampSlider.addEventListener('input', () => {
        const amp = parseFloat(ampSlider.value);
        this.waveSystem.setSourceAmplitude(i, amp);
        ampValue.textContent = amp.toFixed(2);
      });
    }

    document.getElementById('particle-count')!.textContent = this.waveSystem.particleCount.toString();
    this.container.style.cursor = 'grab';
  }

  private setupStats(): void {
    this.fpsLastTime = performance.now();
  }

  private updateFPS(): void {
    this.fpsFrames++;
    const now = performance.now();
    if (now - this.fpsLastTime >= 500) {
      const fps = Math.round((this.fpsFrames * 1000) / (now - this.fpsLastTime));
      document.getElementById('fps')!.textContent = fps.toString();
      this.fpsFrames = 0;
      this.fpsLastTime = now;
    }
  }

  private handleResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.renderer.setSize(width, height);
    this.interaction.handleWindowResize(width, height);
  }

  public start(): void {
    this.running = true;
    this.animate();
  }

  public stop(): void {
    this.running = false;
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
    }
  }

  private animate(): void {
    if (!this.running) return;

    this.frameId = requestAnimationFrame(this.animate.bind(this));

    const deltaTime = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();

    this.interaction.update(deltaTime);
    this.waveSystem.update(elapsedTime);
    this.renderer.render(this.scene, this.camera);
    this.updateFPS();
  }

  public dispose(): void {
    this.stop();
    this.interaction.detachEventListeners();
    window.removeEventListener('resize', this.handleResize.bind(this));

    if (this.scene.background instanceof THREE.Texture) {
      this.scene.background.dispose();
    }

    this.waveSystem.dispose();
    this.renderer.dispose();

    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}

let app: NeuroWaveApp | null = null;

window.addEventListener('DOMContentLoaded', () => {
  app = new NeuroWaveApp();
  app.start();
});

window.addEventListener('beforeunload', () => {
  if (app) {
    app.dispose();
    app = null;
  }
});
