import * as THREE from 'three';

const GRAVITY_RADIUS = 5;
const MAX_RANGE = 60;

export class GravitySource {
  public mesh: THREE.Mesh;
  private position: THREE.Vector3;

  private isDragging: boolean = false;
  private dragPlane: THREE.Plane;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera;
    this.domElement = domElement;
    this.position = new THREE.Vector3(0, 0, 0);
    this.dragPlane = new THREE.Plane();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    const geometry = new THREE.SphereGeometry(GRAVITY_RADIUS, 32, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0xff3366,
      transparent: true,
      opacity: 0.3,
      depthWrite: false
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(this.position);

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.domElement.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.domElement.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.domElement.addEventListener('mouseleave', this.onMouseUp.bind(this));
  }

  private onMouseDown(event: MouseEvent): void {
    if (event.button !== 0) return;

    this.updateMouse(event);
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const intersects = this.raycaster.intersectObject(this.mesh);
    if (intersects.length > 0) {
      this.isDragging = true;
      this.dragPlane.setFromNormalAndCoplanarPoint(
        new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion),
        this.position
      );
      this.domElement.style.cursor = 'grabbing';
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

    const intersection = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.dragPlane, intersection);

    if (intersection) {
      const distance = intersection.length();
      if (distance > MAX_RANGE) {
        intersection.normalize().multiplyScalar(MAX_RANGE);
      }
      this.position.copy(intersection);
      this.mesh.position.copy(this.position);
    }
  }

  private onMouseUp(): void {
    this.isDragging = false;
    this.domElement.style.cursor = 'default';
  }

  private updateMouse(event: MouseEvent): void {
    const rect = this.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  public getPosition(): THREE.Vector3 {
    return this.position.clone();
  }

  public reset(): void {
    this.position.set(0, 0, 0);
    this.mesh.position.copy(this.position);
  }

  public dispose(): void {
    this.domElement.removeEventListener('mousedown', this.onMouseDown.bind(this));
    this.domElement.removeEventListener('mousemove', this.onMouseMove.bind(this));
    this.domElement.removeEventListener('mouseup', this.onMouseUp.bind(this));
    this.domElement.removeEventListener('mouseleave', this.onMouseUp.bind(this));
  }
}
