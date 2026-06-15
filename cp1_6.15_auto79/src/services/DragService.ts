import { v4 as uuidv4 } from 'uuid';

export interface CanvasMaterial {
  id: string;
  materialId: string;
  image: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scale: number;
  zIndex: number;
}

type HandlePosition = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'rotate';

interface DragState {
  isDragging: boolean;
  isResizing: boolean;
  isRotating: boolean;
  startX: number;
  startY: number;
  originalX: number;
  originalY: number;
  originalWidth: number;
  originalHeight: number;
  originalRotation: number;
  originalScale: number;
  handle: HandlePosition | null;
  materialId: string | null;
}

export class DragService {
  private materials: Map<string, CanvasMaterial> = new Map();
  private selectedId: string | null = null;
  private zIndexCounter: number = 0;
  private dragState: DragState = this.createInitialDragState();
  private listeners: Set<() => void> = new Set();

  private createInitialDragState(): DragState {
    return {
      isDragging: false,
      isResizing: false,
      isRotating: false,
      startX: 0,
      startY: 0,
      originalX: 0,
      originalY: 0,
      originalWidth: 0,
      originalHeight: 0,
      originalRotation: 0,
      originalScale: 1,
      handle: null,
      materialId: null
    };
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach(l => l());
  }

  getMaterials(): CanvasMaterial[] {
    return [...this.materials.values()].sort((a, b) => a.zIndex - b.zIndex);
  }

  getSelectedId(): string | null {
    return this.selectedId;
  }

  getSelectedMaterial(): CanvasMaterial | null {
    return this.selectedId ? this.materials.get(this.selectedId) || null : null;
  }

  addMaterial(
    materialId: string,
    image: string,
    x: number,
    y: number,
    width: number,
    height: number
  ): CanvasMaterial {
    const id = uuidv4();
    const canvasMaterial: CanvasMaterial = {
      id,
      materialId,
      image,
      x,
      y,
      width,
      height,
      rotation: 0,
      scale: 1,
      zIndex: ++this.zIndexCounter
    };
    this.materials.set(id, canvasMaterial);
    this.selectedId = id;
    this.notify();
    return canvasMaterial;
  }

  selectMaterial(id: string | null): void {
    this.selectedId = id;
    this.notify();
  }

  bringToFront(id: string): void {
    const material = this.materials.get(id);
    if (material) {
      material.zIndex = ++this.zIndexCounter;
      this.notify();
    }
  }

  duplicateMaterial(id: string): CanvasMaterial | null {
    const material = this.materials.get(id);
    if (!material) return null;

    const newMaterial: CanvasMaterial = {
      ...material,
      id: uuidv4(),
      x: material.x + 20,
      y: material.y + 20,
      zIndex: ++this.zIndexCounter
    };
    this.materials.set(newMaterial.id, newMaterial);
    this.selectedId = newMaterial.id;
    this.notify();
    return newMaterial;
  }

  deleteMaterial(id: string): void {
    this.materials.delete(id);
    if (this.selectedId === id) {
      this.selectedId = null;
    }
    this.notify();
  }

  clearCanvas(): void {
    this.materials.clear();
    this.selectedId = null;
    this.zIndexCounter = 0;
    this.notify();
  }

  startDrag(id: string, clientX: number, clientY: number): void {
    const material = this.materials.get(id);
    if (!material) return;

    this.selectedId = id;
    this.dragState = {
      isDragging: true,
      isResizing: false,
      isRotating: false,
      startX: clientX,
      startY: clientY,
      originalX: material.x,
      originalY: material.y,
      originalWidth: material.width,
      originalHeight: material.height,
      originalRotation: material.rotation,
      originalScale: material.scale,
      handle: null,
      materialId: id
    };
  }

  startResize(id: string, handle: HandlePosition, clientX: number, clientY: number): void {
    const material = this.materials.get(id);
    if (!material) return;

    this.selectedId = id;
    this.dragState = {
      isDragging: false,
      isResizing: true,
      isRotating: false,
      startX: clientX,
      startY: clientY,
      originalX: material.x,
      originalY: material.y,
      originalWidth: material.width,
      originalHeight: material.height,
      originalRotation: material.rotation,
      originalScale: material.scale,
      handle,
      materialId: id
    };
  }

