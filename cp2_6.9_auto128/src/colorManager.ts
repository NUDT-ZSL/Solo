export interface RGB {
  r: number;
  g: number;
  b: number;
}

const PALETTE: RGB[] = [
  { r: 231, g: 76, b: 60 },
  { r: 230, g: 126, b: 34 },
  { r: 241, g: 196, b: 15 },
  { r: 46, g: 204, b: 113 },
  { r: 26, g: 188, b: 156 },
  { r: 52, g: 152, b: 219 },
  { r: 155, g: 89, b: 182 },
  { r: 230, g: 73, b: 128 },
  { r: 244, g: 162, b: 97 },
  { r: 127, g: 179, b: 213 },
];

export function getPalette(): string[] {
  return PALETTE.map(rgbToHex);
}

export function getRandomColor(): string {
  const idx = Math.floor(Math.random() * PALETTE.length);
  return rgbToHex(PALETTE[idx]);
}

export function getPaletteColor(index: number): string {
  const clamped = Math.max(0, Math.min(PALETTE.length - 1, index));
  return rgbToHex(PALETTE[clamped]);
}

export function rgbToHex(rgb: RGB): string {
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

export function hexToRgb(hex: string): RGB {
  const clean = hex.replace('#', '');
  return {
    r: parseInt(clean.substring(0, 2), 16),
    g: parseInt(clean.substring(2, 4), 16),
    b: parseInt(clean.substring(4, 6), 16),
  };
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
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
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
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
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

export function blendColors(color1: string, color2: string, saturationBoost: number = 15): string {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  const hsl1 = rgbToHsl(rgb1.r, rgb1.g, rgb1.b);
  const hsl2 = rgbToHsl(rgb2.r, rgb2.g, rgb2.b);

  const avgH = (hsl1.h + hsl2.h) / 2;
  const avgS = Math.min(100, (hsl1.s + hsl2.s) / 2 + saturationBoost);
  const avgL = (hsl1.l + hsl2.l) / 2;

  const blended = hslToRgb(avgH, avgS, avgL);
  return rgbToHex(blended);
}

export function mixColor(color1: string, color2: string, ratio: number = 0.5): string {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  const r = Math.round(rgb1.r + (rgb2.r - rgb1.r) * ratio);
  const g = Math.round(rgb1.g + (rgb2.g - rgb1.g) * ratio);
  const b = Math.round(rgb1.b + (rgb2.b - rgb1.b) * ratio);
  return rgbToHex({ r, g, b });
}

export function rgbaString(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}
