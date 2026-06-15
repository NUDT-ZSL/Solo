import * as THREE from 'three';
import { store, type EmitterConfig } from './store';

const SNAP_DURATION = 0.2;

interface EmitterVisual {
  id: string;
  cone: THREE.Mesh;
  glow: THREE.PointLight;
  targetPosition: THREE.Vector3;
  snapElapsed: number;
  isSnapping: boolean;
}

class EmitterModule {
  private scene: THREE.Scene;
  private visuals: Map<string, EmitterVisual> = new Map();
  private raycaster = new THREE.Raycaster();
  private groundPlane: THREE.Plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private isDragging = false;
  private dragEmitterId: string | null = null;
  private mouse = new THREE.Vector2();
  private onGroundClick: ((point: THREE.Vector3) => void) | null = null;
  private onEmitterRightClick: ((id: string) => void) | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.bindStore();
  }

  private bindStore(): void {
    store.on('emitters:change', () => this.syncVisuals());
    store.on('emitter:select', () => this.updateSelectionVisuals());
  }

  private syncVisuals(): void {
    const emitters = store.getAllEmitters();

    for (const emitter of emitters) {
      if (!this.visuals.has(emitter.id)) {
        this.addVisual(emitter);
      } else {
        this.updateVisual(emitter);
      }
    }

    for (const [id] of this.visuals) {
      if (!emitters.find((e) => e.id === id)) {
        this.removeVisual(id);
      }
    }
  }

  private addVisual(config: EmitterConfig): void {
    const coneGeo = new THREE.ConeGeometry(0.25, 0.6, 8, 1, true);
    const coneMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(config.color),
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
    });
    const cone = new THREE.Mesh(coneGeo, coneMat);
    cone.position.set(config.position.x, config.position.y + 0.3, config.position.z);
    this.scene.add(cone);

    const glow = new THREE.PointLight(new THREE.Color(config.color), 2, 5);
    glow.position.set(config.position.x, config.position.y + 0.5, config.position.z);
    this.scene.add(glow);

    this.visuals.set(config.id, {
      id: config.id,
      cone,
      glow,
      targetPosition: new THREE.Vector3(config.position.x, config.position.y + 0.3, config.position.z),
      snapElapsed: 0,
      isSnapping: false,
    });
  }

  private updateVisual(config: EmitterConfig): void {
    const v = this.visuals.get(config.id);
    if (!v) return;

    (v.cone.material as THREE.MeshBasicMaterial).color.set(config.color);
    v.glow.color.set(config.color);

    v.targetPosition.set(config.position.x, config.position.y + 0.3, config.position.z);
    v.isSnapping = true;
    v.snapElapsed = 0;
  }

  private removeVisual(id: string): void {
    const v = this.visuals.get(id);
    if (!v) return;
    this.scene.remove(v.cone);
    this.scene.remove(v.glow);
    v.cone.geometry.dispose();
    (v.cone.material as THREE.Material).dispose();
    this.visuals.delete(id);
  }

  private updateSelectionVisuals(): void {
    const selectedId = store.getSelectedEmitterId();
    for (const [id, v] of this.visuals) {
      const mat = v.cone.material as THREE.MeshBasicMaterial;
      mat.opacity = id === selectedId ? 0.8 : 0.45;
    }
  }

  addEmitter(position: THREE.Vector3, color = '#ffffff', intensity = 1, spread = 0.5): string {
    const id = `emitter_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const config: EmitterConfig = {
      id,
      position: { x: position.x, y: 0, z: position.z },
      intensity,
      color,
      spread,
    };
    store.addEmitter(config);
    return id;
  }

  removeEmitter(id: string): void {
    store.removeEmitter(id);
  }

  updateEmitterParams(id: string, params: Partial<EmitterConfig>): void {
    store.updateEmitter(id, params);
  }

  setupInteraction(
    camera: THREE.Camera,
    domElement: HTMLElement,
    onGroundClick: (point: THREE.Vector3) => void,
    onEmitterRightClick: (id: string) => void
  ): void {
    this.onGroundClick = onGroundClick;
    this.onEmitterRightClick = onEmitterRightClick;

    domElement.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.handleLeftDown(e, camera, domElement);
      }
    });

    domElement.addEventListener('mousemove', (e) => {
      this.handleMouseMove(e, camera, domElement);
    });

    domElement.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.isDragging = false;
        this.dragEmitterId = null;
      }
    });

    domElement.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.handleRightClick(e, camera, domElement);
    });
  }

  private getMouseNDC(e: MouseEvent, el: HTMLElement): THREE.Vector2 {
    const rect = el.getBoundingClientRect();
    return new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
  }

  private handleLeftDown(e: MouseEvent, camera: THREE.Camera, el: HTMLElement): void {
    this.mouse = this.getMouseNDC(e, el);
    this.raycaster.setFromCamera(this.mouse, camera);

    const cones = Array.from(this.visuals.values()).map((v) => v.cone);
    const hits = this.raycaster.intersectObjects(cones);
    if (hits.length > 0) {
      const hitMesh = hits[0].object as THREE.Mesh;
      for (const [id, v] of this.visuals) {
        if (v.cone === hitMesh) {
          this.isDragging = true;
          this.dragEmitterId = id;
          break;
        }
      }
    }
  }

  private handleMouseMove(e: MouseEvent, camera: THREE.Camera, el: HTMLElement): void {
    if (!this.isDragging || !this.dragEmitterId) return;

    this.mouse = this.getMouseNDC(e, el);
    this.raycaster.setFromCamera(this.mouse, camera);

    const intersection = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.groundPlane, intersection);

    if (intersection) {
      const clamped = new THREE.Vector3(
        Math.max(-10, Math.min(10, intersection.x)),
        0,
        Math.max(-10, Math.min(10, intersection.z))
      );
      store.updateEmitter(this.dragEmitterId, {
        position: { x: clamped.x, y: 0, z: clamped.z },
      });
    }
  }

  private handleRightClick(e: MouseEvent, camera: THREE.Camera, el: HTMLElement): void {
    this.mouse = this.getMouseNDC(e, el);
    this.raycaster.setFromCamera(this.mouse, camera);

    const cones = Array.from(this.visuals.values()).map((v) => v.cone);
    const hits = this.raycaster.intersectObjects(cones);

    if (hits.length > 0) {
      const hitMesh = hits[0].object as THREE.Mesh;
      for (const [id, v] of this.visuals) {
        if (v.cone === hitMesh) {
          store.selectEmitter(id);
          if (this.onEmitterRightClick) this.onEmitterRightClick(id);
          return;
        }
      }
    }

    const intersection = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.groundPlane, intersection);
    if (intersection) {
      const clamped = new THREE.Vector3(
        Math.max(-10, Math.min(10, intersection.x)),
        0,
        Math.max(-10, Math.min(10, intersection.z))
      );
      if (this.onGroundClick) this.onGroundClick(clamped);
    }
  }

  update(dt: number): void {
    for (const [, v] of this.visuals) {
      if (v.isSnapping) {
        v.snapElapsed += dt;
        const t = Math.min(1, v.snapElapsed / SNAP_DURATION);
        const ease = 1 - Math.pow(1 - t, 3);
        v.cone.position.lerp(v.targetPosition, ease);
        v.glow.position.set(v.cone.position.x, v.cone.position.y + 0.2, v.cone.position.z);
        if (t >= 1) {
          v.isSnapping = false;
          v.cone.position.copy(v.targetPosition);
        }
      }
    }
  }

  getVisuals(): Map<string, EmitterVisual> {
    return this.visuals;
  }

  dispose(): void {
    for (const [, v] of this.visuals) {
      this.scene.remove(v.cone);
      this.scene.remove(v.glow);
      v.cone.geometry.dispose();
      (v.cone.material as THREE.Material).dispose();
    }
    this.visuals.clear();
  }
}

export { EmitterModule };
