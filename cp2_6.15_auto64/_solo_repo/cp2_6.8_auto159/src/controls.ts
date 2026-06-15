import * as THREE from 'three';

export class Controls {
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;

  private isDragging: boolean = false;
  private lastX: number = 0;
  private lastY: number = 0;

  private spherical: THREE.Spherical;
  private target: THREE.Vector3;

  private velocityTheta: number = 0;
  private velocityPhi: number = 0;
  private dampingFactor: number = 0.95;

  private minDistance: number = 5;
  private maxDistance: number = 50;
  private zoomSpeed: number = 0.1;

  private onDownBound: (e: MouseEvent) => void;
  private onMoveBound: (e: MouseEvent) => void;
  private onUpBound: (e: MouseEvent) => void;
  private onWheelBound: (e: WheelEvent) => void;
  private onTouchStartBound: (e: TouchEvent) => void;
  private onTouchMoveBound: (e: TouchEvent) => void;
  private onTouchEndBound: (e: TouchEvent) => void;

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera;
    this.domElement = domElement;

    this.target = new THREE.Vector3(0, 0, 0);
    this.spherical = new THREE.Spherical();
    this.spherical.setFromVector3(camera.position.clone().sub(this.target));

    this.onDownBound = this.onMouseDown.bind(this);
    this.onMoveBound = this.onMouseMove.bind(this);
    this.onUpBound = this.onMouseUp.bind(this);
    this.onWheelBound = this.onWheel.bind(this);
    this.onTouchStartBound = this.onTouchStart.bind(this);
    this.onTouchMoveBound = this.onTouchMove.bind(this);
    this.onTouchEndBound = this.onTouchEnd.bind(this);

    this.attachEvents();
  }

  private attachEvents(): void {
    this.domElement.addEventListener('mousedown', this.onDownBound);
    window.addEventListener('mousemove', this.onMoveBound);
    window.addEventListener('mouseup', this.onUpBound);
    this.domElement.addEventListener('wheel', this.onWheelBound, { passive: false });
    this.domElement.addEventListener('touchstart', this.onTouchStartBound, { passive: false });
    this.domElement.addEventListener('touchmove', this.onTouchMoveBound, { passive: false });
    this.domElement.addEventListener('touchend', this.onTouchEndBound);
  }

  private onMouseDown(event: MouseEvent): void {
    this.isDragging = true;
    this.lastX = event.clientX;
    this.lastY = event.clientY;
    this.velocityTheta = 0;
    this.velocityPhi = 0;
    this.domElement.style.cursor = 'grabbing';
  }

  private onMouseMove(event: MouseEvent): void {
    if (!this.isDragging) return;

    const deltaX = event.clientX - this.lastX;
    const deltaY = event.clientY - this.lastY;

    const rotationSpeed = 0.005;
    this.velocityTheta = -deltaX * rotationSpeed;
    this.velocityPhi = -deltaY * rotationSpeed;

    this.spherical.theta += this.velocityTheta;
    this.spherical.phi += this.velocityPhi;

    this.spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.spherical.phi));

    this.lastX = event.clientX;
    this.lastY = event.clientY;

    this.updateCamera();
  }

  private onMouseUp(): void {
    this.isDragging = false;
    this.domElement.style.cursor = 'grab';
  }

  private onWheel(event: WheelEvent): void {
    event.preventDefault();

    const delta = event.deltaY;
    const zoomFactor = Math.exp(delta * this.zoomSpeed * 0.001);

    this.spherical.radius *= zoomFactor;
    this.spherical.radius = Math.max(this.minDistance, Math.min(this.maxDistance, this.spherical.radius));

    this.updateCamera();
  }

  private onTouchStart(event: TouchEvent): void {
    if (event.touches.length === 1) {
      event.preventDefault();
      this.isDragging = true;
      this.lastX = event.touches[0].clientX;
      this.lastY = event.touches[0].clientY;
      this.velocityTheta = 0;
      this.velocityPhi = 0;
    }
  }

  private onTouchMove(event: TouchEvent): void {
    if (!this.isDragging || event.touches.length !== 1) return;
    event.preventDefault();

    const deltaX = event.touches[0].clientX - this.lastX;
    const deltaY = event.touches[0].clientY - this.lastY;

    const rotationSpeed = 0.005;
    this.velocityTheta = -deltaX * rotationSpeed;
    this.velocityPhi = -deltaY * rotationSpeed;

    this.spherical.theta += this.velocityTheta;
    this.spherical.phi += this.velocityPhi;

    this.spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.spherical.phi));

    this.lastX = event.touches[0].clientX;
    this.lastY = event.touches[0].clientY;

    this.updateCamera();
  }

  private onTouchEnd(): void {
    this.isDragging = false;
  }

  public update(deltaTime: number): void {
    if (!this.isDragging && (Math.abs(this.velocityTheta) > 0.0001 || Math.abs(this.velocityPhi) > 0.0001)) {
      const damping = Math.pow(this.dampingFactor, deltaTime * 60);
      this.velocityTheta *= damping;
      this.velocityPhi *= damping;

      this.spherical.theta += this.velocityTheta;
      this.spherical.phi += this.velocityPhi;

      this.spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.spherical.phi));

      this.updateCamera();
    }
  }

  private updateCamera(): void {
    const offset = new THREE.Vector3().setFromSpherical(this.spherical);
    this.camera.position.copy(this.target).add(offset);
    this.camera.lookAt(this.target);
  }

  public dispose(): void {
    this.domElement.removeEventListener('mousedown', this.onDownBound);
    window.removeEventListener('mousemove', this.onMoveBound);
    window.removeEventListener('mouseup', this.onUpBound);
    this.domElement.removeEventListener('wheel', this.onWheelBound);
    this.domElement.removeEventListener('touchstart', this.onTouchStartBound);
    this.domElement.removeEventListener('touchmove', this.onTouchMoveBound);
    this.domElement.removeEventListener('touchend', this.onTouchEndBound);
  }
}
