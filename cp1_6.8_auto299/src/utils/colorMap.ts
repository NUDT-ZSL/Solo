export type EmotionType = 'joy' | 'calm' | 'anxiety' | 'sadness' | 'anger';

export const EMOTION_LABELS: Record<EmotionType, string> = {
  joy: '愉悦',
  calm: '平静',
  anxiety: '焦虑',
  sadness: '悲伤',
  anger: '愤怒',
};

export const EMOTIONS: EmotionType[] = ['joy', 'calm', 'anxiety', 'sadness', 'anger'];

interface ColorDef {
  main: string;
  light: string;
  dark: string;
  glow: string;
}

const COLOR_MAP: Record<EmotionType, ColorDef> = {
  joy: {
    main: '#FFD93D',
    light: '#FFE873',
    dark: '#E6C235',
    glow: 'rgba(255,217,61,0.5)',
  },
  calm: {
    main: '#6BCB77',
    light: '#8ED99A',
    dark: '#5AB868',
    glow: 'rgba(107,203,119,0.5)',
  },
  anxiety: {
    main: '#FF6B6B',
    light: '#FF9B9B',
    dark: '#E65C5C',
    glow: 'rgba(255,107,107,0.5)',
  },
  sadness: {
    main: '#4D96FF',
    light: '#79B0FF',
    dark: '#3D7FE6',
    glow: 'rgba(77,150,255,0.5)',
  },
  anger: {
    main: '#C74B50',
    light: '#D97276',
    dark: '#B03E43',
    glow: 'rgba(199,75,80,0.5)',
  },
};

export function getEmotionColor(emotion: EmotionType): ColorDef {
  return COLOR_MAP[emotion];
}

export function getEmotionMainColor(emotion: EmotionType): string {
  return COLOR_MAP[emotion].main;
}

export function getEmotionGlow(emotion: EmotionType): string {
  return COLOR_MAP[emotion].glow;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

export function interpolateColor(
  c1: string,
  c2: string,
  t: number
): string {
  const a = hexToRgb(c1);
  const b = hexToRgb(c2);
  const r = Math.round(a.r + (b.r - a.r) * t);
  const g = Math.round(a.g + (b.g - a.g) * t);
  const bl = Math.round(a.b + (b.b - a.b) * t);
  return `rgb(${r},${g},${bl})`;
}
