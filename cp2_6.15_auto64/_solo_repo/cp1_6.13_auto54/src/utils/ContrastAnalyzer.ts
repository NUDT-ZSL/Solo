import { hexToRgb, RGB } from './ColorCalculator';

export interface ContrastResult {
  ratio: number;
  level: 'AAA' | 'AA' | 'Fail';
  normalText: 'AAA' | 'AA' | 'Fail';
  largeText: 'AAA' | 'AA' | 'Fail';
}

function luminance(rgb: RGB): number {
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(c => {
    const srgb = c / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function getContrastRatio(color1: string, color2: string): number {
  const l1 = luminance(hexToRgb(color1));
  const l2 = luminance(hexToRgb(color2));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function getWCAGLevel(ratio: number, isLargeText: boolean = false): 'AAA' | 'AA' | 'Fail' {
  if (isLargeText) {
    if (ratio >= 4.5) return 'AAA';
    if (ratio >= 3) return 'AA';
    return 'Fail';
  } else {
    if (ratio >= 7) return 'AAA';
    if (ratio >= 4.5) return 'AA';
    return 'Fail';
  }
}

export function analyzeContrast(foreground: string, background: string): ContrastResult {
  const ratio = getContrastRatio(foreground, background);
  const roundedRatio = Math.round(ratio * 100) / 100;
  const normalText = getWCAGLevel(ratio, false);
  const largeText = getWCAGLevel(ratio, true);
  const level = normalText === 'AAA' ? 'AAA' : normalText === 'AA' ? 'AA' : 'Fail';
  return {
    ratio: roundedRatio,
    level,
    normalText,
    largeText
  };
}

export function formatRatio(ratio: number): string {
  return `${ratio.toFixed(2)}:1`;
}
