import * as THREE from 'three';
import { SceneManager } from './SceneManager';

export class InteractionHandler {
  private sceneManager: SceneManager;
  private container: HTMLElement;

  private isDragging = false;
  private isPanning = false;
  private shiftPressed = false;
  private mouseDownPos = { x: 0, y: 0 };
  private mouseDownTime = 0;
  private lastMousePos = { x: 0, y: 0 };
  private hasMovedDuringDrag = false;

  private spherical: { theta: number; phi: number; radius: number };
  private target: THREE.Vector3;
  private panOffset: THREE.Vector3;

  private readonly MIN_RADIUS = 2;
  private readonly MAX_RADIUS = 25;

  private boundOnMouseDown: (e: MouseEvent) => void;
  private boundOnMouseMove: (e: MouseEvent) => void;
  private boundOnMouseUp: (e: MouseEvent) => void;
  private boundOnMouseLeave: (e: MouseEvent) => void;
  private boundOnWheel: (e: WheelEvent) => void;
  private boundOnKeyDown: (e: KeyboardEvent) => void;
  private boundOnKeyUp: (e: KeyboardEvent) => void;
  private boundOnResize: () => void;
  private boundOnContextMenu: (e: Event) => void;

  constructor(container: HTMLElement, sceneManager: SceneManager) {
    this.container = container;
    this.sceneManager = sceneManager;

    this.target = new THREE.Vector3(0, 0, 0);
    this.panOffset = new THREE.Vector3(0, 0, 0);

    const initialDir = new THREE.Vector3()
      .subVectors(sceneManager.camera.position, this.target)
      .normalize();
    this.spherical = {
      radius: sceneManager.camera.position.distanceTo(this.target),
      theta: Math.atan2(initialDir.x, initialDir.z),
      phi: Math.acos(THREE.MathUtils.clamp(initialDir.y, -1, 1))
    };

    this.boundOnMouseDown = this.onMouseDown.bind(this);
    this.boundOnMouseMove = this.onMouseMove.bind(this);
    this.boundOnMouseUp = this.onMouseUp.bind(this);
    this.boundOnMouseLeave = this.onMouseLeave.bind(this);
    this.boundOnWheel = this.onWheel.bind(this);
    this.boundOnKeyDown = this.onKeyDown.bind(this);
    this.boundOnKeyUp = this.onKeyUp.bind(this);
    this.boundOnResize = this.onResize.bind(this);
    this.boundOnContextMenu = (e) => e.preventDefault();

    this.attach();
    this.updateCamera();
  }

  private attach(): void {
    this.container.addEventListener('mousedown', this.boundOnMouseDown);
    window.addEventListener('mousemove', this.boundOnMouseMove);
    window.addEventListener('mouseup', this.boundOnMouseUp);
    this.container.addEventListener('mouseleave', this.boundOnMouseLeave);
    this.container.addEventListener('wheel', this.boundOnWheel, { passive: false });
    window.addEventListener('keydown', this.boundOnKeyDown);
    window.addEventListener('keyup', this.boundOnKeyUp);
    window.addEventListener('resize', this.boundOnResize);
    this.container.addEventListener('contextmenu', this.boundOnContextMenu);
  }

  public detach(): void {
    this.container.removeEventListener('mousedown', this.boundOnMouseDown);
    window.removeEventListener('mousemove', this.boundOnMouseMove);
    window.removeEventListener('mouseup', this.boundOnMouseUp);
    this.container.removeEventListener('mouseleave', this.boundOnMouseLeave);
    this.container.removeEventListener('wheel', this.boundOnWheel);
    window.removeEventListener('keydown', this.boundOnKeyDown);
    window.removeEventListener('keyup', this.boundOnKeyUp);
    window.removeEventListener('resize', this.boundOnResize);
    this.container.removeEventListener('contextmenu', this.boundOnContextMenu);
  }

