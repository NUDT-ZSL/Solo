export interface ColorStop {
  id: string;
  color: string;
  position: number;
}

export type GradientType = 'linear' | 'radial';

export interface GradientConfig {
  type: GradientType;
  stops: ColorStop[];
  angle: number;
  shape: 'circle' | 'ellipse';
}

export interface PresetGradient {
  id: string;
  name: string;
  type: GradientType;
  stops: ColorStop[];
  angle?: number;
  shape?: 'circle' | 'ellipse';
}

export interface FavoriteGradient extends GradientConfig {
  id: string;
  name: string;
  createdAt: number;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const hex = Math.max(0, Math.min(255, Math.round(n))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export function hslToHex(h: number, s: number, l: number): string {
  h /= 360;
  s /= 100;
  l /= 100;

  let r: number, g: number, b: number;

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

  return rgbToHex(r * 255, g * 255, b * 255);
}

export function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  return rgbToHsl(rgb.r, rgb.g, rgb.b);
}

export function isValidHex(color: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
}

export function normalizeHex(color: string): string {
  let hex = color.trim();
  if (!hex.startsWith('#')) {
    hex = '#' + hex;
  }
  if (hex.length === 4) {
    hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
  }
  return hex.toLowerCase();
}

export function generateGradientCSS(config: GradientConfig): string {
  const sortedStops = [...config.stops].sort((a, b) => a.position - b.position);
  const stopStr = sortedStops
    .map((stop) => `${stop.color} ${stop.position}%`)
    .join(', ');

  if (config.type === 'linear') {
    return `linear-gradient(${config.angle}deg, ${stopStr})`;
  } else {
    return `radial-gradient(${config.shape}, ${stopStr})`;
  }
}

export function generateGradientCode(config: GradientConfig): string {
  const gradient = generateGradientCSS(config);
  return `.gradient {
  background: ${gradient};
  width: 100%;
  height: 100%;
}`;
}

export function lerpColor(color1: string, color2: string, t: number): string {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  if (!rgb1 || !rgb2) return color1;

  const r = rgb1.r + (rgb2.r - rgb1.r) * t;
  const g = rgb1.g + (rgb2.g - rgb1.g) * t;
  const b = rgb1.b + (rgb2.b - rgb1.b) * t;

  return rgbToHex(r, g, b);
}

export function lerpStops(
  stops1: ColorStop[],
  stops2: ColorStop[],
  t: number
): ColorStop[] {
  const len = Math.max(stops1.length, stops2.length);
  const result: ColorStop[] = [];

  for (let i = 0; i < len; i++) {
    const s1 = stops1[i] || stops1[stops1.length - 1];
    const s2 = stops2[i] || stops2[stops2.length - 1];
    result.push({
      id: s1.id,
      color: lerpColor(s1.color, s2.color, t),
      position: s1.position + (s2.position - s1.position) * t,
    });
  }

  return result;
}

export function lerpAngle(a1: number, a2: number, t: number): number {
  let diff = a2 - a1;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return a1 + diff * t;
}

export const presetGradients: PresetGradient[] = [
  {
    id: 'sunrise',
    name: '日出',
    type: 'linear',
    angle: 180,
    stops: [
      { id: 's1', color: '#ff512f', position: 0 },
      { id: 's2', color: '#f09819', position: 50 },
      { id: 's3', color: '#dd2476', position: 100 },
    ],
  },
  {
    id: 'ocean',
    name: '海洋',
    type: 'linear',
    angle: 180,
    stops: [
      { id: 's1', color: '#2193b0', position: 0 },
      { id: 's2', color: '#6dd5ed', position: 50 },
      { id: 's3', color: '#2193b0', position: 100 },
    ],
  },
  {
    id: 'aurora',
    name: '极光',
    type: 'linear',
    angle: 135,
    stops: [
      { id: 's1', color: '#00c9ff', position: 0 },
      { id: 's2', color: '#92fe9d', position: 50 },
      { id: 's3', color: '#00c9ff', position: 100 },
    ],
  },
  {
    id: 'neon',
    name: '霓虹',
    type: 'linear',
    angle: 90,
    stops: [
      { id: 's1', color: '#ff00cc', position: 0 },
      { id: 's2', color: '#333399', position: 50 },
      { id: 's3', color: '#00ccff', position: 100 },
    ],
  },
  {
    id: 'vintage',
    name: '复古',
    type: 'linear',
    angle: 45,
    stops: [
      { id: 's1', color: '#d4a574', position: 0 },
      { id: 's2', color: '#c9a27a', position: 50 },
      { id: 's3', color: '#8b6f47', position: 100 },
    ],
  },
  {
    id: 'sunset',
    name: '日落',
    type: 'linear',
    angle: 180,
    stops: [
      { id: 's1', color: '#ff6b6b', position: 0 },
      { id: 's2', color: '#feca57', position: 50 },
      { id: 's3', color: '#ff9ff3', position: 100 },
    ],
  },
  {
    id: 'forest',
    name: '森林',
    type: 'linear',
    angle: 180,
    stops: [
      { id: 's1', color: '#134e5e', position: 0 },
      { id: 's2', color: '#71b280', position: 50 },
      { id: 's3', color: '#134e5e', position: 100 },
    ],
  },
  {
    id: 'starry',
    name: '星空',
    type: 'radial',
    shape: 'circle',
    stops: [
      { id: 's1', color: '#0f0c29', position: 0 },
      { id: 's2', color: '#302b63', position: 50 },
      { id: 's3', color: '#24243e', position: 100 },
    ],