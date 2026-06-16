import { v4 as uuidv4 } from 'uuid';

export interface FurnitureDimensions {
  width: number;
  depth: number;
  height: number;
  radius?: number;
}

export interface FurnitureTemplate {
  id: string;
  name: string;
  type: 'sofa' | 'coffeeTable' | 'floorLamp' | 'bookshelf';
  dimensions: FurnitureDimensions;
  color: string;
  textureUrl?: string;
}

export interface PlacedFurniture {
  instanceId: string;
  template: FurnitureTemplate;
  position: { x: number; y: number; z: number };
  isPlacing: boolean;
  animating: boolean;
  animationStartTime: number;
}

export interface LightingConfig {
  id: string;
  name: string;
  ambientColor: string;
  ambientIntensity: number;
  directionalColor: string;
  directionalIntensity: number;
  shadowSoftness: 'soft' | 'sharp';
  hasCandleLight: boolean;
}

export interface LightingPreset {
  id: string;
  name: string;
  ambientColor: string;
  ambientIntensity: number;
  directionalColor: string;
  directionalIntensity: number;
  shadowSoftness: 'soft' | 'sharp';
  hasCandleLight?: boolean;
}

export interface DragState {
  isDragging: boolean;
  templateId: string | null;
  instanceId: string | null;
  projectionPosition: { x: number; z: number } | null;
  projectionDimensions: { width: number; depth: number } | null;
  dragStartTime: number;
}

export interface LightingTransitionState {
  active: boolean;
  fromAmbientIntensity: number;
  toAmbientIntensity: number;
  fromDirectionalIntensity: number;
  toDirectionalIntensity: number;
  fromAmbientColor: string;
  toAmbientColor: string;
  fromDirectionalColor: string;
  toDirectionalColor: string;
  fromHasCandleLight: boolean;
  toHasCandleLight: boolean;
  startTime: number;
  duration: number;
}

interface RoomBounds {
  width: number;
  depth: number;
  height: number;
}

const ROOM_BOUNDS: RoomBounds = {
  width: 10,
  depth: 8,
  height: 3,
};

const DEFAULT_DRAG_STATE: DragState = {
  isDragging: false,
  templateId: null,
  instanceId: null,
  projectionPosition: null,
  projectionDimensions: null,
  dragStartTime: 0,
};

export class LogicModule {
  private furnitureList: PlacedFurniture[] = [];
  private currentLighting: LightingConfig | null = null;
  private lightingPresets: LightingPreset[] = [];
  private furnitureTemplates: FurnitureTemplate[] = [];
  private listeners: Set<() => void> = new Set();
  private dragState: DragState = { ...DEFAULT_DRAG_STATE };
  private lightingTransition: LightingTransitionState | null = null;

  constructor() {
    this.currentLighting = {
      id: 'morning',
      name: '清晨',
      ambientColor: '#FFB347',
      ambientIntensity: 0.6,
      directionalColor: '#FFB347',
      directionalIntensity: 0.6,
      shadowSoftness: 'soft',
      hasCandleLight: false,
    };
  }

  subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notify(): void {
    this.listeners.forEach((cb) => cb());
  }

  setFurnitureTemplates(templates: FurnitureTemplate[]): void {
    this.furnitureTemplates = templates;
    this.notify();
  }

  setLightingPresets(presets: LightingPreset[]): void {
    this.lightingPresets = presets;
    this.notify();
  }

  getFurnitureTemplates(): FurnitureTemplate[] {
    return this.furnitureTemplates;
  }

  getLightingPresets(): LightingPreset[] {
    return this.lightingPresets;
  }

  getFurnitureList(): PlacedFurniture[] {
    return this.furnitureList;
  }

  getCurrentLighting(): LightingConfig | null {
    return this.currentLighting;
  }

  getRoomBounds(): RoomBounds {
    return ROOM_BOUNDS;
  }

  getDragState(): DragState {
    return this.dragState;
  }

  getLightingTransition(): LightingTransitionState | null {
    return this.lightingTransition;
  }

  clearLightingTransition(): void {
    this.lightingTransition = null;
  }

  startDrag(templateId: string): void {
    const template = this.furnitureTemplates.find((t) => t.id === templateId);
    if (!template) return;

    this.dragState = {
      isDragging: true,
      templateId,
      instanceId: null,
      projectionPosition: null,
      projectionDimensions: { width: template.dimensions.width, depth: template.dimensions.depth },
      dragStartTime: performance.now(),
    };
    this.notify();
  }

  updateDragPosition(worldX: number, worldZ: number): void {
    if (!this.dragState.isDragging || !this.dragState.templateId) return;

    const template = this.furnitureTemplates.find((t) => t.id === this.dragState.templateId);
    if (!template) return;

    const constrainedPos = this.constrainPosition({ x: worldX, z: worldZ }, template.dimensions);
    this.dragState.projectionPosition = constrainedPos;

    if (!this.dragState.instanceId) {
      const instance: PlacedFurniture = {
        instanceId: uuidv4(),
        template,
        position: {
          x: constrainedPos.x,
          y: template.dimensions.height / 2,
          z: constrainedPos.z,
        },
        isPlacing: true,
        animating: false,
        animationStartTime: 0,
      };
      this.furnitureList.push(instance);
      this.dragState.instanceId = instance.instanceId;
      this.notify();
    } else {
      const instance = this.furnitureList.find((f) => f.instanceId === this.dragState.instanceId);
      if (instance) {
        instance.position.x = constrainedPos.x;
        instance.position.z = constrainedPos.z;
      }
    }
  }

