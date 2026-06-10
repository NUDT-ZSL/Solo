import { EmotionType, EMOTION_COLORS } from '../types';

/** HEX颜色转RGB */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  return {
    r: parseInt(clean.substring(0, 2), 16),
    g: parseInt(clean.substring(2, 4), 16),
    b: parseInt(clean.substring(4, 6), 16)
  };
}

/** RGB转HSL辅助：用于平滑色阶 */
function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255; g /= 255; b /= 255;
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

/** HSL转RGB辅助 */
function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h /= 360; s /= 100; l /= 100;
  let r, g, b;
  if (s === 0) { r = g = b = l; }
  else {
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

/**
 * HSL插值：在两个颜色间平滑过渡（比纯RGB插值更自然）
 * @param color1 起始色HEX (浅灰蓝 #D0D8E8)
 * @param color2 结束色HEX (深紫红 #8B2252)
 * @param t 插值因子 0~1
 */
export function interpolateHsl(color1: string, color2: string, t: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  const hsl1 = rgbToHsl(c1.r, c1.g, c1.b);
  const hsl2 = rgbToHsl(c2.r, c2.g, c2.b);
  const h = hsl1.h + (hsl2.h - hsl1.h) * t;
  const s = hsl1.s + (hsl2.s - hsl1.s) * t;
  const l = hsl1.l + (hsl2.l - hsl1.l) * t;
  const { r, g, b } = hslToRgb(h, s, l);
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * ★★★ 热力图色阶计算函数 ★★★
 * 根据故事数量计算：浅灰蓝(#D0D8E8, 0条) → 深紫红(#8B2252, 5条+)
 * 使用HSL平滑插值，0~5条之间分为6个色阶
 */
export function getHeatmapColor(count: number): string {
  const MAX = 5;
  const normalized = Math.max(0, Math.min(count, MAX)) / MAX; // 0 ~ 1
  return interpolateHsl('#D0D8E8', '#8B2252', normalized);
}

/**
 * ★★★ 情绪色光晕生成函数 ★★★
 * 根据情绪标签颜色生成 box-shadow 光晕
 * @param emotion 情绪类型
 * @param hovered 是否悬停：悬停时光晕亮度增加50%
 */
export function getEmotionGlow(emotion: EmotionType, hovered: boolean = false): string {
  const color = EMOTION_COLORS[emotion];
  const { r, g, b } = hexToRgb(color);
  // 悬停时光晕强度(透明度)增加50%
  const baseAlpha = hovered ? 0.75 : 0.5;       // 内层光晕 +50%
  const outerAlpha = hovered ? 0.375 : 0.25;    // 外层光晕 +50%
  const radius1 = hovered ? 28 : 18;             // 悬停时光晕范围略大
  const radius2 = hovered ? 56 : 36;
  return `0 0 ${radius1}px rgba(${r},${g},${b},${baseAlpha}), 0 0 ${radius2}px rgba(${r},${g},${b},${outerAlpha})`;
}
