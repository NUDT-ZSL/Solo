import { Color, BaseColors } from './types';

export const BASE_COLORS: BaseColors[] = [
  { hex: '#FF3333', hue: 0 },
  { hex: '#FF8833', hue: 30 },
  { hex: '#FFFF33', hue: 60 },
  { hex: '#33FF33', hue: 120 },
  { hex: '#33FFFF', hue: 180 },
  { hex: '#3333FF', hue: 240 },
  { hex: '#8833FF', hue: 270 },
  { hex: '#FF33FF', hue: 300 },
];

export const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

export const lerp = (a: number, b: number, t: number): number => {
  return a + (b - a) * t;
};

export const randomRange = (min: number, max: number): number => {
  return Math.random() * (max - min) + min;
};

export const randomInt = (min: number, max: number): number => {
  return Math.floor(randomRange(min, max + 1));
};

export const hueDistance = (h1: number, h2: number): number => {
  let diff = Math.abs(h1 - h2) % 360;
  if (diff > 180) diff = 360 - diff;
  return diff;
};

export const weightedAverageHue = (hues: number[]): number => {
  if (hues.length === 0) return 0;
  let sinSum = 0;
  let cosSum = 0;
  const weights: number[] = [];
  for (let i = 0; i < hues.length; i++) {
    weights.push(i + 1);
  }
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < hues.length; i++) {
    const rad = (hues[i] * Math.PI) / 180;
    const w = weights[i] / totalWeight;
    sinSum += Math.sin(rad) * w;
    cosSum += Math.cos(rad) * w;
  }
  const avgRad = Math.atan2(sinSum, cosSum);
  let avgDeg = (avgRad * 180) / Math.PI;
  if (avgDeg < 0) avgDeg += 360;
  return avgDeg;
};

export const hslToCss = (h: number, s: number, l: number): string => {
  return `hsl(${h}, ${s}%, ${l}%)`;
};

export const hexToHsl = (hex: string): Color => {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
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
    hue: Math.round(h * 360),
    saturation: Math.round(s * 100),
    lightness: Math.round(l * 100),
  };
};

export const distance = (x1: number, y1: number, x2: number, y2: number): number => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
};

export const normalize = (x: number, y: number): { x: number; y: number } => {
  const len = Math.sqrt(x * x + y * y);
  if (len === 0) return { x: 0, y: 0 };
  return { x: x / len, y: y / len };
};

export const getComplementaryHue = (hue: number): number => {
  return (hue + 180) % 360;
};

export const getWarmCreatureHue = (): number => randomRange(0, 45);
export const getCoolCreatureHue = (): number => randomRange(210, 315);
