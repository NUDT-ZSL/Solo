// ============================================================================
// src/main.ts - 应用主入口模块
// 职责：初始化 Three.js 场景、透视相机、WebGL 渲染器，装配各模块，启动渲染循环
// 数据流向：
//   - data/oceanData.ts (数据生成)
//   - src/oceanRenderer.ts (渲染核心，消费数据) → 渲染到画布
//   - src/uiControls.ts (UI控制) → 调用渲染器方法
// 调用关系：
//   - 调用 OceanRenderer.init(scene, camera, renderer, domElement)
//   - 调用 UIControls.init(oceanRenderer, camera, orbitControls)
//   - 每帧调用 OceanRenderer.animate(deltaTime)
// ============================================================================

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { OceanRenderer } from './oceanRenderer.js';
import { UIControls } from './uiControls.js';

class OceanCurrentApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;
  private orbitControls: OrbitControls;

  private oceanRenderer: OceanRenderer;
  private uiControls: UIControls;

  private clock: THREE.Clock;
  private animationId: number = 0;

  private labelElement: HTMLElement | null = null;
  private labelRegion: HTMLElement | null = null;
  private labelSpeed: HTMLElement | null = null;
  private labelDepth: HTMLElement | null = null;

  private _fpsFrames = 0;
  private _fpsLastTime = 0;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a3a5e);
    this.scene.fog = new THREE.FogExp2(0x0a1030, 0.008);

    this.camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    const dist = 80;
    const angle = Math.PI / 4;
    this.camera.position.set(
      0,
      Math.sin(angle) * dist,
      Math.cos(angle) * dist
    );
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x1a3a5e, 1);
    this.container.appendChild(this.renderer.domElement);

    this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbitControls.enableDamping = true;
    this.orbitControls.dampingFactor = 0.08;
    this.orbitControls.minDistance = 20;
    this.orbitControls.maxDistance = 150;
    this.orbitControls.maxPolarAngle = Math.PI * 0.48;

    this.setupLights();
    this.setupReferenceGrid();
    this.setupLabels();

    this.oceanRenderer = new OceanRenderer({
      onHoverChange: (info) => this.updateInfoLabel(info),
      onTransitionStart: () => this.setAppInteraction(false),
      onTransitionComplete: () => this.setAppInteraction(true),
      onBackgroundColorChange: (color) => {
        this.scene.background = color;
      }
    });

    this.uiControls = new UIControls();

    this.oceanRenderer.init(
      this.scene,
      this.camera,
      this.renderer,
      this.renderer.domElement
    );

    this.uiControls.init(this.oceanRenderer, this.camera, this.orbitControls);

    window.addEventListener('resize', this.onResize.bind(this));
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0x8899bb, 0.6);
    this.scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xaaccee, 0.9);
    dirLight1.position.set(30, 50, 30);
    this.scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x8866aa, 0.4);
    dirLight2.position.set(-30, 20, -20);
    this.scene.add(dirLight2);

    const hemisphereLight = new THREE.HemisphereLight(0x6699ff, 0x223366, 0.3);
    this.scene.add(hemisphereLight);
  }

  private setupReferenceGrid(): void {
    const gridHelper = new THREE.GridHelper(100, 20, 0x224488, 0x1a2a4a);
    (gridHelper.material as THREE.Material).opacity = 0.25;
    (gridHelper.material as THREE.Material).transparent = true;
    gridHelper.position.y = -30;
    this.scene.add(gridHelper);

    const axesHelper = new THREE.AxesHelper(8);
    axesHelper.position.set(-45, -29.5, -45);
    this.scene.add(axesHelper);
  }

  private setupLabels(): void {
    this.labelElement = document.getElementById('info-label');
    this.labelRegion = document.getElementById('label-region');
    this.labelSpeed = document.getElementById('label-speed');
    this.labelDepth = document.getElementById('label-depth');
  }

  private updateInfoLabel(info: {
    regionName: string;
    avgSpeed: number;
    depth: number;
    visible: boolean;
    screenX: number;
    screenY: number;
  }): void {
    if (!this.labelElement || !this.labelRegion || !this.labelSpeed || !this.labelDepth) return;

    if (info.visible) {
      this.labelElement.style.display = 'block';
      this.labelRegion.textContent = info.regionName;
      this.labelSpeed.textContent = info.avgSpeed.toFixed(2) + ' 单位/秒';
      this.labelDepth.textContent = info.depth + ' m';

      const offsetX = 20;
      const offsetY = 20;
      const labelWidth = this.labelElement.offsetWidth;
      const labelHeight = this.labelElement.offsetHeight;

      let left = info.screenX + offsetX;
      let top = info.screenY + offsetY;

      if (left + labelWidth > window.innerWidth - 10) {
        left = info.screenX - labelWidth - offsetX;
      }
      if (top + labelHeight > window.innerHeight - 10) {
        top = info.screenY - labelHeight - offsetY;
      }

      this.labelElement.style.left = left + 'px';
      this.labelElement.style.top = top + 'px';
      this.labelElement.style.opacity = '1';
    } else {
      this.labelElement.style.opacity = '0';
      setTimeout(() => {
        if (this.labelElement) {
          this.labelElement.style.display = 'none';
        }
      }, 200);
    }
  }

  private setAppInteraction(enabled: boolean): void {
    this.orbitControls.enabled = enabled;
    this.uiControls.setInteractionEnabled(enabled);
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  start(): void {
    this._fpsLastTime = performance.now();
    this.animate();
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate());

    const delta = Math.min(this.clock.getDelta(), 0.05);

    this.orbitControls.update();
    this.oceanRenderer.animate(delta);

    this.renderer.render(this.scene, this.camera);

    this._fpsFrames++;
    const now = performance.now();
    if (now - this._fpsLastTime >= 2000) {
      const fps = Math.round((this._fpsFrames * 1000) / (now - this._fpsLastTime));
      console.debug(`FPS: ${fps} (目标: 50+ FPS)`);
      this._fpsFrames = 0;
      this._fpsLastTime = now;
    }
  }

  dispose(): void {
    cancelAnimationFrame(this.animationId);
    this.uiControls.dispose();
    this.renderer.dispose();
    window.removeEventListener('resize', this.onResize.bind(this));
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const app = new OceanCurrentApp();
  app.start();
});
