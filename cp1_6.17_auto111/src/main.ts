import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { BuildingManager } from './buildingManager';
import { WindSimulator } from './windSimulator';

class App {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private buildingManager: BuildingManager;
  private windSimulator: WindSimulator;
  private clock: THREE.Clock;
  
  private mode: 'place' | 'adjust' = 'place';
  private showWindArrows = true;
  private showSectionParticles = false;
  private sectionViewEnabled = false;
  private pressureMode = false;
  private baseWindSpeed = 10;
  
  private panel!: HTMLDivElement;
  private statsPanel!: HTMLDivElement;
  private fps = 0;
  private frameCount = 0;
  private lastFpsUpdate = 0;
  
  private isDraggingBuilding = false;

  constructor() {
    const app = document.getElementById('app');
    if (!app) throw new Error('Container #app not found');
    this.container = app;
    
    this.clock = new THREE.Clock();
    
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f172a);
    this.scene.fog = new THREE.Fog(0x0f172a, 150, 400);
    
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(150, 120, 150);
    this.camera.lookAt(0, 0, 0);
    
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.container.appendChild(this.renderer.domElement);
    
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2.1;
    this.controls.minDistance = 50;
    this.controls.maxDistance = 300;
    this.controls.target.set(0, 0, 0);
    
    this.setupLights();
    
    this.buildingManager = new BuildingManager(this.scene, this.camera, this.container);
    this.windSimulator = new WindSimulator(this.scene);
    
    this.buildingManager.setOnBuildingChange(() => {
      this.windSimulator.setBuildings(this.buildingManager.getBuildings());
    });
    
