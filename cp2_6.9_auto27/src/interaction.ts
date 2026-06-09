import * as THREE from 'three';
import { BuildingData } from './city';
import { triggerLightShow, setBuildingHovered } from './animation';

export interface InteractionHandlers {
  onBuildingClick: (data: BuildingData) => void;
}

export class InteractionManager {
  private raycaster: THREE.Raycaster;
  private pointer: THREE.Vector2;
  private camera: THREE.PerspectiveCamera;
  private buildingMeshes: THREE.Mesh[] = [];
  private buildingsMap: Map<THREE.Mesh, BuildingData>;
  private hoveredMesh: THREE.Mesh | null = null;
  private handlers: InteractionHandlers;
  private isDragging = false;
  private dragStartPos = { x: 0, y: 0 };
  private dragThreshold = 5;
  private domElement: HTMLElement;

  constructor(
    camera: THREE.PerspectiveCamera,
    domElement: HTMLElement,
    buildingsMap: Map<THREE.Mesh, BuildingData>,
    handlers: InteractionHandlers
  ) {
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.camera = camera;
    this.buildingsMap = buildingsMap;
    this.handlers = handlers;
    this.domElement = domElement;

    this.buildingMeshes = Array.from(buildingsMap.keys());

    this.attachEvents();
  }

  private attachEvents(): void {
    const el = this.domElement;

    el.addEventListener('pointermove', this.onPointerMove);
    el.addEventListener('pointerdown', this.onPointerDown);
    el.addEventListener('pointerup', this.onPointerUp);
    el.addEventListener('pointerleave', this.onPointerLeave);
    el.addEventListener('pointercancel', this.onPointerLeave);
  }

  dispose(): void {
    const el = this.domElement;
    el.removeEventListener('pointermove', this.onPointerMove);
    el.removeEventListener('pointerdown', this.onPointerDown);
    el.removeEventListener('pointerup', this.onPointerUp);
    el.removeEventListener('pointerleave', this.onPointerLeave);
    el.removeEventListener('pointercancel', this.onPointerLeave);
    this.clearHover();
  }

  private updatePointer(clientX: number, clientY: number): void {
    const rect = this.domElement.getBoundingClientRect();
    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  }

  private pickBuilding(): THREE.Mesh | null {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.buildingMeshes, false);
    if (hits.length > 0) {
      return hits[0].object as THREE.Mesh;
    }
    return null;
  }

  private clearHover(): void {
    if (this.hoveredMesh) {
      const data = this.buildingsMap.get(this.hoveredMesh);
      if (data) setBuildingHovered(data.edges, false);
      this.hoveredMesh = null;
      this.domElement.style.cursor = 'grab';
    }
  }

  private onPointerMove = (e: PointerEvent): void => {
    if (this.isDragging) {
      const dx = Math.abs(e.clientX - this.dragStartPos.x);
      const dy = Math.abs(e.clientY - this.dragStartPos.y);
      if (dx > this.dragThreshold || dy > this.dragThreshold) {
        this.clearHover();
      }
      return;
    }
    this.updatePointer(e.clientX, e.clientY);
    const picked = this.pickBuilding();

    if (picked !== this.hoveredMesh) {
      if (this.hoveredMesh) {
        const prevData = this.buildingsMap.get(this.hoveredMesh);
        if (prevData) setBuildingHovered(prevData.edges, false);
      }
      this.hoveredMesh = picked;
      if (picked) {
        const data = this.buildingsMap.get(picked);
        if (data) setBuildingHovered(data.edges, true);
        this.domElement.style.cursor = 'pointer';
      } else {
        this.domElement.style.cursor = 'grab';
      }
    }
  };

  private onPointerDown = (e: PointerEvent): void => {
    this.isDragging = true;
    this.dragStartPos = { x: e.clientX, y: e.clientY };
  };

  private onPointerUp = (e: PointerEvent): void => {
    const dx = Math.abs(e.clientX - this.dragStartPos.x);
    const dy = Math.abs(e.clientY - this.dragStartPos.y);
    const wasDrag = dx > this.dragThreshold || dy > this.dragThreshold;
    this.isDragging = false;

    if (!wasDrag && e.button === 0) {
      this.updatePointer(e.clientX, e.clientY);
      const picked = this.pickBuilding();
      if (picked) {
        const data = this.buildingsMap.get(picked);
        if (data) {
          triggerLightShow(data);
          this.handlers.onBuildingClick(data);
        }
      }
    }
  };

  private onPointerLeave = (): void => {
    this.isDragging = false;
    this.clearHover();
  };
}
