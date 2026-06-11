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
    position: new THREE.Vector3(0, 120, 10),
    target: new THREE.Vector3(0, 0, 0),
  },
  street: {
    name: '街景',
    position: new THREE.Vector3(60, 15, 60),
    target: new THREE.Vector3(0, 10, 0),
  },
  free: {
    name: '自由',
    position: new THREE.Vector3(80, 50, 80),
    target: new THREE.Vector3(0, 10, 0),
  },
};

type BuildingClickCallback = (building: BuildingData, screenX: number, screenY: number) => void;
type BuildingHoverCallback = (building: BuildingData | null) => void;

export class InteractionControls {
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;
  private cityGenerator: CityGenerator;

  private isDragging = false;
  private isRightDrag = false;
  private previousMouse = { x: 0, y: 0 };
  private spherical = { theta: 0, phi: 0, radius: 100 };
  private target = new THREE.Vector3(0, 10, 0);

  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();

  private clickCallbacks: BuildingClickCallback[] = [];
  private hoverCallbacks: BuildingHoverCallback[] = [];

  private animating = false;
  private animStartPos = new THREE.Vector3();
  private animStartTarget = new THREE.Vector3();
  private animEndPos = new THREE.Vector3();
  private animEndTarget = new THREE.Vector3();
  private animStartTime = 0;
  private animDuration = 1.5;

