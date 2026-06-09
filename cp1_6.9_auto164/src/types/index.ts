export type FurnitureId = 'sofa' | 'coffeeTable' | 'floorLamp' | 'shelf' | 'carpet';

export interface MaterialConfig {
  color: string;
  metalness: number;
  roughness: number;
  emissive?: string;
}

export interface FurnitureState {
  id: FurnitureId;
  name: string;
  position: [number, number, number];
  rotation: [number, number, number];
  material: MaterialConfig;
  baseY: number;
}

export type StyleId = 'modern' | 'japanese' | 'vintage' | 'luxury';

export interface StylePreset {
  id: StyleId;
  name: string;
  buttonColor: string;
  furniture: Record<FurnitureId, MaterialConfig>;
}

export interface LightConfig {
  intensity: number;
  colorHex: string;
}

export const FURNITURE_NAMES: Record<FurnitureId, string> = {
  sofa: '沙发',
  coffeeTable: '茶几',
  floorLamp: '落地灯',
  shelf: '置物架',
  carpet: '地毯',
};

export const STYLE_PRESETS: StylePreset[] = [
  {
    id: 'modern',
    name: '现代灰白',
    buttonColor: '#EAEAEA',
    furniture: {
      sofa: { color: '#D0D0D0', metalness: 0.05, roughness: 0.85 },
      coffeeTable: { color: '#F5F5F5', metalness: 0.3, roughness: 0.4 },
      floorLamp: { color: '#2C2C2C', metalness: 0.6, roughness: 0.3, emissive: '#FFF8E3' },
      shelf: { color: '#A0A0A0', metalness: 0.4, roughness: 0.5 },
      carpet: { color: '#E0E0E0', metalness: 0, roughness: 0.95 },
    },
  },
  {
    id: 'japanese',
    name: '暖木日式',
    buttonColor: '#D4B895',
    furniture: {
      sofa: { color: '#E8D5B7', metalness: 0, roughness: 0.9 },
      coffeeTable: { color: '#C9A876', metalness: 0.05, roughness: 0.7 },
      floorLamp: { color: '#8B6F47', metalness: 0.2, roughness: 0.6, emissive: '#FFE4B5' },
      shelf: { color: '#B8956C', metalness: 0.05, roughness: 0.75 },
      carpet: { color: '#DEB887', metalness: 0, roughness: 0.98 },
    },
  },
  {
    id: 'vintage',
    name: '复古墨绿',
    buttonColor: '#2D5A27',
    furniture: {
      sofa: { color: '#2D5A27', metalness: 0.02, roughness: 0.92 },
      coffeeTable: { color: '#B87333', metalness: 0.75, roughness: 0.35 },
      floorLamp: { color: '#5C4033', metalness: 0.5, roughness: 0.45, emissive: '#FFDAB9' },
      shelf: { color: '#4A3728', metalness: 0.15, roughness: 0.65 },
      carpet: { color: '#8B5A2B', metalness: 0, roughness: 0.97 },
    },
  },
  {
    id: 'luxury',
    name: '轻奢金棕',
    buttonColor: '#B87333',
    furniture: {
      sofa: { color: '#6B4423', metalness: 0.1, roughness: 0.78 },
      coffeeTable: { color: '#D4AF37', metalness: 0.95, roughness: 0.15 },
      floorLamp: { color: '#1C1C1C', metalness: 0.85, roughness: 0.2, emissive: '#FFFACD' },
      shelf: { color: '#8B4513', metalness: 0.7, roughness: 0.35 },
      carpet: { color: '#8B0000', metalness: 0.02, roughness: 0.96 },
    },
  },
];

export const ROOM_SIZE = { width: 5, depth: 5, height: 3 };
export const GRID_SIZE = 0.1;

export const WARM_LIGHT = '#FFF8E3';
export const COOL_LIGHT = '#E3F0FF';
