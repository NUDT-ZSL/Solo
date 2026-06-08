export type ElementType = 'avatar' | 'name' | 'position' | 'contact' | 'social' | 'bio';

export interface CardElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  fontSize?: number;
  color?: string;
}

export interface Template {
  id: string;
  name: string;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  elementPositions: Record<string, { x: number; y: number }>;
  spacing: number;
}

export interface CardState {
  elements: CardElement[];
  backgroundColor: string;
  fontSize: number;
  margin: number;
  activeTemplate: string;
}

export const CANVAS_WIDTH = 600;
export const CANVAS_HEIGHT = 400;

export const PRESET_COLORS: string[] = [
  '#FFFFFF',
  '#F5F5F5',
  '#FFE0B2',
  '#FFCDD2',
  '#C8E6C9',
  '#B3E5FC',
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
];

export const FONT_SIZES: number[] = [12, 16, 20, 24, 28, 32, 36];

export const TEMPLATES: Template[] = [
  {
    id: 'professional',
    name: '专业',
    backgroundColor: '#F5F5F5',
    textColor: '#212121',
    accentColor: '#1976D2',
    elementPositions: {
      avatar: { x: 40, y: 60 },
      name: { x: 180, y: 70 },
      position: { x: 180, y: 120 },
      contact: { x: 40, y: 260 },
      social: { x: 40, y: 320 },
    },
    spacing: 16,
  },
  {
    id: 'lively',
    name: '活泼',
    backgroundColor: '#FFE0B2',
    textColor: '#5D4037',
    accentColor: '#FF6F00',
    elementPositions: {
      avatar: { x: 250, y: 30 },
      name: { x: 180, y: 150 },
      position: { x: 200, y: 200 },
      contact: { x: 120, y: 270 },
      social: { x: 200, y: 340 },
    },
    spacing: 12,
  },
  {
    id: 'dark',
    name: '暗黑',
    backgroundColor: '#263238',
    textColor: '#ECEFF1',
    accentColor: '#00BCD4',
    elementPositions: {
      avatar: { x: 440, y: 50 },
      name: { x: 40, y: 70 },
      position: { x: 40, y: 120 },
      contact: { x: 40, y: 200 },
      social: { x: 440, y: 320 },
    },
    spacing: 20,
  },
  {
    id: 'minimal',
    name: '简约',
    backgroundColor: '#FFFFFF',
    textColor: '#424242',
    accentColor: '#757575',
    elementPositions: {
      avatar: { x: 50, y: 120 },
      name: { x: 200, y: 140 },
      position: { x: 200, y: 190 },
      contact: { x: 200, y: 240 },
      social: { x: 200, y: 300 },
    },
    spacing: 10,
  },
  {
    id: 'retro',
    name: '复古',
    backgroundColor: '#EFEBE9',
    textColor: '#3E2723',
    accentColor: '#8D6E63',
    elementPositions: {
      avatar: { x: 60, y: 50 },
      name: { x: 60, y: 180 },
      position: { x: 60, y: 230 },
      contact: { x: 320, y: 80 },
      social: { x: 320, y: 300 },
    },
    spacing: 14,
  },
];
