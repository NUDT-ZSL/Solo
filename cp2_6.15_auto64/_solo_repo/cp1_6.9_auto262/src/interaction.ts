import * as THREE from 'three';
import { CrystalSystem, CrystalData } from './CrystalSystem';
import { NetworkSystem } from './NetworkSystem';

export class InteractionSystem {
  private camera: THREE.PerspectiveCamera;
  private crystalSystem: CrystalSystem;
  private networkSystem: NetworkSystem;
  private renderer: THREE.WebGLRenderer;
  private domElement: HTMLElement;

  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mouse: THREE.Vector2 = new THREE.Vector2();

  private isDragging: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;

  private cameraYaw: number = 0;
  private cameraPitch: number = 0.2;
  private cameraDistance: number = 10;
  private cameraTarget: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  private minDistance: number = 3;
  private maxDistance: number = 15;
  private minPitch: number = -Math.PI / 2 + 0.1;
  private maxPitch: number = Math.PI / 2 - 0.1;

  private keys: Set<string> = new Set();
  private movementSpeed: number = 2;
  private rotationSpeed: number = 1;

  private mouseDownX: number = 0;
  private mouseDownY: number = 0;
  private clickThreshold: number = 5;

  private hoveredCrystalId: number | null = null;

  constructor(
    camera: THREE.PerspectiveCamera,
    crystalSystem: CrystalSystem,
    networkSystem: NetworkSystem,
    renderer: THREE.WebGLRenderer,
    domElement: HTMLElement
  ) {
    this.camera = camera;
    this.crystalSystem = crystalSystem;
    this.networkSystem = networkSystem;
    this.renderer = renderer;
    this.domElement = domElement;

    this.bindEvents();
    this.updateCameraPosition();
  }

  private bindEvents(): void {
    const el = this.domElement;

    el.addEventListener('mousedown', this.onMouseDown);
    el.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);
    el.addEventListener('wheel', this.onWheel, { passive: false });
    el.addEventListener('mouseleave', this.onMouseLeave);

    el.addEventListener('touchstart', this.onTouchStart, { passive: false });
    el.addEventListener('touchmove', this.onTouchMove, { passive: false });
    el.addEventListener('touchend', this.onTouchEnd);

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  private onMouseDown = (e: MouseEvent): void => {
    this.isDragging = true;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
    this.mouseDownX = e.clientX;
    this.mouseDownY = e.clientY;
  };

  private onMouseMove = (e: MouseEvent): void => {
    this.updateMouse(e.clientX, e.clientY);

    if (this.isDragging) {
      const deltaX = e.clientX - this.lastMouseX;
      const deltaY = e.clientY - this.lastMouseY;

      this.cameraYaw -= deltaX * 0.005;
      this.cameraPitch -= deltaY * 0.005;
      this.cameraPitch = Math.max(this.minPitch, Math.min(this.maxPitch, this.cameraPitch));

      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    } else {
      this.checkHover();
    }
  };

  private onMouseUp = (e: MouseEvent): void => {
    if (this.isDragging) {
      const dx = Math.abs(e.clientX - this.mouseDownX);
      const dy = Math.abs(e.clientY - this.mouseDownY);

      if (dx < this.clickThreshold && dy < this.clickThreshold) {
        this.handleClick();
      }
    }
    this.isDragging = false;
  };

  private onMouseLeave = (): void => {
    this.isDragging = false;
    this.crystalSystem.handleHover(null);
    this.hoveredCrystalId = null;
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    e.stopPropagation();

    const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
    this.cameraDistance *= zoomFactor;
    this.cameraDistance = Math.max(this.minDistance, Math.min(this.maxDistance, this.cameraDistance));
  };

  private onTouchStart = (e: TouchEvent): void => {
    e.preventDefault();
    if (e.touches.length === 1) {
      this.isDragging = true;
      this.lastMouseX = e.touches[0].clientX;
      this.lastMouseY = e.touches[0].clientY;
      this.mouseDownX = e.touches[0].clientX;
      this.mouseDownY = e.touches[0].clientY;
    }
  };

  private onTouchMove = (e: TouchEvent): void => {
    e.preventDefault();
    if (this.isDragging && e.touches.length === 1) {
      const deltaX = e.touches[0].clientX - this.lastMouseX;
      const deltaY = e.touches[0].clientY - this.lastMouseY;

      this.cameraYaw -= deltaX * 0.005;
      this.cameraPitch -= deltaY * 0.005;
      this.cameraPitch = Math.max(this.minPitch, Math.min(this.maxPitch, this.cameraPitch));

      this.lastMouseX = e.touches[0].clientX;
      this.lastMouseY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dist = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      if ((e as any).lastPinchDist !== undefined) {
        const delta = (e as any).lastPinchDist - dist;
        const zoomFactor = delta > 0 ? 1.02 : 0.98;
        this.cameraDistance *= zoomFactor;
        this.cameraDistance = Math.max(this.minDistance, Math.min(this.maxDistance, this.cameraDistance));
      }
      (e as any).lastPinchDist = dist;
    }
  };

