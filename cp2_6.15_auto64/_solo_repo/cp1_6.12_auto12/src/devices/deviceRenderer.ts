/**
 * ============================================================
 *  src/devices/deviceRenderer.ts — 设备 3D 渲染 + 交互
 * ============================================================
 *
 *  【职责】
 *    1. 订阅 dataManager.data$，为每个 Device 创建立方体 + 光环
 *    2. 状态切换时：TWEEN 颜色渐变 + 告警闪烁动画
 *    3. Raycaster 检测悬停 / 单击 / 双击 → 发射 Subject 事件
 *    4. 搜索匹配：LineLoop 白色虚线立方体轮廓 + 不匹配设备 opacity=0.2
 *    5. 提供 getDeviceAABBs() 供碰撞检测使用
 *
 *  【上游调用】
 *    — main.ts:  new DeviceRenderer(scene, camera, domElement)
 *                .setSearchTerm() / .getDeviceAABBs() / .update()
 *                .onDeviceClick / .onDeviceDoubleClick 订阅
 *
 *  【下游依赖】
 *    — core/dataManager.ts:  data$ / Device / STATUS_COLORS
 *    — three.js:              Mesh / RingGeometry / LineLoop / Raycaster
 *    — @tweenjs/tween.js:     TWEEN 颜色渐变 & 闪烁
 *
 *  【数据流向】
 *    dataManager.data$ ──► syncDevices() ──► createDevice / updateDevice
 *                                                       │
 *                                        状态变更 ───────► TWEEN 颜色过渡
 *                                        告警状态 ───────► TWEEN 闪烁动画
 *
 *    controlPanel.onSearch ──► setSearchTerm() ──► addHighlight / removeHighlight
 *
 *    Raycaster (mousedown/click/dblclick) ──► onDeviceClick / onDeviceDoubleClick
 *                                            ──► main.ts.focusOnDevice()
 * ============================================================
 */

import * as THREE from 'three';
import TWEEN from '@tweenjs/tween.js';
import { Subject, Subscription } from 'rxjs';
import {
  dataManager,
  Device,
  DeviceStatus,
  STATUS_COLORS
} from '../core/dataManager';

export interface DeviceMeshObject {
  id: string;
  name: string;
  group: THREE.Group;
  cube: THREE.Mesh;
  cubeMaterial: THREE.MeshStandardMaterial;
  ring: THREE.Mesh;
  ringMaterial: THREE.MeshBasicMaterial;
  highlightEdges: THREE.LineSegments | null;
  baseColor: THREE.Color;
  targetColor: THREE.Color;
  currentStatus: DeviceStatus;
  isHovered: boolean;
  isHighlighted: boolean;
  baseRingScale: number;
  deviceData: Device;
}

