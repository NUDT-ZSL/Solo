import * as THREE from 'three';
import { CityGenerator, BuildingData } from './cityGenerator';

export interface CameraPreset {
  name: string;
  position: THREE.Vector3;
  target: THREE.Vector3;
}

export const CAMERA_PRESETS: Record<string, CameraPreset> = {
  birdseye: {
    name: '鸟瞰',
    position: new THREE.Vector3(0, 150, 0.01),
    target: new THREE.Vector3(0, 0, 0),
  },
  street: {
    name: '街景',
    position: new THREE.Vector3(70, 18, 70),
    target: new THREE.Vector3(0, 10, 0),
  },
  free: {
    name: '自由',
    position: new THREE.Vector3(90, 55, 90),
    target: new THREE.Vector3(0, 10, 0),
  },
};

type BuildingClickCallback = (building: BuildingData, screenX: number, screenY: number, worldPos: THREE.Vector3) => void;
type BuildingHoverCallback = (building: BuildingData | null, screenX?: number, screenY?: number) => void;
type PresetChangeCallback = (t: number) => void;

export class InteractionControls {
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;
  private cityGenerator: CityGenerator;

  private isDragging = false;
  private dragStartPos = { x: 0, y: 0 };
  private previousMouse = { x: 0, y: 0 };
  private spherical = { theta: 0, phi: 0, radius: 100 };
  private target = new THREE.Vector3(0, 10, 0);

  private raycaster = new THREE.Raycaster();
  private mouseNDC = new THREE.Vector2();

  private clickCallbacks: BuildingClickCallback[] = [];
  private hoverCallbacks: BuildingHoverCallback[] = [];
  private presetAnimationCallbacks: PresetChangeCallback[] = [];

  private animating = false;
  private bezierP0 = new THREE.Vector3();
  private bezierP1 = new THREE.Vector3();
  private bezierP2 = new THREE.Vector3();
  private bezierP3 = new THREE.Vector3();
  private bezierTargetStart = new THREE.Vector3();
  private bezierTargetEnd = new THREE.Vector3();
  private animStartTime = 0;
  private animDuration = 1.5;

  private hoveredBuilding: BuildingData | null = null;
  private selectedBuilding: BuildingData | null = null;
  private highlightMesh: THREE.Mesh | null = null;
  private highlightEdges: THREE.LineSegments | null = null;
  private highlightStartTime = 0;

