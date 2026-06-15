export type BlendMode = 'normal' | 'multiply' | 'screen' | 'soft-light' | 'hard-light';
export type LightEffectType = 'none' | 'soft-glow' | 'neon' | 'sparkle';
export type ElementType = 'vintage-stamp' | 'graffiti-stroke' | 'torn-paper' | 'neon-bar' | 'dried-flower' | 'vinyl-record';
export type TextureType = 'none' | 'old-paper' | 'burlap' | 'watercolor';

export interface LightEffect {
  type: LightEffectType;
  intensity: number;
  radius: number;
}

export interface MaterialDef {
  type: ElementType;
  name: string;
  defaultWidth: number;
  defaultHeight: number;
  colors: string[];
  shadowOffsetX: number;
  shadowOffsetY: number;
  shadowBlur: number;
  shadowColor: string;
}

export interface Layer {
  id: string;
  type: ElementType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scale: number;
  opacity: number;
  visible: boolean;
  blendMode: BlendMode;
  shadowOffsetX: number;
  shadowOffsetY: number;
  shadowBlur: number;
  shadowColor: string;
  lightEffect: LightEffect;
  colors: string[];
  pressAnim: number;
}

export interface CanvasState {
  layers: Layer[];
  selectedId: string | null;
  backgroundColor: string;
  textureType: TextureType;
  textureSize: number;
}

export const MATERIAL_LIBRARY: MaterialDef[] = [
  {
    type: 'vintage-stamp',
    name: '复古邮票',
    defaultWidth: 160,
    defaultHeight: 200,
    colors: ['#C94F4F', '#8B2E2E', '#F5E6D3', '#D4A574'],
    shadowOffsetX: 3,
    shadowOffsetY: 3,
    shadowBlur: 8,
    shadowColor: 'rgba(80, 40, 20, 0.35)'
  },
  {
    type: 'graffiti-stroke',
    name: '涂鸦笔画',
    defaultWidth: 220,
    defaultHeight: 80,
    colors: ['#FF6B9D', '#C44569', '#FFE66D', '#4ECDC4'],
    shadowOffsetX: 2,
    shadowOffsetY: 4,
    shadowBlur: 6,
    shadowColor: 'rgba(0, 0, 0, 0.3)'
  },
  {
    type: 'torn-paper',
    name: '撕纸边缘',
    defaultWidth: 280,
    defaultHeight: 180,
    colors: ['#FFF8E7', '#F0E6D2', '#E8DCC0', '#D4C4A8'],
    shadowOffsetX: 4,
    shadowOffsetY: 5,
    shadowBlur: 12,
    shadowColor: 'rgba(50, 40, 30, 0.25)'
  },
  {
    type: 'neon-bar',
    name: '霓虹光条',
    defaultWidth: 60,
    defaultHeight: 260,
    colors: ['#FF00FF', '#00FFFF', '#FF0080', '#8000FF'],
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    shadowBlur: 20,
    shadowColor: 'rgba(255, 0, 255, 0.6)'
  },
  {
    type: 'dried-flower',
    name: '干枯花朵',
    defaultWidth: 140,
    defaultHeight: 180,
    colors: ['#C9A96E', '#8B7355', '#E8D5B7', '#A67B5B'],
    shadowOffsetX: 2,
    shadowOffsetY: 3,
    shadowBlur: 10,
    shadowColor: 'rgba(70, 50, 30, 0.3)'
  },
  {
    type: 'vinyl-record',
    name: '黑胶唱片',
    defaultWidth: 200,
    defaultHeight: 200,
    colors: ['#1A1A1A', '#2D2D2D', '#FF4757', '#F1C40F'],
    shadowOffsetX: 4,
    shadowOffsetY: 6,
    shadowBlur: 14,
    shadowColor: 'rgba(0, 0, 0, 0.45)'
  }
];

export function generateId(): string {
  return 'layer_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
}

export function createLayerFromMaterial(material: MaterialDef, centerX: number, centerY: number): Layer {
  return {
    id: generateId(),
    type: material.type,
    name: material.name,
    x: centerX - material.defaultWidth / 2,
    y: centerY - material.defaultHeight / 2,
    width: material.defaultWidth,
    height: material.defaultHeight,
    rotation: 0,
    scale: 1,
    opacity: 1,
    visible: true,
    blendMode: 'normal',
    shadowOffsetX: material.shadowOffsetX,
    shadowOffsetY: material.shadowOffsetY,
    shadowBlur: material.shadowBlur,
    shadowColor: material.shadowColor,
    lightEffect: { type: 'none', intensity: 0.5, radius: 30 },
    colors: [...material.colors],
    pressAnim: 0
  };
}
