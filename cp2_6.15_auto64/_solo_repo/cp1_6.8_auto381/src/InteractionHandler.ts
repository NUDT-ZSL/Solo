import * as THREE from 'three';
import { ParticleSystem } from './ParticleSystem';

export class InteractionHandler {
  private camera: THREE.Camera;
  private renderer: THREE.WebGLRenderer;
  private particleSystem: ParticleSystem;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private dragPlane: THREE.Plane;
  private isDragging: boolean = false;
  private previousDragPos: THREE.Vector3 = new THREE.Vector3();
  private pickThreshold: number = 1.5;

  constructor(
    camera: THREE.Camera,
    renderer: THREE.WebGLRenderer,
    particleSystem: ParticleSystem
  ) {
    this.camera = camera;
    this.renderer = renderer;
    this.particleSystem = particleSystem;
    this.raycaster = new THREE.Raycaster();
    this.raycaster.params.Points = { threshold: this.pickThreshold };
    this.mouse = new THREE.Vector2();
    this.dragPlane = new THREE.Plane();

    const canvas = renderer.domElement;
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerUp);
  }

  private onPointerDown = (event: PointerEvent) => {
    this.updateMouse(event);
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const intersects = this.raycaster.intersectObject(this.particleSystem.points);
    if (intersects.length > 0) {
      const idx = intersects[0].index;
      if (idx !== undefined && idx < this.particleSystem.count) {
        this.isDragging = true;
        this.particleSystem.draggedIndex = idx;
        this.renderer.domElement.style.cursor = 'grabbing';

        const particlePos = this.particleSystem.getPosition(idx);
        const camDir = new THREE.Vector3();
        this.camera.getWorldDirection(camDir);
        this.dragPlane.setFromNormalAndCoplanarPoint(camDir, particlePos);

        const intersection = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(this.dragPlane, intersection);
        if (intersection) {
          this.particleSystem.dragTarget.copy(intersection);
          this.previousDragPos.copy(intersection);
        }
      }
    }
  };

  private onPointerMove = (event: PointerEvent) => {
    if (!this.isDragging) {
      this.updateMouse(event);
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObject(this.particleSystem.points);
      this.renderer.domElement.style.cursor = intersects.length > 0 ? 'grab' : 'default';
      return;
    }

    this.updateMouse(event);
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const intersection = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.dragPlane, intersection);
    if (intersection) {
      this.particleSystem.dragTarget.copy(intersection);
      const dragDelta = intersection.clone().sub(this.previousDragPos);
      this.particleSystem.applyRadialForce(this.particleSystem.draggedIndex, 0.3);
      this.previousDragPos.copy(intersection);
    }
  };

  private onPointerUp = () => {
    if (this.isDragging) {
      this.isDragging = false;
      const idx = this.particleSystem.draggedIndex;
      if (idx >= 0) {
        this.particleSystem.applyRadialForce(idx, 1.5);
      }
      this.particleSystem.draggedIndex = -1;
      this.renderer.domElement.style.cursor = 'default';
    }
  };

  private updateMouse(event: PointerEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  dispose() {
    const canvas = this.renderer.domElement;
    canvas.removeEventListener('pointerdown', this.onPointerDown);
    canvas.removeEventListener('pointermove', this.onPointerMove);
    canvas.removeEventListener('pointerup', this.onPointerUp);
  }
}