  private getNDC(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.container.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * 2 - 1,
      y: -((clientY - rect.top) / rect.height) * 2 + 1
    };
  }

  private onMouseDown(e: MouseEvent): void {
    if (e.button !== 0) return;
    this.isDragging = true;
    this.isPanning = this.shiftPressed;
    this.hasMovedDuringDrag = false;
    this.mouseDownPos = { x: e.clientX, y: e.clientY };
    this.lastMousePos = { x: e.clientX, y: e.clientY };
    this.mouseDownTime = performance.now();
  }

  private onMouseMove(e: MouseEvent): void {
    const ndc = this.getNDC(e.clientX, e.clientY);

    if (this.isDragging) {
      const dx = e.clientX - this.lastMousePos.x;
      const dy = e.clientY - this.lastMousePos.y;

      const totalDx = e.clientX - this.mouseDownPos.x;
      const totalDy = e.clientY - this.mouseDownPos.y;
      if (Math.abs(totalDx) > 3 || Math.abs(totalDy) > 3) {
        this.hasMovedDuringDrag = true;
      }

      if (this.isPanning) {
        this.handlePan(dx, dy);
      } else {
        this.handleRotate(dx, dy);
      }

      this.lastMousePos = { x: e.clientX, y: e.clientY };
    } else {
      const hovered = this.sceneManager.getHoveredNode(ndc.x, ndc.y);
      this.sceneManager.setHoveredNode(hovered);
      if (hovered !== null) {
        this.container.style.cursor = 'pointer';
      } else {
        this.container.style.cursor = 'crosshair';
      }
    }
  }

  private onMouseUp(e: MouseEvent): void {
    if (e.button !== 0) return;

    const wasDragging = this.isDragging;
    this.isDragging = false;
    this.isPanning = false;

    const duration = performance.now() - this.mouseDownTime;
    if (!this.hasMovedDuringDrag && duration < 400 && wasDragging) {
      const ndc = this.getNDC(e.clientX, e.clientY);
      this.sceneManager.clickAtPosition(ndc.x, ndc.y);
    }
  }

  private onMouseLeave(_e: MouseEvent): void {
    this.isDragging = false;
    this.isPanning = false;
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const zoomFactor = Math.pow(0.95, Math.sign(e.deltaY));
    this.spherical.radius = THREE.MathUtils.clamp(
      this.spherical.radius * zoomFactor,
      this.MIN_RADIUS,
      this.MAX_RADIUS
    );
    this.updateCamera();
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
      this.shiftPressed = true;
      if (this.isDragging) {
        this.isPanning = true;
      }
      this.container.style.cursor = 'grab';
    }
    if (e.code === 'Space' && !e.repeat) {
      e.preventDefault();
      this.sceneManager.triggerGlobalBurst();
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
      this.shiftPressed = false;
      this.isPanning = false;
      this.container.style.cursor = 'crosshair';
    }
  }

  private handleRotate(dx: number, dy: number): void {
    const rotSpeed = 0.005;
    this.spherical.theta -= dx * rotSpeed;
    this.spherical.phi -= dy * rotSpeed;

    const minPhi = THREE.MathUtils.degToRad(30);
    const maxPhi = THREE.MathUtils.degToRad(150);
    this.spherical.phi = THREE.MathUtils.clamp(this.spherical.phi, minPhi, maxPhi);

    this.updateCamera();
  }

  private handlePan(dx: number, dy: number): void {
    const panSpeed = 0.01 * this.spherical.radius * 0.3;

    const forward = new THREE.Vector3()
      .subVectors(this.sceneManager.camera.position, this.target)
      .normalize();
    const right = new THREE.Vector3()
      .crossVectors(forward, new THREE.Vector3(0, 1, 0))
      .normalize();
    const up = new THREE.Vector3()
      .crossVectors(right, forward)
      .normalize();

    this.panOffset.addScaledVector(right, -dx * panSpeed);
    this.panOffset.addScaledVector(up, dy * panSpeed);

    this.updateCamera();
  }

  private updateCamera(): void {
    const sinPhi = Math.sin(this.spherical.phi);
    const offset = new THREE.Vector3(
      this.spherical.radius * sinPhi * Math.sin(this.spherical.theta),
      this.spherical.radius * Math.cos(this.spherical.phi),
      this.spherical.radius * sinPhi * Math.cos(this.spherical.theta)
    );

    const actualTarget = new THREE.Vector3().addVectors(this.target, this.panOffset);
    this.sceneManager.camera.position.copy(actualTarget).add(offset);
    this.sceneManager.camera.lookAt(actualTarget);
  }

  private onResize(): void {
    this.sceneManager.handleResize(window.innerWidth, window.innerHeight);
  }

  public update(): void {}
}
