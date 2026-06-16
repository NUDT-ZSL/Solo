import * as THREE from 'three';
import { GUI } from 'dat.gui';
import { DataManager } from './dataManager';
import { ParticleSystem } from './particleSystem';
import { ForceField } from './forceField';

class FinanceForceFieldApp {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private canvas!: HTMLCanvasElement;
  private clock!: THREE.Clock;

  private dataManager!: DataManager;
  private particleSystem!: ParticleSystem;
  private forceField!: ForceField;

  private selectedPathLine: THREE.Line | null = null;
  private selectedStockIndex: number = -1;

  private gui!: GUI;
  private guiParams = {
    particleSize: 0.08,
    correlationThreshold: 0.6,
    rotationSpeed: 0.5,
    colorScheme: 'redGreen' as 'redGreen' | 'warmGradient',
    showAxes: true
  };

  private isDragging: boolean = false;
  private previousMousePosition: { x: number; y: number } = { x: 0, y: 0 };
  private spherical: { radius: number; theta: number; phi: number } = {
    radius: 12,
    theta: Math.PI / 4,
    phi: Math.PI / 3
  };
  private targetSpherical = { ...this.spherical };

  private mouse: THREE.Vector2 = new THREE.Vector2();
  private hoveredStockIndex: number = -1;

  private frameCount: number = 0;
  private lastFpsUpdate: number = 0;
  private currentFps: number = 60;

  private axesHelper: THREE.AxesHelper | null = null;

  constructor() {
    this.canvas = document.getElementById('scene-canvas') as HTMLCanvasElement;
    this.clock = new THREE.Clock();

    this.setupThreeJS();
    this.setupDataAndVisuals();
    this.setupGUI();
    this.setupEventListeners();
    this.setupUI();
    this.animate();
  }

  private setupThreeJS(): void {
    this.scene = new THREE.Scene();
    this.setupGradientBackground();

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.updateCameraPosition();

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    this.scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0x6366f1, 0.5, 50);
    pointLight.position.set(-5, 5, -5);
    this.scene.add(pointLight);

