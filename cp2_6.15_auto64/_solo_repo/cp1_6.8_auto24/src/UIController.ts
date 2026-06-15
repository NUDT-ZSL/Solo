import * as THREE from 'three';
import { PlanktonSystem } from './PlanktonSystem';
import { OceanScene } from './OceanScene';

export interface AppSettings {
  tideSpeed: number;
  glowIntensity: number;
  trailEnabled: boolean;
}

export class UIController {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private planktonSystem: PlanktonSystem;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private hoveredMesh: THREE.Mesh | null = null;

  private settings: AppSettings = {
    tideSpeed: 1.0,
    glowIntensity: 1.0,
    trailEnabled: true,
  };

  private cardEl: HTMLElement;
  private controlPanelEl: HTMLElement;
  private tideSpeedSlider: HTMLInputElement;
  private glowIntensitySlider: HTMLInputElement;
  private trailToggle: HTMLInputElement;
  private tideSpeedValue: HTMLElement;
  private glowIntensityValue: HTMLElement;

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    planktonSystem: PlanktonSystem,
    _ocean: OceanScene
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.planktonSystem = planktonSystem;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2(-999, -999);

    this.cardEl = this.createInfoCard();
    this.controlPanelEl = this.createControlPanel();
    this.tideSpeedSlider = this.controlPanelEl.querySelector(
      '#tideSpeedSlider'
    ) as HTMLInputElement;
    this.glowIntensitySlider = this.controlPanelEl.querySelector(
      '#glowIntensitySlider'
    ) as HTMLInputElement;
    this.trailToggle = this.controlPanelEl.querySelector(
      '#trailToggle'
    ) as HTMLInputElement;
    this.tideSpeedValue = this.controlPanelEl.querySelector(
      '#tideSpeedValue'
    ) as HTMLElement;
    this.glowIntensityValue = this.controlPanelEl.querySelector(
      '#glowIntensityValue'
    ) as HTMLElement;