    this.createPanel();
    this.createStatsPanel();
    this.bindEvents();
    this.animate();
  }

  private setupLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(80, 120, 80);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -150;
    directionalLight.shadow.camera.right = 150;
    directionalLight.shadow.camera.top = 150;
    directionalLight.shadow.camera.bottom = -150;
    this.scene.add(directionalLight);
    
    const fillLight = new THREE.DirectionalLight(0x60a5fa, 0.3);
    fillLight.position.set(-50, 50, -50);
    this.scene.add(fillLight);
  }

  private createPanel() {
    this.panel = document.createElement('div');
    this.panel.style.cssText = `
      position: fixed;
      left: 16px;
      top: 50%;
      transform: translateY(-50%);
      width: 280px;
      background-color: #1E293B;
      color: #E2E8F0;
      border-radius: 12px;
      padding: 16px;
      z-index: 100;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    
    const title = document.createElement('div');
    title.style.cssText = `
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 16px;
      color: #F1F5F9;
      border-bottom: 1px solid #334155;
      padding-bottom: 10px;
    `;
    title.textContent = '风环境控制面板';
    this.panel.appendChild(title);
    
    this.createModeButtons();
    this.createWindSpeedSlider();
    this.createDisplayToggles();
    this.createPressureToggle();
    
    this.container.appendChild(this.panel);
  }

  private createModeButtons() {
    const section = this.createSection('编辑模式');
    
    const buttonGroup = document.createElement('div');
    buttonGroup.style.cssText = `
      display: flex;
      gap: 8px;
      margin-top: 8px;
    `;
    
    const placeBtn = this.createModeButton('放置建筑', 'place', true);
    const adjustBtn = this.createModeButton('调整尺寸', 'adjust', false);
    
    buttonGroup.appendChild(placeBtn);
    buttonGroup.appendChild(adjustBtn);
    
    section.appendChild(buttonGroup);
    this.panel.appendChild(section);
  }

  private createModeButton(text: string, mode: 'place' | 'adjust', active: boolean): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.dataset.mode = mode;
    btn.style.cssText = `
      flex: 1;
      padding: 10px 12px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.15s ease;
      background-color: ${active ? '#3B82F6' : '#475569'};
      color: white;
    `;
    
    btn.addEventListener('mouseenter', () => {
      if (btn.dataset.mode !== this.mode) {
        btn.style.backgroundColor = '#64748B';
      }
    });
    
    btn.addEventListener('mouseleave', () => {
      if (btn.dataset.mode !== this.mode) {
        btn.style.backgroundColor = '#475569';
      }
    });
    
    btn.addEventListener('click', () => {
      this.mode = mode;
      this.updateModeButtons();
      this.controls.enabled = mode === 'adjust';
    });
    
    return btn;
  }

  private updateModeButtons() {
    const buttons = this.panel.querySelectorAll('button[data-mode]');
    buttons.forEach(btn => {
      const el = btn as HTMLButtonElement;
      if (el.dataset.mode === this.mode) {
        el.style.backgroundColor = '#3B82F6';
      } else {
        el.style.backgroundColor = '#475569';
      }
    });
  }

  private createWindSpeedSlider() {
    const section = this.createSection('基础风速');
    
    const sliderContainer = document.createElement('div');
    sliderContainer.style.cssText = `
      margin-top: 8px;
    `;
    
    const valueDisplay = document.createElement('div');
    valueDisplay.style.cssText = `
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      margin-bottom: 8px;
      color: #94A3B8;
    `;
    valueDisplay.innerHTML = `<span>风速</span><span style="color: #60A5FA; font-weight: 600;">${this.baseWindSpeed} m/s</span>`;
    
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '5';
    slider.max = '20';
    slider.step = '1';
    slider.value = this.baseWindSpeed.toString();
    slider.style.cssText = `
      width: 100%;
      height: 6px;
      border-radius: 3px;
      background: #64748B;
      outline: none;
      -webkit-appearance: none;
      cursor: pointer;
    `;
    
    const style = document.createElement('style');
    style.textContent = `
      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #60A5FA;
        cursor: pointer;
        box-shadow: 0 2px 6px rgba(96, 165, 250, 0.4);
        transition: transform 0.15s ease;
      }
      input[type="range"]::-webkit-slider-thumb:hover {
        transform: scale(1.1);
      }
      input[type="range"]::-moz-range-thumb {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #60A5FA;
        cursor: pointer;
        border: none;
        box-shadow: 0 2px 6px rgba(96, 165, 250, 0.4);
      }
    `;
    document.head.appendChild(style);
    
    slider.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      this.baseWindSpeed = value;
      valueDisplay.innerHTML = `<span>风速</span><span style="color: #60A5FA; font-weight: 600;">${value} m/s</span>`;
      this.windSimulator.setBaseWindSpeed(value);
    });
    
    sliderContainer.appendChild(valueDisplay);
    sliderContainer.appendChild(slider);
    section.appendChild(sliderContainer);
    this.panel.appendChild(section);
  }

  private createDisplayToggles() {
    const section = this.createSection('显示选项');
    
    const toggle1 = this.createToggle('风场箭头', this.showWindArrows, (enabled) => {
      this.showWindArrows = enabled;
      this.windSimulator.setShowArrows(enabled);
    });
    
    const toggle2 = this.createToggle('剖面粒子', this.showSectionParticles, (enabled) => {
      this.showSectionParticles = enabled;
      this.windSimulator.setShowParticles(enabled);
      this.windSimulator.setSectionView(this.sectionViewEnabled && enabled);
    });
    
    const toggle3 = this.createToggle('剖面视图', this.sectionViewEnabled, (enabled) => {
      this.sectionViewEnabled = enabled;
      this.buildingManager.setSectionView(enabled);
      this.windSimulator.setSectionView(enabled && this.showSectionParticles);
    });
    
    section.appendChild(toggle1);
    section.appendChild(toggle2);
    section.appendChild(toggle3);
    this.panel.appendChild(section);
  }

  private createPressureToggle() {
    const section = this.createSection('风压显示');
    
    const toggle = this.createToggle('显示表面风压', this.pressureMode, (enabled) => {
      this.pressureMode = enabled;
      this.buildingManager.setPressureMode(enabled);
    });
    
    section.appendChild(toggle);
    this.panel.appendChild(section);
    
    const hint = document.createElement('div');
    hint.style.cssText = `
      font-size: 11px;
      color: #64748B;
      margin-top: 6px;
      line-height: 1.4;
    `;
    hint.textContent = '开启后点击建筑表面可查看风压数值';
    section.appendChild(hint);
  }

  private createSection(title: string): HTMLDivElement {
    const section = document.createElement('div');
    section.style.cssText = `
      margin-bottom: 16px;
    `;
    
    const label = document.createElement('div');
    label.style.cssText = `
      font-size: 13px;
      font-weight: 500;
      color: #CBD5E1;
      margin-bottom: 4px;
    `;
    label.textContent = title;
    section.appendChild(label);
    
    return section;
  }

  private createToggle(label: string, initialValue: boolean, onChange: (value: boolean) => void): HTMLDivElement {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 0;
    `;
    
    const labelEl = document.createElement('span');
    labelEl.style.cssText = `
      font-size: 13px;
      color: #94A3B8;
    `;
    labelEl.textContent = label;
    
    const toggleBtn = document.createElement('div');
    toggleBtn.style.cssText = `
      width: 40px;
      height: 22px;
      border-radius: 11px;
      background-color: ${initialValue ? '#10B981' : '#EF4444'};
      position: relative;
      cursor: pointer;
      transition: background-color 0.15s ease;
    `;
    
    const knob = document.createElement('div');
    knob.style.cssText = `
      position: absolute;
      top: 3px;
      left: ${initialValue ? '21px' : '3px'};
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background-color: white;
      transition: left 0.15s ease;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    `;
    
    toggleBtn.appendChild(knob);
    
    let isOn = initialValue;
    
    toggleBtn.addEventListener('click', () => {
      isOn = !isOn;
      toggleBtn.style.backgroundColor = isOn ? '#10B981' : '#EF4444';
      knob.style.left = isOn ? '21px' : '3px';
      onChange(isOn);
    });
    
    toggleBtn.addEventListener('mouseenter', () => {
      toggleBtn.style.opacity = '0.9';
    });
    
    toggleBtn.addEventListener('mouseleave', () => {
      toggleBtn.style.opacity = '1';
    });
    
    wrapper.appendChild(labelEl);
    wrapper.appendChild(toggleBtn);
    
    return wrapper;
  }

  private createStatsPanel() {
    this.statsPanel = document.createElement('div');
    this.statsPanel.style.cssText = `
      position: fixed;
      right: 16px;
      bottom: 16px;
      background-color: rgba(0, 0, 0, 0.5);
      color: white;
      padding: 10px 14px;
      border-radius: 8px;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      z-index: 100;
      pointer-events: none;
      line-height: 1.6;
    `;
    this.statsPanel.innerHTML = `
      <div>FPS: <span id="fps-value">--</span></div>
      <div>粒子: <span id="particle-count">--</span></div>
      <div>箭头: <span id="arrow-count">--</span></div>
    `;
    this.container.appendChild(this.statsPanel);
  }

  private updateStats() {
    const fpsEl = document.getElementById('fps-value');
    const particleEl = document.getElementById('particle-count');
    const arrowEl = document.getElementById('arrow-count');
    
    if (fpsEl) fpsEl.textContent = this.fps.toFixed(0);
    if (particleEl) particleEl.textContent = this.windSimulator.getParticleCount().toString();
    if (arrowEl) arrowEl.textContent = this.windSimulator.getArrowCount().toString();
  }

  private bindEvents() {
    window.addEventListener('resize', this.onWindowResize.bind(this));
    
    this.renderer.domElement.addEventListener('click', this.onCanvasClick.bind(this));
    this.renderer.domElement.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.renderer.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.renderer.domElement.addEventListener('mouseup', this.onMouseUp.bind(this));
    
    this.controls.enabled = false;
  }

  private onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private onCanvasClick(event: MouseEvent) {
    if (this.isDraggingBuilding) return;
    
    if (event.target !== this.renderer.domElement) return;
    
    const panelRect = this.panel.getBoundingClientRect();
    const statsRect = this.statsPanel.getBoundingClientRect();
    
    if (
      (event.clientX >= panelRect.left && event.clientX <= panelRect.right &&
       event.clientY >= panelRect.top && event.clientY <= panelRect.bottom) ||
      (event.clientX >= statsRect.left && event.clientX <= statsRect.right &&
       event.clientY >= statsRect.top && event.clientY <= statsRect.bottom)
    ) {
      return;
    }
    
    if (this.mode === 'place') {
      this.buildingManager.handleClick(event, 'place');
    } else {
      this.buildingManager.handleClick(event, 'adjust');
    }
  }

  private onMouseDown(event: MouseEvent) {
    if (this.mode === 'adjust' && event.button === 0) {
      const handled = this.buildingManager.handleMouseDown(event);
      if (handled) {
        this.isDraggingBuilding = true;
        this.controls.enabled = false;
      }
    }
  }

  private onMouseMove(event: MouseEvent) {
    if (this.isDraggingBuilding) {
      this.buildingManager.handleMouseMove(event);
    }
    
    if (this.pressureMode) {
      this.buildingManager.updatePressureLabelPositions();
    }
  }

  private onMouseUp() {
    if (this.isDraggingBuilding) {
      this.buildingManager.handleMouseUp();
      this.isDraggingBuilding = false;
      setTimeout(() => {
        if (this.mode === 'adjust') {
          this.controls.enabled = true;
        }
      }, 50);
    }
  }

  private animate() {
    requestAnimationFrame(this.animate.bind(this));
    
    const delta = this.clock.getDelta();
    
    this.controls.update();
    this.windSimulator.update(delta);
    
    if (this.pressureMode) {
      this.buildingManager.updatePressureLabelPositions();
    }
    
    this.renderer.render(this.scene, this.camera);
    
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsUpdate >= 500) {
      this.fps = (this.frameCount * 1000) / (now - this.lastFpsUpdate);
      this.frameCount = 0;
      this.lastFpsUpdate = now;
      this.updateStats();
    }
  }

  dispose() {
    this.buildingManager.dispose();
    this.windSimulator.dispose();
    this.renderer.dispose();
    this.controls.dispose();
  }
}

const app = new App();