    this.axesHelper = new THREE.AxesHelper(6);
    this.scene.add(this.axesHelper);
  }

  private setupGradientBackground(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#0B0E1E');
    gradient.addColorStop(1, '#1A1F3A');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);

    const texture = new THREE.CanvasTexture(canvas);
    this.scene.background = texture;
  }

  private setupDataAndVisuals(): void {
    this.dataManager = new DataManager(30, 60);

    this.particleSystem = new ParticleSystem(this.scene, this.dataManager, {
      particleSize: this.guiParams.particleSize,
      colorScheme: this.guiParams.colorScheme,
      emissiveIntensity: 0.2
    });

    this.forceField = new ForceField(this.scene, this.dataManager, this.particleSystem, {
      correlationThreshold: this.guiParams.correlationThreshold,
      baseOpacity: 0.3,
      lineWidth: 0.005
    });

    this.addGridReference();
  }

  private addGridReference(): void {
    const gridHelper = new THREE.GridHelper(12, 12, 0x444466, 0x222244);
    gridHelper.position.y = -5;
    this.scene.add(gridHelper);
  }

  private setupGUI(): void {
    this.gui = new GUI({ width: 260 });
    this.gui.domElement.style.position = 'absolute';
    this.gui.domElement.style.top = '20px';
    this.gui.domElement.style.right = '20px';
    this.gui.domElement.style.left = 'auto';
    this.gui.domElement.style.borderRadius = '12px';
    this.gui.domElement.style.background = 'rgba(15, 18, 34, 0.8)';

    const particleFolder = this.gui.addFolder('粒子设置');
    particleFolder.add(this.guiParams, 'particleSize', 0.05, 0.2, 0.01)
      .name('粒子大小')
      .onChange((val: number) => {
        this.particleSystem.updateParticleSize(val);
      });

    particleFolder.add(this.guiParams, 'colorScheme', {
      '红涨绿跌': 'redGreen',
      '暖色渐变': 'warmGradient'
    })
      .name('颜色方案')
      .onChange((val: 'redGreen' | 'warmGradient') => {
        this.particleSystem.setColorScheme(val);
      });

    const forceFolder = this.gui.addFolder('力场设置');
    forceFolder.add(this.guiParams, 'correlationThreshold', 0.4, 0.9, 0.05)
      .name('连接阈值')
      .onChange((val: number) => {
        this.forceField.updateCorrelationThreshold(val);
      });

    const sceneFolder = this.gui.addFolder('场景设置');
    sceneFolder.add(this.guiParams, 'rotationSpeed', 0, 2, 0.1)
      .name('旋转速度');

    sceneFolder.add(this.guiParams, 'showAxes')
      .name('显示坐标轴')
      .onChange((val: boolean) => {
        if (this.axesHelper) this.axesHelper.visible = val;
      });
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onWindowResize.bind(this));

    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    window.addEventListener('mouseup', this.onMouseUp.bind(this));
    window.addEventListener('mousemove', this.onMouseMove.bind(this));

    this.canvas.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
    this.canvas.addEventListener('click', this.onClick.bind(this));

    this.canvas.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    this.canvas.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    this.canvas.addEventListener('touchend', this.onTouchEnd.bind(this));
  }

  private setupUI(): void {
    document.getElementById('stock-count')!.textContent = String(this.dataManager.getStockCount());
    document.getElementById('point-count')!.textContent = String(this.dataManager.getAllDataPoints().length);
    document.getElementById('selected-stock')!.textContent = '无';

    const trend = this.dataManager.getMarketTrend();
    const trendEl = document.getElementById('market-trend')!;
    if (trend === 'bullish') {
      trendEl.textContent = '📈 看涨';
      trendEl.className = 'info-value price-up';
    } else if (trend === 'bearish') {
      trendEl.textContent = '📉 看跌';
      trendEl.className = 'info-value price-down';
    } else {
      trendEl.textContent = '➡️ 震荡';
      trendEl.className = 'info-value';
    }

    document.getElementById('reset-view-btn')!.addEventListener('click', () => {
      this.targetSpherical = { radius: 12, theta: Math.PI / 4, phi: Math.PI / 3 };
      this.clearSelection();
    });

    document.getElementById('toggle-lines-btn')!.addEventListener('click', () => {
      const enabled = this.forceField.toggle();
      const btn = document.getElementById('toggle-lines-btn')!;
      btn.textContent = enabled ? '隐藏力场线' : '显示力场线';
    });

    document.getElementById('close-detail')!.addEventListener('click', () => {
      this.hideDetailPanel();
    });
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private onMouseDown(e: MouseEvent): void {
    this.isDragging = true;
    this.previousMousePosition = { x: e.clientX, y: e.clientY };
  }

  private onMouseUp(): void {
    this.isDragging = false;
  }

  private onMouseMove(e: MouseEvent): void {
    this.updateMouse(e.clientX, e.clientY);

    if (this.isDragging) {
      const deltaX = e.clientX - this.previousMousePosition.x;
      const deltaY = e.clientY - this.previousMousePosition.y;

      this.targetSpherical.theta -= deltaX * 0.005;
      this.targetSpherical.phi = Math.max(
        0.1,
        Math.min(Math.PI - 0.1, this.targetSpherical.phi - deltaY * 0.005)
      );

      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    } else {
      this.handleHover();
    }
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    e.stopPropagation();
    const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
    this.targetSpherical.radius = Math.max(
      2,
      Math.min(20, this.targetSpherical.radius * zoomFactor)
    );
  }

  private onClick(): void {
    if (this.isDragging) return;

    const result = this.particleSystem.detectClick(this.mouse, this.camera);
    if (result) {
      this.selectStock(result.stockIndex, result.dayIndex);
    } else {
      this.clearSelection();
    }
  }

  private onTouchStart(e: TouchEvent): void {
    if (e.touches.length === 1) {
      e.preventDefault();
      const touch = e.touches[0];
      this.isDragging = true;
      this.previousMousePosition = { x: touch.clientX, y: touch.clientY };
      this.updateMouse(touch.clientX, touch.clientY);
    }
  }

  private onTouchMove(e: TouchEvent): void {
    if (e.touches.length === 1 && this.isDragging) {
      e.preventDefault();
      const touch = e.touches[0];
      const deltaX = touch.clientX - this.previousMousePosition.x;
      const deltaY = touch.clientY - this.previousMousePosition.y;

      this.targetSpherical.theta -= deltaX * 0.005;
      this.targetSpherical.phi = Math.max(
        0.1,
        Math.min(Math.PI - 0.1, this.targetSpherical.phi - deltaY * 0.005)
      );

      this.previousMousePosition = { x: touch.clientX, y: touch.clientY };
      this.updateMouse(touch.clientX, touch.clientY);
    }
  }

  private onTouchEnd(e: TouchEvent): void {
    if (this.isDragging && e.changedTouches.length === 1) {
      const result = this.particleSystem.detectClick(this.mouse, this.camera);
      if (result) {
        this.selectStock(result.stockIndex, result.dayIndex);
      }
    }
    this.isDragging = false;
  }

  private updateMouse(clientX: number, clientY: number): void {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  }

  private handleHover(): void {
    const hovered = this.particleSystem.detectHover(this.mouse, this.camera);
    if (hovered !== this.hoveredStockIndex) {
      if (this.hoveredStockIndex >= 0 && this.hoveredStockIndex !== this.selectedStockIndex) {
        this.particleSystem.clearHighlight();
      }
      this.hoveredStockIndex = hovered;
      if (hovered >= 0 && hovered !== this.selectedStockIndex) {
        this.particleSystem.hoverHighlightStock(hovered);
        this.forceField.setHoveredStock(hovered);
        this.canvas.style.cursor = 'pointer';
      } else if (hovered < 0) {
        this.forceField.clearHover();
        if (this.selectedStockIndex < 0) {
          this.particleSystem.clearHighlight();
        } else {
          this.particleSystem.highlightStock(this.selectedStockIndex);
        }
        this.canvas.style.cursor = 'grab';
      }
    }
  }

  private selectStock(stockIndex: number, _dayIndex: number): void {
    this.selectedStockIndex = stockIndex;
    this.particleSystem.highlightStock(stockIndex);
    this.drawStockPath(stockIndex);
    this.showDetailPanel(stockIndex);

    const stock = this.dataManager.getStock(stockIndex);
    if (stock) {
      document.getElementById('selected-stock')!.textContent = stock.code;
    }
  }

  private clearSelection(): void {
    this.selectedStockIndex = -1;
    this.particleSystem.clearHighlight();
    this.removeStockPath();
    this.hideDetailPanel();
    document.getElementById('selected-stock')!.textContent = '无';
  }

  private drawStockPath(stockIndex: number): void {
    this.removeStockPath();

    const positions = this.particleSystem.getStockPositions(stockIndex);
    if (positions.length < 2) return;

    const curve = new THREE.CatmullRomCurve3(positions, false, 'catmullrom', 0.5);
    const points = curve.getPoints(positions.length * 5);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    const color = this.particleSystem.getStockLatestColor(stockIndex);
    const material = new THREE.LineBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.95,
      linewidth: 0.02
    });

    this.selectedPathLine = new THREE.Line(geometry, material);
    this.scene.add(this.selectedPathLine);

    const glowMaterial = new THREE.LineBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.4,
      linewidth: 0.06
    });
    const glowLine = new THREE.Line(geometry, glowMaterial);
    this.selectedPathLine.add(glowLine);
  }

  private removeStockPath(): void {
    if (this.selectedPathLine) {
      this.selectedPathLine.geometry.dispose();
      (this.selectedPathLine.material as THREE.Material).dispose();
      this.scene.remove(this.selectedPathLine);
      this.selectedPathLine = null;
    }
  }

  private showDetailPanel(stockIndex: number): void {
    const stock = this.dataManager.getStock(stockIndex);
    if (!stock) return;

    const panel = document.getElementById('detail-panel')!;
    document.getElementById('detail-stock-code')!.textContent = `${stock.code} · ${stock.name}`;
    document.getElementById('detail-price')!.textContent = `¥${stock.latestPrice.toFixed(2)}`;

    const changeEl = document.getElementById('detail-change')!;
    const pctEl = document.getElementById('detail-pct')!;

    if (stock.changeAmount >= 0) {
      changeEl.textContent = `+¥${stock.changeAmount.toFixed(2)}`;
      changeEl.style.color = '#FF4444';
      pctEl.textContent = `+${stock.changePercent.toFixed(2)}%`;
      pctEl.style.color = '#FF4444';
    } else {
      changeEl.textContent = `-¥${Math.abs(stock.changeAmount).toFixed(2)}`;
      changeEl.style.color = '#44FF44';
      pctEl.textContent = `${stock.changePercent.toFixed(2)}%`;
      pctEl.style.color = '#44FF44';
    }

    document.getElementById('detail-open')!.textContent = `¥${stock.initialPrice.toFixed(2)}`;
    document.getElementById('detail-high')!.textContent = `¥${stock.highPrice.toFixed(2)}`;
    document.getElementById('detail-low')!.textContent = `¥${stock.lowPrice.toFixed(2)}`;
    document.getElementById('detail-volume')!.textContent = this.formatVolume(stock.avgVolume);

    panel.style.display = 'block';
  }

  private hideDetailPanel(): void {
    document.getElementById('detail-panel')!.style.display = 'none';
  }

  private formatVolume(vol: number): string {
    if (vol >= 100000000) return (vol / 100000000).toFixed(2) + '亿';
    if (vol >= 10000) return (vol / 10000).toFixed(2) + '万';
    return vol.toString();
  }

  private updateCameraPosition(): void {
    const x = this.spherical.radius * Math.sin(this.spherical.phi) * Math.cos(this.spherical.theta);
    const y = this.spherical.radius * Math.cos(this.spherical.phi);
    const z = this.spherical.radius * Math.sin(this.spherical.phi) * Math.sin(this.spherical.theta);
    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 0, 0);
  }

  private updateFPS(): void {
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsUpdate >= 1000) {
      this.currentFps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsUpdate = now;
      document.getElementById('fps-value')!.textContent = String(this.currentFps);
      document.getElementById('particle-count')!.textContent = String(this.particleSystem.getVisibleCount());
    }
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));

    const delta = this.clock.getDelta();

    this.spherical.radius += (this.targetSpherical.radius - this.spherical.radius) * 0.1;
    this.spherical.theta += (this.targetSpherical.theta - this.spherical.theta) * 0.1;
    this.spherical.phi += (this.targetSpherical.phi - this.spherical.phi) * 0.1;
    this.updateCameraPosition();

    this.particleSystem.animate(delta, this.guiParams.rotationSpeed);
    this.forceField.animate(delta, this.camera);

    const camDistance = this.camera.position.distanceTo(new THREE.Vector3(0, 0, 0));
    this.particleSystem.setLODLevel(camDistance);
    this.forceField.setLODLevel(camDistance);

    if (this.selectedPathLine) {
      this.selectedPathLine.rotation.y = this.particleSystem.getGroup().rotation.y;
    }

    this.renderer.render(this.scene, this.camera);
    this.updateFPS();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new FinanceForceFieldApp();
});
