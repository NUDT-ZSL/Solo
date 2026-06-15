export const CONFIG = {
  BACKGROUND_COLOR: '#000000',
  DEFAULT_STROKE_COLOR: '#FF6666',
  DECAY_RATE: 0.02,
  INITIAL_STROKE_WIDTH: 4,
  MAX_STROKE_POINTS: 2000,
  RANDOM_OFFSET: 2,
  LINE_WIDTH: 2,
  SHADOW_BLUR: 8,
  FPS_FONT: '12px monospace',
  FPS_COLOR: 'rgba(255, 255, 255, 0.5)',
  PRESET_COLORS: [
    '#FF6666',
    '#FFFF00',
    '#00FF88',
    '#FF66B2',
    '#33CCFF',
    '#FFAA00'
  ]
} as const;

export interface LightPoint {
  x: number;
  y: number;
  color: string;
  alpha: number;
  width: number;
}
