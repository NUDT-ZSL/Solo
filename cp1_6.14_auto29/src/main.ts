import './styles/main.css';
import * as THREE from 'three';
import { DataGenerator, colorTempToRGB, getPerformanceLimits } from './DataGenerator';
import type { BuildingData } from './DataGenerator';
import { SkylineRenderer } from './SkylineRenderer';
import { ParticleOverlay } from './ParticleOverlay';

const FPS_TARGET = 30;
const FPS_SAMPLE_COUNT = 60;

class PerformanceMonitor {
  private frameTimes: number[] = [];
  private lastTime = performance.now();
  private polygonCount = 0;

  tick(): number {
    const now = performance.now();
    const delta = now - this.lastTime;
    this.lastTime = now;
    this.frameTimes.push(delta);
    if (this.frameTimes.length > FPS_SAMPLE_COUNT) this.frameTimes.shift();
    return delta;
  }

  getAvgFPS(): number {
    if (this.frameTimes.length === 0) return 0;
    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    return Math.round(1000 / avg);
  }

  setPolygonCount(n: number): void { this.polygonCount = n; }
  getPolygonCount(): number { return this.polygonCount; }

  checkLimits(buildings: number, particles: number, polygons: number): boolean {
    const limits = getPerformanceLimits();
    return buildings <= limits.MAX_BUILDINGS
      && particles <= limits.MAX_PARTICLES
      && polygons <= limits.MAX_POLYGONS;
  }
}

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private skyline: SkylineRenderer;
  private particles: ParticleOverlay;
  private perfMon: PerformanceMonitor;
  private data: BuildingData[] = [];
  private infoPopup: HTMLDivElement | null = null;
  private popupTimeout: ReturnType<typeof setTimeout> | null = null;
  private controlPanel: HTMLDivElement | null = null;
  private drawerBtn: HTMLButtonElement | null = null;
  private drawerOpen = false;
  private isMobile = false;
  private intensityScale = 1;
  private colorTempOffset = 0;

  constructor() {
    const container = document.getElementById('app')!;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
    this.scene.fog = new THREE.FogExp2(0x000000, 0.015);

    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    container.appendChild(this.renderer.domElement);

    const ambient = new THREE.AmbientLight(0x111122, 0.3);
    this.scene.add(ambient);

    this.skyline = new SkylineRenderer(this.scene, this.camera, this.renderer.domElement);
    this.particles = new ParticleOverlay(this.scene, this.renderer);
    this.perfMon = new PerformanceMonitor();

    this.data = new DataGenerator(20, 20).getData();
    this.skyline.render(this.data);
    this.particles.init(this.data);

    this.buildUI();
    this.setupEvents();
    this.animate();
  }

  private buildUI(): void {
    this.buildNavbar();
    this.buildControlPanel();
    this.buildColorTempBar();
    this.buildInfoPopup();
    this.buildFPSDisplay();
    this.checkMobile();
  }

  private buildNavbar(): void {
    const nav = document.createElement('div');
    nav.id = 'navbar';
    nav.innerHTML = `
      <span class="nav-title">LumiScape</span>
      <button id="resetBtn">重置视角</button>
    `;
    document.getElementById('app')!.appendChild(nav);
    document.getElementById('resetBtn')!.addEventListener('click', () => {
      this.skyline.resetCamera();
    });
  }

  private buildControlPanel(): void {
    const panel = document.createElement('div');
    panel.id = 'controlPanel';
    panel.innerHTML = `
      <div class="panel-title">控制面板</div>
      <label class="slider-label">光照强度缩放: <span id="intensityVal">1.0x</span></label>
      <input type="range" id="intensitySlider" min="0.5" max="2.0" step="0.1" value="1.0" />
      <label class="slider-label">色温偏移: <span id="tempVal">0K</span></label>
      <input type="range" id="tempSlider" min="-1500" max="1500" step="100" value="0" />
      <div class="info-display">
        <div>视角中心: (<span id="camX">0.0</span>, <span id="camZ">0.0</span>)</div>
        <div>区域平均强度: <span id="avgIntensity">0</span> lux</div>
      </div>
    `;
    document.getElementById('app')!.appendChild(panel);
    this.controlPanel = panel;

    document.getElementById('intensitySlider')!.addEventListener('input', (e) => {
      this.intensityScale = parseFloat((e.target as HTMLInputElement).value);
      document.getElementById('intensityVal')!.textContent = this.intensityScale.toFixed(1) + 'x';
      this.skyline.updateIntensityScale(this.intensityScale);
    });

    document.getElementById('tempSlider')!.addEventListener('input', (e) => {
      this.colorTempOffset = parseInt((e.target as HTMLInputElement).value);
      document.getElementById('tempVal')!.textContent = (this.colorTempOffset >= 0 ? '+' : '') + this.colorTempOffset + 'K';
      this.skyline.updateColorTempOffset(this.colorTempOffset);
      this.particles.updateColorTempOffset(this.colorTempOffset);
    });

    const btn = document.createElement('button');
    btn.id = 'drawerBtn';
    btn.innerHTML = '&#9776;';
    btn.addEventListener('click', () => this.toggleDrawer());
    document.getElementById('app')!.appendChild(btn);
    this.drawerBtn = btn;
  }

  private buildColorTempBar(): void {
    const container = document.createElement('div');
    container.id = 'colorTempBarContainer';

    const canvas = document.createElement('canvas');
    const height = 300;
    canvas.width = 20;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    for (let y = 0; y < height; y++) {
      const kelvin = 6500 - (y / (height - 1)) * (6500 - 2000);
      const [r, g, b] = colorTempToRGB(kelvin);
      ctx.fillStyle = `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`;
      ctx.fillRect(0, y, 20, 1);
    }
    canvas.style.width = '20px';
    canvas.style.height = height + 'px';
    canvas.style.borderRadius = '4px';
    container.appendChild(canvas);

    const labels = document.createElement('div');
    labels.className = 'temp-labels';
    const kelvinValues = [2000, 3000, 4000, 5000, 6500];
    for (const k of kelvinValues) {
      const label = document.createElement('span');
      label.textContent = k + 'K';
      const yPercent = ((6500 - k) / (6500 - 2000)) * 100;
      label.style.top = yPercent + '%';
      labels.appendChild(label);
    }
    container.appendChild(labels);
    document.getElementById('app')!.appendChild(container);
  }

  private buildInfoPopup(): void {
    const popup = document.createElement('div');
    popup.id = 'infoPopup';
    popup.style.display = 'none';
    document.getElementById('app')!.appendChild(popup);
    this.infoPopup = popup;
  }

  private buildFPSDisplay(): void {
    const fps = document.createElement('div');
    fps.id = 'fpsDisplay';
    document.getElementById('app')!.appendChild(fps);
  }

  private showInfoPopup(data: BuildingData, screenX: number, screenY: number): void {
    if (!this.infoPopup) return;
    if (this.popupTimeout) clearTimeout(this.popupTimeout);
    const [cr, cg, cb] = colorTempToRGB(data.colorTemp + this.colorTempOffset);
    this.infoPopup.innerHTML = `
      <div class="popup-title">建筑信息</div>
      <div>坐标: (${data.x}, ${data.z})</div>
      <div>高度: ${data.height.toFixed(1)} 单位</div>
      <div>光照强度: ${(data.intensity * this.intensityScale).toFixed(1)} lux</div>
      <div>色温: ${data.colorTemp + this.colorTempOffset}K</div>
    `;
    this.infoPopup.style.display = 'block';
    this.infoPopup.style.left = Math.min(screenX + 15, window.innerWidth - 260) + 'px';
    this.infoPopup.style.top = Math.min(screenY + 15, window.innerHeight - 150) + 'px';
    this.infoPopup.style.opacity = '1';
    this.infoPopup.style.transition = 'none';

    this.popupTimeout = setTimeout(() => {
      if (this.infoPopup) {
        this.infoPopup.style.transition = 'opacity 0.5s ease-out';
        this.infoPopup.style.opacity = '0';
        setTimeout(() => {
          if (this.infoPopup) this.infoPopup.style.display = 'none';
        }, 500);
      }
    }, 3000);
  }

  private setupEvents(): void {
    window.addEventListener('resize', () => this.onResize());

    this.renderer.domElement.addEventListener('dblclick', (e) => {
      const rect = this.renderer.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      const hit = this.skyline.raycastBuilding(mouse, this.camera);
      if (hit) this.showInfoPopup(hit, e.clientX, e.clientY);
    });

    window.addEventListener('resize', () => this.checkMobile());
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.particles.resize(window.innerWidth, window.innerHeight);
  }

  private checkMobile(): void {
    const was = this.isMobile;
    this.isMobile = window.innerWidth < 768;
    if (this.controlPanel) {
      if (this.isMobile) {
        this.controlPanel.classList.add('mobile');
        if (!this.drawerOpen) this.controlPanel.classList.remove('open');
        if (this.drawerBtn) this.drawerBtn.style.display = 'flex';
      } else {
        this.controlPanel.classList.remove('mobile', 'open');
        if (this.drawerBtn) this.drawerBtn.style.display = 'none';
        this.drawerOpen = false;
      }
    }
  }

  private toggleDrawer(): void {
    this.drawerOpen = !this.drawerOpen;
    if (this.controlPanel) {
      if (this.drawerOpen) {
        this.controlPanel.classList.add('open');
      } else {
        this.controlPanel.classList.remove('open');
      }
    }
  }

  private updateUI(): void {
    const center = this.skyline.getCameraCenter();
    const camX = document.getElementById('camX');
    const camZ = document.getElementById('camZ');
    const avgEl = document.getElementById('avgIntensity');
    if (camX) camX.textContent = center.x.toFixed(1);
    if (camZ) camZ.textContent = center.z.toFixed(1);
    if (avgEl) avgEl.textContent = this.skyline.getAverageIntensity().toString();

    const fpsEl = document.getElementById('fpsDisplay');
    if (fpsEl) {
      const fps = this.perfMon.getAvgFPS();
      const pCount = this.particles.getParticleCount();
      const bCount = this.data.length;
      const status = this.perfMon.checkLimits(bCount, pCount, this.perfMon.getPolygonCount());
      fpsEl.textContent = `FPS: ${fps} | 建筑: ${bCount} | 粒子: ${pCount} | ${status ? '✓' : '⚠'}`;
      fpsEl.style.color = fps >= FPS_TARGET ? '#4ade80' : '#f87171';
    }
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);
    this.perfMon.tick();
    this.skyline.update();
    this.particles.render(this.camera);
    this.updateUI();
  };
}

new App();
