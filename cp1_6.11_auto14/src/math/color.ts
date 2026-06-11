export interface Color {
  r: number;
  g: number;
  b: number;
  a?: number;
}

export function color(r: number, g: number, b: number, a: number = 1): Color {
  return { r, g, b, a };
}

export function hexToColor(hex: string): Color {
  let h = hex.replace('#', '');
  if (h.length === 3) {
    h = h.split('').map(c => c + c).join('');
  }
  return {
    r: parseInt(h.substring(0, 2), 16) / 255,
    g: parseInt(h.substring(2, 4), 16) / 255,
    b: parseInt(h.substring(4, 6), 16) / 255,
    a: 1
  };
}

export function colorToHex(c: Color): string {
  const r = Math.round(Math.min(255, Math.max(0, c.r * 255)));
  const g = Math.round(Math.min(255, Math.max(0, c.g * 255)));
  const b = Math.round(Math.min(255, Math.max(0, c.b * 255)));
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

export function colorToRgba(c: Color, alpha?: number): string {
  const a = alpha !== undefined ? alpha : (c.a !== undefined ? c.a : 1);
  const r = Math.round(Math.min(255, Math.max(0, c.r * 255)));
  const g = Math.round(Math.min(255, Math.max(0, c.g * 255)));
  const b = Math.round(Math.min(255, Math.max(0, c.b * 255)));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export function colorLerp(a: Color, b: Color, t: number): Color {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
    a: (a.a || 1) + ((b.a || 1) - (a.a || 1)) * t
  };
}

export function colorMultiply(c: Color, factor: number): Color {
  return {
    r: Math.min(1, Math.max(0, c.r * factor)),
    g: Math.min(1, Math.max(0, c.g * factor)),
    b: Math.min(1, Math.max(0, c.b * factor)),
    a: c.a
  };
}

export function colorAdd(a: Color, b: Color): Color {
  return {
    r: Math.min(1, a.r + b.r),
    g: Math.min(1, a.g + b.g),
    b: Math.min(1, a.b + b.b),
    a: (a.a || 1) + (b.a || 1)
  };
}

export function getContrastColor(bgColor: Color): Color {
  const brightness = bgColor.r * 0.299 + bgColor.g * 0.587 + bgColor.b * 0.114;
  return brightness > 0.5
    ? { r: 0.1, g: 0.1, b: 0.1, a: 1 }
    : { r: 0.9, g: 0.9, b: 0.9, a: 1 };
}

export function createGradientColors(baseColor: Color, count: number): Color[] {
  const colors: Color[] = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const lightness = 0.5 + (t - 0.5) * 0.6;
    colors.push(colorMultiply(baseColor, lightness));
  }
  return colors;
}

export const ColorPresets = {
  cyan: hexToColor('#4FC3F7'),
  violet: hexToColor('#7C4DFF'),
  gold: hexToColor('#FFB74D'),
  red: hexToColor('#FF6B6B'),
  white: { r: 1, g: 1, b: 1, a: 1 },
  silver: hexToColor('#B0BEC5'),
  glass: { r: 0.8, g: 0.9, b: 1, a: 0.5 }
};