export class DeviceRenderer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private deviceMap = new Map<string, DeviceMeshObject>();
  private subscriptions = new Subscription();
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private hoveredDeviceId: string | null = null;
  public selectedDeviceId: string | null = null;
  private searchTerm: string = '';
  private currentMode: 'overview' | 'focus' = 'overview';
  private clock = new THREE.Clock();

  public readonly onDeviceClick = new Subject<Device>();
  public readonly onDeviceDoubleClick = new Subject<Device>();
  public readonly onDeviceHover = new Subject<Device | null>();
  public readonly onDevicesCount = new Subject<number>();

  private static readonly cubeGeo = new THREE.BoxGeometry(2, 2.4, 2);
  private static readonly ringGeo = new THREE.RingGeometry(1.2, 1.7, 48);

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    private domElement: HTMLElement
  ) {
    this.scene = scene;
    this.camera = camera;
    this.setupDataSubscription();
    this.setupInteraction();
  }

  private setupDataSubscription() {
    this.subscriptions.add(
      dataManager.data$.subscribe(devices => {
        this.onDevicesCount.next(devices.length);
        this.syncDevices(devices);
      })
    );
  }

  private syncDevices(devices: Device[]) {
    const seen = new Set<string>();

    for (const device of devices) {
      seen.add(device.id);
      if (this.deviceMap.has(device.id)) {
        this.updateDevice(device);
      } else {
        this.createDevice(device);
      }
    }

    for (const [id, obj] of this.deviceMap) {
      if (!seen.has(id)) {
        this.scene.remove(obj.group);
        this.deviceMap.delete(id);
      }
    }

    this.applySearchFilter();
  }

  private createDevice(device: Device) {
    const group = new THREE.Group();
    group.position.set(device.position.x, 0, device.position.z);
    group.userData.deviceId = device.id;

    const color = STATUS_COLORS[device.status];
    const colorObj = new THREE.Color(color);

    const cubeMaterial = new THREE.MeshStandardMaterial({
      color: colorObj,
      metalness: 0.3,
      roughness: 0.6,
      transparent: true,
      opacity: 1.0,
      emissive: colorObj,
      emissiveIntensity: 0.15
    });

    const cube = new THREE.Mesh(DeviceRenderer.cubeGeo, cubeMaterial);
    cube.position.y = device.position.y;
    cube.castShadow = true;
    cube.receiveShadow = true;
    cube.userData.deviceId = device.id;
    group.add(cube);

    const ringMaterial = new THREE.MeshBasicMaterial({
      color: colorObj,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(DeviceRenderer.ringGeo, ringMaterial);
    ring.position.y = device.position.y + 2.2;
    ring.rotation.x = -Math.PI / 2;
    ring.userData.deviceId = device.id;
    group.add(ring);

    const edgeGeo = new THREE.EdgesGeometry(DeviceRenderer.cubeGeo);
    const edgeMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.6
    });
    const edges = new THREE.LineSegments(edgeGeo, edgeMat);
    edges.position.y = device.position.y;
    group.add(edges);

    this.scene.add(group);

    const obj: DeviceMeshObject = {
      id: device.id,
      name: device.name,
      group,
      cube,
      cubeMaterial,
      ring,
      ringMaterial,
      highlightEdges: null,
      baseColor: colorObj.clone(),
      targetColor: colorObj.clone(),
      currentStatus: device.status,
      isHovered: false,
      isHighlighted: false,
      baseRingScale: 1,
      deviceData: { ...device }
    };

    this.deviceMap.set(device.id, obj);
  }

  private updateDevice(device: Device) {
    const obj = this.deviceMap.get(device.id);
    if (!obj) return;

    obj.deviceData = { ...device };

    if (obj.currentStatus !== device.status) {
      obj.currentStatus = device.status;
      const newColor = new THREE.Color(STATUS_COLORS[device.status]);
      obj.targetColor = newColor;
      this.animateColorTransition(obj, newColor);
    }

    if (device.status === 'alert') {
      this.triggerAlertBlink(obj);
    }

    if (this.selectedDeviceId === device.id) {
      this.onDeviceClick.next(device);
    }
  }

  private animateColorTransition(obj: DeviceMeshObject, targetColor: THREE.Color) {
    const startColor = obj.baseColor.clone();
    const tween = new TWEEN.Tween({ t: 0 })
      .to({ t: 1 }, 300)
      .easing(TWEEN.Easing.Quadratic.Out)
      .onUpdate(({ t }) => {
        const r = startColor.r + (targetColor.r - startColor.r) * t;
        const g = startColor.g + (targetColor.g - startColor.g) * t;
        const b = startColor.b + (targetColor.b - startColor.b) * t;
        obj.cubeMaterial.color.setRGB(r, g, b);
        obj.cubeMaterial.emissive.setRGB(r * 0.15, g * 0.15, b * 0.15);
        obj.ringMaterial.color.setRGB(r, g, b);
      })
      .onComplete(() => {
        obj.baseColor.copy(targetColor);
      })
      .start();
  }

  private triggerAlertBlink(obj: DeviceMeshObject) {
    if ((obj.ringMaterial as any)._blinking) return;
    (obj.ringMaterial as any)._blinking = true;

    const baseOpacity = 0.7;
    new TWEEN.Tween({ opacity: baseOpacity })
      .to({ opacity: 0.2 }, 400)
      .easing(TWEEN.Easing.Sinusoidal.InOut)
      .yoyo(true)
      .repeat(3)
      .onUpdate(({ opacity }) => {
        obj.ringMaterial.opacity = opacity;
      })
      .onComplete(() => {
        obj.ringMaterial.opacity = baseOpacity;
        (obj.ringMaterial as any)._blinking = false;
      })
      .start();
  }

  private setupInteraction() {
    let mouseDownPos = { x: 0, y: 0 };
    let isDragging = false;

    this.domElement.addEventListener('mousedown', (e) => {
      mouseDownPos.x = e.clientX;
      mouseDownPos.y = e.clientY;
      isDragging = true;
    });

    this.domElement.addEventListener('mouseup', () => {
      isDragging = false;
    });

    this.domElement.addEventListener('mousemove', (e) => {
      if (isDragging) {
        const dx = Math.abs(e.clientX - mouseDownPos.x);
        const dy = Math.abs(e.clientY - mouseDownPos.y);
        if (dx > 3 || dy > 3) {
          isDragging = false;
        }
      }

      const rect = this.domElement.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this.checkHover(e);
    });

    this.domElement.addEventListener('click', (e) => {
      const dx = Math.abs(e.clientX - mouseDownPos.x);
      const dy = Math.abs(e.clientY - mouseDownPos.y);
      if (dx > 5 || dy > 5) return;

      const device = this.pickDevice();
      if (device) {
        this.selectedDeviceId = device.id;
        this.onDeviceClick.next(device.deviceData);
      } else {
        this.selectedDeviceId = null;
      }
    });

    this.domElement.addEventListener('dblclick', (e) => {
      const dx = Math.abs(e.clientX - mouseDownPos.x);
      const dy = Math.abs(e.clientY - mouseDownPos.y);
      if (dx > 5 || dy > 5) return;

      const device = this.pickDevice();
      if (device) {
        this.selectedDeviceId = device.id;
        this.onDeviceDoubleClick.next(device.deviceData);
      }
    });

    this.domElement.addEventListener('mouseleave', () => {
      this.clearHover();
    });
  }

  private pickDevice(): DeviceMeshObject | null {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const cubes = Array.from(this.deviceMap.values()).map(o => o.cube);
    const intersects = this.raycaster.intersectObjects(cubes, false);

    if (intersects.length > 0) {
      const id = intersects[0].object.userData.deviceId as string;
      return this.deviceMap.get(id) || null;
    }
    return null;
  }

  private checkHover(e: MouseEvent) {
    const obj = this.pickDevice();

    if (obj) {
      document.body.style.cursor = 'pointer';
      if (this.hoveredDeviceId !== obj.id) {
        this.clearHover();
        this.hoveredDeviceId = obj.id;
        obj.isHovered = true;
        new TWEEN.Tween(obj.ring.scale)
          .to({ x: 1.2, y: 1.2, z: 1.2 }, 200)
          .easing(TWEEN.Easing.Quadratic.Out)
          .start();
        this.onDeviceHover.next(obj.deviceData);
      }
    } else {
      document.body.style.cursor = 'default';
      this.clearHover();
    }
  }

  private clearHover() {
    if (this.hoveredDeviceId) {
      const prev = this.deviceMap.get(this.hoveredDeviceId);
      if (prev) {
        prev.isHovered = false;
        new TWEEN.Tween(prev.ring.scale)
          .to({ x: 1, y: 1, z: 1 }, 200)
          .easing(TWEEN.Easing.Quadratic.Out)
          .start();
      }
      this.hoveredDeviceId = null;
      this.onDeviceHover.next(null);
    }
  }

  public setSearchTerm(term: string) {
    this.searchTerm = term.toLowerCase().trim();
    this.applySearchFilter();
  }

  private applySearchFilter() {
    for (const [id, obj] of this.deviceMap) {
      const matches = this.searchTerm === ''
        ? true
        : obj.name.toLowerCase().startsWith(this.searchTerm) ||
          id.toLowerCase().startsWith(this.searchTerm);

      if (matches && this.searchTerm !== '') {
        obj.cubeMaterial.opacity = 1;
        obj.ringMaterial.opacity = obj.isHovered ? 0.9 : 0.7;
        this.addHighlight(obj);
      } else if (!matches && this.searchTerm !== '') {
        obj.cubeMaterial.opacity = 0.2;
        obj.ringMaterial.opacity = 0.1;
        this.removeHighlight(obj);
      } else {
        obj.cubeMaterial.opacity = 1;
        obj.ringMaterial.opacity = obj.isHovered ? 0.9 : 0.7;
        this.removeHighlight(obj);
      }
    }
  }

  /**
   * 构建立方体 12 条棱的 LineSegments 虚线轮廓，
   * 采用 EdgesGeometry + LineDashedMaterial + computeLineDistances()，
   * 保证虚线样式在 WebGL 中正常显示。
   */
  private addHighlight(obj: DeviceMeshObject) {
    if (obj.highlightEdges || obj.isHighlighted) return;
    obj.isHighlighted = true;

    const cubeSize = { w: 2, h: 2.4, d: 2 };
    const positions = new Float32Array([
      -cubeSize.w / 2, -cubeSize.h / 2, -cubeSize.d / 2,   cubeSize.w / 2, -cubeSize.h / 2, -cubeSize.d / 2,
       cubeSize.w / 2, -cubeSize.h / 2, -cubeSize.d / 2,   cubeSize.w / 2, -cubeSize.h / 2,  cubeSize.d / 2,
       cubeSize.w / 2, -cubeSize.h / 2,  cubeSize.d / 2,  -cubeSize.w / 2, -cubeSize.h / 2,  cubeSize.d / 2,
      -cubeSize.w / 2, -cubeSize.h / 2,  cubeSize.d / 2,  -cubeSize.w / 2, -cubeSize.h / 2, -cubeSize.d / 2,

      -cubeSize.w / 2,  cubeSize.h / 2, -cubeSize.d / 2,   cubeSize.w / 2,  cubeSize.h / 2, -cubeSize.d / 2,
       cubeSize.w / 2,  cubeSize.h / 2, -cubeSize.d / 2,   cubeSize.w / 2,  cubeSize.h / 2,  cubeSize.d / 2,
       cubeSize.w / 2,  cubeSize.h / 2,  cubeSize.d / 2,  -cubeSize.w / 2,  cubeSize.h / 2,  cubeSize.d / 2,
      -cubeSize.w / 2,  cubeSize.h / 2,  cubeSize.d / 2,  -cubeSize.w / 2,  cubeSize.h / 2, -cubeSize.d / 2,

      -cubeSize.w / 2, -cubeSize.h / 2, -cubeSize.d / 2,  -cubeSize.w / 2,  cubeSize.h / 2, -cubeSize.d / 2,
       cubeSize.w / 2, -cubeSize.h / 2, -cubeSize.d / 2,   cubeSize.w / 2,  cubeSize.h / 2, -cubeSize.d / 2,
       cubeSize.w / 2, -cubeSize.h / 2,  cubeSize.d / 2,   cubeSize.w / 2,  cubeSize.h / 2,  cubeSize.d / 2,
      -cubeSize.w / 2, -cubeSize.h / 2,  cubeSize.d / 2,  -cubeSize.w / 2,  cubeSize.h / 2,  cubeSize.d / 2,
    ]);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.LineDashedMaterial({
      color: 0xffffff,
      dashSize: 0.25,
      gapSize: 0.15,
      transparent: true,
      opacity: 0.95,
      linewidth: 2
    });

    const edges = new THREE.LineSegments(geo, mat);
    edges.position.y = obj.cube.position.y;
    edges.computeLineDistances();
    obj.group.add(edges);
    obj.highlightEdges = edges;
  }

  private removeHighlight(obj: DeviceMeshObject) {
    if (obj.highlightEdges) {
      obj.group.remove(obj.highlightEdges);
      obj.highlightEdges.geometry.dispose();
      (obj.highlightEdges.material as THREE.Material).dispose();
      obj.highlightEdges = null;
    }
    obj.isHighlighted = false;
  }

  public setMode(mode: 'overview' | 'focus') {
    this.currentMode = mode;
  }

  public update() {
    const delta = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    for (const obj of this.deviceMap.values()) {
      const pulse = 1 + Math.sin(time * 2 + obj.group.position.x) * 0.05;
      if (!obj.isHovered) {
        obj.ring.scale.setScalar(pulse);
      }
      obj.ring.position.y = obj.cube.position.y + 2.2 + Math.sin(time * 1.5 + obj.group.position.z) * 0.08;

      if (obj.highlightEdges) {
        obj.highlightEdges.rotation.y += delta * 0.6;
        const pulse2 = 1 + Math.sin(time * 3) * 0.06;
        obj.highlightEdges.scale.setScalar(pulse2);
      }
    }
  }

  public getDevicePosition(id: string): THREE.Vector3 | null {
    const obj = this.deviceMap.get(id);
    return obj ? obj.group.position.clone() : null;
  }

  public getDeviceAABBs(): { id: string; box: THREE.Box3 }[] {
    const result: { id: string; box: THREE.Box3 }[] = [];
    for (const [id, obj] of this.deviceMap) {
      const box = new THREE.Box3().setFromObject(obj.cube);
      box.expandByScalar(0.3);
      result.push({ id, box });
    }
    return result;
  }

  public dispose() {
    this.subscriptions.unsubscribe();
    for (const obj of this.deviceMap.values()) {
      this.scene.remove(obj.group);
      obj.cubeMaterial.dispose();
      obj.ringMaterial.dispose();
      if (obj.highlightEdges) {
        obj.highlightEdges.geometry.dispose();
        (obj.highlightEdges.material as THREE.Material).dispose();
      }
    }
    this.deviceMap.clear();
  }
}
