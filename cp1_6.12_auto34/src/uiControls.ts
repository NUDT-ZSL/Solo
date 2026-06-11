// ============================================================================
// src/uiControls.ts - UI控制面板模块
// 职责：利用 dat.GUI 创建控制面板，处理用户交互参数调整
// 数据流向：
//   - 输入：用户操作（选择深度、调整滑块、点击按钮）
//   - 输出：调用 oceanRenderer 的方法更新渲染状态
// 调用关系：
//   - 被 src/main.ts 调用 init(oceanRenderer, camera, controls)
//   - 内部回调调用 oceanRenderer.updateFlow / setSpeedScale / setParticleSpeed
// ============================================================================

import * as dat from 'dat.gui';
import * as THREE from 'three';
import { OceanRenderer } from './oceanRenderer.js';
import { DepthLayer, DEPTH_LABELS } from '../data/oceanData.js';

interface OrbitControlsLike {
  target: THREE.Vector3;
  update(): void;
}

export interface UIControlParams {
  depthLayer: string;
  speedScale: number;
  particleSpeed: number;
}

export class UIControls {
  private gui: dat.GUI | null = null;
  private oceanRenderer: OceanRenderer | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private controls: OrbitControlsLike | null = null;

  private params: UIControlParams = {
    depthLayer: 'surface',
    speedScale: 1.0,
    particleSpeed: 0.5
  };

  private initialCameraPosition: THREE.Vector3 = new THREE.Vector3();
  private initialCameraTarget: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  init(
    oceanRenderer: OceanRenderer,
    camera: THREE.PerspectiveCamera,
    controls?: OrbitControlsLike
  ): void {
    this.oceanRenderer = oceanRenderer;
    this.camera = camera;
    this.controls = controls ?? null;

    if (camera) {
      this.initialCameraPosition.copy(camera.position);
      if (controls) {
        this.initialCameraTarget.copy(controls.target);
      }
    }

    this.createGUI();
  }

  private createGUI(): void {
    this.gui = new dat.GUI();
    const titleEl = this.gui.domElement.querySelector('.title');
    if (titleEl) {
      (titleEl as HTMLElement).textContent = '洋流控制面板';
    }

    const style = document.createElement('style');
    style.textContent = `
      .dg.ac {
        z-index: 100 !important;
      }
      .dg.main {
        background-color: rgba(0, 0, 0, 0.7) !important;
        backdrop-filter: blur(8px);
      }
      .dg .c {
        color: #ffffff !important;
      }
      .dg .property-name {
        color: #ffffff !important;
        text-shadow: 0 0 4px rgba(100, 200, 255, 0.3);
      }
      .dg .title {
        background-color: rgba(20, 40, 80, 0.9) !important;
        color: #64d8ff !important;
        text-shadow: 0 0 8px rgba(100, 216, 255, 0.5);
        font-weight: 600 !important;
      }
      .dg .slider {
        background-color: rgba(100, 150, 255, 0.2) !important;
      }
      .dg .slider-fg {
        background-color: #64d8ff !important;
        box-shadow: 0 0 8px rgba(100, 216, 255, 0.5);
      }
      .dg select {
        background-color: rgba(30, 40, 60, 0.9) !important;
        color: #ffffff !important;
        border: 1px solid rgba(100, 200, 255, 0.3) !important;
      }
      .dg .button {
        background-color: rgba(50, 100, 180, 0.6) !important;
        color: #ffffff !important;
        border: 1px solid rgba(100, 200, 255, 0.4) !important;
        transition: all 0.2s ease;
      }
      .dg .button:hover {
        background-color: rgba(80, 140, 220, 0.8) !important;
        box-shadow: 0 0 12px rgba(100, 200, 255, 0.4);
      }
    `;
    document.head.appendChild(style);

    const depthFolder = this.gui.addFolder('深度层设置');
    depthFolder.open();

    const depthOptions: Record<string, string> = {};
    (Object.keys(DEPTH_LABELS) as DepthLayer[]).forEach(key => {
      depthOptions[DEPTH_LABELS[key]] = key;
    });

    depthFolder
      .add(this.params, 'depthLayer', depthOptions)
      .name('洋流深度')
      .onChange((value: string) => {
        if (this.oceanRenderer) {
          this.oceanRenderer.updateFlow(value as DepthLayer);
        }
      });

    const animFolder = this.gui.addFolder('动画参数');
    animFolder.open();

    animFolder
      .add(this.params, 'speedScale', 0.5, 2.0, 0.1)
      .name('流速缩放')
      .onChange((value: number) => {
        if (this.oceanRenderer) {
          this.oceanRenderer.setSpeedScale(value);
        }
      });

    animFolder
      .add(this.params, 'particleSpeed', 0.1, 1.0, 0.05)
      .name('粒子速度')
      .onChange((value: number) => {
        if (this.oceanRenderer) {
          this.oceanRenderer.setParticleSpeed(value);
        }
      });

    const viewFolder = this.gui.addFolder('视角控制');
    viewFolder.open();

    const resetViewObj = { reset: () => this.resetView() };
    viewFolder
      .add(resetViewObj, 'reset')
      .name('重置视角');
  }

  private resetView(): void {
    if (!this.camera) return;

    const startPos = this.camera.position.clone();
    const startTarget = this.controls ? this.controls.target.clone() : new THREE.Vector3(0, 0, 0);
    const endPos = this.initialCameraPosition.clone();
    const endTarget = this.initialCameraTarget.clone();

    const duration = 800;
    const startTime = performance.now();

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(1, elapsed / duration);
      const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

      if (this.camera) {
        this.camera.position.lerpVectors(startPos, endPos, eased);
      }
      if (this.controls) {
        this.controls.target.lerpVectors(startTarget, endTarget, eased);
        this.controls.update();
      }

      if (t < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }

  setDepthLayer(depth: DepthLayer): void {
    this.params.depthLayer = depth;
    if (this.gui) {
      for (const controller of this.gui.__controllers) {
        if (controller.property === 'depthLayer') {
          controller.setValue(depth);
          controller.updateDisplay();
          break;
        }
      }
    }
  }

  setInteractionEnabled(enabled: boolean): void {
    if (!this.gui) return;
    this.gui.domElement.style.pointerEvents = enabled ? 'auto' : 'none';
    this.gui.domElement.style.opacity = enabled ? '1' : '0.5';
  }

  dispose(): void {
    if (this.gui) {
      this.gui.destroy();
      this.gui = null;
    }
  }
}
