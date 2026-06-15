import type { MoodType } from '../types';

export const MOOD_COLORS: Record<MoodType, string> = {
  happy: '#FFD700',
  calm: '#7EC8E3',
  melancholy: '#6C5CE7',
  anger: '#FF6B6B',
  anxiety: '#A29BFE',
};

export const MOOD_COLORS_RGB: Record<MoodType, { r: number; g: number; b: number }> = {
  happy: { r: 255, g: 215, b: 0 },
  calm: { r: 126, g: 200, b: 227 },
  melancholy: { r: 108, g: 92, b: 231 },
  anger: { r: 255, g: 107, b: 107 },
  anxiety: { r: 162, g: 155, b: 254 },
};

export function getMoodGradient(mood: MoodType): string {
  const color = MOOD_COLORS[mood];
  return `linear-gradient(135deg, ${color}80 0%, ${color}FF 50%, ${color}80 100%)`;
}

export function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
