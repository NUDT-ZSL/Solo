import * as THREE from 'three';
import { SceneManager } from './SceneManager';

export class InteractionController {
  private camera: THREE.PerspectiveCamera;
  private scene: THREE.Scene;
  private domElement: HTMLElement;
  private sceneManager: SceneManager;

  private isDragging: boolean = false;
  private previousMouse: THREE.Vector2 = new THREE.Vector2();
  private spherical: THREE.Spherical = new THREE.Spherical();
  private target: THREE.Vector3 = new THREE.Vector3();

  private rotateSpeed: number = 0.5;
  private zoomSpeed: number = 1.0;
  private minDistance: number = 2.0;
  private maxDistance: number = 12.0;

  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  private clickTimeout: ReturnType<typeof setTimeout> | null = null;
  private lastClickTime: number = 0;

  private inertia: THREE.Vector2 = new THREE.Vector2();
  private dampingFactor: number = 0.92;

  constructor(
    camera: THREE.PerspectiveCamera,
    scene: THREE.Scene,
    domElement: HTMLElement,
    sceneManager: SceneManager
  ) {
    this.camera = camera;
    this.scene = scene;
    this.domElement = domElement;
    this.sceneManager = sceneManager;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    const offset = camera.position.clone().sub(this.target);
    this.spherical.setFromVector3(offset);

    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onWheel = this.onWheel.bind(this);
    this.onClick = this.onClick.bind(this);
    this.onDblClick = this.onDblClick.bind(this);
    this.onTouchStart = this.onTouchStart.bind(this);
    this.onTouchMove = this.onTouchMove.bind(this);
    this.onTouchEnd = this.onTouchEnd.bind(this);
    this.onContextMenu = this.onContextMenu.bind(this);

    domElement.addEventListener('mousedown', this.onMouseDown);
    domElement.addEventListener('mousemove', this.onMouseMove);
    domElement.addEventListener('mouseup', this.onMouseUp);
    domElement.addEventListener('wheel', this.onWheel, { passive: false });
    domElement.addEventListener('click', this.onClick);
    domElement.addEventListener('dblclick', this.onDblClick);
    domElement.addEventListener('touchstart', this.onTouchStart, { passive: false });
    domElement.addEventListener('touchmove', this.onTouchMove, { passive: false });
    domElement.addEventListener('touchend', this.onTouchEnd);
    domElement.addEventListener('contextmenu', this.onContextMenu);
  }

  private onContextMenu(e: Event): void {
    e.preventDefault();
  }

  private onMouseDown(e: MouseEvent): void {
    if (e.button === 0) {
      this.isDragging = true;
      this.previousMouse.set(e.clientX, e.clientY);
      this.inertia.set(0, 0);
    }
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.isDragging) return;

    const deltaX = e.clientX - this.previousMouse.x;
    const deltaY = e.clientY - this.previousMouse.y;

    this.spherical.theta -= deltaX * this.rotateSpeed * 0.01;
    this.spherical.phi -= deltaY * this.rotateSpeed * 0.01;
    this.spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.spherical.phi));

    this.inertia.set(deltaX * 0.01, deltaY * 0.01);
    this.previousMouse.set(e.clientX, e.clientY);
  }

  private onMouseUp(): void {
    this.isDragging = false;
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    this.spherical.radius += e.deltaY * this.zoomSpeed * 0.005;
    this.spherical.radius = Math.max(
      this.minDistance,
      Math.min(this.maxDistance, this.spherical.radius)
    );
  }

  private onClick(e: MouseEvent): void {
    const now = Date.now();
    if (now - this.lastClickTime < 300) {
      if (this.clickTimeout) {
        clearTimeout(this.clickTimeout);
        this.clickTimeout = null;
      }
      return;
    }
    this.lastClickTime = now;

    this.clickTimeout = setTimeout(() => {
      this.handleSingleClick(e);
      this.clickTimeout = null;
    }, 250);
  }

  private handleSingleClick(e: MouseEvent): void {
    this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const nodes = this.sceneManager.getNodes();
    const intersects = this.raycaster.intersectObjects(nodes);

    if (intersects.length > 0) {
      const hitPoint = intersects[0].point;
      this.sceneManager.triggerRipple(hitPoint);
    }
  }

  private onDblClick(e: MouseEvent): void {
    this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const nodes = this.sceneManager.getNodes();
    const intersects = this.raycaster.intersectObjects(nodes);

    if (intersects.length === 0) {
      const direction = new THREE.Vector3();
      this.raycaster.ray.at(5, direction);
      this.sceneManager.triggerShockwave(direction);
    }
  }

  private touchStartPos: THREE.Vector2 = new THREE.Vector2();
  private touchDistance: number = 0;

  private onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length === 1) {
      this.isDragging = true;
      this.previousMouse.set(e.touches[0].clientX, e.touches[0].clientY);
      this.touchStartPos.set(e.touches[0].clientX, e.touches[0].clientY);
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      this.touchDistance = Math.sqrt(dx * dx + dy * dy);
    }
  }

  private onTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length === 1 && this.isDragging) {
      const deltaX = e.touches[0].clientX - this.previousMouse.x;
      const deltaY = e.touches[0].clientY - this.previousMouse.y;

      this.spherical.theta -= deltaX * this.rotateSpeed * 0.01;
      this.spherical.phi -= deltaY * this.rotateSpeed * 0.01;
      this.spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.spherical.phi));

      this.inertia.set(deltaX * 0.01, deltaY * 0.01);
      this.previousMouse.set(e.touches[0].clientX, e.touches[0].clientY);
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const newDistance = Math.sqrt(dx * dx + dy * dy);
      const delta = this.touchDistance - newDistance;
      this.spherical.radius += delta * this.zoomSpeed * 0.02;
      this.spherical.radius = Math.max(
        this.minDistance,
        Math.min(this.maxDistance, this.spherical.radius)
      );
      this.touchDistance = newDistance;
    }
  }

  private onTouchEnd(): void {
    this.isDragging = false;
  }

  update(): void {
    if (!this.isDragging) {
      this.spherical.theta -= this.inertia.x * this.rotateSpeed;
      this.spherical.phi -= this.inertia.y * this.rotateSpeed;
      this.spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.spherical.phi));

      this.inertia.multiplyScalar(this.dampingFactor);
      if (Math.abs(this.inertia.x) < 0.0001) this.inertia.x = 0;
      if (Math.abs(this.inertia.y) < 0.0001) this.inertia.y = 0;
    }

    const offset = new THREE.Vector3().setFromSpherical(this.spherical);
    this.camera.position.copy(this.target).add(offset);
    this.camera.lookAt(this.target);
  }
}
