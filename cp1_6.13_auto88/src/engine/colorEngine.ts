function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
  else if (h >= 60 && h < 120) { r = x; g = c; b = 0; }
  else if (h >= 120 && h < 180) { r = 0; g = c; b = x; }
  else if (h >= 180 && h < 240) { r = 0; g = x; b = c; }
  else if (h >= 240 && h < 300) { r = x; g = 0; b = c; }
  else if (h >= 300 && h < 360) { r = c; g = 0; b = x; }

  const toHex = (n: number) => {
    const hex = Math.round((n + m) * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function getLightness(hour: number): number {
  const normalized = (hour - 6) / 24;
  const angle = normalized * Math.PI * 2;
  return 0.45 + 0.22 * Math.sin(angle);
}

function getSaturation(hour: number): number {
  const isDaytime = hour >= 6 && hour <= 18;
  if (isDaytime) {
    const transition = Math.sin(((hour - 6) / 12) * Math.PI);
    return 0.58 + 0.18 * transition;
  } else {
    const nightProgress = hour < 6 ? (hour + 6) / 12 : (hour - 18) / 12;
    return 0.58 - 0.18 * Math.sin(nightProgress * Math.PI);
  }
}

function getBaseHue(hour: number): number {
  return (hour / 24) * 360;
}

export function generateColorPalette(hour: number): [string, string, string, string, string] {
  const clampedHour = Math.max(0, Math.min(23.999, hour));
  const baseHue = getBaseHue(clampedHour);
  const lightness = getLightness(clampedHour);
  const saturation = getSaturation(clampedHour);

  const primaryHue = baseHue;
  const secondaryHue = (baseHue + 32) % 360;
  const accentHue = (baseHue + 180) % 360;

  const primary = hslToHex(primaryHue, saturation, lightness);
  const secondary = hslToHex(secondaryHue, saturation * 0.9, Math.min(lightness * 0.97, 0.92));
  const accent = hslToHex(accentHue, Math.min(saturation * 1.05, 0.9), Math.min(Math.max(lightness * 1.05, 0.3), 0.85));

  const isDarkMode = lightness < 0.45;
  const bgLightness = isDarkMode ? 0.08 + (lightness * 0.15) : 0.96 - ((0.7 - lightness) * 0.1);
  const bgSaturation = Math.min(saturation * 0.12, 0.1);
  const background = hslToHex(baseHue, bgSaturation, bgLightness);

  const textLightness = isDarkMode ? 0.9 : 0.12;
  const text = hslToHex(baseHue, Math.min(saturation * 0.25, 0.2), textLightness);

  return [primary, secondary, accent, background, text];
}

export function validatePalette(): void {
  const midnightColors = generateColorPalette(0);
  const noonColors = generateColorPalette(12);

  const hexToRgb = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b];
  };

  const getLuminance = ([r, g, b]: number[]) => {
    return 0.299 * r + 0.587 * g + 0.114 * b;
  };

  const midnightBgLum = getLuminance(hexToRgb(midnightColors[3]));
  const noonBgLum = getLuminance(hexToRgb(noonColors[3]));

  if (midnightBgLum > noonBgLum) {
    console.warn('配色引擎警告: 0点背景亮度高于12点，请检查亮度曲线');
  }

  if (midnightBgLum > 100) {
    console.warn('配色引擎警告: 0点背景色过亮，夜间模式应该是深色');
  }

  if (noonBgLum < 150) {
    console.warn('配色引擎警告: 12点背景色过暗，白天模式应该是亮色');
  }

  const midnightPrimaryLum = getLuminance(hexToRgb(midnightColors[0]));
  const contrast = Math.abs(midnightBgLum - midnightPrimaryLum);
  if (contrast < 30) {
    console.warn('配色引擎警告: 0点主色与背景对比度不足');
  }
}
