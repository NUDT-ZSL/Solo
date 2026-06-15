export type ComponentType = 'button' | 'card' | 'input';

export interface ButtonProps {
  backgroundColor: string;
  borderRadius: number;
  fontSize: number;
  textColor: string;
  shadowDepth: number;
  width: number;
  height: number;
}

export interface CardProps {
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  borderRadius: number;
  shadowDepth: number;
  width: number;
  height: number;
}

export interface InputProps {
  borderColor: string;
  borderRadius: number;
  placeholderColor: string;
  padding: number;
  width: number;
  height: number;
}

export interface ComponentData {
  id: string;
  type: ComponentType;
  x: number;
  y: number;
  zIndex: number;
  props: ButtonProps | CardProps | InputProps;
}

export const DEFAULT_BUTTON_PROPS: ButtonProps = {
  backgroundColor: '#3b82f6',
  borderRadius: 8,
  fontSize: 14,
  textColor: '#ffffff',
  shadowDepth: 0,
  width: 160,
  height: 48,
};

export const DEFAULT_CARD_PROPS: CardProps = {
  backgroundColor: '#ffffff',
  borderColor: '#e2e8f0',
  borderWidth: 1,
  borderRadius: 12,
  shadowDepth: 4,
  width: 280,
  height: 220,
};

export const DEFAULT_INPUT_PROPS: InputProps = {
  borderColor: '#d1d5db',
  borderRadius: 8,
  placeholderColor: '#9ca3af',
  padding: 12,
  width: 300,
  height: 44,
};

export const THEME_PRESETS = [
  { label: '默认浅灰', value: '#f0f4f8' },
  { label: '深色', value: '#1e293b' },
  { label: '暖黄', value: '#fef3c7' },
  { label: '浅蓝', value: '#dbeafe' },
  { label: '浅绿', value: '#ecfccb' },
] as const;

export const GRID_SIZE = 20;
export const MAX_COMPONENTS = 6;

export function snapToGrid(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

export function getDefaultProps(type: ComponentType): ButtonProps | CardProps | InputProps {
  switch (type) {
    case 'button':
      return { ...DEFAULT_BUTTON_PROPS };
    case 'card':
      return { ...DEFAULT_CARD_PROPS };
    case 'input':
      return { ...DEFAULT_INPUT_PROPS };
  }
}

export function getComponentLabel(type: ComponentType): string {
  switch (type) {
    case 'button': return '按钮';
    case 'card': return '卡片';
    case 'input': return '输入框';
  }
}
