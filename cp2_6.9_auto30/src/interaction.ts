import * as THREE from 'three';
import { PointCloudManager, HighlightedPoint } from './pointCloud';

export type ViewType = 'aerial' | 'side' | 'front';
export type ToolType = 'pick' | 'rotate';

const VIEW_POSITIONS: Record<ViewType, THREE.Vector3> = {
  aerial: new THREE.Vector3(0, 38, 0.1),
  side: new THREE.Vector3(32, 8, 0),
  front: new THREE.Vector3(0, 8, 28)
};

const VIEW_TARGETS: Record<ViewType, THREE.Vector3> = {
  aerial: new THREE.Vector3(0, 3, 0),
  side: new THREE.Vector3(0, 5, 0),
  front: new THREE.Vector3(0, 5, 0)
};

export interface InteractionCallbacks {
  onProgressChange: (current: number, total: number) => void;
  onReconstruct: () => void;
  onPointPicked: (point: HighlightedPoint | null) => void;
}

export class InteractionManager {
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private pointCloud: PointCloudManager;
  private callbacks: InteractionCallbacks;

  public currentView: ViewType = 'aerial';
  public currentTool: ToolType = 'pick';

  private cameraTarget: THREE.Vector3 = new THREE.Vector3(0, 5, 0);
  private isDragging = false;
  private previousMouse = new THREE.Vector2();
  private spherical = { radius: 38, theta: 0, phi: Math.PI * 0.05 };

  private isAnimatingView = false;
  private viewAnimStart = {
    cameraPos: new THREE.Vector3(),
    cameraTarget: new THREE.Vector3(),
    spherical: { radius: 0, theta: 0, phi: 0 }
  };
  private viewAnimEnd = {
    cameraPos: new THREE.Vector3(),
    cameraTarget: new THREE.Vector3(),
    spherical: { radius: 0, theta: 0, phi: 0 }
  };
  private viewAnimProgress = 0;
  private readonly VIEW_ANIM_DURATION = 400;

  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private downMouse = new THREE.Vector2();

  public keyPoints: HighlightedPoint[] = [];
  public readonly MAX_KEY_POINTS = 5;

  public markerRing: THREE.Mesh | null = null;
  private ringStartTime = 0;

  constructor(
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    pointCloud: PointCloudManager,
    callbacks: InteractionCallbacks
  ) {
    this.camera = camera;
    this.renderer = renderer;
    this.pointCloud = pointCloud;
    this.callbacks = callbacks;

    this.setupCameraForView(this.currentView);
    this.bindEvents();
  }

  private setupCameraForView(view: ViewType): void {
    const pos = VIEW_POSITIONS[view];
    const target = VIEW_TARGETS[view];

    this.camera.position.copy(pos);
    this.cameraTarget.copy(target);
    this.camera.lookAt(target);

    const dx = pos.x - target.x;
    const dy = pos.y - target.y;
    const dz = pos.z - target.z;
    this.spherical.radius = Math.sqrt(dx * dx + dy * dy + dz * dz);
    this.spherical.theta = Math.atan2(dx, dz);
    this.spherical.phi = Math.acos(Math.max(-1, Math.min(1, dy / this.spherical.radius)));
  }

  private bindEvents(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);
    canvas.addEventListener('contextmenu', e => e.preventDefault());

