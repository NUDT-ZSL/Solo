/**
 * ============================================================
 *  src/main.ts — 应用入口 & 主循环
 * ============================================================
 *
 *  【职责】
 *    1. 调用 sceneSetup.ts 初始化 Three.js 场景 / 相机 / 渲染器
 *    2. 实例化 DeviceRenderer (3D)、HudPanel (UI)、ControlPanel (UI)
 *    3. 调用 dataManager.startPolling() 启动数据流
 *    4. 运行 requestAnimationFrame 循环：TWEEN.update() → 移动 → 渲染
 *
 *  【上游调用】
 *    — index.html <script type="module" src="/src/main.ts">
 *
 *  【下游依赖】
 *    ↳ core/sceneSetup.ts        setupScene() → SceneContext
 *    ↳ core/dataManager.ts       dataManager.startPolling() / data$
 *    ↳ devices/deviceRenderer.ts DeviceRenderer 订阅 data$ 创建立方体+光环
 *    ↳ ui/hudPanel.ts            HudPanel 订阅选中设备显示信息卡
 *    ↳ ui/controlPanel.ts        ControlPanel 发出模式/搜索/重置事件
 *
 *  【数据流向】
 *    dataManager.data$ ──┬──► deviceRenderer.syncDevices()  3D渲染
 *                        ├──► hudPanel.setTotalDevices()     HUD计数
 *                        └──► hudPanel.updateDeviceData()    仪表盘数值
 *
 *    controlPanel.onSearch  ──► deviceRenderer.setSearchTerm()  高亮过滤
 *    controlPanel.onModeChange ─► App.viewMode                 漫游/总览切换
 *    deviceRenderer.onDeviceDoubleClick ─► App.focusOnDevice()  TWEEN聚焦
 * ============================================================
 */

import * as THREE from 'three';
import TWEEN from '@tweenjs/tween.js';
import { Subscription } from 'rxjs';
import { setupScene, SceneContext } from './core/sceneSetup';
import { dataManager, Device } from './core/dataManager';
import { DeviceRenderer } from './devices/deviceRenderer';
import { HudPanel } from './ui/hudPanel';
import { ControlPanel, ViewMode } from './ui/controlPanel';

interface CameraState {
  position: THREE.Vector3;
  target: THREE.Vector3;
  yaw: number;
  pitch: number;
}

class App {
  private container!: HTMLElement;
  private sceneCtx!: SceneContext;
  private deviceRenderer!: DeviceRenderer;
  private hud!: HudPanel;
  private controlPanel!: ControlPanel;
  private subscriptions = new Subscription();

  private viewMode: ViewMode = 'overview';
  private cameraState: CameraState;
  private readonly defaultCameraPos = new THREE.Vector3(0, 45, 45);
  private readonly defaultCameraTarget = new THREE.Vector3(0, 0, 0);
  private readonly walkEyeHeight = 4.5;

  private keys = new Set<string>();
  private isDragging = false;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private moveSpeed = 5;

  private frameCount = 0;
  private fpsTimer = 0;
  private lastTime = performance.now();
  private rafId = 0;
  private isFocusTweening = false;

  private cachedAABBs: { id: string; box: THREE.Box3 }[] = [];
  private aabbRefreshTimer = 0;

  constructor() {
    this.cameraState = {
      position: this.defaultCameraPos.clone(),
      target: this.defaultCameraTarget.clone(),
      yaw: -Math.PI / 4,
      pitch: -Math.PI / 4
    };
  }

  public start(): void {
    this.container = document.getElementById('app') as HTMLElement;
    if (!this.container) {
      console.error('Container #app not found');
      return;
    }

    this.sceneCtx = setupScene(this.container);
    this.deviceRenderer = new DeviceRenderer(
      this.sceneCtx.scene,
      this.sceneCtx.camera,
      this.sceneCtx.renderer.domElement
    );
    this.hud = new HudPanel(this.container);
    this.controlPanel = new ControlPanel(this.container);

    this.bindGlobalEvents();
    this.setupSubscriptions();
    dataManager.startPolling(2000);

    this.checkServerStatus();
    setInterval(() => this.checkServerStatus(), 5000);

    this.animate();
    this.logStartup();
  }

  private checkServerStatus() {
    this.hud.setServerStatus(dataManager.isServerConnected());
  }

