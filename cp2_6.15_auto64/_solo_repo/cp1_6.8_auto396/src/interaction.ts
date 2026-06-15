import * as THREE from 'three';
import { TidalNetwork } from './tidalNetwork';

interface Ripple {
  origin: THREE.Vector3;
  radius: number;
  maxRadius: number;
  strength: number;
  speed: number;
}

export class InteractionManager {
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;
  private network: TidalNetwork;

  private mouse: THREE.Vector2;
  private isDragging: boolean;
  private dragStart: THREE.Vector2;
  private raycaster: THREE.Raycaster;
  private plane: THREE.Plane;

  private ripples: Ripple[];
  private vortexStrength: number;
  private vortexRadius: number;

  private onPointerDown: (e: PointerEvent) => void;
  private onPointerMove: (e: PointerEvent) => void;
  private onPointerUp: (e: PointerEvent) => void;

  constructor(
    camera: THREE.PerspectiveCamera,
    domElement: HTMLElement,
    network: TidalNetwork
  ) {
    this.camera = camera;
    this.domElement = domElement;
    this.network = network;

    this.mouse = new THREE.Vector2();
    this.isDragging = false;
    this.dragStart = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();
    this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    this.ripples = [];
    this.vortexStrength = 0.6;
    this.vortexRadius = 10;

    this.onPointerDown = (e: PointerEvent) => this.handlePointerDown(e);
    this.onPointerMove = (e: PointerEvent) => this.handlePointerMove(e);
    this.onPointerUp = (e: PointerEvent) => this.handlePointerUp(e);

    domElement.addEventListener('pointerdown', this.onPointerDown);
    domElement.addEventListener('pointermove', this.onPointerMove);
    domElement.addEventListener('pointerup', this.onPointerUp);
    domElement.addEventListener('pointercancel', this.onPointerUp);
  }

  private getWorldPosition(ndcX: number, ndcY: number): THREE.Vector3 | null {
    this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
    const target = new THREE.Vector3();
    const hit = this.raycaster.ray.intersectPlane(this.plane, target);
    return hit;
  }

  private handlePointerDown(e: PointerEvent) {
    const rect = this.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.isDragging = true;
    this.dragStart.set(this.mouse.x, this.mouse.y);
  }

  private handlePointerMove(e: PointerEvent) {
    const rect = this.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private handlePointerUp(e: PointerEvent) {
    if (!this.isDragging) return;
    const rect = this.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const dx = this.mouse.x - this.dragStart.x;
    const dy = this.mouse.y - this.dragStart.y;
    const dragDist = Math.sqrt(dx * dx + dy * dy);

    const worldPos = this.getWorldPosition(this.mouse.x, this.mouse.y);
    if (worldPos) {
      this.ripples.push({
        origin: worldPos.clone(),
        radius: 0,
        maxRadius: 15,
        strength: dragDist < 0.02 ? 0.8 : 0.4,
        speed: 12,
      });
    }

    this.isDragging = false;
  }

  update(delta: number) {
    if (this.isDragging) {
      const worldPos = this.getWorldPosition(this.mouse.x, this.mouse.y);
      if (worldPos) {
        this.network.applyVortex(
          worldPos.x,
          worldPos.y,
          worldPos.z,
          this.vortexRadius,
          this.vortexStrength
        );
      }
    }

    const expired: number[] = [];
    for (let i = 0; i < this.ripples.length; i++) {
      const r = this.ripples[i];
      r.radius += r.speed * delta;
      const fadeout = 1.0 - r.radius / r.maxRadius;
      if (fadeout <= 0) {
        expired.push(i);
        continue;
      }
      this.network.applyRipple(
        r.origin.x,
        r.origin.y,
        r.origin.z,
        r.radius,
        2.5,
        r.strength * fadeout * delta * 60
      );
    }

    for (let i = expired.length - 1; i >= 0; i--) {
      this.ripples.splice(expired[i], 1);
    }
  }

  dispose() {
    this.domElement.removeEventListener('pointerdown', this.onPointerDown);
    this.domElement.removeEventListener('pointermove', this.onPointerMove);
    this.domElement.removeEventListener('pointerup', this.onPointerUp);
    this.domElement.removeEventListener('pointercancel', this.onPointerUp);
  }
}