  private enabled = true;

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement, cityGenerator: CityGenerator) {
    this.camera = camera;
    this.domElement = domElement;
    this.cityGenerator = cityGenerator;

    const offset = camera.position.clone().sub(this.target);
    this.spherical.radius = offset.length();
    this.spherical.theta = Math.atan2(offset.x, offset.z);
    this.spherical.phi = Math.acos(THREE.MathUtils.clamp(offset.y / this.spherical.radius, -1, 1));

    this.bindEvents();
  }

  private bindEvents(): void {
    this.domElement.addEventListener('mousedown', this.onMouseDown);
    this.domElement.addEventListener('mousemove', this.onMouseMove);
    this.domElement.addEventListener('mouseup', this.onMouseUp);
    this.domElement.addEventListener('mouseleave', this.onMouseUp);
    this.domElement.addEventListener('wheel', this.onWheel, { passive: false });
    this.domElement.addEventListener('contextmenu', this.onContextMenu);
    this.domElement.addEventListener('click', this.onClick);

    this.domElement.addEventListener('touchstart', this.onTouchStart, { passive: false });
    this.domElement.addEventListener('touchmove', this.onTouchMove, { passive: false });
    this.domElement.addEventListener('touchend', this.onTouchEnd);
  }

  private onMouseDown = (e: MouseEvent): void => {
    if (!this.enabled || this.animating) return;
    if (e.button === 0) {
      this.isDragging = true;
      this.dragStartPos = { x: e.clientX, y: e.clientY };
    }
    this.previousMouse = { x: e.clientX, y: e.clientY };
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (!this.enabled) return;

    if (this.isDragging && !this.animating) {
      const dx = e.clientX - this.previousMouse.x;
      const dy = e.clientY - this.previousMouse.y;
      this.spherical.theta -= dx * 0.005;
      this.spherical.phi = THREE.MathUtils.clamp(
        this.spherical.phi - dy * 0.005,
        0.08,
        Math.PI / 2 - 0.03
      );
      this.previousMouse = { x: e.clientX, y: e.clientY };
      this.updateCameraFromSpherical();
    }

    this.updateHover(e.clientX, e.clientY);
  };

  private onMouseUp = (): void => {
    this.isDragging = false;
  };

  private onWheel = (e: WheelEvent): void => {
    if (!this.enabled || this.animating) return;
    e.preventDefault();
    const factor = Math.sign(e.deltaY);
    this.spherical.radius = THREE.MathUtils.clamp(
      this.spherical.radius * (1 + factor * 0.06),
      15,
      250
    );
    this.updateCameraFromSpherical();
  };

  private onContextMenu = (e: Event): void => {
    e.preventDefault();
  };

  private onClick = (e: MouseEvent): void => {
    if (!this.enabled || this.animating) return;
    const dx = Math.abs(e.clientX - this.dragStartPos.x);
    const dy = Math.abs(e.clientY - this.dragStartPos.y);
    if (dx > 4 || dy > 4) return;

    const result = this.pickBuilding(e.clientX, e.clientY);
    if (result) {
      const { building, worldPos } = result;
      this.selectBuilding(building);
      this.clickCallbacks.forEach(cb => cb(building, e.clientX, e.clientY, worldPos));
    } else {
      this.deselectBuilding();
    }
  };

  private onTouchStart = (e: TouchEvent): void => {
    if (!this.enabled || this.animating) return;
    e.preventDefault();
    if (e.touches.length === 1) {
      this.isDragging = true;
      this.previousMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      this.dragStartPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  private onTouchMove = (e: TouchEvent): void => {
    if (!this.enabled || this.animating) return;
    e.preventDefault();
    if (e.touches.length === 1 && this.isDragging) {
      const dx = e.touches[0].clientX - this.previousMouse.x;
      const dy = e.touches[0].clientY - this.previousMouse.y;
      this.spherical.theta -= dx * 0.005;
      this.spherical.phi = THREE.MathUtils.clamp(
        this.spherical.phi - dy * 0.005,
        0.08,
        Math.PI / 2 - 0.03
      );
      this.previousMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      this.updateCameraFromSpherical();
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const last = (this as any)._lastPinchDist;
      if (last && last > 0) {
        const ratio = last / dist;
        this.spherical.radius = THREE.MathUtils.clamp(this.spherical.radius * ratio, 15, 250);
        this.updateCameraFromSpherical();
      }
      (this as any)._lastPinchDist = dist;
    }
  };

  private onTouchEnd = (e: TouchEvent): void => {
    if (this.isDragging) {
      const t = e.changedTouches[0];
      const dx = Math.abs(t.clientX - this.dragStartPos.x);
      const dy = Math.abs(t.clientY - this.dragStartPos.y);
      if (dx < 5 && dy < 5) {
        const result = this.pickBuilding(t.clientX, t.clientY);
        if (result) {
          this.selectBuilding(result.building);
          this.clickCallbacks.forEach(cb => cb(result.building, t.clientX, t.clientY, result.worldPos));
        }
      }
    }
    this.isDragging = false;
    (this as any)._lastPinchDist = 0;
  };

  private pickBuilding(screenX: number, screenY: number): { building: BuildingData; worldPos: THREE.Vector3 } | null {
    this.mouseNDC.x = (screenX / window.innerWidth) * 2 - 1;
    this.mouseNDC.y = -(screenY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouseNDC, this.camera);

    const buildings = this.cityGenerator.getAllBuildings();
    const proxyMeshes = buildings.map(b => b.mesh);

    const intersects = this.raycaster.intersectObjects(proxyMeshes, false);
    if (intersects.length > 0) {
      const hit = intersects[0];
      const mesh = hit.object as THREE.Mesh;
      const data = mesh.userData.buildingData as BuildingData | undefined;
      if (data) {
        return { building: data, worldPos: hit.point.clone() };
      }
    }
    return null;
  }

  private updateHover(screenX: number, screenY: number): void {
    const result = this.pickBuilding(screenX, screenY);
    const building = result ? result.building : null;

    if (building !== this.hoveredBuilding) {
      this.hoveredBuilding = building;
      this.hoverCallbacks.forEach(cb => cb(building, screenX, screenY));
    }
    this.domElement.style.cursor = building ? 'pointer' : 'grab';
  }

  private selectBuilding(building: BuildingData): void {
    this.deselectBuilding();
    this.selectedBuilding = building;
    this.highlightStartTime = performance.now();

    const { position, size } = building;
    const highlightGeo = new THREE.BoxGeometry(
      size.x * 1.04,
      size.y * 1.02,
      size.z * 1.04
    );
    const highlightMat = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      transparent: true,
      opacity: 0.08,
      side: THREE.BackSide,
      depthWrite: false,
    });
    this.highlightMesh = new THREE.Mesh(highlightGeo, highlightMat);
    this.highlightMesh.position.copy(position);
    this.highlightMesh.renderOrder = 998;
    building.mesh.parent?.add(this.highlightMesh);

    const edgesGeo = new THREE.EdgesGeometry(highlightGeo);
    const edgesMat = new THREE.LineBasicMaterial({
      color: 0xffd700,
      transparent: true,
      opacity: 1,
    });
    this.highlightEdges = new THREE.LineSegments(edgesGeo, edgesMat);
    this.highlightEdges.position.copy(position);
    this.highlightEdges.renderOrder = 999;
    building.mesh.parent?.add(this.highlightEdges);
  }

  deselectBuilding(): void {
    if (this.highlightMesh) {
      this.highlightMesh.parent?.remove(this.highlightMesh);
      this.highlightMesh.geometry.dispose();
      (this.highlightMesh.material as THREE.Material).dispose();
      this.highlightMesh = null;
    }
    if (this.highlightEdges) {
      this.highlightEdges.parent?.remove(this.highlightEdges);
      this.highlightEdges.geometry.dispose();
      (this.highlightEdges.material as THREE.Material).dispose();
      this.highlightEdges = null;
    }
    this.selectedBuilding = null;
  }

  updateHighlight(now: number): void {
    if (!this.selectedBuilding || !this.highlightEdges) return;

    const elapsed = (now - this.highlightStartTime) / 1000;
    const blinkFreq = 1 / 0.5;
    const blink = (Math.sin(elapsed * Math.PI * 2 * blinkFreq) + 1) / 2;
    const edgeOpacity = 0.25 + blink * 0.75;

    const edgeMat = this.highlightEdges.material as THREE.LineBasicMaterial;
    edgeMat.opacity = edgeOpacity;

    if (this.highlightMesh) {
      const hm = this.highlightMesh.material as THREE.MeshBasicMaterial;
      hm.opacity = 0.03 + blink * 0.15;
    }
  }

  updateCameraFromSpherical(): void {
    const sinPhi = Math.sin(this.spherical.phi);
    const cosPhi = Math.cos(this.spherical.phi);
    const sinTheta = Math.sin(this.spherical.theta);
    const cosTheta = Math.cos(this.spherical.theta);

    this.camera.position.set(
      this.target.x + this.spherical.radius * sinPhi * sinTheta,
      this.target.y + this.spherical.radius * cosPhi,
      this.target.z + this.spherical.radius * sinPhi * cosTheta
    );
    this.camera.lookAt(this.target);
  }

  setPreset(preset: CameraPreset, duration = 1.5): void {
    this.bezierP0.copy(this.camera.position);
    this.bezierP3.copy(preset.position);

    const startLen = this.bezierP0.length();
    const endLen = this.bezierP3.length();
    const arcHeight = Math.max(startLen, endLen) * 0.55 + 25;

    const dirStart = this.bezierP0.clone().sub(this.target).normalize();
    const dirEnd = this.bezierP3.clone().sub(new THREE.Vector3(0, preset.target.y, 0)).normalize();
    const midDir = dirStart.clone().add(dirEnd).normalize();
    const midDist = (this.spherical.radius + preset.position.distanceTo(preset.target)) * 0.55;

    this.bezierP1.copy(this.target).add(dirStart.multiplyScalar(midDist)).add(new THREE.Vector3(0, arcHeight * 0.5, 0));
    this.bezierP2.copy(new THREE.Vector3(0, preset.target.y, 0)).add(midDir.multiplyScalar(midDist)).add(new THREE.Vector3(0, arcHeight, 0));

    this.bezierTargetStart.copy(this.target);
    this.bezierTargetEnd.copy(preset.target);

    this.animStartTime = performance.now();
    this.animDuration = duration * 1000;
    this.animating = true;
  }

  updateAnimation(now: number): boolean {
    if (!this.animating) return false;

    const elapsed = now - this.animStartTime;
    let t = Math.min(1, elapsed / this.animDuration);
    const eased = this.easeInOutCubic(t);

    const pos = this.cubicBezierPoint(
      this.bezierP0, this.bezierP1, this.bezierP2, this.bezierP3, eased
    );
    const tgt = new THREE.Vector3().lerpVectors(this.bezierTargetStart, this.bezierTargetEnd, eased);

    this.camera.position.copy(pos);
    this.target.copy(tgt);
    this.camera.lookAt(this.target);

    this.presetAnimationCallbacks.forEach(cb => cb(t));

    const offset = this.camera.position.clone().sub(this.target);
    this.spherical.radius = offset.length();
    this.spherical.theta = Math.atan2(offset.x, offset.z);
    const rawPhi = Math.acos(THREE.MathUtils.clamp(offset.y / this.spherical.radius, -1, 1));
    this.spherical.phi = THREE.MathUtils.clamp(rawPhi, 0.08, Math.PI / 2 - 0.03);

    if (t >= 1) {
      this.animating = false;
      this.presetAnimationCallbacks.forEach(cb => cb(1));
    }

    return this.animating;
  }

  private cubicBezierPoint(p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, t: number): THREE.Vector3 {
    const mt = 1 - t;
    const mtt = mt * mt;
    const mttt = mtt * mt;
    const tt = t * t;
    const ttt = tt * t;

    return new THREE.Vector3(
      mttt * p0.x + 3 * mtt * t * p1.x + 3 * mt * tt * p2.x + ttt * p3.x,
      mttt * p0.y + 3 * mtt * t * p1.y + 3 * mt * tt * p2.y + ttt * p3.y,
      mttt * p0.z + 3 * mtt * t * p1.z + 3 * mt * tt * p2.z + ttt * p3.z
    );
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  onBuildingClick(callback: BuildingClickCallback): void {
    this.clickCallbacks.push(callback);
  }

  onBuildingHover(callback: BuildingHoverCallback): void {
    this.hoverCallbacks.push(callback);
  }

  onPresetAnimation(callback: PresetChangeCallback): void {
    this.presetAnimationCallbacks.push(callback);
  }

  enable(): void { this.enabled = true; }
  disable(): void { this.enabled = false; }
  isAnimating(): boolean { return this.animating; }
  getSelectedBuilding(): BuildingData | null { return this.selectedBuilding; }

  dispose(): void {
    this.domElement.removeEventListener('mousedown', this.onMouseDown);
    this.domElement.removeEventListener('mousemove', this.onMouseMove);
    this.domElement.removeEventListener('mouseup', this.onMouseUp);
    this.domElement.removeEventListener('mouseleave', this.onMouseUp);
    this.domElement.removeEventListener('wheel', this.onWheel);
    this.domElement.removeEventListener('contextmenu', this.onContextMenu);
    this.domElement.removeEventListener('click', this.onClick);
    this.domElement.removeEventListener('touchstart', this.onTouchStart);
    this.domElement.removeEventListener('touchmove', this.onTouchMove);
    this.domElement.removeEventListener('touchend', this.onTouchEnd);
  }
}
