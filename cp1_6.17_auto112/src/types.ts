export type Language = 'javascript' | 'python' | 'html';

export type AnimationStyle = 'typewriter' | 'fade' | 'highlight';

export interface CodeData {
  code: string;
  language: Language;
}

export interface AnimationParams {
  style: AnimationStyle;
  speed: number;
  highlightColor: string;
  backgroundColor: string;
}

export interface ExportData {
  canvas: HTMLCanvasElement;
  duration: number;
  fps: number;
}

export type TokenType = 'keyword' | 'string' | 'comment' | 'function' | 'default';

export interface SyntaxToken {
  type: TokenType;
  value: string;
  color: string;
}

export const HIGHLIGHT_COLORS: Record<TokenType, string> = {
  keyword: '#C678DD',
  string: '#98C379',
  comment: '#5C6370',
  function: '#61AFEF',
  default: '#ABB2BF',
} as const;

export const LANGUAGE_OPTIONS: { value: Language; label: string }[] = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'python', label: 'Python' },
  { value: 'html', label: 'HTML' },
];

export const ANIMATION_STYLES: { value: AnimationStyle; label: string; icon: 'T' | 'dashed' | 'solid' }[] = [
  { value: 'typewriter', label: '打字机', icon: 'T' },
  { value: 'fade', label: '渐显', icon: 'dashed' },
  { value: 'highlight', label: '行高亮', icon: 'solid' },
];

export const HIGHLIGHT_COLOR_OPTIONS: string[] = ['#FFD700', '#00BFFF', '#FF69B4'];
export const BACKGROUND_COLOR_OPTIONS: string[] = ['#1E1E1E', '#FFFFFF'];

export const DEFAULT_ANIMATION_PARAMS: AnimationParams = {
  style: 'typewriter',
  speed: 1,
  highlightColor: '#FFD700',
  backgroundColor: '#1E1E1E',
};

export const FPS = 30;
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;
export const FONT_FAMILY = 'Fira Code, monospace';
export const FONT_SIZE = 16;
export const LINE_HEIGHT = 1.6;
export const PADDING = 20;
