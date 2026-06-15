import * as THREE from 'three';
import { StarField, StarData } from './starField';

export interface InteractionCallbacks {
  onStarSelect: (index: number, star: StarData) => void;
  onStarDoubleClick: (index: number, star: StarData) => void;
  onHoverChange: (hovering: boolean) => void;
  onFusion?: () => void;
}

export class InteractionSystem {
  private camera: THREE.PerspectiveCamera;
  private starField: StarField;
  private callbacks: InteractionCallbacks;

  private isDragging: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  private rotationVelocityX: number = 0;
  private rotationVelocityY: number = 0;
  private autoRotateSpeed: number = 0.02;
  private targetRotationY: number = 0;
  private targetRotationX: number = 0;

  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private domElement: HTMLElement;

  private mouseDownPos: { x: number; y: number } = { x: 0, y: 0 };
  private lastClickTime: number = 0;
  private lastClickedIndex: number = -1;
  private dragThreshold: number = 5;
  private hasDragged: boolean = false;

  private boundOnMouseDown: (e: MouseEvent) => void;
  private boundOnMouseMove: (e: MouseEvent) => void;
  private boundOnMouseUp: (e: MouseEvent) => void;
  private boundOnMouseLeave: (e: MouseEvent) => void;
  private boundOnWheel: (e: WheelEvent) => void;
  private boundOnContextMenu: (e: MouseEvent) => void;

  private crosshair: HTMLElement | null = null;
  private cameraMinDistance: number = 400;
  private cameraMaxDistance: number = 1200;
  private cameraTargetDistance: number = 700;

  constructor(
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    starField: StarField,
    callbacks: InteractionCallbacks
  ) {
    this.camera = camera;
    this.starField = starField;
    this.callbacks = callbacks;

    this.raycaster = new THREE.Raycaster();
    this.raycaster.params.Points = { threshold: 12 };
    this.mouse = new THREE.Vector2();
    this.domElement = renderer.domElement;

    this.crosshair = document.getElementById('crosshair');

    this.boundOnMouseDown = this.onMouseDown.bind(this);
    this.boundOnMouseMove = this.onMouseMove.bind(this);
    this.boundOnMouseUp = this.onMouseUp.bind(this);
    this.boundOnMouseLeave = this.onMouseLeave.bind(this);
    this.boundOnWheel = this.onWheel.bind(this);
    this.boundOnContextMenu = (e) => e.preventDefault();

    this.registerEvents();
  }

  private registerEvents(): void {
    this.domElement.addEventListener('mousedown', this.boundOnMouseDown);
    this.domElement.addEventListener('mousemove', this.boundOnMouseMove);
    this.domElement.addEventListener('mouseup', this.boundOnMouseUp);
    this.domElement.addEventListener('mouseleave', this.boundOnMouseLeave);
    this.domElement.addEventListener('wheel', this.boundOnWheel, { passive: false });
    this.domElement.addEventListener('contextmenu', this.boundOnContextMenu);
  }

  private onMouseDown(e: MouseEvent): void {
    if (e.button !== 0) return;
    this.isDragging = true;
    this.hasDragged = false;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
    this.mouseDownPos = { x: e.clientX, y: e.clientY };
  }

  private onMouseMove(e: MouseEvent): void {
    if (this.crosshair) {
      this.crosshair.style.left = e.clientX + 'px';
      this.crosshair.style.top = e.clientY + 'px';
    }

    const rect = this.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    if (this.isDragging) {
      const dx = e.clientX - this.lastMouseX;
      const dy = e.clientY - this.lastMouseY;

      const moveDist = Math.sqrt(
        Math.pow(e.clientX - this.mouseDownPos.x, 2) +
        Math.pow(e.clientY - this.mouseDownPos.y, 2)
      );
      if (moveDist > this.dragThreshold) {
        this.hasDragged = true;
      }

      this.rotationVelocityY = dx * 0.005;
      this.rotationVelocityX = dy * 0.005;
      this.targetRotationY += this.rotationVelocityY;
      this.targetRotationX += this.rotationVelocityX;

      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    }

    this.checkHover();
  }

  private checkHover(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.starField.points);
    const hovering = intersects.length > 0;
    if (hovering) {
      document.body.classList.add('hovering-star');
    } else {
      document.body.classList.remove('hovering-star');
    }
    this.callbacks.onHoverChange(hovering);
  }

  private onMouseUp(e: MouseEvent): void {
    if (e.button !== 0) return;
    this.isDragging = false;

    const moveDist = Math.sqrt(
      Math.pow(e.clientX - this.mouseDownPos.x, 2) +
      Math.pow(e.clientY - this.mouseDownPos.y, 2)
    );

    if (moveDist < this.dragThreshold && !this.hasDragged) {
      const rect = this.domElement.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this.handleClick();
    }
  }

  private handleClick(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.starField.points);

    if (intersects.length > 0) {
      const index = intersects[0].index;
      if (index === undefined) return;

      const star = this.starField.getStarByIndex(index);
      if (!star) return;

      const now = performance.now();
      const timeSinceLastClick = now - this.lastClickTime;

      if (timeSinceLastClick < 350 && index === this.lastClickedIndex) {
        this.callbacks.onStarDoubleClick(index, star);
        this.lastClickTime = 0;
        this.lastClickedIndex = -1;
      } else {
        this.starField.selectStar(index);
        this.callbacks.onStarSelect(index, star);
        this.lastClickTime = now;
        this.lastClickedIndex = index;
      }
    }
  }

  private onMouseLeave(_e: MouseEvent): void {
    this.isDragging = false;
    document.body.classList.remove('hovering-star');
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 1.05 : 0.95;
    this.cameraTargetDistance = THREE.MathUtils.clamp(
      this.cameraTargetDistance * delta,
      this.cameraMinDistance,
      this.cameraMaxDistance
    );
  }

  public update(dt: number): void {
    if (!this.isDragging) {
      const maxDecel = 0.015;
      const dampingFactor = 0.02;

      const targetVelY = this.autoRotateSpeed;
      const velDiffY = targetVelY - this.rotationVelocityY;
      this.rotationVelocityY += velDiffY * dampingFactor;

      if (Math.abs(this.rotationVelocityX) > maxDecel) {
        this.rotationVelocityX *= 0.94;
      } else {
        this.rotationVelocityX *= 0.98;
      }

      this.targetRotationY += this.rotationVelocityY * dt * 60;
      this.targetRotationX += this.rotationVelocityX * dt * 60;
    }

    const maxTilt = Math.PI / 3;
    this.targetRotationX = THREE.MathUtils.clamp(this.targetRotationX, -maxTilt, maxTilt);

    const group = this.starField.starGroup;
    group.rotation.y += (this.targetRotationY - group.rotation.y) * 0.1;
    group.rotation.x += (this.targetRotationX - group.rotation.x) * 0.1;

    const currentDist = this.camera.position.length();
    const desiredDist = this.cameraTargetDistance;
    const newDist = currentDist + (desiredDist - currentDist) * 0.08;
    this.camera.position.normalize().multiplyScalar(newDist);
    this.camera.lookAt(0, 0, 0);
  }

  public dispose(): void {
    this.domElement.removeEventListener('mousedown', this.boundOnMouseDown);
    this.domElement.removeEventListener('mousemove', this.boundOnMouseMove);
    this.domElement.removeEventListener('mouseup', this.boundOnMouseUp);
    this.domElement.removeEventListener('mouseleave', this.boundOnMouseLeave);
    this.domElement.removeEventListener('wheel', this.boundOnWheel);
    this.domElement.removeEventListener('contextmenu', this.boundOnContextMenu);
  }
}
