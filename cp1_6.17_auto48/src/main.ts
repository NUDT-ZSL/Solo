import * as THREE from 'three';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import * as TWEEN from '@tweenjs/tween.js';
import { StarField } from './starField';
import { ZodiacManager } from './zodiacManager';
import { UIPanel } from './uiPanel';
import constellationsData from './data/constellations';

const R = 12;

class StarLegendApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private labelRenderer: CSS2DRenderer;
  private starField: StarField;
  private zodiacManager: ZodiacManager;
  private uiPanel: UIPanel;
  private container: HTMLElement;
  private clock = new THREE.Clock();

  private isMythMode = false;
  private colorTransitionValue = 0;
  private colorTransitionTarget = 0;

  private zodiacRing: THREE.Mesh | null = null;
  private sunMarker: THREE.Mesh | null = null;
  private sunGlow: THREE.Sprite | null = null;
  private isAnimatingSun = false;
  private sunAngle = 0;

  private cameraTarget = new THREE.Vector3(0, 0, 0);
  private defaultCameraPos = new THREE.Vector3(0, 4, 30);

  private collectedCount = 0;
  private totalConstellations = 13;
  private progressBar: HTMLElement | null = null;
  private progressFill: HTMLElement | null = null;

  private toolbar: HTMLElement | null = null;
  private modeToggle: HTMLElement | null = null;

  constructor() {
    this.container = document.getElementById('app')!;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
    this.camera.position.copy(this.defaultCameraPos);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.container.appendChild(this.renderer.domElement);

    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
    this.labelRenderer.domElement.style.position = 'absolute';
    this.labelRenderer.domElement.style.top = '0';
    this.labelRenderer.domElement.style.left = '0';
    this.labelRenderer.domElement.style.pointerEvents = 'none';
    this.container.appendChild(this.labelRenderer.domElement);

    this.starField = new StarField(this.scene, this.camera);
    this.zodiacManager = new ZodiacManager(this.scene, this.camera, this.labelRenderer);
    this.uiPanel = new UIPanel(this.container, this.zodiacManager);

    this.buildZodiacRing();
    this.buildUI();
    this.bindEvents();
    this.animate();
  }

  private buildZodiacRing() {
    const ringGeo = new THREE.TorusGeometry(12, 0.6, 2, 128);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x4fc3f7,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
    });
    this.zodiacRing = new THREE.Mesh(ringGeo, ringMat);
    this.zodiacRing.rotation.x = Math.PI / 2;
    this.scene.add(this.zodiacRing);
  }

  private buildUI() {
    this.buildToolbar();
    this.buildModeToggle();
    this.buildProgressBar();
  }

  private buildToolbar() {
    this.toolbar = document.createElement('div');
    this.toolbar.className = 'season-toolbar';
    this.toolbar.innerHTML = `
      <div class="toolbar-title">星座筛选</div>
      <div class="toolbar-options">
        <div class="toolbar-option active" data-season="all">全部星座</div>
        <div class="toolbar-option" data-season="spring">春季星座</div>
        <div class="toolbar-option" data-season="summer">夏季星座</div>
        <div class="toolbar-option" data-season="autumn">秋季星座</div>
        <div class="toolbar-option" data-season="winter">冬季星座</div>
      </div>
    `;

    const style = document.createElement('style');
    style.textContent = `
      .season-toolbar {
        position: absolute;
        left: 16px;
        top: 50%;
        transform: translateY(-50%);
        width: 200px;
        background: rgba(10, 10, 30, 0.7);
        border-radius: 8px;
        padding: 16px;
        z-index: 50;
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        border: 1px solid rgba(255,255,255,0.1);
      }
      .toolbar-title {
        color: #81D4FA;
        font-size: 14px;
        font-weight: 600;
        margin-bottom: 12px;
        font-family: 'Noto Sans SC', sans-serif;
      }
      .toolbar-options {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .toolbar-option {
        color: #FFFFFF;
        font-size: 16px;
        padding: 8px 12px;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
        font-family: 'Noto Sans SC', sans-serif;
        background: transparent;
        border: 1px solid transparent;
      }
      .toolbar-option:hover {
        background: rgba(255,255,255,0.1);
      }
      .toolbar-option.active {
        background: rgba(129, 212, 250, 0.15);
        color: #81D4FA;
        border-color: rgba(129, 212, 250, 0.3);
      }
      @media (max-width: 768px) {
        .season-toolbar {
          left: 0;
          right: 0;
          top: auto;
          bottom: 0;
          transform: none;
          width: 100%;
          border-radius: 12px 12px 0 0;
          max-height: 50px;
          overflow: hidden;
          transition: max-height 0.3s;
          padding: 12px 16px;
        }
        .season-toolbar.expanded {
          max-height: 300px;
        }
        .toolbar-options {
          flex-direction: row;
          flex-wrap: wrap;
          gap: 8px;
        }
        .toolbar-option {
          font-size: 13px;
          padding: 6px 10px;
        }
      }
    `;
    this.toolbar.prepend(style);

    const options = this.toolbar.querySelectorAll('.toolbar-option');
    options.forEach(opt => {
      opt.addEventListener('click', () => {
        options.forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
        const season = (opt as HTMLElement).dataset.season!;
        this.zodiacManager.filterBySeason(season);
      });
    });

    if (window.innerWidth <= 768) {
      let isExpanded = false;
      this.toolbar.addEventListener('click', (e) => {
        if (!isExpanded) {
          this.toolbar!.classList.add('expanded');
          isExpanded = true;
          e.stopPropagation();
        }
      });
      document.addEventListener('click', () => {
        if (isExpanded) {
          this.toolbar!.classList.remove('expanded');
          isExpanded = false;
        }
      });
    }

    this.container.appendChild(this.toolbar);
  }

  private buildModeToggle() {
    this.modeToggle = document.createElement('div');
    this.modeToggle.className = 'mode-toggle';
    this.modeToggle.innerHTML = `
      <button class="mode-btn active" data-mode="real">🌌 真实星空</button>
      <button class="mode-btn" data-mode="myth">📜 神话模式</button>
    `;

    const style = document.createElement('style');
    style.textContent = `
      .mode-toggle {
        position: absolute;
        top: 16px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        gap: 4px;
        background: rgba(10, 10, 30, 0.7);
        border-radius: 8px;
        padding: 4px;
        z-index: 50;
        backdrop-filter: blur(8px);
        border: 1px solid rgba(255,255,255,0.1);
      }
      .mode-btn {
        padding: 8px 16px;
        border-radius: 8px;
        border: 1px solid transparent;
        background: transparent;
        color: #B0C4DE;
        font-size: 13px;
        cursor: pointer;
        transition: all 0.2s;
        font-family: 'Noto Sans SC', sans-serif;
      }
      .mode-btn:hover {
        background: rgba(255,255,255,0.1);
      }
      .mode-btn.active {
        background: rgba(129, 212, 250, 0.15);
        color: #81D4FA;
        border-color: rgba(129, 212, 250, 0.3);
      }
    `;
    this.modeToggle.prepend(style);

    const btns = this.modeToggle.querySelectorAll('.mode-btn');
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        btns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const mode = (btn as HTMLElement).dataset.mode!;
        this.isMythMode = mode === 'myth';
        this.colorTransitionTarget = this.isMythMode ? 1 : 0;
        this.zodiacManager.setMythMode(this.isMythMode, this.colorTransitionValue);

        if (this.isMythMode) {
          document.body.style.background = 'radial-gradient(ellipse at center, #2A0044 0%, #1A0033 100%)';
          if (this.zodiacRing) {
            (this.zodiacRing.material as THREE.MeshBasicMaterial).color.set(0xb71c1c);
          }
        } else {
          document.body.style.background = 'radial-gradient(ellipse at center, #0D0D2B 0%, #0A0A23 100%)';
          if (this.zodiacRing) {
            (this.zodiacRing.material as THREE.MeshBasicMaterial).color.set(0x4fc3f7);
          }
        }
      });
    });

    this.container.appendChild(this.modeToggle);
  }

  private buildProgressBar() {
    this.progressBar = document.createElement('div');
    this.progressBar.className = 'progress-bar-container';
    this.progressBar.innerHTML = `
      <div class="progress-label">已收集 <span class="progress-count">0</span>/${this.totalConstellations}</div>
      <div class="progress-track">
        <div class="progress-fill" style="width: 0%"></div>
      </div>
    `;

    const style = document.createElement('style');
    style.textContent = `
      .progress-bar-container {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        z-index: 50;
        padding: 8px 20px;
        background: rgba(10, 10, 30, 0.5);
      }
      .progress-label {
        color: #B0C4DE;
        font-size: 12px;
        font-family: 'Noto Sans SC', sans-serif;
        margin-bottom: 4px;
      }
      .progress-count {
        color: #FFD54F;
        font-weight: 600;
      }
      .progress-track {
        width: 100%;
        height: 6px;
        background: rgba(255,255,255,0.1);
        border-radius: 3px;
        overflow: hidden;
      }
      .progress-fill {
        height: 100%;
        background: #FFD54F;
        border-radius: 3px;
        transition: width 0.5s ease;
      }
    `;
    this.progressBar.prepend(style);
    this.container.appendChild(this.progressBar);

    this.progressFill = this.progressBar.querySelector('.progress-fill');
  }

  private updateProgress() {
    if (this.progressFill) {
      const pct = (this.collectedCount / this.totalConstellations) * 100;
      this.progressFill.style.width = `${pct}%`;
    }
    const countEl = this.progressBar?.querySelector('.progress-count');
    if (countEl) countEl.textContent = String(this.collectedCount);
  }

  private bindEvents() {
    window.addEventListener('resize', () => this.onResize());

    window.addEventListener('keydown', (e) => {
      if (e.key === 't' || e.key === 'T') {
        this.uiPanel.show('leo');
      }
    });

    this.renderer.domElement.addEventListener('click', (e) => {
      this.zodiacManager.handleClick(e, this.renderer.domElement);
    });

    this.renderer.domElement.addEventListener('mousemove', (e) => {
      this.zodiacManager.handleHover(e, this.renderer.domElement);
    });

    this.zodiacManager.setOnConstellationClick((id: string) => {
      const center = this.zodiacManager.getConstellationCenterById(id);
      this.animateCameraTo(center);

      setTimeout(() => {
        this.uiPanel.show(id);
      }, 300);
    });

    this.uiPanel.setOnCollect((id: string) => {
      this.collectedCount = this.zodiacManager.getCollectedCount();
      this.updateProgress();
    });

    this.uiPanel.on('startApparentMotion', () => {
      this.startApparentMotion();
    });

    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let cameraTheta = 0;
    let cameraPhi = Math.PI / 2;
    const cameraRadius = 45;

    this.renderer.domElement.addEventListener('mousedown', (e) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    this.renderer.domElement.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const deltaMove = {
        x: e.clientX - previousMousePosition.x,
        y: e.clientY - previousMousePosition.y,
      };
      cameraTheta -= deltaMove.x * 0.005;
      cameraPhi = Math.max(0.3, Math.min(Math.PI - 0.3, cameraPhi - deltaMove.y * 0.005));
      previousMousePosition = { x: e.clientX, y: e.clientY };

      this.camera.position.x = cameraRadius * Math.sin(cameraPhi) * Math.cos(cameraTheta);
      this.camera.position.y = cameraRadius * Math.cos(cameraPhi);
      this.camera.position.z = cameraRadius * Math.sin(cameraPhi) * Math.sin(cameraTheta);
      this.camera.lookAt(0, 0, 0);
    });

    this.renderer.domElement.addEventListener('mouseup', () => {
      isDragging = false;
    });

    this.renderer.domElement.addEventListener('wheel', (e) => {
      const zoomSpeed = 0.02;
      const direction = new THREE.Vector3();
      this.camera.getWorldDirection(direction);
      this.camera.position.addScaledVector(direction, -e.deltaY * zoomSpeed);

      const dist = this.camera.position.length();
      if (dist < 15) this.camera.position.setLength(15);
      if (dist > 80) this.camera.position.setLength(80);
    });
  }

  private animateCameraTo(target: THREE.Vector3) {
    const direction = new THREE.Vector3().subVectors(this.camera.position, target).normalize();
    const newCamPos = target.clone().add(direction.multiplyScalar(12));

    new TWEEN.Tween(this.camera.position)
      .to({ x: newCamPos.x, y: newCamPos.y, z: newCamPos.z }, 600)
      .easing(TWEEN.Easing.Cubic.InOut)
      .start();

    new TWEEN.Tween(this.cameraTarget)
      .to({ x: target.x, y: target.y, z: target.z }, 600)
      .easing(TWEEN.Easing.Cubic.InOut)
      .onUpdate(() => {
        this.camera.lookAt(this.cameraTarget);
      })
      .start();
  }

  private startApparentMotion() {
    if (this.isAnimatingSun) return;
    this.isAnimatingSun = true;

    const sunGeo = new THREE.SphereGeometry(0.8, 16, 16);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffd54f });
    this.sunMarker = new THREE.Mesh(sunGeo, sunMat);
    this.scene.add(this.sunMarker);

    const glowTexture = this.createGlowTexture();
    const glowMat = new THREE.SpriteMaterial({
      map: glowTexture,
      color: 0xffd54f,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    });
    this.sunGlow = new THREE.Sprite(glowMat);
    this.sunGlow.scale.set(4, 4, 1);
    this.scene.add(this.sunGlow);

    const duration = 15000;
    const startTime = Date.now();

    const animate = () => {
      if (!this.isAnimatingSun) return;
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      this.sunAngle = progress * Math.PI * 2;
      const sunX = R * Math.cos(this.sunAngle);
      const sunZ = R * Math.sin(this.sunAngle);
      const sunY = Math.sin(this.sunAngle * 2) * 0.5;

      if (this.sunMarker) {
        this.sunMarker.position.set(sunX, sunY, sunZ);
      }
      if (this.sunGlow) {
        this.sunGlow.position.set(sunX, sunY, sunZ);
      }

      const currentDate = this.getDateFromProgress(progress);
      const currentConstellation = this.getConstellationFromAngle(this.sunAngle);
      this.uiPanel.showDateOverlay(currentDate, currentConstellation);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.stopApparentMotion();
      }
    };

    requestAnimationFrame(animate);
  }

  private stopApparentMotion() {
    this.isAnimatingSun = false;
    if (this.sunMarker) {
      this.scene.remove(this.sunMarker);
      this.sunMarker.geometry.dispose();
      (this.sunMarker.material as THREE.Material).dispose();
      this.sunMarker = null;
    }
    if (this.sunGlow) {
      this.scene.remove(this.sunGlow);
      (this.sunGlow.material as THREE.SpriteMaterial).dispose();
      this.sunGlow = null;
    }
    this.uiPanel.hideDateOverlay();
  }

  private createGlowTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(255, 213, 79, 1)');
    gradient.addColorStop(0.3, 'rgba(255, 213, 79, 0.4)');
    gradient.addColorStop(1, 'rgba(255, 213, 79, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  private getDateFromProgress(progress: number): string {
    const start = new Date(2026, 0, 1);
    const dayOfYear = Math.floor(progress * 365);
    start.setDate(start.getDate() + dayOfYear);
    return start.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  private getConstellationFromAngle(angle: number): string {
    const normalizedAngle = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const segment = (normalizedAngle / (Math.PI * 2)) * 12;
    const index = Math.floor(segment) % 12;
    const sortedConstellations = [...constellationsData].sort((a, b) => a.eclipticAngle - b.eclipticAngle);
    return sortedConstellations[index]?.nameCN || '未知星座';
  }

  private onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate() {
    requestAnimationFrame(() => this.animate());

    const time = this.clock.getElapsedTime();

    TWEEN.update();

    const colorSpeed = 0.03;
    if (this.colorTransitionValue < this.colorTransitionTarget) {
      this.colorTransitionValue = Math.min(this.colorTransitionValue + colorSpeed, this.colorTransitionTarget);
    } else if (this.colorTransitionValue > this.colorTransitionTarget) {
      this.colorTransitionValue = Math.max(this.colorTransitionValue - colorSpeed, this.colorTransitionTarget);
    }

    this.starField.setMythMode(this.isMythMode, this.colorTransitionValue);
    this.zodiacManager.setMythMode(this.isMythMode, this.colorTransitionValue);

    this.starField.update(time);
    this.zodiacManager.update(time);

    if (this.zodiacRing) {
      if (this.isMythMode) {
        const ringColor = new THREE.Color(0x4fc3f7).lerp(new THREE.Color(0xb71c1c), this.colorTransitionValue);
        (this.zodiacRing.material as THREE.MeshBasicMaterial).color.copy(ringColor);
      }
    }

    this.renderer.render(this.scene, this.camera);
    this.labelRenderer.render(this.scene, this.camera);
  }
}

new StarLegendApp();
