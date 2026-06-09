import * as THREE from 'three';
import { LavaCaveScene } from './scene';

const MIN_DISTANCE = 3;
const MAX_DISTANCE = 25;
const MIN_PITCH = -Math.PI / 3;
const MAX_PITCH = Math.PI / 3;
const DAMPING_DURATION = 0.4;

interface CameraState {
  yaw: number;
  pitch: number;
  distance: number;
  target: THREE.Vector3;
}

export class InteractionManager {
  private camera: THREE.PerspectiveCamera;
  private caveScene: LavaCaveScene;
  private canvas: HTMLElement;

  private currentState: CameraState;
  private targetState: CameraState;

  private isDragging: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  private dragVelocityX: number = 0;
  private dragVelocityY: number = 0;

  private raycaster: THREE.Raycaster;
  private mouseNDC: THREE.Vector2;
  private hoveredCrystal: THREE.Mesh | null = null;
  private crystals: THREE.Mesh[];

  private onClickCallback: ((mesh: THREE.Mesh, elapsed: number) => void) | null = null;

  constructor(
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    caveScene: LavaCaveScene
  ) {
    this.camera = camera;
    this.caveScene = caveScene;
    this.canvas = renderer.domElement;

    this.currentState = {
      yaw: Math.PI * 0.25,
      pitch: -0.35,
      distance: 14,
      target: new THREE.Vector3(0, -1, 0)
    };
    this.targetState = { ...this.currentState, target: this.currentState.target.clone() };

    this.raycaster = new THREE.Raycaster();
    this.mouseNDC = new THREE.Vector2();
    this.crystals = caveScene.getCrystals();

    this.bindEvents();
    this.updateCamera(0);
  }

  private bindEvents(): void {
    const canvas = this.canvas;

    canvas.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);
    canvas.addEventListener('wheel', this.onWheel, { passive: false });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    canvas.addEventListener('touchstart', this.onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', this.onTouchMove, { passive: false });
    canvas.addEventListener('touchend', this.onTouchEnd);
  }

  private onMouseDown = (e: MouseEvent): void => {
    if (e.button === 2) return;
    this.isDragging = true;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
    this.dragVelocityX = 0;
    this.dragVelocityY = 0;
    this.canvas.style.cursor = 'grabbing';
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (this.isDragging) {
      const dx = e.clientX - this.lastMouseX;
      const dy = e.clientY - this.lastMouseY;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;

      const rotSpeedX = 0.006;
      const rotSpeedY = 0.006;

      this.targetState.yaw -= dx * rotSpeedX;
      this.targetState.pitch -= dy * rotSpeedY;
      this.targetState.pitch = Math.max(MIN_PITCH, Math.min(MAX_PITCH, this.targetState.pitch));

      this.dragVelocityX = dx;
      this.dragVelocityY = dy;
    }

    this.updateHover(e.clientX, e.clientY);
  };

  private onMouseUp = (e: MouseEvent): void => {
    if (this.isDragging) {
      this.isDragging = false;
      this.canvas.style.cursor = 'default';

      if (Math.abs(this.dragVelocityX) < 3 && Math.abs(this.dragVelocityY) < 3) {
        this.handleClick(e.clientX, e.clientY);
      }
    }
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const zoomSpeed = 0.002;
    const delta = e.deltaY;
    this.targetState.distance *= 1 + delta * zoomSpeed;
    this.targetState.distance = Math.max(MIN_DISTANCE, Math.min(MAX_DISTANCE, this.targetState.distance));
  };

  private onTouchStart = (e: TouchEvent): void => {
    e.preventDefault();
    if (e.touches.length === 1) {
      this.isDragging = true;
      this.lastMouseX = e.touches[0].clientX;
      this.lastMouseY = e.touches[0].clientY;
      this.dragVelocityX = 0;
      this.dragVelocityY = 0;
    }
  };

