import * as THREE from 'three';
import { RainbowBridge } from './bridge';
import { ParticleSystem } from './particles';

const BRIDGE_HALF_SPAN = 20;
const BRIDGE_WIDTH = 3.5;

interface CameraState {
  targetYaw: number;
  targetPitch: number;
  targetDistance: number;
  targetLookAt: THREE.Vector3;
  yaw: number;
  pitch: number;
  distance: number;
  lookAt: THREE.Vector3;
}

export class InteractionController {
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;
  private bridge: RainbowBridge;
  private particles: ParticleSystem;
  private raycaster: THREE.Raycaster;
  private pointer: THREE.Vector2;

  private cam: CameraState;

  private isDragging = false;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private pointerDownX = 0;
  private pointerDownY = 0;
  private pointerDownTime = 0;
  private movedThreshold = 4;
  private hasMoved = false;

  private yawSpeed = 0.005;
  private pitchSpeed = 0.005;
  private zoomSpeed = 0.0015;
  private smoothing = 6;

  private minPitch = -0.8;
  private maxPitch = 1.1;
  private minDistance = 8;
  private maxDistance = 60;

  get cameraAngleY(): number {
    return this.cam.yaw;
  }

  constructor(
    camera: THREE.PerspectiveCamera,
    domElement: HTMLElement,
    bridge: RainbowBridge,
    particles: ParticleSystem
  ) {
    this.camera = camera;
    this.domElement = domElement;
    this.bridge = bridge;
    this.particles = particles;
    this.particles.setBridge(bridge);
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();

    const lookAt = new THREE.Vector3(0, 4, 0);
    const initPos = new THREE.Vector3(0, 8, 28);
    const diff = initPos.clone().sub(lookAt);
    const dist = diff.length();
    const pitch = Math.asin(diff.y / dist);
    const yaw = Math.atan2(diff.x, diff.z);

    this.cam = {
      targetYaw: yaw,
      targetPitch: pitch,
      targetDistance: dist,
      targetLookAt: lookAt.clone(),
      yaw,
      pitch,
      distance: dist,
      lookAt: lookAt.clone()
    };

    this.bindEvents();
  }

  resetView() {
    const lookAt = new THREE.Vector3(0, 4, 0);
    const initPos = new THREE.Vector3(0, 8, 28);
    const diff = initPos.clone().sub(lookAt);
    const dist = diff.length();
    const pitch = Math.asin(diff.y / dist);
    const yaw = Math.atan2(diff.x, diff.z);

    this.cam.targetYaw = yaw;
    this.cam.targetPitch = pitch;
    this.cam.targetDistance = dist;
    this.cam.targetLookAt.copy(lookAt);
  }

  private bindEvents() {
    this.domElement.addEventListener('pointerdown', this.onPointerDown);
    this.domElement.addEventListener('pointermove', this.onPointerMove);
    this.domElement.addEventListener('pointerup', this.onPointerUp);
    this.domElement.addEventListener('pointercancel', this.onPointerUp);
    this.domElement.addEventListener('pointerleave', this.onPointerUp);
    this.domElement.addEventListener('wheel', this.onWheel, { passive: false });
  }

  private onPointerDown = (e: PointerEvent) => {
    this.isDragging = true;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
    this.pointerDownX = e.clientX;
    this.pointerDownY = e.clientY;
    this.pointerDownTime = performance.now();
    this.hasMoved = false;
    this.domElement.setPointerCapture(e.pointerId);
  };

  private onPointerMove = (e: PointerEvent) => {
    if (!this.isDragging) return;

    const dx = e.clientX - this.lastPointerX;
    const dy = e.clientY - this.lastPointerY;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;

    const totalDx = e.clientX - this.pointerDownX;
    const totalDy = e.clientY - this.pointerDownY;
    if (Math.hypot(totalDx, totalDy) > this.movedThreshold) {
      this.hasMoved = true;
    }

    this.cam.targetYaw -= dx * this.yawSpeed;
    this.cam.targetPitch -= dy * this.pitchSpeed;
    this.cam.targetPitch = THREE.MathUtils.clamp(
      this.cam.targetPitch,
      this.minPitch,
      this.maxPitch
    );
  };

  private onPointerUp = (e: PointerEvent) => {
    if (!this.isDragging) return;
    this.isDragging = false;
    try {
      this.domElement.releasePointerCapture(e.pointerId);
    } catch {
    }

    const timeDelta = performance.now() - this.pointerDownTime;
    if (!this.hasMoved && timeDelta < 400) {
      this.handleClick(e.clientX, e.clientY);
    }
  };

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const zoomDelta = e.deltaY * this.zoomSpeed;
    this.cam.targetDistance += zoomDelta;
    this.cam.targetDistance = THREE.MathUtils.clamp(
      this.cam.targetDistance,
      this.minDistance,
      this.maxDistance
    );
  };

  private handleClick(clientX: number, clientY: number) {
    const rect = this.domElement.getBoundingClientRect();
    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hitMesh = this.bridge.getHitMesh();
    const intersects = this.raycaster.intersectObject(hitMesh);

    if (intersects.length > 0) {
      const hit = intersects[0];
      const point = hit.point;
      const arcT = THREE.MathUtils.clamp(
        (point.x / (BRIDGE_HALF_SPAN * 2)) + 0.5,
        0.02,
        0.98
      );
      const tangent = this.bridge.sampleArchTangent(arcT);
      const normal = new THREE.Vector3(-tangent.y, tangent.x, 0).normalize();
      const center = this.bridge.sampleArch(arcT);
      const deltaVec = point.clone().sub(center);
      const wProjection = deltaVec.dot(normal);
      const widthT = THREE.MathUtils.clamp(
        (wProjection / BRIDGE_WIDTH) + 0.5,
        0.05,
        0.95
      );

      const themeColors = this.bridge.getThemeColors();
      let baseColor: THREE.Color;
      if (arcT < 0.5) {
        const t = arcT * 2;
        baseColor = themeColors.bottom.clone().lerp(themeColors.mid, t);
      } else {
        const t = (arcT - 0.5) * 2;
        baseColor = themeColors.mid.clone().lerp(themeColors.top, t);
      }

      const hsl = { h: 0, s: 0, l: 0 };
      baseColor.getHSL(hsl);
      baseColor.setHSL(
        hsl.h + (Math.random() - 0.5) * 0.05,
        Math.min(1, hsl.s + 0.15),
        Math.min(1, hsl.l + 0.1)
      );

      this.particles.spawnGlider(arcT, widthT, baseColor);
    }
  }

  update(delta: number) {
    const t = 1 - Math.exp(-this.smoothing * delta);

    this.cam.yaw += (this.cam.targetYaw - this.cam.yaw) * t;
    this.cam.pitch += (this.cam.targetPitch - this.cam.pitch) * t;
    this.cam.distance += (this.cam.targetDistance - this.cam.distance) * t;
    this.cam.lookAt.lerp(this.cam.targetLookAt, t);

    const cosPitch = Math.cos(this.cam.pitch);
    const offsetX = Math.sin(this.cam.yaw) * cosPitch * this.cam.distance;
    const offsetY = Math.sin(this.cam.pitch) * this.cam.distance;
    const offsetZ = Math.cos(this.cam.yaw) * cosPitch * this.cam.distance;

    this.camera.position.set(
      this.cam.lookAt.x + offsetX,
      this.cam.lookAt.y + offsetY,
      this.cam.lookAt.z + offsetZ
    );
    this.camera.lookAt(this.cam.lookAt);
  }
}
