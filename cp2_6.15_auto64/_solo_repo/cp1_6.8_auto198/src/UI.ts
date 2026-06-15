import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TideSystem } from './TideSystem';
import { ParticleSystem } from './ParticleSystem';

const DREAM_FRAGMENTS = [
  '意识的潮汐退去，留下记忆的贝壳散落在沙滩上……',
  '在梦的深处，每一滴海水都是一个未完成的故事……',
  '时间像潮水般涌来，又在指缝间悄然退去……',
  '迷雾中，有人低语着被遗忘的名字……',
  '浪花碎裂的瞬间，映出另一个世界的轮廓……',
  '深海的尽头，是一扇从未关上的门……',
  '潮声渐远，梦境的边缘开始模糊……',
  '星光沉入海底，化作最温柔的光芒……',
  '意识的碎片在潮汐中旋转，拼凑出遗忘的画面……',
  '海平面下，藏着一个永远不会醒来的梦……',
];

export class UI {
  private container: HTMLElement;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private tideSystem: TideSystem;
  private particleSystem: ParticleSystem;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private defaultCameraPosition: THREE.Vector3;
  private defaultCameraTarget: THREE.Vector3;
  private panel: HTMLElement | null = null;
  private infoCard: HTMLElement | null = null;
  private currentFragmentIndex: number = 0;
  private cardTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(
    container: HTMLElement,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    tideSystem: TideSystem,
    particleSystem: ParticleSystem
  ) {
    this.container = container;
    this.camera = camera;
    this.renderer = renderer;
    this.tideSystem = tideSystem;
    this.particleSystem = particleSystem;

    this.defaultCameraPosition = camera.position.clone();
    this.defaultCameraTarget = new THREE.Vector3(0, 0, 0);

    this.controls = new OrbitControls(camera, renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 20;
    this.controls.maxDistance = 150;
    this.controls.maxPolarAngle = Math.PI * 0.48;
    this.controls.minPolarAngle = Math.PI * 0.1;
    this.controls.target.copy(this.defaultCameraTarget);

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.createPanel();
    this.createInfoCard();
    this.bindEvents();
  }

  private createPanel(): void {
    this.panel = document.createElement('div');
    this.panel.id = 'control-panel';
    this.panel.innerHTML = `
      <div class="panel-title">潮汐织梦</div>
      <div class="control-group">
        <label>潮汐流速</label>
        <input type="range" id="tide-speed" min="0.1" max="3.0" step="0.1" value="1.0" />
        <span id="tide-speed-val">1.0</span>
      </div>
      <div class="control-group">
        <label>粒子密度</label>
        <input type="range" id="particle-density" min="0.2" max="2.0" step="0.1" value="1.0" />
        <span id="particle-density-val">1.0</span>
      </div>
      <button id="reset-view">重置视角</button>
    `;

    const style = document.createElement('style');
    style.textContent = `
      #control-panel {
        position: fixed;
        bottom: 24px;
        right: 24px;
        padding: 20px 24px;
        background: rgba(15, 15, 40, 0.55);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(120, 130, 200, 0.25);
        border-radius: 16px;
        color: rgba(200, 200, 240, 0.9);
        font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
        font-size: 13px;
        z-index: 100;
        min-width: 200px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), inset 0 0 0 1px rgba(255, 255, 255, 0.05);
        animation: panelFadeIn 1.2s ease-out;
        user-select: none;
      }
      @keyframes panelFadeIn {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .panel-title {
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 16px;
        text-align: center;
        letter-spacing: 4px;
        color: rgba(180, 180, 240, 0.95);
        text-shadow: 0 0 12px rgba(100, 120, 220, 0.4);
      }
      .control-group {
        margin-bottom: 14px;
      }
      .control-group label {
        display: block;
        margin-bottom: 6px;
        font-size: 12px;
        color: rgba(160, 170, 220, 0.8);
      }
      .control-group input[type="range"] {
        -webkit-appearance: none;
        width: 100%;
        height: 4px;
        border-radius: 2px;
        background: rgba(80, 90, 150, 0.4);
        outline: none;
      }
      .control-group input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: rgba(130, 150, 230, 0.9);
        cursor: pointer;
        box-shadow: 0 0 8px rgba(100, 120, 220, 0.5);
      }
      .control-group span {
        display: inline-block;
        margin-top: 4px;
        font-size: 11px;
        color: rgba(140, 150, 210, 0.7);
      }
      #reset-view {
        width: 100%;
        padding: 8px 0;
        margin-top: 8px;
        background: rgba(80, 90, 160, 0.25);
        border: 1px solid rgba(120, 130, 200, 0.3);
        border-radius: 8px;
        color: rgba(180, 190, 240, 0.9);
        font-size: 13px;
        cursor: pointer;
        transition: all 0.3s ease;
        font-family: inherit;
        letter-spacing: 2px;
      }
      #reset-view:hover {
        background: rgba(100, 110, 180, 0.4);
        border-color: rgba(150, 160, 230, 0.5);
        box-shadow: 0 0 12px rgba(100, 120, 220, 0.3);
      }
    `;
    document.head.appendChild(style);
    this.container.appendChild(this.panel);

    const tideSpeedSlider = document.getElementById('tide-speed') as HTMLInputElement;
    const tideSpeedVal = document.getElementById('tide-speed-val') as HTMLSpanElement;
    tideSpeedSlider.addEventListener('input', () => {
      const val = parseFloat(tideSpeedSlider.value);
      tideSpeedVal.textContent = val.toFixed(1);
      this.tideSystem.setTideSpeed(val);
      this.particleSystem.setTideSpeed(val);
    });

    const densitySlider = document.getElementById('particle-density') as HTMLInputElement;
    const densityVal = document.getElementById('particle-density-val') as HTMLSpanElement;
    densitySlider.addEventListener('input', () => {
      const val = parseFloat(densitySlider.value);
      densityVal.textContent = val.toFixed(1);
      this.particleSystem.setDensity(val);
    });

    const resetBtn = document.getElementById('reset-view') as HTMLButtonElement;
    resetBtn.addEventListener('click', () => {
      this.resetCamera();
    });
  }

  private createInfoCard(): void {
    this.infoCard = document.createElement('div');
    this.infoCard.id = 'dream-card';
    this.infoCard.style.cssText = `
      position: fixed;
      padding: 20px 28px;
      background: rgba(15, 15, 45, 0.5);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border: 1px solid rgba(130, 140, 210, 0.2);
      border-radius: 14px;
      color: rgba(200, 205, 240, 0.92);
      font-family: 'PingFang SC', 'Microsoft YaHei', serif;
      font-size: 15px;
      line-height: 1.8;
      letter-spacing: 1.5px;
      max-width: 320px;
      pointer-events: none;
      z-index: 90;
      opacity: 0;
      transform: translateY(10px);
      transition: opacity 0.8s ease, transform 0.8s ease;
      box-shadow: 0 6px 24px rgba(0, 0, 0, 0.25), inset 0 0 0 1px rgba(255, 255, 255, 0.04);
      text-shadow: 0 0 8px rgba(100, 120, 220, 0.3);
    `;
    this.container.appendChild(this.infoCard);
  }

  private showInfoCard(screenX: number, screenY: number): void {
    if (!this.infoCard) return;

    this.infoCard.textContent = DREAM_FRAGMENTS[this.currentFragmentIndex];
    this.currentFragmentIndex = (this.currentFragmentIndex + 1) % DREAM_FRAGMENTS.length;

    const cardWidth = 320;
    const cardHeight = 80;
    let left = screenX + 20;
    let top = screenY - cardHeight / 2;

    if (left + cardWidth > window.innerWidth) left = screenX - cardWidth - 20;
    if (top < 10) top = 10;
    if (top + cardHeight > window.innerHeight) top = window.innerHeight - cardHeight - 10;

    this.infoCard.style.left = left + 'px';
    this.infoCard.style.top = top + 'px';
    this.infoCard.style.opacity = '1';
    this.infoCard.style.transform = 'translateY(0)';

    if (this.cardTimeout) clearTimeout(this.cardTimeout);
    this.cardTimeout = setTimeout(() => {
      if (this.infoCard) {
        this.infoCard.style.opacity = '0';
        this.infoCard.style.transform = 'translateY(10px)';
      }
    }, 3500);
  }

  private bindEvents(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('click', (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObject(this.tideSystem.mesh);

      if (intersects.length > 0) {
        const point = intersects[0].point;
        const time = performance.now() / 1000;

        this.tideSystem.addClickPoint(point, time);
        this.particleSystem.triggerBurst(point);
        this.showInfoCard(event.clientX, event.clientY);
      }
    });

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  private resetCamera(): void {
    const startPos = this.camera.position.clone();
    const startTarget = this.controls.target.clone();
    const duration = 1000;
    const startTime = performance.now();

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      this.camera.position.lerpVectors(startPos, this.defaultCameraPosition, eased);
      this.controls.target.lerpVectors(startTarget, this.defaultCameraTarget, eased);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    animate();
  }

  update(): void {
    this.controls.update();
  }
}