    window.addEventListener('resize', this.onResize);
  }

  private onMouseDown = (e: MouseEvent): void => {
    if (e.button !== 0) return;
    this.isDragging = true;
    this.previousMouse.set(e.clientX, e.clientY);
    this.downMouse.set(e.clientX, e.clientY);
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (!this.isDragging) return;

    const deltaX = e.clientX - this.previousMouse.x;
    const deltaY = e.clientY - this.previousMouse.y;

    if (this.currentTool === 'rotate' || this.isAnimatingView === false) {
      const rotSpeed = 0.005;
      this.spherical.theta -= deltaX * rotSpeed;
      this.spherical.phi = Math.max(0.05, Math.min(Math.PI - 0.05, this.spherical.phi + deltaY * rotSpeed));
      this.updateCameraFromSpherical();
    }

    this.previousMouse.set(e.clientX, e.clientY);
  };

  private onMouseUp = (e: MouseEvent): void => {
    if (!this.isDragging) return;
    this.isDragging = false;

    const dx = Math.abs(e.clientX - this.downMouse.x);
    const dy = Math.abs(e.clientY - this.downMouse.y);
    const isClick = dx < 5 && dy < 5;

    if (isClick && this.currentTool === 'pick' && !this.isAnimatingView) {
      this.handlePick(e.clientX, e.clientY);
    }
  };

  private handlePick(clientX: number, clientY: number): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const index = this.pointCloud.raycast(this.raycaster);

    if (index >= 0) {
      const point = this.pointCloud.highlightPoint(index);
      if (point) {
        this.addKeyPoint(point);
        this.callbacks.onPointPicked(point);
        return;
      }
    }
    this.callbacks.onPointPicked(null);
  }

  private addKeyPoint(point: HighlightedPoint): void {
    if (this.keyPoints.length >= this.MAX_KEY_POINTS) return;

    const exists = this.keyPoints.find(kp => kp.index === point.index);
    if (exists) return;

    this.keyPoints.push(point);
    this.callbacks.onProgressChange(this.keyPoints.length, this.MAX_KEY_POINTS);

    if (this.keyPoints.length >= this.MAX_KEY_POINTS) {
      this.createMarkerRing();
      this.callbacks.onReconstruct();
      this.pointCloud.startReconstruction();
    }
  }

  private createMarkerRing(): void {
    if (this.keyPoints.length === 0) return;

    const center = new THREE.Vector3();
    for (const kp of this.keyPoints) {
      center.add(kp.position);
    }
    center.divideScalar(this.keyPoints.length);

    const geometry = new THREE.RingGeometry(2.3, 2.5, 64);
    const material = new THREE.MeshBasicMaterial({
      color: 0x4caf50,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    this.markerRing = new THREE.Mesh(geometry, material);
    this.markerRing.position.copy(center);
    this.markerRing.rotation.x = -Math.PI / 2;
    this.pointCloud.scene.add(this.markerRing);
    this.ringStartTime = performance.now();
  }

  private updateCameraFromSpherical(): void {
    const sinPhi = Math.sin(this.spherical.phi);
    this.camera.position.x = this.cameraTarget.x + this.spherical.radius * sinPhi * Math.sin(this.spherical.theta);
    this.camera.position.y = this.cameraTarget.y + this.spherical.radius * Math.cos(this.spherical.phi);
    this.camera.position.z = this.cameraTarget.z + this.spherical.radius * sinPhi * Math.cos(this.spherical.theta);
    this.camera.lookAt(this.cameraTarget);
  }

  public switchView(view: ViewType): void {
    if (this.isAnimatingView || this.currentView === view) return;

    this.currentView = view;
    this.isAnimatingView = true;
    this.viewAnimProgress = 0;

    this.viewAnimStart.cameraPos.copy(this.camera.position);
    this.viewAnimStart.cameraTarget.copy(this.cameraTarget);
    this.viewAnimStart.spherical = { ...this.spherical };

    const targetPos = VIEW_POSITIONS[view];
    const targetTarget = VIEW_TARGETS[view];

    this.viewAnimEnd.cameraPos.copy(targetPos);
    this.viewAnimEnd.cameraTarget.copy(targetTarget);

    const dx = targetPos.x - targetTarget.x;
    const dy = targetPos.y - targetTarget.y;
    const dz = targetPos.z - targetTarget.z;
    this.viewAnimEnd.spherical = {
      radius: Math.sqrt(dx * dx + dy * dy + dz * dz),
      theta: Math.atan2(dx, dz),
      phi: Math.acos(Math.max(-1, Math.min(1, dy / Math.sqrt(dx * dx + dy * dy + dz * dz))))
    };
  }

  public setTool(tool: ToolType): void {
    this.currentTool = tool;
  }

  private easeInOutQuad(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  private lerpAngle(a: number, b: number, t: number): number {
    let diff = b - a;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return a + diff * t;
  }

  public update(delta: number): void {
    if (this.isAnimatingView) {
      this.viewAnimProgress += delta * 1000;
      const rawT = Math.min(1, this.viewAnimProgress / this.VIEW_ANIM_DURATION);
      const t = this.easeInOutQuad(rawT);

      this.camera.position.lerpVectors(
        this.viewAnimStart.cameraPos,
        this.viewAnimEnd.cameraPos,
        t
      );
      this.cameraTarget.lerpVectors(
        this.viewAnimStart.cameraTarget,
        this.viewAnimEnd.cameraTarget,
        t
      );

      this.spherical.radius = THREE.MathUtils.lerp(
        this.viewAnimStart.spherical.radius,
        this.viewAnimEnd.spherical.radius,
        t
      );
      this.spherical.theta = this.lerpAngle(
        this.viewAnimStart.spherical.theta,
        this.viewAnimEnd.spherical.theta,
        t
      );
      this.spherical.phi = THREE.MathUtils.lerp(
        this.viewAnimStart.spherical.phi,
        this.viewAnimEnd.spherical.phi,
        t
      );

      this.camera.lookAt(this.cameraTarget);

      if (rawT >= 1) {
        this.isAnimatingView = false;
      }
    }

    if (this.markerRing) {
      const elapsed = performance.now() - this.ringStartTime;
      const pulse = 0.5 + 0.5 * Math.sin(elapsed * 0.004);
      const mat = this.markerRing.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.35 + pulse * 0.35;

      const colorT = (Math.sin(elapsed * 0.0015) + 1) / 2;
      mat.color.setRGB(
        0.3 + (0.4 - 0.3) * colorT,
        0.7 + (0.2 - 0.7) * colorT,
        0.3 + (0.9 - 0.3) * colorT
      );

      const scale = 1 + pulse * 0.1;
      this.markerRing.scale.setScalar(scale);
    }
  }

  private onResize = (): void => {
    const width = window.innerWidth;
    let baseSize = 0.18;
    if (width >= 1920) {
      baseSize = 0.22;
    } else if (width <= 1024) {
      baseSize = 0.14;
    }
    this.pointCloud.material.size = baseSize;
  };

  public dispose(): void {
    const canvas = this.renderer.domElement;
    canvas.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('resize', this.onResize);
  }
}