  private bindGlobalEvents() {
    const dom = this.sceneCtx.renderer.domElement;

    dom.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      this.isDragging = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    dom.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.lastMouseX;
      const dy = e.clientY - this.lastMouseY;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;

      if (this.viewMode === 'free') {
        this.cameraState.yaw -= dx * 0.003;
        this.cameraState.pitch -= dy * 0.003;
        this.cameraState.pitch = Math.max(-Math.PI / 2.5, Math.min(-0.05, this.cameraState.pitch));
      } else {
        const angleY = dx * 0.005;
        const angleX = dy * 0.004;
        this.rotateCameraAroundTarget(angleY, angleX);
      }
    });

    dom.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY * 0.02;
      if (this.viewMode === 'overview') {
        const dir = this.sceneCtx.camera.position.clone().sub(this.cameraState.target);
        const dist = dir.length();
        const newDist = Math.max(15, Math.min(120, dist + delta * 3));
        dir.setLength(newDist);
        this.cameraState.position.copy(this.cameraState.target).add(dir);
      } else {
        const forward = new THREE.Vector3(
          -Math.sin(this.cameraState.yaw) * Math.cos(this.cameraState.pitch),
          Math.sin(this.cameraState.pitch),
          -Math.cos(this.cameraState.yaw) * Math.cos(this.cameraState.pitch)
        ).normalize();
        const newPos = this.cameraState.position.clone().addScaledVector(forward, -delta * 2);
        if (!this.checkCollisionAtPoint(newPos)) {
          this.cameraState.position.copy(newPos);
          this.cameraState.target.copy(newPos).add(
            new THREE.Vector3(-Math.sin(this.cameraState.yaw), 0, -Math.cos(this.cameraState.yaw)).multiplyScalar(10)
          );
        }
      }
    }, { passive: false });

    window.addEventListener('keydown', (e) => {
      this.keys.add(e.key.toLowerCase());
      if (e.key === 'Escape') {
        this.controlPanel.clearSearch();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.toLowerCase());
    });
  }

  private setupSubscriptions() {
    this.subscriptions.add(
      this.deviceRenderer.onDevicesCount.subscribe(n => {
        this.hud.setTotalDevices(n);
      })
    );

    this.subscriptions.add(
      this.deviceRenderer.onDeviceClick.subscribe(device => {
        this.hud.showInfo(device);
      })
    );

    this.subscriptions.add(
      dataManager.data$.subscribe(devices => {
        const selected = devices.find(d => (this.deviceRenderer as any).selectedDeviceId === d.id);
        if (selected) {
          this.hud.updateDeviceData(selected);
        }
      })
    );

    this.subscriptions.add(
      this.deviceRenderer.onDeviceDoubleClick.subscribe(device => {
        this.focusOnDevice(device);
        this.hud.showInfo(device);
      })
    );

    this.subscriptions.add(
      this.controlPanel.onModeChange.subscribe(mode => {
        this.viewMode = mode;
        if (mode === 'overview') {
          this.resetToOverview();
        } else {
          this.switchToFreeWalk();
        }
      })
    );

    this.subscriptions.add(
      this.controlPanel.onSearch.subscribe(term => {
        this.deviceRenderer.setSearchTerm(term);
      })
    );

    this.subscriptions.add(
      this.controlPanel.onResetView.subscribe(() => {
        this.controlPanel.setMode('overview');
        this.resetToOverview();
        this.hud.hideInfo();
        this.controlPanel.clearSearch();
      })
    );

    this.subscriptions.add(
      this.hud.onCloseInfo.subscribe(() => {
      })
    );
  }

  private rotateCameraAroundTarget(deltaYaw: number, deltaPitch: number) {
    const target = this.cameraState.target;
    const pos = this.cameraState.position.clone();

    const spherical = new THREE.Spherical();
    spherical.setFromVector3(pos.sub(target));
    spherical.theta -= deltaYaw;
    spherical.phi = Math.max(0.3, Math.min(Math.PI / 2 - 0.1, spherical.phi + deltaPitch));

    const newPos = new THREE.Vector3().setFromSpherical(spherical).add(target);
    this.cameraState.position.copy(newPos);
  }

  private switchToFreeWalk() {
    const target = this.cameraState.target.clone();
    const dir = new THREE.Vector3(0, 0, 1);
    const focusPos = target.clone().add(new THREE.Vector3(0, this.walkEyeHeight, -8));
    focusPos.y = this.walkEyeHeight;

    this.tweenCameraTo(focusPos, target, 800, () => {
      this.cameraState.position.copy(focusPos);
      this.cameraState.target.copy(target);
      this.computeYawPitchFromDirection();
    });
  }

  private computeYawPitchFromDirection() {
    const dir = this.cameraState.target.clone().sub(this.cameraState.position).normalize();
    this.cameraState.yaw = Math.atan2(-dir.x, -dir.z);
    this.cameraState.pitch = Math.asin(Math.max(-0.9, Math.min(0.9, dir.y)));
  }

  private resetToOverview() {
    this.tweenCameraTo(this.defaultCameraPos, this.defaultCameraTarget, 1200, () => {
      this.cameraState.position.copy(this.defaultCameraPos);
      this.cameraState.target.copy(this.defaultCameraTarget);
    });
  }

  /**
   * 热点聚焦：使用 @tweenjs/tween.js 在 1500ms 内平滑将相机飞行到
   * 设备前方 2 单位处（沿相机→设备方向向量），同时 lookAt 设备中心。
   */
  private focusOnDevice(device: Device) {
    const devicePos = new THREE.Vector3(
      device.position.x,
      device.position.y + 1.2,
      device.position.z
    );

    const camToDevice = devicePos.clone().sub(this.sceneCtx.camera.position).normalize();
    const standoffDist = 2;
    const focusPos = devicePos.clone().addScaledVector(camToDevice, -standoffDist);
    focusPos.y = Math.max(this.walkEyeHeight, focusPos.y + 1.5);

    this.tweenCameraTo(focusPos, devicePos, 1500, () => {
      if (this.viewMode === 'free') {
        this.cameraState.position.copy(focusPos);
        this.cameraState.target.copy(devicePos);
        this.computeYawPitchFromDirection();
      }
    });
  }

  private tweenCameraTo(
    toPos: THREE.Vector3,
    toTarget: THREE.Vector3,
    durationMs: number,
    onComplete?: () => void
  ) {
    if (this.isFocusTweening) {
      TWEEN.removeAll();
    }
    this.isFocusTweening = true;

    const fromState = {
      px: this.sceneCtx.camera.position.x,
      py: this.sceneCtx.camera.position.y,
      pz: this.sceneCtx.camera.position.z,
      tx: this.cameraState.target.x,
      ty: this.cameraState.target.y,
      tz: this.cameraState.target.z
    };
    const toState = {
      px: toPos.x,
      py: toPos.y,
      pz: toPos.z,
      tx: toTarget.x,
      ty: toTarget.y,
      tz: toTarget.z
    };

    new TWEEN.Tween(fromState)
      .to(toState, durationMs)
      .easing(TWEEN.Easing.Cubic.InOut)
      .onUpdate(() => {
        this.sceneCtx.camera.position.set(fromState.px, fromState.py, fromState.pz);
        this.cameraState.target.set(fromState.tx, fromState.ty, fromState.tz);
        this.cameraState.position.copy(this.sceneCtx.camera.position);
        this.sceneCtx.camera.lookAt(this.cameraState.target);
      })
      .onComplete(() => {
        this.isFocusTweening = false;
        if (onComplete) onComplete();
      })
      .start();
  }

  /**
   * WASD 漫游：采用逐轴 (per-axis) 碰撞检测 + 滑动，
   * 避免穿透设备立方体并沿墙面平滑滑行。
   */
  private updateMovement(delta: number) {
    if (this.viewMode !== 'free' || this.isFocusTweening) return;

    const forward = new THREE.Vector3(
      -Math.sin(this.cameraState.yaw),
      0,
      -Math.cos(this.cameraState.yaw)
    ).normalize();
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    let moveX = 0, moveZ = 0;
    if (this.keys.has('w')) { moveX += forward.x; moveZ += forward.z; }
    if (this.keys.has('s')) { moveX -= forward.x; moveZ -= forward.z; }
    if (this.keys.has('d')) { moveX += right.x; moveZ += right.z; }
    if (this.keys.has('a')) { moveX -= right.x; moveZ -= right.z; }

    if (moveX === 0 && moveZ === 0) {
      const wantUp = this.keys.has('e') ? 3 : this.keys.has('q') ? -3 : 0;
      if (wantUp !== 0) {
        const testY = this.cameraState.position.y + wantUp * delta;
        const clampedY = Math.max(2, Math.min(30, testY));
        const testPos = this.cameraState.position.clone();
        testPos.y = clampedY;
        if (!this.checkCollisionAtPoint(testPos)) {
          this.cameraState.position.y = clampedY;
        }
      }
      return;
    }

    const len = Math.hypot(moveX, moveZ);
    moveX = (moveX / len) * this.moveSpeed * delta;
    moveZ = (moveZ / len) * this.moveSpeed * delta;

    const aabbs = this.getFreshAABBs();

    const tryPos = this.cameraState.position.clone();
    tryPos.x += moveX;
    if (!this.checkCollisionInternal(tryPos, aabbs)) {
      this.cameraState.position.x = tryPos.x;
    }

    tryPos.copy(this.cameraState.position);
    tryPos.z += moveZ;
    if (!this.checkCollisionInternal(tryPos, aabbs)) {
      this.cameraState.position.z = tryPos.z;
    }

    this.cameraState.target.set(
      this.cameraState.position.x - Math.sin(this.cameraState.yaw) * 10,
      this.cameraState.position.y + Math.tan(this.cameraState.pitch) * 10,
      this.cameraState.position.z - Math.cos(this.cameraState.yaw) * 10
    );
  }

  private getFreshAABBs(): { id: string; box: THREE.Box3 }[] {
    this.aabbRefreshTimer += 1 / 60;
    if (this.aabbRefreshTimer > 0.25 || this.cachedAABBs.length === 0) {
      this.cachedAABBs = this.deviceRenderer.getDeviceAABBs();
      this.aabbRefreshTimer = 0;
    }
    return this.cachedAABBs;
  }

  private checkCollisionAtPoint(pos: THREE.Vector3): boolean {
    return this.checkCollisionInternal(pos, this.getFreshAABBs());
  }

  private checkCollisionInternal(
    pos: THREE.Vector3,
    aabbs: { id: string; box: THREE.Box3 }[]
  ): boolean {
    const halfW = 0.6;
    const halfH = 1.8;
    const halfD = 0.6;
    const camBox = new THREE.Box3(
      new THREE.Vector3(pos.x - halfW, pos.y - halfH, pos.z - halfD),
      new THREE.Vector3(pos.x + halfW, pos.y + halfH * 0.3, pos.z + halfD)
    );
    for (const { box } of aabbs) {
      if (camBox.intersectsBox(box)) return true;
    }
    return false;
  }

  private animate = () => {
    this.rafId = requestAnimationFrame(this.animate);
    const now = performance.now();
    const delta = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    this.frameCount++;
    this.fpsTimer += delta;
    if (this.fpsTimer >= 0.5) {
      this.hud.setFPS(this.frameCount / this.fpsTimer);
      this.frameCount = 0;
      this.fpsTimer = 0;
    }

    this.updateMovement(delta);

    if (!this.isFocusTweening) {
      this.sceneCtx.camera.position.copy(this.cameraState.position);
      this.sceneCtx.camera.lookAt(this.cameraState.target);
    }

    this.deviceRenderer.update();
    TWEEN.update(now);

    this.sceneCtx.renderer.render(this.sceneCtx.scene, this.sceneCtx.camera);
  };

  private logStartup() {
    const info = [
      '%c🎮 工业设备监控 3D 可视化看板',
      'color: #60a5fa; font-size: 16px; font-weight: bold;',
    ].join('\n');
    console.log(info);
    console.log('%c操作提示:', 'color: #00ff88; font-weight: bold;');
    console.log('  - 鼠标左键拖拽: 旋转视角');
    console.log('  - 鼠标滚轮: 缩放 / 前后推进');
    console.log('  - WASD + Q/E: 自由漫游模式下移动');
    console.log('  - 双击设备: TWEEN 1.5s 平滑聚焦');
    console.log('  - 搜索框: 输入设备ID/名称前缀进行筛选');
  }

  public destroy() {
    cancelAnimationFrame(this.rafId);
    this.subscriptions.unsubscribe();
    this.deviceRenderer.dispose();
    this.hud.dispose();
    this.controlPanel.dispose();
    dataManager.stopPolling();
    TWEEN.removeAll();
  }
}

const app = new App();
window.addEventListener('DOMContentLoaded', () => {
  app.start();
});

(window as any).__APP__ = app;
