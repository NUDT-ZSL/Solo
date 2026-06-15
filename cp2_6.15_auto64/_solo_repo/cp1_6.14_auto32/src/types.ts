export type ElementType = 'platform' | 'spike' | 'obstacle' | 'collectible' | 'goal';

export interface LevelElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

export type EditorMode = 'edit' | 'play';

export interface GameStats {
  time: number;
  deaths: number;
  completed: boolean;
}

export const PRESET_COLORS: string[] = [
  '#ff4444',
  '#ff8c00',
  '#ffd700',
  '#22c55e',
  '#00d4ff',
  '#3b82f6',
  '#a78bfa',
  '#ec4899'
];

export const DEFAULT_ELEMENT_SIZES: Record<ElementType, { width: number; height: number }> = {
  platform: { width: 100, height: 20 },
  spike: { width: 30, height: 30 },
  obstacle: { width: 40, height: 60 },
  collectible: { width: 30, height: 30 },
  goal: { width: 40, height: 80 }
};

export const DEFAULT_ELEMENT_COLORS: Record<ElementType, string> = {
  platform: '#22c55e',
  spike: '#ff4444',
  obstacle: '#a78bfa',
  collectible: '#ffd700',
  goal: '#00d4ff'
};

export const TOOLBOX_ITEMS: Array<{ type: ElementType; label: string; icon: string }> = [
  { type: 'platform', label: '平台', icon: '▬' },
  { type: 'spike', label: '尖刺', icon: '▲' },
  { type: 'obstacle', label: '障碍物', icon: '■' },
  { type: 'collectible', label: '收集物', icon: '●' },
  { type: 'goal', label: '终点旗帜', icon: '⚑' }
];
