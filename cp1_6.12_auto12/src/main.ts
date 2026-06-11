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
        if (!this.checkCollision(newPos)) {
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
        const selected = devices.find(d => this.deviceRenderer['selectedDeviceId'] === d.id);
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
          this.setupFreeCamera();
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

  private setupFreeCamera() {
    const dir = this.cameraState.position.clone().sub(this.cameraState.target);
    this.cameraState.yaw = Math.atan2(-dir.x, -dir.z);
    this.cameraState.pitch = Math.asin(dir.y / dir.length());
    this.cameraState.pitch = Math.max(-Math.PI / 2.5, Math.min(-0.1, this.cameraState.pitch));
  }

  private resetToOverview() {
    if (this.isFocusTweening) return;

    const from = {
      px: this.sceneCtx.camera.position.x,
      py: this.sceneCtx.camera.position.y,
      pz: this.sceneCtx.camera.position.z,
      tx: this.cameraState.target.x,
      ty: this.cameraState.target.y,
      tz: this.cameraState.target.z
    };
    const to = {
      px: this.defaultCameraPos.x,
      py: this.defaultCameraPos.y,
      pz: this.defaultCameraPos.z,
      tx: this.defaultCameraTarget.x,
      ty: this.defaultCameraTarget.y,
      tz: this.defaultCameraTarget.z
    };

    this.isFocusTweening = true;
    new TWEEN.Tween(from)
      .to(to, 1200)
      .easing(TWEEN.Easing.Cubic.InOut)
      .onUpdate(() => {
        this.sceneCtx.camera.position.set(from.px, from.py, from.pz);
        this.cameraState.target.set(from.tx, from.ty, from.tz);
        this.cameraState.position.copy(this.sceneCtx.camera.position);
        this.sceneCtx.camera.lookAt(this.cameraState.target);
      })
      .onComplete(() => {
        this.isFocusTweening = false;
        this.sceneCtx.camera.position.copy(this.defaultCameraPos);
        this.cameraState.position.copy(this.defaultCameraPos);
        this.cameraState.target.copy(this.defaultCameraTarget);
        this.sceneCtx.camera.lookAt(this.cameraState.target);
      })
      .start();
  }

  private focusOnDevice(device: Device) {
    const devicePos = new THREE.Vector3(
      device.position.x,
      device.position.y,
      device.position.z
    );

    const dir = this.sceneCtx.camera.position.clone().sub(devicePos).normalize();
    const focusPos = devicePos.clone().addScaledVector(dir, 8);
    focusPos.y = Math.max(6, focusPos.y);

    const from = {
      px: this.sceneCtx.camera.position.x,
      py: this.sceneCtx.camera.position.y,
      pz: this.sceneCtx.camera.position.z,
      tx: this.cameraState.target.x,
      ty: this.cameraState.target.y,
      tz: this.cameraState.target.z
    };
    const to = {
      px: focusPos.x,
      py: focusPos.y,
      pz: focusPos.z,
      tx: devicePos.x,
      ty: devicePos.y,
      tz: devicePos.z
    };

    if (this.isFocusTweening) TWEEN.removeAll();
    this.isFocusTweening = true;

    new TWEEN.Tween(from)
      .to(to, 1500)
      .easing(TWEEN.Easing.Cubic.InOut)
      .onUpdate(() => {
        this.sceneCtx.camera.position.set(from.px, from.py, from.pz);
        this.cameraState.target.set(from.tx, from.ty, from.tz);
        this.cameraState.position.copy(this.sceneCtx.camera.position);
        this.sceneCtx.camera.lookAt(this.cameraState.target);
      })
      .onComplete(() => {
        this.isFocusTweening = false;
        if (this.viewMode === 'free') {
          this.setupFreeCamera();
        }
      })
      .start();
  }

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

    if (moveX === 0 && moveZ === 0) return;

    const len = Math.hypot(moveX, moveZ);
    moveX = (moveX / len) * this.moveSpeed * delta;
    moveZ = (moveZ / len) * this.moveSpeed * delta;

    const newPos = this.cameraState.position.clone();
    newPos.x += moveX;
    newPos.z += moveZ;
    newPos.y = Math.max(3, newPos.y + (this.keys.has('q') ? -3 : this.keys.has('e') ? 3 : 0) * delta);

    if (!this.checkCollision(newPos)) {
      this.cameraState.position.copy(newPos);
      this.cameraState.target.set(
        newPos.x - Math.sin(this.cameraState.yaw) * 10,
        newPos.y + Math.tan(this.cameraState.pitch) * 10,
        newPos.z - Math.cos(this.cameraState.yaw) * 10
      );
    }
  }

  private checkCollision(pos: THREE.Vector3): boolean {
    const aabbs = this.deviceRenderer.getDeviceAABBs();
    const camBox = new THREE.Box3(
      new THREE.Vector3(pos.x - 0.5, pos.y - 1.5, pos.z - 0.5),
      new THREE.Vector3(pos.x + 0.5, pos.y + 0.5, pos.z + 0.5)
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
    console.log('  - WASD: 自由漫游模式下移动');
    console.log('  - 双击设备: 聚焦到该设备');
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
