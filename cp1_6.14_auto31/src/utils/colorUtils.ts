export interface HSL {
  h: number;
  s: number;
  l: number;
}

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export type SchemeType =
  | 'monochromatic'
  | 'complementary'
  | 'split'
  | 'triadic'
  | 'tetradic';

export interface ColorScheme {
  type: SchemeType;
  name: string;
  colors: HSL[];
}

export interface FavoriteEntry {
  id: string;
  timestamp: number;
  primary: HSL;
  schemes: ColorScheme[];
}

const clamp = (v: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, v));

const normalizeHue = (h: number): number => {
  h = h % 360;
  return h < 0 ? h + 360 : h;
};

export const hslToRgb = (hsl: HSL): RGB => {
  const h = hsl.h / 360;
  const s = hsl.s / 100;
  const l = hsl.l / 100;

  if (s === 0) {
    const val = Math.round(l * 255);
    return { r: val, g: val, b: val };
  }

  const hue2rgb = (p: number, q: number, t: number): number => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  return {
    r: Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, h) * 255),
    b: Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  };
};

export const rgbToHsl = (rgb: RGB): HSL => {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / delta + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / delta + 2) / 6;
        break;
      case b:
        h = ((r - g) / delta + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
};

export const rgbToHex = (rgb: RGB): string => {
  const toHex = (n: number): string => {
    const hex = clamp(Math.round(n), 0, 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return ('#' + toHex(rgb.r) + toHex(rgb.g) + toHex(rgb.b)).toUpperCase();
};

export const hexToRgb = (hex: string): RGB | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!result) return null;
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
};

export const hexToHsl = (hex: string): HSL | null => {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  return rgbToHsl(rgb);
};

export const hslToHex = (hsl: HSL): string => rgbToHex(hslToRgb(hsl));

export const hslToString = (hsl: HSL): string =>
  `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;

export const rgbToString = (rgb: RGB): string =>
  `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;

export const generateMonochromatic = (primary: HSL): HSL[] => {
  return [
    { h: primary.h, s: clamp(primary.s, 0, 100), l: clamp(primary.l - 25, 10, 95) },
    { h: primary.h, s: clamp(primary.s, 0, 100), l: clamp(primary.l - 12, 10, 95) },
    { h: primary.h, s: primary.s, l: primary.l },
    { h: primary.h, s: clamp(primary.s, 0, 100), l: clamp(primary.l + 15, 10, 95) },
  ];
};

export const generateComplementary = (primary: HSL): HSL[] => {
  const compH = normalizeHue(primary.h + 180);
  return [
    { h: primary.h, s: primary.s, l: clamp(primary.l - 15, 10, 95) },
    { h: primary.h, s: primary.s, l: primary.l },
    { h: compH, s: primary.s, l: primary.l },
    { h: compH, s: primary.s, l: clamp(primary.l + 15, 10, 95) },
  ];
};

export const generateSplit = (primary: HSL): HSL[] => {
  const h1 = normalizeHue(primary.h + 150);
  const h2 = normalizeHue(primary.h + 210);
  return [
    { h: primary.h, s: primary.s, l: clamp(primary.l - 12, 10, 95) },
    { h: primary.h, s: primary.s, l: primary.l },
    { h: h1, s: primary.s, l: primary.l },
    { h: h2, s: primary.s, l: primary.l },
  ];
};

export const generateTriadic = (primary: HSL): HSL[] => {
  const h1 = normalizeHue(primary.h + 120);
  const h2 = normalizeHue(primary.h + 240);
  return [
    { h: primary.h, s: primary.s, l: primary.l },
    { h: h1, s: primary.s, l: primary.l },
    { h: h2, s: primary.s, l: primary.l },
    { h: h1, s: primary.s, l: clamp(primary.l + 15, 10, 95) },
  ];
};

export const generateTetradic = (primary: HSL): HSL[] => {
  const h1 = normalizeHue(primary.h + 90);
  const h2 = normalizeHue(primary.h + 180);
  const h3 = normalizeHue(primary.h + 270);
  return [
    { h: primary.h, s: primary.s, l: primary.l },
    { h: h1, s: primary.s, l: primary.l },
    { h: h2, s: primary.s, l: primary.l },
    { h: h3, s: primary.s, l: primary.l },
  ];
};

export const generateAllSchemes = (primary: HSL): ColorScheme[] => {
  return [
    {
      type: 'monochromatic',
      name: '单色',
      colors: generateMonochromatic(primary),
    },
    {
      type: 'complementary',
      name: '互补',
      colors: generateComplementary(primary),
    },
    {
      type: 'split',
      name: '分裂互补',
      colors: generateSplit(primary),
    },
    {
      type: 'triadic',
      name: '三角',
      colors: generateTriadic(primary),
    },
    {
      type: 'tetradic',
      name: '四色',
      colors: generateTetradic(primary),
    },
  ];
};

export const getContrastColor = (hex: string): string => {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#ffffff';
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.5 ? '#111827' : '#ffffff';
};

export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
};
