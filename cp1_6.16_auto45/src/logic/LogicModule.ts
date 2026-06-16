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
  placementProgress: number;
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
  transitionProgress: number;
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

export class LogicModule {
  private furnitureList: PlacedFurniture[] = [];
  private currentLighting: LightingConfig | null = null;
  private lightingPresets: LightingPreset[] = [];
  private furnitureTemplates: FurnitureTemplate[] = [];
  private listeners: Set<() => void> = new Set();

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
      transitionProgress: 1,
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

  createPlacingInstance(templateId: string, initialPos: { x: number; z: number }): PlacedFurniture | null {
    const template = this.furnitureTemplates.find((t) => t.id === templateId);
    if (!template) return null;

    const constrainedPos = this.constrainPosition(initialPos, template.dimensions);
    const instance: PlacedFurniture = {
      instanceId: uuidv4(),
      template,
      position: {
        x: constrainedPos.x,
        y: template.dimensions.height / 2,
        z: constrainedPos.z,
      },
      isPlacing: true,
      placementProgress: 0,
    };

    this.furnitureList.push(instance);
    this.notify();
    return instance;
  }

  updatePlacingPosition(instanceId: string, pos: { x: number; z: number }): void {
    const instance = this.furnitureList.find((f) => f.instanceId === instanceId && f.isPlacing);
    if (!instance) return;

    const constrainedPos = this.constrainPosition(pos, instance.template.dimensions);
    instance.position.x = constrainedPos.x;
    instance.position.z = constrainedPos.z;
    this.notify();
  }

  finalizePlacement(instanceId: string): void {
    const instance = this.furnitureList.find((f) => f.instanceId === instanceId);
    if (!instance) return;

    if (this.checkCollision(instance)) {
      this.removeFurniture(instanceId);
      return;
    }

    instance.isPlacing = false;
    instance.placementProgress = 0;
    this.animatePlacement(instance);
    this.notify();
  }

  cancelPlacement(instanceId: string): void {
    this.removeFurniture(instanceId);
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

    this.currentLighting = {
      ...this.currentLighting,
      transitionProgress: 0,
    };

    this.animateLightingTransition(preset);
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

  private animatePlacement(instance: PlacedFurniture): void {
    const startTime = performance.now();
    const duration = 300;

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(1, elapsed / duration);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const scale = 0.9 + easeOut * 0.1;

      instance.placementProgress = progress;
      instance.position.y = instance.template.dimensions.height / 2 * scale;

      this.notify();

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }

  private animateLightingTransition(targetPreset: LightingPreset): void {
    if (!this.currentLighting) return;

    const startTime = performance.now();
    const duration = 500;

    const startAmbientIntensity = this.currentLighting.ambientIntensity;
    const startDirectionalIntensity = this.currentLighting.directionalIntensity;

    const animate = () => {
      if (!this.currentLighting) return;

      const elapsed = performance.now() - startTime;
      const progress = Math.min(1, elapsed / duration);
      const eased = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      this.currentLighting = {
        id: targetPreset.id,
        name: targetPreset.name,
        ambientColor: targetPreset.ambientColor,
        ambientIntensity: startAmbientIntensity + (targetPreset.ambientIntensity - startAmbientIntensity) * eased,
        directionalColor: targetPreset.directionalColor,
        directionalIntensity: startDirectionalIntensity + (targetPreset.directionalIntensity - startDirectionalIntensity) * eased,
        shadowSoftness: targetPreset.shadowSoftness,
        hasCandleLight: targetPreset.hasCandleLight || false,
        transitionProgress: progress,
      };

      this.notify();

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }

  parseLightingPreset(preset: LightingPreset): LightingConfig {
    return {
      id: preset.id,
      name: preset.name,
      ambientColor: preset.ambientColor,
      ambientIntensity: preset.ambientIntensity,
      directionalColor: preset.directionalColor,
      directionalIntensity: preset.directionalIntensity,
      shadowSoftness: preset.shadowSoftness,
      hasCandleLight: preset.hasCandleLight || false,
      transitionProgress: 1,
    };
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
