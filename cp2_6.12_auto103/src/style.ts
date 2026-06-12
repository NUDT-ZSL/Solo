export type ViewType = 'front' | 'side' | 'back';
export type CanvasSize = 16 | 32;
export type BrushSize = 1 | 2;
export type FrameData = number[][];

export const COLORS = {
  bg: '#1a1a2e',
  panel: '#16213e',
  accent: '#e94560',
  text: '#f4f4f4',
  textDim: '#94b0c2',
  border: '#333c57',
  highlight: '#73eff7',
  success: '#38b764',
  grid: 'rgba(255,255,255,0.08)',
  gridAccent: 'rgba(255,255,255,0.15)',
} as const;

export const PALETTE = [
  '#1a1c2c',
  '#5d275d',
  '#b13e53',
  '#ef7d57',
  '#ffcd75',
  '#a7f070',
  '#38b764',
  '#257179',
  '#29366f',
  '#3b5dc9',
  '#41a6f6',
  '#73eff7',
  '#f4f4f4',
  '#94b0c2',
  '#566c86',
  '#333c57',
] as const;

export const LAYOUT = {
  toolPanelWidth: 60,
  timelineHeight: 80,
  breakpoint: 768,
} as const;

export const ANIMATION = {
  defaultSpeed: 200,
  minSpeed: 100,
  maxSpeed: 500,
  particleDuration: 200,
  glowDuration: 500,
} as const;

export const VIEW_LABELS: Record<ViewType, string> = {
  front: '正面',
  side: '侧面',
  back: '背面',
};

export function createEmptyFrame(size: CanvasSize): FrameData {
  return Array.from({ length: size }, () => Array(size).fill(0));
}

export function deepCopyFrame(frame: FrameData): FrameData {
  return frame.map(row => [...row]);
}

export function getViewFrameRange(view: ViewType): [number, number] {
  switch (view) {
    case 'front': return [0, 3];
    case 'side': return [4, 7];
    case 'back': return [8, 11];
  }
}

export function getFrameView(frameIndex: number): ViewType {
  if (frameIndex <= 3) return 'front';
  if (frameIndex <= 7) return 'side';
  return 'back';
}
