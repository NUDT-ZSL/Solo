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

export function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((x) => {
        const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      })
      .join('')
  );
}

export function lerpColor(color1: string, color2: string, t: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  return rgbToHex(
    c1.r + (c2.r - c1.r) * t,
    c1.g + (c2.g - c1.g) * t,
    c1.b + (c2.b - c1.b) * t
  );
}

export function getConversionRateColor(rate: number, minRate = 0.01, maxRate = 0.06): string {
  const lowColor = '#e74c3c';
  const midColor = '#f1c40f';
  const highColor = '#2ecc71';

  const t = Math.max(0, Math.min(1, (rate - minRate) / (maxRate - minRate)));

  if (t < 0.5) {
    return lerpColor(lowColor, midColor, t * 2);
  } else {
    return lerpColor(midColor, highColor, (t - 0.5) * 2);
  }
}

export function getConversionRateBgColor(
  rate: number,
  minRate = 0.01,
  maxRate = 0.06
): string {
  const baseColor = getConversionRateColor(rate, minRate, maxRate);
  const rgb = hexToRgb(baseColor);
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`;
}

export const CHART_COLORS = [
  '#E74C3C',
  '#3498DB',
  '#2ECC71',
  '#F39C12',
  '#9B59B6',
  '#1ABC9C',
  '#E67E22',
  '#34495E',
  '#E91E63',
  '#00BCD4',
];
