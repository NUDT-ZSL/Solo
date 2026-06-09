export type TextureType = 'noise' | 'stripes' | 'waves' | 'grid';

export type BlendMode = 'normal' | 'overlay' | 'soft-light' | 'hard-light';

export type GradientType = 'linear' | 'radial';

export interface TextureLayer {
  id: string;
  type: TextureType;
  intensity: number;
  color: string;
  scale: number;
  angle: number;
}

export interface GradientStop {
  id: string;
  position: number;
  color: string;
}

export interface GradientConfig {
  enabled: boolean;
  type: GradientType;
  stops: GradientStop[];
  angle: number;
  blendMode: BlendMode;
  opacity: number;
}

export interface Preset {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  layers: TextureLayer[];
  gradient: GradientConfig;
  backgroundColor: string;
}

export interface TextureParams {
  layers: TextureLayer[];
  gradient: GradientConfig;
  backgroundColor: string;
}

export interface HistoryState {
  snapshots: TextureParams[];
  currentIndex: number;
}

export const TEXTURE_TYPE_LABELS: Record<TextureType, string> = {
  noise: '噪点',
  stripes: '竖条纹',
  waves: '波纹',
  grid: '网格'
};

export const BLEND_MODE_LABELS: Record<BlendMode, string> = {
  normal: '正常',
  overlay: '叠加',
  'soft-light': '柔光',
  'hard-light': '强光'
};

export const GRADIENT_TYPE_LABELS: Record<GradientType, string> = {
  linear: '线性渐变',
  radial: '径向渐变'
};

export const CANVAS_BLEND_MODES: Record<BlendMode, GlobalCompositeOperation> = {
  normal: 'source-over',
  overlay: 'overlay',
  'soft-light': 'soft-light',
  'hard-light': 'hard-light'
};