  startRotate(id: string, clientX: number, clientY: number, centerX: number, centerY: number): void {
    const material = this.materials.get(id);
    if (!material) return;

    this.selectedId = id;
    const angle = Math.atan2(clientY - centerY, clientX - centerX) * (180 / Math.PI);
    this.dragState = {
      isDragging: false,
      isResizing: false,
      isRotating: true,
      startX: angle,
      startY: 0,
      originalX: material.x,
      originalY: material.y,
      originalWidth: material.width,
      originalHeight: material.height,
      originalRotation: material.rotation,
      originalScale: material.scale,
      handle: 'rotate',
      materialId: id
    };
  }

  onMove(clientX: number, clientY: number, centerX?: number, centerY?: number): void {
    if (!this.dragState.materialId) return;
    const material = this.materials.get(this.dragState.materialId);
    if (!material) return;

    if (this.dragState.isDragging) {
      const dx = clientX - this.dragState.startX;
      const dy = clientY - this.dragState.startY;
      material.x = this.dragState.originalX + dx;
      material.y = this.dragState.originalY + dy;
    } else if (this.dragState.isResizing && this.dragState.handle) {
      this.handleResize(material, clientX, clientY);
    } else if (this.dragState.isRotating && centerX !== undefined && centerY !== undefined) {
      const angle = Math.atan2(clientY - centerY, clientX - centerX) * (180 / Math.PI);
      material.rotation = this.dragState.originalRotation + (angle - this.dragState.startX);
    }

    this.notify();
  }

  private handleResize(material: CanvasMaterial, clientX: number, clientY: number): void {
    const handle = this.dragState.handle;
    if (!handle) return;

    const dx = clientX - this.dragState.startX;
    const dy = clientY - this.dragState.startY;
    const aspectRatio = this.dragState.originalWidth / this.dragState.originalHeight;

    let newWidth = this.dragState.originalWidth;
    let newHeight = this.dragState.originalHeight;
    let newX = this.dragState.originalX;
    let newY = this.dragState.originalY;

    switch (handle) {
      case 'e':
        newWidth = Math.max(20, this.dragState.originalWidth + dx);
        newHeight = newWidth / aspectRatio;
        break;
      case 'w':
        newWidth = Math.max(20, this.dragState.originalWidth - dx);
        newHeight = newWidth / aspectRatio;
        newX = this.dragState.originalX + (this.dragState.originalWidth - newWidth);
        break;
      case 's':
        newHeight = Math.max(20, this.dragState.originalHeight + dy);
        newWidth = newHeight * aspectRatio;
        break;
      case 'n':
        newHeight = Math.max(20, this.dragState.originalHeight - dy);
        newWidth = newHeight * aspectRatio;
        newY = this.dragState.originalY + (this.dragState.originalHeight - newHeight);
        break;
      case 'se':
        newWidth = Math.max(20, this.dragState.originalWidth + dx);
        newHeight = newWidth / aspectRatio;
        break;
      case 'sw':
        newWidth = Math.max(20, this.dragState.originalWidth - dx);
        newHeight = newWidth / aspectRatio;
        newX = this.dragState.originalX + (this.dragState.originalWidth - newWidth);
        break;
      case 'ne':
        newWidth = Math.max(20, this.dragState.originalWidth + dx);
        newHeight = newWidth / aspectRatio;
        newY = this.dragState.originalY + (this.dragState.originalHeight - newHeight);
        break;
      case 'nw':
        newWidth = Math.max(20, this.dragState.originalWidth - dx);
        newHeight = newWidth / aspectRatio;
        newX = this.dragState.originalX + (this.dragState.originalWidth - newWidth);
        newY = this.dragState.originalY + (this.dragState.originalHeight - newHeight);
        break;
    }

    material.x = newX;
    material.y = newY;
    material.width = newWidth;
    material.height = newHeight;
  }

  endDrag(): void {
    this.dragState = this.createInitialDragState();
  }

  getLayoutData(): CanvasMaterial[] {
    return this.getMaterials();
  }

  isDraggingActive(): boolean {
    return this.dragState.isDragging || this.dragState.isResizing || this.dragState.isRotating;
  }
}

export const dragService = new DragService();
