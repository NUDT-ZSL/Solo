import * as THREE from 'three';

const GRAVITY_RADIUS = 5;
const MAX_RANGE = 60;

export class GravitySource {
  public mesh: THREE.Mesh;
  private position: THREE.Vector3;

  private isDragging: boolean = false;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;
  private scene: THREE.Scene;

  private dragOffset: THREE.Vector3;
  private tempVector: THREE.Vector3;
  private tempPlane: THREE.Plane;

  private boundMouseDown: (e: MouseEvent) => void;
  private boundMouseMove: (e: MouseEvent) => void;
  private boundMouseUp: (e: MouseEvent) => void;

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement, scene: THREE.Scene) {
    this.camera = camera;
    this.domElement = domElement;
    this.scene = scene;
    this.position = new THREE.Vector3(0, 0, 0);
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.dragOffset = new THREE.Vector3();
    this.tempVector = new THREE.Vector3();
    this.tempPlane = new THREE.Plane();

    const geometry = new THREE.SphereGeometry(GRAVITY_RADIUS, 32, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0xff3366,
      transparent: true,
      opacity: 0.3,
      depthWrite: false
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(this.position);

    this.boundMouseDown = this.onMouseDown.bind(this);
    this.boundMouseMove = this.onMouseMove.bind(this);
    this.boundMouseUp = this.onMouseUp.bind(this);

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.domElement.addEventListener('mousedown', this.boundMouseDown);
    this.domElement.addEventListener('mousemove', this.boundMouseMove);
    this.domElement.addEventListener('mouseup', this.boundMouseUp);
    this.domElement.addEventListener('mouseleave', this.boundMouseUp);
  }

  private updateMouse(event: MouseEvent): void {
    const rect = this.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private getDragPlane(): THREE.Plane {
    const normal = this.tempVector;
    this.camera.getWorldDirection(normal);
    normal.negate();
    this.tempPlane.setFromNormalAndCoplanarPoint(normal, this.position);
    return this.tempPlane;
  }

  private onMouseDown(event: MouseEvent): void {
    if (event.button !== 0) return;

    this.updateMouse(event);
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const intersects = this.raycaster.intersectObject(this.mesh);
    if (intersects.length > 0) {
      this.isDragging = true;

      const plane = this.getDragPlane();
      const intersection = new THREE.Vector3();
      this.raycaster.ray.intersectPlane(plane, intersection);

      if (intersection) {
        this.dragOffset.copy(this.position).sub(intersection);
      }

      this.domElement.style.cursor = 'grabbing';
      event.preventDefault();
    }
  }

  private onMouseMove(event: MouseEvent): void {
    if (!this.isDragging) {
      this.updateMouse(event);
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObject(this.mesh);
      this.domElement.style.cursor = intersects.length > 0 ? 'grab' : 'default';
      return;
    }

    this.updateMouse(event);
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const plane = this.getDragPlane();
    const intersection = new THREE.Vector3();
    const result = this.raycaster.ray.intersectPlane(plane, intersection);

    if (result) {
      intersection.add(this.dragOffset);

      const distance = intersection.length();
      if (distance > MAX_RANGE) {
        intersection.normalize().multiplyScalar(MAX_RANGE);
      }

      this.position.copy(intersection);
      this.mesh.position.copy(this.position);
    }

    event.preventDefault();
  }

  private onMouseUp(event: MouseEvent): void {
    if (this.isDragging && event.button === 0) {
      this.isDragging = false;
      this.domElement.style.cursor = 'default';
    }
  }

  public getPosition(): THREE.Vector3 {
    return this.position.clone();
  }

  public reset(): void {
    this.position.set(0, 0, 0);
    this.mesh.position.copy(this.position);
  }

  public dispose(): void {
    this.domElement.removeEventListener('mousedown', this.boundMouseDown);
    this.domElement.removeEventListener('mousemove', this.boundMouseMove);
    this.domElement.removeEventListener('mouseup', this.boundMouseUp);
    this.domElement.removeEventListener('mouseleave', this.boundMouseUp);
  }
}
