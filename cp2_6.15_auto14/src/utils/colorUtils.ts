import { RGB } from '../types';

export function rgbToString(color: RGB): string {
  if (color.a !== undefined) {
    return `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;
  }
  return `rgb(${color.r}, ${color.g}, ${color.b})`;
}

export function rgbToHex(color: RGB): string {
  const r = color.r.toString(16).padStart(2, '0');
  const g = color.g.toString(16).padStart(2, '0');
  const b = color.b.toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

export function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16)
  };
}

export function colorsEqual(a: RGB | null, b: RGB | null): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  return a.r === b.r && a.g === b.g && a.b === b.b;
}

export function darkenColor(color: RGB, percent: number): RGB {
  return {
    r: Math.max(0, Math.floor(color.r * (1 - percent))),
    g: Math.max(0, Math.floor(color.g * (1 - percent))),
    b: Math.max(0, Math.floor(color.b * (1 - percent)))
  };
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}
