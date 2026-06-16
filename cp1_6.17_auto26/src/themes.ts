import type { ThemeColor, ThemeConfig } from './types';

const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
};

const rgbToHex = (r: number, g: number, b: number): string => {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
};

const mixWithWhite = (hex: string, amount: number): string => {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(
    r + (255 - r) * amount,
    g + (255 - g) * amount,
    b + (255 - b) * amount
  );
};

const adjustBrightness = (hex: string, percent: number): string => {
  const { r, g, b } = hexToRgb(hex);
  const factor = percent / 100;
  return rgbToHex(
    r + (255 - r) * factor,
    g + (255 - g) * factor,
    b + (255 - b) * factor
  );
};

const buildTheme = (base: string) => ({
  main: base,
  tone300: adjustBrightness(base, 20),
  light: adjustBrightness(base, 45),
  lighter: adjustBrightness(base, 65),
  lightest: adjustBrightness(base, 92),
  cardBg: mixWithWhite(base, 0.92),
  cardBorder: mixWithWhite(base, 0.75),
  tagBg: mixWithWhite(base, 0.85)
});

export const THEMES: Record<ThemeColor, ReturnType<typeof buildTheme>> = {
  warm: buildTheme('#E65100'),
  cool: buildTheme('#1565C0'),
  nature: buildTheme('#2E7D32'),
  soft: buildTheme('#F48FB1'),
  dark: buildTheme('#424242'),
  vintage: buildTheme('#795548')
};

export const THEME_LABELS: Record<ThemeColor, string> = {
  warm: '暖橙',
  cool: '冷蓝',
  nature: '自然绿',
  soft: '柔和粉',
  dark: '暗黑',
  vintage: '复古棕'
};
