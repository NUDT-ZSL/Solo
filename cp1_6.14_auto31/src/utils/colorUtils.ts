export interface HSL {
  readonly h: number;
  readonly s: number;
  readonly l: number;
}

export interface RGB {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

export type SchemeType =
  | 'monochromatic'
  | 'complementary'
  | 'split'
  | 'triadic'
  | 'tetradic';

export interface ColorScheme {
  readonly type: SchemeType;
  readonly name: string;
  readonly colors: ReadonlyArray<HSL>;
}

export interface FavoriteEntry {
  readonly id: string;
  readonly timestamp: number;
  readonly primary: HSL;
  readonly schemes: ReadonlyArray<ColorScheme>;
}

const isNumber = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v);

const clamp = (v: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, v));

export const validateHSL = (hsl: HSL): HSL => {
  const h = isNumber(hsl?.h) ? hsl.h : 0;
  const s = isNumber(hsl?.s) ? hsl.s : 0;
  const l = isNumber(hsl?.l) ? hsl.l : 0;
  const rawH = h % 360;
  return {
    h: clamp(Math.round(rawH < 0 ? rawH + 360 : rawH), 0, 359),
    s: clamp(Math.round(s), 0, 100),
    l: clamp(Math.round(l), 0, 100),
  };
};

export const validateRGB = (rgb: RGB): RGB => {
  const r = isNumber(rgb?.r) ? rgb.r : 0;
  const g = isNumber(rgb?.g) ? rgb.g : 0;
  const b = isNumber(rgb?.b) ? rgb.b : 0;
  return {
    r: clamp(Math.round(r), 0, 255),
    g: clamp(Math.round(g), 0, 255),
    b: clamp(Math.round(b), 0, 255),
  };
};

export const normalizeHue = (h: number): number => {
  if (!isNumber(h)) return 0;
  const normalized = h % 360;
  return normalized < 0 ? normalized + 360 : normalized;
};

export const hslToRgb = (input: HSL): RGB => {
  const hsl = validateHSL(input);
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

  return validateRGB({
    r: hue2rgb(p, q, h + 1 / 3) * 255,
    g: hue2rgb(p, q, h) * 255,
    b: hue2rgb(p, q, h - 1 / 3) * 255,
  });
};

export const rgbToHsl = (input: RGB): HSL => {
  const rgb = validateRGB(input);
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
        h = ((g - b) / delta + (g < b ? 6 : 0));
        h /= 6;
        break;
      case g:
        h = ((b - r) / delta + 2) / 6;
        break;
      case b:
        h = ((r - g) / delta + 4) / 6;
        break;
    }
  }

  return validateHSL({
    h: h * 360,
    s: s * 100,
    l: l * 100,
  });
};

export const rgbToHex = (input: RGB): string => {
  const rgb = validateRGB(input);
  const toHex = (n: number): string => {
    const hex = clamp(Math.round(n), 0, 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return ('#' + toHex(rgb.r) + toHex(rgb.g) + toHex(rgb.b)).toUpperCase();
};

export const hexToRgb = (hex: string): RGB | null => {
  if (typeof hex !== 'string') return null;
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!result) return null;
  return validateRGB({
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  });
};

export const hexToHsl = (hex: string): HSL | null => {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  return rgbToHsl(rgb);
};

export const hslToHex = (hsl: HSL): string => rgbToHex(hslToRgb(hsl));

export const hslToString = (input: HSL): string => {
  const hsl = validateHSL(input);
  return `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
};

export const rgbToString = (input: RGB): string => {
  const rgb = validateRGB(input);
  return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
};

export const generateMonochromatic = (input: HSL): ReadonlyArray<HSL> => {
  const primary = validateHSL(input);
  return [
    validateHSL({ h: primary.h, s: primary.s, l: primary.l - 25 }),
    validateHSL({ h: primary.h, s: primary.s, l: primary.l - 12 }),
    primary,
    validateHSL({ h: primary.h, s: primary.s, l: primary.l + 15 }),
  ] as const;
};

export const generateComplementary = (input: HSL): ReadonlyArray<HSL> => {
  const primary = validateHSL(input);
  const compH = normalizeHue(primary.h + 180);
  return [
    validateHSL({ h: primary.h, s: primary.s, l: primary.l - 15 }),
    primary,
    validateHSL({ h: compH, s: primary.s, l: primary.l }),
    validateHSL({ h: compH, s: primary.s, l: primary.l + 15 }),
  ] as const;
};

export const generateSplit = (input: HSL): ReadonlyArray<HSL> => {
  const primary = validateHSL(input);
  const h1 = normalizeHue(primary.h + 150);
  const h2 = normalizeHue(primary.h + 210);
  return [
    validateHSL({ h: primary.h, s: primary.s, l: primary.l - 12 }),
    primary,
    validateHSL({ h: h1, s: primary.s, l: primary.l }),
    validateHSL({ h: h2, s: primary.s, l: primary.l }),
  ] as const;
};

export const generateTriadic = (input: HSL): ReadonlyArray<HSL> => {
  const primary = validateHSL(input);
  const h1 = normalizeHue(primary.h + 120);
  const h2 = normalizeHue(primary.h + 240);
  return [
    primary,
    validateHSL({ h: h1, s: primary.s, l: primary.l }),
    validateHSL({ h: h2, s: primary.s, l: primary.l }),
    validateHSL({ h: h1, s: primary.s, l: primary.l + 15 }),
  ] as const;
};

export const generateTetradic = (input: HSL): ReadonlyArray<HSL> => {
  const primary = validateHSL(input);
  const h1 = normalizeHue(primary.h + 90);
  const h2 = normalizeHue(primary.h + 180);
  const h3 = normalizeHue(primary.h + 270);
  return [
    primary,
    validateHSL({ h: h1, s: primary.s, l: primary.l }),
    validateHSL({ h: h2, s: primary.s, l: primary.l }),
    validateHSL({ h: h3, s: primary.s, l: primary.l }),
  ] as const;
};

export const generateAllSchemes = (primary: HSL): ReadonlyArray<ColorScheme> => {
  const p = validateHSL(primary);
  return [
    { type: 'monochromatic', name: '单色', colors: generateMonochromatic(p) },
    { type: 'complementary', name: '互补', colors: generateComplementary(p) },
    { type: 'split', name: '分裂互补', colors: generateSplit(p) },
    { type: 'triadic', name: '三角', colors: generateTriadic(p) },
    { type: 'tetradic', name: '四色', colors: generateTetradic(p) },
  ] as const;
};

export const getContrastColor = (hex: string): string => {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#ffffff';
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.5 ? '#111827' : '#ffffff';
};

export const generateId = (): string =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 9);

export const copyToClipboard = async (text: string): Promise<boolean> => {
  if (typeof text !== 'string') return false;
  try {
    if (
      typeof navigator !== 'undefined' &&
      navigator.clipboard &&
      typeof navigator.clipboard.writeText &&
      window.isSecureContext
    ) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fallback
  }
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '-100vh';
    textarea.style.left = '-100vw';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    const ok = document.execCommand && document.execCommand('copy');
    document.body.removeChild(textarea);
    return !!ok;
  } catch {
    return false;
  }
};
