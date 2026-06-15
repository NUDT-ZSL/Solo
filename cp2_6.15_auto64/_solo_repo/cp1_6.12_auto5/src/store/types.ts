export interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  text: string;
  accent: string;
}

export type ColorKey = keyof ThemeColors;

export const COLOR_KEY_LABELS: Record<ColorKey, string> = {
  primary: '主色',
  secondary: '辅色',
  background: '背景色',
  text: '文字色',
  accent: '强调色',
};

export const COLOR_KEYS: ColorKey[] = [
  'primary',
  'secondary',
  'background',
  'text',
  'accent',
];

export interface Theme {
  id: string;
  name: string;
  colors: ThemeColors;
  comments: string;
  createdAt: number;
  updatedAt: number;
}

export interface HistorySnapshot {
  id: string;
  themeId: string;
  colors: ThemeColors;
  timestamp: number;
  label?: string;
}

export interface ShareableTheme {
  name: string;
  colors: ThemeColors;
  comments: string;
  exportedAt: number;
}