  private hoveredBuilding: BuildingData | null = null;
  private selectedBuilding: BuildingData | null = null;
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
    } else if (e.button === 2) {
      this.isRightDrag = true;
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
        0.1,
        Math.PI / 2 - 0.05
      );
      this.previousMouse = { x: e.clientX, y: e.clientY };
      this.updateCameraFromSpherical();
    }

    if (this.isRightDrag && !this.animating) {
      const dx = e.clientX - this.previousMouse.x;
      const dy = e.clientY - this.previousMouse.y;
      this.target.x -= dx * 0.1;
      this.target.y += dy * 0.1;
      this.previousMouse = { x: e.clientX, y: e.clientY };
      this.updateCameraFromSpherical();
    }

    this.updateHover(e);
  };

  private onMouseUp = (): void => {
    this.isDragging = false;
    this.isRightDrag = false;
  };

  private onWheel = (e: WheelEvent): void => {
    if (!this.enabled || this.animating) return;
    e.preventDefault();
    this.spherical.radius = THREE.MathUtils.clamp(
      this.spherical.radius + e.deltaY * 0.05,
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
    if (this.isDragging) return;

    this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const buildings = this.cityGenerator.getAllBuildings();
    const meshes = buildings.map(b => b.mesh);
    const intersects = this.raycaster.intersectObjects(meshes);

    if (intersects.length > 0) {
      const hitMesh = intersects[0].object as THREE.Mesh;
      const buildingId = hitMesh.userData.buildingId as number;
      const building = this.cityGenerator.getBuildingById(buildingId);
      if (building) {
        this.selectBuilding(building);
        this.clickCallbacks.forEach(cb => cb(building, e.clientX, e.clientY));
      }
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
        0.1,
        Math.PI / 2 - 0.05
      );
      this.previousMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      this.updateCameraFromSpherical();
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      if ((this as any)._lastPinchDist) {
        const delta = (this as any)._lastPinchDist - dist;
        this.spherical.radius = THREE.MathUtils.clamp(
          this.spherical.radius + delta * 0.1,
          15,
          250
        );
        this.updateCameraFromSpherical();
      }
      (this as any)._lastPinchDist = dist;
    }
  };

  private onTouchEnd = (): void => {
    this.isDragging = false;
    (this as any)._lastPinchDist = 0;
  };

  private updateHover(e: MouseEvent): void {
    this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const buildings = this.cityGenerator.getAllBuildings();
    const meshes = buildings.map(b => b.mesh);
    const intersects = this.raycaster.intersectObjects(meshes);

    if (intersects.length > 0) {
      const hitMesh = intersects[0].object as THREE.Mesh;
      const buildingId = hitMesh.userData.buildingId as number;
      const building = this.cityGenerator.getBuildingById(buildingId);

      if (this.hoveredBuilding !== building) {
        if (this.hoveredBuilding) {
          this.resetBuildingEmissive(this.hoveredBuilding);
        }
        this.hoveredBuilding = building;
        if (building && building !== this.selectedBuilding) {
          const mat = building.mesh.material as THREE.MeshStandardMaterial;
          mat.emissive = new THREE.Color(0x222244);
          mat.emissiveIntensity = 0.3;
        }
        this.hoverCallbacks.forEach(cb => cb(building));
      }
      this.domElement.style.cursor = 'pointer';
    } else {
      if (this.hoveredBuilding) {
        this.resetBuildingEmissive(this.hoveredBuilding);
        this.hoveredBuilding = null;
        this.hoverCallbacks.forEach(cb => cb(null));
      }
      this.domElement.style.cursor = 'grab';
    }
  }

  private resetBuildingEmissive(building: BuildingData): void {
    if (building === this.selectedBuilding) return;
    const mat = building.mesh.material as THREE.MeshStandardMaterial;
    mat.emissive = new THREE.Color(0x000000);
    mat.emissiveIntensity = 0;
  }

  private selectBuilding(building: BuildingData): void {
    if (this.selectedBuilding) {
      this.deselectBuilding();
    }
    this.selectedBuilding = building;
    this.highlightStartTime = performance.now();

    const mat = building.mesh.material as THREE.MeshStandardMaterial;
    mat.emissive = new THREE.Color(0xffd700);
    mat.emissiveIntensity = 0.5;

    const edgeGeo = new THREE.EdgesGeometry(building.mesh.geometry);
    const edgeMat = new THREE.LineBasicMaterial({
      color: 0xffd700,
      transparent: true,
      opacity: 1,
    });
    this.highlightEdges = new THREE.LineSegments(edgeGeo, edgeMat);
    this.highlightEdges.position.copy(building.mesh.position);
    this.highlightEdges.name = 'highlight-edges';
    building.mesh.parent?.add(this.highlightEdges);
  }

  deselectBuilding(): void {
    if (this.selectedBuilding) {
      const mat = this.selectedBuilding.mesh.material as THREE.MeshStandardMaterial;
      mat.emissive = new THREE.Color(0x000000);
      mat.emissiveIntensity = 0;

      if (this.highlightEdges) {
        this.highlightEdges.parent?.remove(this.highlightEdges);
        this.highlightEdges.geometry.dispose();
        (this.highlightEdges.material as THREE.Material).dispose();
        this.highlightEdges = null;
      }

      this.selectedBuilding = null;
    }
  }

  updateHighlight(now: number): void {
    if (!this.selectedBuilding || !this.highlightEdges) return;

    const elapsed = (now - this.highlightStartTime) / 1000;
    const blink = Math.sin(elapsed * Math.PI * 2 * (1 / 0.5));
    const opacity = 0.3 + Math.abs(blink) * 0.7;

    const edgeMat = this.highlightEdges.material as THREE.LineBasicMaterial;
    edgeMat.opacity = opacity;

    const mat = this.selectedBuilding.mesh.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = 0.2 + Math.abs(blink) * 0.5;
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
    this.animStartPos.copy(this.camera.position);
    this.animStartTarget.copy(this.target);
    this.animEndPos.copy(preset.position);
    this.animEndTarget.copy(preset.target);
    this.animStartTime = performance.now();
    this.animDuration = duration * 1000;
    this.animating = true;
  }

  updateAnimation(now: number): boolean {
    if (!this.animating) return false;

    const elapsed = now - this.animStartTime;
    let t = Math.min(1, elapsed / this.animDuration);
    t = this.easeInOutCubic(t);

    const midY = Math.max(this.animStartPos.y, this.animEndPos.y) + 30;
    const p1 = new THREE.Vector3(
      this.animStartPos.x * 0.6 + this.animEndPos.x * 0.4,
      midY,
      this.animStartPos.z * 0.6 + this.animEndPos.z * 0.4
    );
    const p2 = new THREE.Vector3(
      this.animStartPos.x * 0.4 + this.animEndPos.x * 0.6,
      midY,
      this.animStartPos.z * 0.4 + this.animEndPos.z * 0.6
    );

    const pos = this.cubicBezier(
      this.animStartPos, p1, p2, this.animEndPos, t
    );
    const tgt = new THREE.Vector3().lerpVectors(this.animStartTarget, this.animEndTarget, t);

    this.camera.position.copy(pos);
    this.target.copy(tgt);
    this.camera.lookAt(this.target);

    const offset = this.camera.position.clone().sub(this.target);
    this.spherical.radius = offset.length();
    this.spherical.theta = Math.atan2(offset.x, offset.z);
    this.spherical.phi = Math.acos(THREE.MathUtils.clamp(offset.y / this.spherical.radius, -1, 1));

    if (t >= 1) {
      this.animating = false;
    }

    return this.animating;
  }

  private cubicBezier(p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, t: number): THREE.Vector3 {
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;
    const t2 = t * t;
    const t3 = t2 * t;

    return new THREE.Vector3(
      mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
      mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y,
      mt3 * p0.z + 3 * mt2 * t * p1.z + 3 * mt * t2 * p2.z + t3 * p3.z
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

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
  }

  isAnimating(): boolean {
    return this.animating;
  }

  getSelectedBuilding(): BuildingData | null {
    return this.selectedBuilding;
  }

  dispose(): void {
    this.domElement.removeEventListener('mousedown', this.onMouseDown);
    this.domElement.removeEventListener('mousemove', this.onMouseMove);
    this.domElement.removeEventListener('mouseup', this.onMouseUp);
    this.domElement.removeEventListener('wheel', this.onWheel);
    this.domElement.removeEventListener('contextmenu', this.onContextMenu);
    this.domElement.removeEventListener('click', this.onClick);
    this.domElement.removeEventListener('touchstart', this.onTouchStart);
    this.domElement.removeEventListener('touchmove', this.onTouchMove);
    this.domElement.removeEventListener('touchend', this.onTouchEnd);
  }
}