    this.bindEvents();
  }

  getSettings(): AppSettings {
    return { ...this.settings };
  }

  private createInfoCard(): HTMLElement {
    const card = document.createElement('div');
    card.id = 'info-card';
    card.innerHTML = `
      <button id="card-close">&times;</button>
      <div id="card-content">
        <h3 id="card-name"></h3>
        <div class="card-row"><span class="card-label">亮度值</span><span id="card-brightness"></span></div>
        <div class="card-row"><span class="card-label">共生次数</span><span id="card-clicks"></span></div>
      </div>
    `;
    const style = document.createElement('style');
    style.textContent = `
      #info-card {
        position: fixed;
        pointer-events: auto;
        display: none;
        min-width: 220px;
        padding: 20px 24px;
        border-radius: 16px;
        background: rgba(20, 30, 60, 0.45);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid rgba(120, 160, 255, 0.25);
        box-shadow: 0 8px 32px rgba(0, 40, 120, 0.4), inset 0 1px 0 rgba(255,255,255,0.1);
        color: #e0e8ff;
        font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
        z-index: 100;
        transform: scale(0.8);
        opacity: 0;
        transition: transform 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease;
      }
      #info-card.visible {
        transform: scale(1);
        opacity: 1;
      }
      #info-card.hiding {
        transform: scale(0.8);
        opacity: 0;
      }
      #card-close {
        position: absolute;
        top: 8px;
        right: 12px;
        background: none;
        border: none;
        color: rgba(200,220,255,0.7);
        font-size: 22px;
        cursor: pointer;
        line-height: 1;
        transition: color 0.2s;
      }
      #card-close:hover {
        color: #fff;
      }
      #card-name {
        margin: 0 0 14px 0;
        font-size: 20px;
        font-weight: 600;
        text-shadow: 0 0 12px rgba(100,180,255,0.6);
        color: #c0d8ff;
      }
      .card-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 6px 0;
        border-bottom: 1px solid rgba(100,150,255,0.12);
      }
      .card-row:last-child {
        border-bottom: none;
      }
      .card-label {
        color: rgba(180,200,255,0.7);
        font-size: 14px;
      }
      .card-row span:last-child {
        font-weight: 600;
        font-size: 16px;
        color: #88bbff;
        text-shadow: 0 0 8px rgba(100,160,255,0.4);
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(card);

    card.querySelector('#card-close')!.addEventListener('click', () => {
      this.hideCard();
    });

    return card;
  }

  private createControlPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.id = 'control-panel';
    panel.innerHTML = `
      <h4>控制面板</h4>
      <div class="control-group">
        <label>潮汐速度 <span id="tideSpeedValue">1.0</span>x</label>
        <input type="range" id="tideSpeedSlider" min="0.1" max="2.0" step="0.1" value="1.0" />
      </div>
      <div class="control-group">
        <label>发光强度 <span id="glowIntensityValue">1.0</span>x</label>
        <input type="range" id="glowIntensitySlider" min="0.1" max="2.0" step="0.1" value="1.0" />
      </div>
      <div class="control-group toggle-group">
        <label>光尾开关</label>
        <div class="toggle-wrapper">
          <input type="checkbox" id="trailToggle" checked />
          <label for="trailToggle" class="toggle-label"></label>
        </div>
      </div>
    `;
    const style = document.createElement('style');
    style.textContent = `
      #control-panel {
        position: fixed;
        bottom: 24px;
        right: 24px;
        padding: 20px 24px;
        border-radius: 16px;
        background: rgba(15, 25, 50, 0.5);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid rgba(100, 150, 255, 0.2);
        box-shadow: 0 4px 24px rgba(0, 20, 80, 0.4), inset 0 1px 0 rgba(255,255,255,0.08);
        color: #c0d8ff;
        font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
        z-index: 90;
        min-width: 200px;
      }
      #control-panel h4 {
        margin: 0 0 16px 0;
        font-size: 16px;
        font-weight: 600;
        text-shadow: 0 0 10px rgba(100,180,255,0.5);
        color: #d0e0ff;
      }
      .control-group {
        margin-bottom: 14px;
      }
      .control-group label {
        display: block;
        font-size: 13px;
        color: rgba(180, 200, 255, 0.8);
        margin-bottom: 6px;
        text-shadow: 0 0 6px rgba(100,160,255,0.3);
      }
      .control-group label span {
        color: #88bbff;
        font-weight: 600;
      }
      input[type="range"] {
        -webkit-appearance: none;
        width: 100%;
        height: 4px;
        border-radius: 2px;
        background: rgba(60, 100, 180, 0.4);
        outline: none;
      }
      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #6699ff;
        box-shadow: 0 0 8px rgba(100,160,255,0.6);
        cursor: pointer;
      }
      input[type="range"]::-moz-range-thumb {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #6699ff;
        box-shadow: 0 0 8px rgba(100,160,255,0.6);
        cursor: pointer;
        border: none;
      }
      .toggle-group {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .toggle-group label {
        margin-bottom: 0;
      }
      .toggle-wrapper {
        position: relative;
      }
      #trailToggle {
        display: none;
      }
      .toggle-label {
        display: block;
        width: 44px;
        height: 24px;
        border-radius: 12px;
        background: rgba(60, 80, 120, 0.5);
        cursor: pointer;
        position: relative;
        transition: background 0.3s;
      }
      .toggle-label::after {
        content: '';
        position: absolute;
        top: 3px;
        left: 3px;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #88a0cc;
        transition: transform 0.3s, background 0.3s;
      }
      #trailToggle:checked + .toggle-label {
        background: rgba(60, 120, 220, 0.6);
      }
      #trailToggle:checked + .toggle-label::after {
        transform: translateX(20px);
        background: #66aaff;
        box-shadow: 0 0 8px rgba(100,170,255,0.6);
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(panel);

    this.tideSpeedSlider = panel.querySelector(
      '#tideSpeedSlider'
    ) as HTMLInputElement;
    this.glowIntensitySlider = panel.querySelector(
      '#glowIntensitySlider'
    ) as HTMLInputElement;
    this.trailToggle = panel.querySelector(
      '#trailToggle'
    ) as HTMLInputElement;

    this.tideSpeedSlider.addEventListener('input', (e) => {
      this.settings.tideSpeed = parseFloat(
        (e.target as HTMLInputElement).value
      );
      this.tideSpeedValue.textContent = this.settings.tideSpeed.toFixed(1);
    });

    this.glowIntensitySlider.addEventListener('input', (e) => {
      this.settings.glowIntensity = parseFloat(
        (e.target as HTMLInputElement).value
      );
      this.glowIntensityValue.textContent =
        this.settings.glowIntensity.toFixed(1);
    });

    this.trailToggle.addEventListener('change', (e) => {
      this.settings.trailEnabled = (e.target as HTMLInputElement).checked;
    });

    return panel;
  }

  private bindEvents() {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousemove', (e) => {
      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    canvas.addEventListener('click', (e) => {
      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const meshes = this.planktonSystem.getMeshes();
      const intersects = this.raycaster.intersectObjects(meshes, false);

      if (intersects.length > 0) {
        const hitMesh = intersects[0].object as THREE.Mesh;
        const plankton = this.planktonSystem.triggerSurge(hitMesh);
        if (plankton) {
          this.showCard(
            e.clientX,
            e.clientY,
            plankton.name,
            plankton.brightness,
            plankton.clickCount
          );
        }
      }
    });

    canvas.addEventListener('mouseleave', () => {
      this.mouse.set(-999, -999);
      this.planktonSystem.setHovered(null);
      this.hoveredMesh = null;
    });
  }

  private showCard(
    x: number,
    y: number,
    name: string,
    brightness: number,
    clicks: number
  ) {
    const card = this.cardEl;
    card.querySelector('#card-name')!.textContent = name;
    card.querySelector('#card-brightness')!.textContent = String(brightness);
    card.querySelector('#card-clicks')!.textContent = String(clicks);

    const cardWidth = 240;
    const cardHeight = 160;
    let left = x + 20;
    let top = y - cardHeight / 2;
    if (left + cardWidth > window.innerWidth) left = x - cardWidth - 20;
    if (top < 10) top = 10;
    if (top + cardHeight > window.innerHeight - 10)
      top = window.innerHeight - cardHeight - 10;

    card.style.left = `${left}px`;
    card.style.top = `${top}px`;
    card.style.display = 'block';
    card.classList.remove('hiding');
    requestAnimationFrame(() => {
      card.classList.add('visible');
    });
  }

  private hideCard() {
    const card = this.cardEl;
    card.classList.add('hiding');
    card.classList.remove('visible');
    setTimeout(() => {
      card.style.display = 'none';
      card.classList.remove('hiding');
    }, 350);
  }

  update() {
    if (this.mouse.x < -1 || this.mouse.x > 1) return;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const meshes = this.planktonSystem.getMeshes();
    const intersects = this.raycaster.intersectObjects(meshes, false);

    const newHovered =
      intersects.length > 0 ? (intersects[0].object as THREE.Mesh) : null;

    if (newHovered !== this.hoveredMesh) {
      this.hoveredMesh = newHovered;
      this.planktonSystem.setHovered(newHovered);
      this.renderer.domElement.style.cursor = newHovered ? 'pointer' : 'grab';
    }
  }
}