  private onTouchEnd = (e: TouchEvent): void => {
    if (this.isDragging && e.changedTouches.length === 1) {
      const touch = e.changedTouches[0];
      const dx = Math.abs(touch.clientX - this.mouseDownX);
      const dy = Math.abs(touch.clientY - this.mouseDownY);

      if (dx < this.clickThreshold * 2 && dy < this.clickThreshold * 2) {
        this.updateMouse(touch.clientX, touch.clientY);
        this.handleClick();
      }
    }
    this.isDragging = false;
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    this.keys.add(e.code);
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
  };

  private updateMouse(clientX: number, clientY: number): void {
    const rect = this.domElement.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  }

  private checkHover(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const crystals = this.crystalSystem.getCrystals();
    const meshes = crystals.map(c => c.mesh);
    const intersects = this.raycaster.intersectObjects(meshes, false);

    if (intersects.length > 0) {
      const clickedMesh = intersects[0].object as THREE.Mesh;
      const crystal = crystals.find(c => c.mesh === clickedMesh);
      if (crystal) {
        if (this.hoveredCrystalId !== crystal.id) {
          this.hoveredCrystalId = crystal.id;
          this.crystalSystem.handleHover(crystal.id);
        }
        this.domElement.style.cursor = 'pointer';
        return;
      }
    }

    if (this.hoveredCrystalId !== null) {
      this.hoveredCrystalId = null;
      this.crystalSystem.handleHover(null);
    }
    this.domElement.style.cursor = this.isDragging ? 'grabbing' : 'grab';
  }

  private handleClick(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const crystals = this.crystalSystem.getCrystals();
    const meshes = crystals.map(c => c.mesh);
    const intersects = this.raycaster.intersectObjects(meshes, false);

    if (intersects.length > 0) {
      const clickedMesh = intersects[0].object as THREE.Mesh;
      const crystal = crystals.find(c => c.mesh === clickedMesh);
      if (crystal) {
        this.onCrystalClick(crystal);
      }
    }
  }

  private onCrystalClick(crystal: CrystalData): void {
    this.networkSystem.createRipple(crystal.position.clone(), crystal.color);
    this.crystalSystem.boostCrystal(crystal.id);
    this.networkSystem.boostConnectionsForCrystal(crystal.id);
  }

  public update(deltaTime: number): void {
    if (this.keys.has('KeyW')) {
      const forward = new THREE.Vector3();
      this.camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();
      this.cameraTarget.addScaledVector(forward, this.movementSpeed * deltaTime);
    }
    if (this.keys.has('KeyS')) {
      const backward = new THREE.Vector3();
      this.camera.getWorldDirection(backward);
      backward.y = 0;
      backward.normalize();
      this.cameraTarget.addScaledVector(backward, -this.movementSpeed * deltaTime);
    }
    if (this.keys.has('KeyA')) {
      this.cameraYaw += this.rotationSpeed * deltaTime;
    }
    if (this.keys.has('KeyD')) {
      this.cameraYaw -= this.rotationSpeed * deltaTime;
    }

    this.updateCameraPosition();
  }

  private updateCameraPosition(): void {
    const sinYaw = Math.sin(this.cameraYaw);
    const cosYaw = Math.cos(this.cameraYaw);
    const sinPitch = Math.sin(this.cameraPitch);
    const cosPitch = Math.cos(this.cameraPitch);

    const offsetX = this.cameraDistance * cosPitch * sinYaw;
    const offsetY = this.cameraDistance * sinPitch;
    const offsetZ = this.cameraDistance * cosPitch * cosYaw;

    this.camera.position.set(
      this.cameraTarget.x + offsetX,
      this.cameraTarget.y + offsetY,
      this.cameraTarget.z + offsetZ
    );

    this.camera.lookAt(this.cameraTarget);
  }

  public dispose(): void {
    const el = this.domElement;

    el.removeEventListener('mousedown', this.onMouseDown);
    el.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);
    el.removeEventListener('wheel', this.onWheel);
    el.removeEventListener('mouseleave', this.onMouseLeave);

    el.removeEventListener('touchstart', this.onTouchStart);
    el.removeEventListener('touchmove', this.onTouchMove);
    el.removeEventListener('touchend', this.onTouchEnd);

    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }
}
