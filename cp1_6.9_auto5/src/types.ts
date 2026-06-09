export type BlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten';

export type AnimationType = 'none' | 'sine' | 'noise';

export type LayerType = 'image' | 'draw';

export interface Transform {
  x: number;
  y: number;
  rotation: number;
  scale: number;
}

export interface AnimationConfig {
  type: AnimationType;
  amplitude: number;
  frequency: number;
  enabled: boolean;
}

export interface LayerData {
  id: string;
  type: LayerType;
  src: string;
  width: number;
  height: number;
  transform: Transform;
  blendMode: BlendMode;
  opacity: number;
  animation: AnimationConfig;
}

export interface LayerRuntime {
  imageElement: HTMLImageElement | null;
}

export type CompositeOperationMap = Record<BlendMode, GlobalCompositeOperation>;

export const BLEND_MODE_MAP: CompositeOperationMap = {
  normal: 'source-over',
  multiply: 'multiply',
  screen: 'screen',
  overlay: 'overlay',
  darken: 'darken',
  lighten: 'lighten',
};

export const BLEND_MODE_LABELS: Record<BlendMode, string> = {
  normal: 'Normal',
  multiply: 'Multiply',
  screen: 'Screen',
  overlay: 'Overlay',
  darken: 'Darken',
  lighten: 'Lighten',
};

export const CANVAS_WIDTH = 1920;
export const CANVAS_HEIGHT = 1080;

export const generateId = (): string => {
  return `layer-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
};

export const createDefaultAnimation = (): AnimationConfig => ({
  type: 'none',
  amplitude: 5,
  frequency: 1,
  enabled: false,
});

export const createDefaultTransform = (canvasW: number, canvasH: number, imgW: number, imgH: number): Transform => {
  const scale = Math.min((canvasW * 0.6) / imgW, (canvasH * 0.6) / imgH, 1);
  return {
    x: canvasW / 2,
    y: canvasH / 2,
    rotation: 0,
    scale,
  };
};
