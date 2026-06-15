import * as THREE from 'three';
import { GeometryManager } from './geometryManager';

export interface InteractionConfig {
  radiateScale: number;
  wrapDuration: number;
  recoverDuration: number;
  wrapTurns: [number, number];
}

const DEFAULT_CONFIG: InteractionConfig = {
  radiateScale: 1.5,
  wrapDuration: 1.5,
  recoverDuration: 0.8,
  wrapTurns: [2, 3]
};

export class InteractionManager {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private renderer: THREE.WebGLRenderer;
  private geometryManager: GeometryManager;
  private config: InteractionConfig;
  private raycaster: THREE.Raycaster;
  private pointer: THREE.Vector2;
  private _activeHoverId: string | null = null;
  private _pendingHoverId: string | null = null;
  private mouseDirty = false;
  private hoverCheckAccum = 0;
  private boundMeshes: THREE.Mesh[] = [];
  private listenersCleanup: (() => void)[] = [];

  constructor(
    scene: THREE.Scene,
    camera: THREE.Camera,
    renderer: THREE.WebGLRenderer,
    geometryManager: GeometryManager,
    config?: Partial<InteractionConfig>
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.geometryManager = geometryManager;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.raycaster = new THREE.Raycaster();
    this.raycaster.params.Mesh = { threshold: 0.12 };
    this.pointer = new THREE.Vector2(-999, -999);
    this.boundMeshes = geometryManager.getBoundingMeshes();
    this.attachPointerListeners();
    void this.config;
  }

  private attachPointerListeners(): void {
    const dom = this.renderer.domElement;
    const canvas = dom;
    let rafId = 0;

    const updatePointer = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      this.pointer.x = (x / rect.width) * 2 - 1;
      this.pointer.y = -(y / rect.height) * 2 + 1;
      if (!rafId) {
        rafId = requestAnimationFrame(() => {
          rafId = 0;
          this.mouseDirty = true;
        });
      }
    };

    const leave = () => {
      this.pointer.set(-999, -999);
      this.mouseDirty = true;
    };

    canvas.addEventListener('pointermove', updatePointer, { passive: true });
    canvas.addEventListener('pointerleave', leave, { passive: true });
    canvas.addEventListener('pointercancel', leave, { passive: true });

    this.listenersCleanup.push(() => {
      canvas.removeEventListener('pointermove', updatePointer);
      canvas.removeEventListener('pointerleave', leave);
      canvas.removeEventListener('pointercancel', leave);
      if (rafId) cancelAnimationFrame(rafId);
    });
  }

  private performHitTest(): string | null {
    if (
      this.pointer.x < -1.1 ||
      this.pointer.x > 1.1 ||
      this.pointer.y < -1.1 ||
      this.pointer.y > 1.1
    ) {
      return null;
    }
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersects = this.raycaster.intersectObjects(this.boundMeshes, false);
    if (intersects.length === 0) return null;
    const hit = intersects[0].object as THREE.Mesh;
    const id = hit.userData.geometryId as string | undefined;
    return id || null;
  }

  update(delta: number): void {
    this.hoverCheckAccum += delta;
    const checkInterval = 0.05;
    if (this.mouseDirty || this.hoverCheckAccum >= checkInterval) {
      this.hoverCheckAccum = 0;
      const hoveredId = this.performHitTest();
      this._pendingHoverId = hoveredId;
      this.mouseDirty = false;

      if (this._pendingHoverId !== this._activeHoverId) {
        if (this._activeHoverId !== null) {
          this.geometryManager.setHoverTarget(this._activeHoverId, false);
        }
        if (this._pendingHoverId !== null) {
          this.geometryManager.setHoverTarget(this._pendingHoverId, true);
        }
        this._activeHoverId = this._pendingHoverId;
      }
    }
  }

  getActiveHoverId(): string | null {
    return this._activeHoverId;
  }

  dispose(): void {
    for (const cleanup of this.listenersCleanup) cleanup();
    this.listenersCleanup = [];
  }
}
