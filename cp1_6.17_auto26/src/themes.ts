import type { ThemeColor, ThemeConfig } from './types';

interface HSL {
  h: number;
  s: number;
  l: number;
}

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

const rgbToHsl = (r: number, g: number, b: number): HSL => {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
};

const hslToRgb = (h: number, s: number, l: number): { r: number; g: number; b: number } => {
  h /= 360;
  s /= 100;
  l /= 100;

  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  };
};

const adjustLuminance = (hex: string, targetLuminance: number): string => {
  const { r, g, b } = hexToRgb(hex);
  const hsl = rgbToHsl(r, g, b);
  const newRgb = hslToRgb(hsl.h, hsl.s, targetLuminance);
  return rgbToHex(newRgb.r, newRgb.g, newRgb.b);
};

const adjustLuminanceSaturate = (hex: string, targetLuminance: number, minSaturation: number = 60): string => {
  const { r, g, b } = hexToRgb(hex);
  const hsl = rgbToHsl(r, g, b);
  const s = Math.max(hsl.s, minSaturation);
  const newRgb = hslToRgb(hsl.h, s, targetLuminance);
  return rgbToHex(newRgb.r, newRgb.g, newRgb.b);
};

const buildTheme = (base: string): ThemeConfig => {
  const { r, g, b } = hexToRgb(base);
  const baseHsl = rgbToHsl(r, g, b);

  return {
    main: base,
    tone300: adjustLuminanceSaturate(base, 60, 75),
    light: adjustLuminanceSaturate(base, 72, 70),
    lighter: adjustLuminanceSaturate(base, 82, 65),
    lightest: adjustLuminanceSaturate(base, 94, 40),
    cardBg: adjustLuminanceSaturate(base, 85, 55),
    cardBorder: adjustLuminanceSaturate(base, 75, 60),
    tagBg: adjustLuminanceSaturate(base, 80, 60)
  };
};

export const THEMES: Record<ThemeColor, ThemeConfig> = {
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

export const getThemeColors = (color: ThemeColor) => {
  const t = THEMES[color];
  console.log(`Theme ${color}:`, {
    main: t.main,
    tone300: t.tone300,
    cardBg: t.cardBg,
    cardBorder: t.cardBorder
  });
  return t;
};
