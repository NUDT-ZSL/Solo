import * as THREE from 'three';
import { ParticleCloth } from './particleCloth';

export class InteractionSystem {
  cloth: ParticleCloth;
  camera: THREE.PerspectiveCamera;
  canvas: HTMLCanvasElement;

  raycaster: THREE.Raycaster;
  mouseNdc: THREE.Vector2;
  mouseScreen: THREE.Vector2;
  grabPlane: THREE.Plane;
  hitPoint: THREE.Vector3;
  grabbedNode: number | null;
  dragOffset: THREE.Vector3;
  tempVec: THREE.Vector3;
  tempVec2: THREE.Vector3;

  isDragging = false;
  lastMoveTime = 0;

  constructor(cloth: ParticleCloth, camera: THREE.PerspectiveCamera, canvas: HTMLCanvasElement) {
    this.cloth = cloth;
    this.camera = camera;
    this.canvas = canvas;
    this.raycaster = new THREE.Raycaster();
    this.raycaster.params.Points = { threshold: 0.4 };
    this.mouseNdc = new THREE.Vector2();
    this.mouseScreen = new THREE.Vector2();
    this.grabPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    this.hitPoint = new THREE.Vector3();
    this.grabbedNode = null;
    this.dragOffset = new THREE.Vector3();
    this.tempVec = new THREE.Vector3();
    this.tempVec2 = new THREE.Vector3();
    this.bind();
  }

  bind() {
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('pointerup', this.onPointerUp);
    this.canvas.addEventListener('pointerleave', this.onPointerUp);
    this.canvas.addEventListener('pointercancel', this.onPointerUp);
  }

  unbind() {
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointerleave', this.onPointerUp);
    this.canvas.removeEventListener('pointercancel', this.onPointerUp);
  }

  updateMouse(event: PointerEvent) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouseScreen.set(event.clientX - rect.left, event.clientY - rect.top);
    this.mouseNdc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouseNdc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return;
    this.updateMouse(event);
    this.raycaster.setFromCamera(this.mouseNdc, this.camera);

    const res = this.raycaster.intersectObject(this.cloth.points, false);
    if (res.length === 0) return;

    const hit = res[0].point;
    const nearest = this.cloth.findNearestNode(hit);
    if (nearest < 0) return;

    this.cloth.getNodePosition(nearest, this.tempVec);
    const d = this.tempVec.distanceTo(hit);
    if (d > 1.5) return;

    this.grabbedNode = nearest;
    this.isDragging = true;
    (this.canvas as HTMLElement).setPointerCapture(event.pointerId);

    this.tempVec.copy(this.camera.position).sub(this.tempVec).normalize();
    this.grabPlane.setFromNormalAndCoplanarPoint(this.tempVec, this.tempVec);
    this.raycaster.ray.intersectPlane(this.grabPlane, this.hitPoint);
    this.dragOffset.copy(this.hitPoint).sub(this.tempVec);

    this.cloth.drag.active = true;
    this.cloth.drag.nodeIndex = nearest;
    this.cloth.drag.startPos.copy(this.tempVec);
    this.cloth.drag.targetPos.copy(this.tempVec);
  };

  onPointerMove = (event: PointerEvent) => {
    const now = performance.now();
    this.lastMoveTime = now;
    this.updateMouse(event);

    if (!this.isDragging || this.grabbedNode == null) return;

    this.raycaster.setFromCamera(this.mouseNdc, this.camera);
    this.raycaster.ray.intersectPlane(this.grabPlane, this.hitPoint);
    this.tempVec.copy(this.hitPoint).sub(this.dragOffset);
    this.cloth.applyNodeDrag(this.grabbedNode, this.tempVec);
    this.cloth.drag.targetPos.copy(this.tempVec);
  };

  onPointerUp = (event: PointerEvent) => {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.grabbedNode = null;
    this.cloth.drag.active = false;
    this.cloth.drag.nodeIndex = null;
    try { (this.canvas as HTMLElement).releasePointerCapture(event.pointerId); } catch {}
  };

  update(_now: number, _dt: number) {}
}
