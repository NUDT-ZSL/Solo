export interface FurnitureData {
  id: string;
  name: string;
  type: 'sofa' | 'coffeeTable' | 'floorLamp' | 'bookshelf';
  dimensions: {
    width: number;
    depth: number;
    height: number;
    radius?: number;
  };
  color: string;
  textureUrl?: string;
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

export const furnitureLibrary: FurnitureData[] = [
  {
    id: 'sofa-1',
    name: '沙发',
    type: 'sofa',
    dimensions: { width: 2, depth: 1, height: 0.8 },
    color: '#8B4513',
  },
  {
    id: 'coffee-table-1',
    name: '茶几',
    type: 'coffeeTable',
    dimensions: { width: 1.2, depth: 0.6, height: 0.5 },
    color: '#D2691E',
  },
  {
    id: 'floor-lamp-1',
    name: '落地灯',
    type: 'floorLamp',
    dimensions: { width: 0.6, depth: 0.6, height: 1.5, radius: 0.3 },
    color: '#FFD700',
  },
  {
    id: 'bookshelf-1',
    name: '书架',
    type: 'bookshelf',
    dimensions: { width: 1.2, depth: 0.4, height: 2 },
    color: '#8B7355',
  },
];

export const lightingPresets: LightingPreset[] = [
  {
    id: 'morning',
    name: '清晨',
    ambientColor: '#FFB347',
    ambientIntensity: 0.6,
    directionalColor: '#FFB347',
    directionalIntensity: 0.6,
    shadowSoftness: 'soft',
  },
  {
    id: 'noon',
    name: '正午',
    ambientColor: '#87CEEB',
    ambientIntensity: 1.0,
    directionalColor: '#87CEEB',
    directionalIntensity: 1.0,
    shadowSoftness: 'sharp',
  },
  {
    id: 'night',
    name: '夜间',
    ambientColor: '#191970',
    ambientIntensity: 0.3,
    directionalColor: '#191970',
    directionalIntensity: 0.3,
    shadowSoftness: 'soft',
    hasCandleLight: true,
  },
];