  endDrag(): void {
    if (!this.dragState.isDragging) return;

    if (this.dragState.instanceId) {
      const instance = this.furnitureList.find((f) => f.instanceId === this.dragState.instanceId);
      if (instance) {
        if (this.checkCollision(instance)) {
          this.removeFurniture(this.dragState.instanceId);
        } else {
          instance.isPlacing = false;
          instance.animating = true;
          instance.animationStartTime = performance.now();
          this.notify();
        }
      }
    }

    this.dragState = { ...DEFAULT_DRAG_STATE };
    this.notify();
  }

  cancelDrag(): void {
    if (!this.dragState.isDragging) return;

    if (this.dragState.instanceId) {
      this.removeFurniture(this.dragState.instanceId);
    }

    this.dragState = { ...DEFAULT_DRAG_STATE };
    this.notify();
  }

  removeFurniture(instanceId: string): void {
    const index = this.furnitureList.findIndex((f) => f.instanceId === instanceId);
    if (index !== -1) {
      this.furnitureList.splice(index, 1);
      this.notify();
    }
  }

  switchLighting(presetId: string): void {
    const preset = this.lightingPresets.find((p) => p.id === presetId);
    if (!preset || !this.currentLighting) return;
    if (preset.id === this.currentLighting.id) return;

    this.lightingTransition = {
      active: true,
      fromAmbientIntensity: this.currentLighting.ambientIntensity,
      toAmbientIntensity: preset.ambientIntensity,
      fromDirectionalIntensity: this.currentLighting.directionalIntensity,
      toDirectionalIntensity: preset.directionalIntensity,
      fromAmbientColor: this.currentLighting.ambientColor,
      toAmbientColor: preset.ambientColor,
      fromDirectionalColor: this.currentLighting.directionalColor,
      toDirectionalColor: preset.directionalColor,
      fromHasCandleLight: this.currentLighting.hasCandleLight,
      toHasCandleLight: preset.hasCandleLight || false,
      startTime: performance.now(),
      duration: 500,
    };

    this.currentLighting = {
      id: preset.id,
      name: preset.name,
      ambientColor: preset.ambientColor,
      ambientIntensity: preset.ambientIntensity,
      directionalColor: preset.directionalColor,
      directionalIntensity: preset.directionalIntensity,
      shadowSoftness: preset.shadowSoftness,
      hasCandleLight: preset.hasCandleLight || false,
    };

    this.notify();
  }

  private constrainPosition(
    pos: { x: number; z: number },
    dims: FurnitureDimensions
  ): { x: number; z: number } {
    const halfWidth = dims.width / 2;
    const halfDepth = dims.depth / 2;

    const minX = -ROOM_BOUNDS.width / 2 + halfWidth;
    const maxX = ROOM_BOUNDS.width / 2 - halfWidth;
    const minZ = -ROOM_BOUNDS.depth / 2 + halfDepth;
    const maxZ = ROOM_BOUNDS.depth / 2 - halfDepth;

    return {
      x: Math.max(minX, Math.min(maxX, pos.x)),
      z: Math.max(minZ, Math.min(maxZ, pos.z)),
    };
  }

  private checkCollision(instance: PlacedFurniture): boolean {
    const dims = instance.template.dimensions;
    const pos = instance.position;

    for (const other of this.furnitureList) {
      if (other.instanceId === instance.instanceId || other.isPlacing) continue;

      const otherDims = other.template.dimensions;
      const otherPos = other.position;

      const minX1 = pos.x - dims.width / 2;
      const maxX1 = pos.x + dims.width / 2;
      const minZ1 = pos.z - dims.depth / 2;
      const maxZ1 = pos.z + dims.depth / 2;

      const minX2 = otherPos.x - otherDims.width / 2;
      const maxX2 = otherPos.x + otherDims.width / 2;
      const minZ2 = otherPos.z - otherDims.depth / 2;
      const maxZ2 = otherPos.z + otherDims.depth / 2;

      if (minX1 < maxX2 && maxX1 > minX2 && minZ1 < maxZ2 && maxZ1 > minZ2) {
        return true;
      }
    }
    return false;
  }

  getShadowMapSize(): number {
    if (!this.currentLighting) return 1024;
    return this.currentLighting.shadowSoftness === 'sharp' ? 2048 : 1024;
  }

  getShadowRadius(): number {
    if (!this.currentLighting) return 0;
    return this.currentLighting.shadowSoftness === 'soft' ? 4 : 0;
  }
}

export const logicModule = new LogicModule();
