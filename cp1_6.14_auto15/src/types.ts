export interface Layer {
  id: string;
  name: string;
  image: HTMLImageElement | null;
  opacity: number;
  blendMode: GlobalCompositeOperation;
  color: string;
  visible: boolean;
}

export type BlendMode = GlobalCompositeOperation;

export const BLEND_MODES: BlendMode[] = [
  'source-over',
  'multiply',
  'screen',
  'overlay',
  'darken',
  'lighten',
  'color-dodge',
  'color-burn',
  'hard-light',
];

export const LAYER_COLORS = [
  '#ef4444',
  '#3b82f6',
  '#22c55e',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
];