  private onTouchMove = (e: TouchEvent): void => {
    e.preventDefault();
    if (this.isDragging && e.touches.length === 1) {
      const touch = e.touches[0];
      const dx = touch.clientX - this.lastMouseX;
      const dy = touch.clientY - this.lastMouseY;
      this.lastMouseX = touch.clientX;
      this.lastMouseY = touch.clientY;

      const rotSpeedX = 0.008;
      const rotSpeedY = 0.008;

      this.targetState.yaw -= dx * rotSpeedX;
      this.targetState.pitch -= dy * rotSpeedY;
      this.targetState.pitch = Math.max(MIN_PITCH, Math.min(MAX_PITCH, this.targetState.pitch));

      this.dragVelocityX = dx;
      this.dragVelocityY = dy;
    }
  };

  private onTouchEnd = (e: TouchEvent): void => {
    if (this.isDragging) {
      this.isDragging = false;
      if (e.changedTouches.length === 1) {
        const touch = e.changedTouches[0];
        if (Math.abs(this.dragVelocityX) < 5 && Math.abs(this.dragVelocityY) < 5) {
          this.handleClick(touch.clientX, touch.clientY);
        }
      }
    }
  };

  private updateHover(clientX: number, clientY: number): void {
    const rect = this.canvas.getBoundingClientRect();
    this.mouseNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouseNDC.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouseNDC, this.camera);
    const intersects = this.raycaster.intersectObjects(this.crystals, false);

    const newHovered = intersects.length > 0 ? (intersects[0].object as THREE.Mesh) : null;

    if (newHovered !== this.hoveredCrystal) {
      if (this.hoveredCrystal) {
        this.caveScene.setCrystalHovered(this.hoveredCrystal, false);
      }
      this.hoveredCrystal = newHovered;
      if (this.hoveredCrystal) {
        this.caveScene.setCrystalHovered(this.hoveredCrystal, true);
        this.canvas.style.cursor = 'pointer';
      } else if (!this.isDragging) {
        this.canvas.style.cursor = 'default';
      }
    }
  }

  private handleClick(clientX: number, clientY: number): void {
    const rect = this.canvas.getBoundingClientRect();
    this.mouseNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouseNDC.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouseNDC, this.camera);
    const intersects = this.raycaster.intersectObjects(this.crystals, false);

    if (intersects.length > 0) {
      const mesh = intersects[0].object as THREE.Mesh;
      if (this.onClickCallback) {
        this.onClickCallback(mesh, performance.now() / 1000);
      }
    }
  }

  setOnCrystalClick(callback: (mesh: THREE.Mesh, elapsed: number) => void): void {
    this.onClickCallback = callback;
  }

  update(delta: number): void {
    const dampingFactor = DAMPING_DURATION > 0 ? Math.min(delta / DAMPING_DURATION, 1) : 1;
    const smoothT = 1 - Math.pow(1 - dampingFactor, 3);

    this.currentState.yaw += (this.targetState.yaw - this.currentState.yaw) * smoothT;
    this.currentState.pitch += (this.targetState.pitch - this.currentState.pitch) * smoothT;
    this.currentState.distance += (this.targetState.distance - this.currentState.distance) * smoothT;
    this.currentState.target.lerp(this.targetState.target, smoothT);

    this.updateCameraFromState();
  }

  private updateCameraFromState(): void {
    const { yaw, pitch, distance, target } = this.currentState;

    const x = target.x + distance * Math.cos(pitch) * Math.sin(yaw);
    const y = target.y + distance * Math.sin(pitch);
    const z = target.z + distance * Math.cos(pitch) * Math.cos(yaw);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(target);
  }

  private updateCamera(_delta: number): void {
    this.updateCameraFromState();
  }

  getCurrentDistance(): number {
    return this.currentState.distance;
  }

  dispose(): void {
    const canvas = this.canvas;
    canvas.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);
    canvas.removeEventListener('wheel', this.onWheel);
  }
}
