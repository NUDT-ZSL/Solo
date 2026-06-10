import { EmotionType, EMOTION_COLORS } from '../types';

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : { r: 0, g: 0, b: 0 };
}

export function interpolateColor(color1: string, color2: string, t: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  const r = Math.round(c1.r + (c2.r - c1.r) * t);
  const g = Math.round(c1.g + (c2.g - c1.g) * t);
  const b = Math.round(c1.b + (c2.b - c1.b) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

export function getHeatmapColor(count: number): string {
  const maxCount = 5;
  const t = Math.min(count / maxCount, 1);
  return interpolateColor('#D0D8E8', '#8B2252', t);
}

export function getEmotionGlow(emotion: EmotionType, intensity: number = 0.5): string {
  const color = EMOTION_COLORS[emotion];
  const { r, g, b } = hexToRgb(color);
  return `0 0 20px rgba(${r}, ${g}, ${b}, ${intensity}), 0 0 40px rgba(${r}, ${g}, ${b}, ${intensity * 0.5})`;
}
