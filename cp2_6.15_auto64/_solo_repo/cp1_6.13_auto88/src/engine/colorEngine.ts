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

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function getLuminance([r, g, b]: [number, number, number]): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function getContrastRatio(color1: string, color2: string): number {
  const lum1 = getLuminance(hexToRgb(color1)) / 255;
  const lum2 = getLuminance(hexToRgb(color2)) / 255;
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

function getLightness(hour: number): number {
  const normalized = (hour - 6) / 24;
  const angle = normalized * Math.PI * 2;
  return 0.42 + 0.22 * Math.sin(angle);
}

function getSaturation(hour: number): number {
  const isDaytime = hour >= 6 && hour <= 18;
  if (isDaytime) {
    const transition = Math.sin(((hour - 6) / 12) * Math.PI);
    return 0.6 + 0.18 * transition;
  } else {
    const nightProgress = hour < 6 ? (hour + 6) / 12 : (hour - 18) / 12;
    return 0.6 - 0.15 * Math.sin(nightProgress * Math.PI);
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

  const isDarkMode = lightness < 0.45;

  const primaryHue = baseHue;
  const secondaryHue = (baseHue + 32) % 360;
  const accentHue = (baseHue + 180) % 360;

  const primaryLightness = isDarkMode
    ? Math.max(lightness + 0.12, 0.28)
    : lightness;
  const secondaryLightness = isDarkMode
    ? Math.max(lightness + 0.08, 0.32)
    : Math.min(lightness * 0.95, 0.82);
  const accentLightness = isDarkMode
    ? Math.max(lightness + 0.18, 0.42)
    : Math.min(Math.max(lightness + 0.05, 0.35), 0.78);

  let primary = hslToHex(primaryHue, saturation, primaryLightness);
  const secondary = hslToHex(secondaryHue, saturation * 0.9, secondaryLightness);
  const accent = hslToHex(accentHue, Math.min(saturation * 1.05, 0.9), accentLightness);

  const bgLightness = isDarkMode ? 0.07 : 0.96;
  const bgSaturation = Math.min(saturation * 0.1, 0.08);
  let background = hslToHex(baseHue, bgSaturation, bgLightness);

  const contrast = getContrastRatio(primary, background);
  if (contrast < 3.5) {
    if (isDarkMode) {
      primary = hslToHex(primaryHue, Math.min(saturation + 0.1, 0.85), 0.5);
      background = hslToHex(baseHue, bgSaturation, 0.05);
    } else {
      primary = hslToHex(primaryHue, saturation, 0.35);
      background = hslToHex(baseHue, bgSaturation, 0.98);
    }
  }

  const textLightness = isDarkMode ? 0.92 : 0.1;
  const text = hslToHex(baseHue, Math.min(saturation * 0.2, 0.15), textLightness);

  return [primary, secondary, accent, background, text];
}

export function validatePalette(): { pass: boolean; results: string[] } {
  const results: string[] = [];

  const midnightColors = generateColorPalette(0);
  const noonColors = generateColorPalette(12);
  const sunriseColors = generateColorPalette(6);
  const sunsetColors = generateColorPalette(18);

  const midnightBgLum = getLuminance(hexToRgb(midnightColors[3]));
  const noonBgLum = getLuminance(hexToRgb(noonColors[3]));

  results.push(`0点 (午夜) 背景亮度: ${midnightBgLum.toFixed(1)} (目标: <80深色)`);
  results.push(`12点 (正午) 背景亮度: ${noonBgLum.toFixed(1)} (目标: >200亮色)`);

  if (midnightBgLum > 80) {
    results.push(`✗ 失败: 0点背景色过亮 (${midnightBgLum.toFixed(1)} > 80)`);
  } else {
    results.push('✓ 通过: 0点背景色为深色系');
  }

  if (noonBgLum < 180) {
    results.push(`✗ 失败: 12点背景色过暗 (${noonBgLum.toFixed(1)} < 180)`);
  } else {
    results.push('✓ 通过: 12点背景色为亮色系');
  }

  if (midnightBgLum > noonBgLum) {
    results.push('✗ 失败: 0点背景亮度高于12点，亮度曲线异常');
  } else {
    results.push('✓ 通过: 亮度曲线正常（正午>午夜）');
  }

  const keyMoments = [
    { name: '午夜(0点)', colors: midnightColors },
    { name: '日出(6点)', colors: sunriseColors },
    { name: '正午(12点)', colors: noonColors },
    { name: '日落(18点)', colors: sunsetColors },
  ];

  for (const moment of keyMoments) {
    const primaryContrast = getContrastRatio(moment.colors[0], moment.colors[3]);
    const textContrast = getContrastRatio(moment.colors[4], moment.colors[3]);

    results.push(`${moment.name}: 主色-背景对比度=${primaryContrast.toFixed(2)}, 文字-背景对比度=${textContrast.toFixed(2)}`);

    if (primaryContrast < 3) {
      results.push(`  ✗ 警告: 主色对比度不足 (${primaryContrast.toFixed(2)} < 3)`);
    } else {
      results.push(`  ✓ 通过: 主色对比度充足`);
    }

    if (textContrast < 4.5) {
      results.push(`  ✗ 警告: 文字对比度不足 (${textContrast.toFixed(2)} < 4.5)`);
    } else {
      results.push(`  ✓ 通过: 文字对比度充足`);
    }
  }

  results.push('\n配色方案样例:');
  results.push(`  0点: ${midnightColors.map(c => c.toUpperCase()).join(' | ')}`);
  results.push(`  6点: ${sunriseColors.map(c => c.toUpperCase()).join(' | ')}`);
  results.push(`  12点: ${noonColors.map(c => c.toUpperCase()).join(' | ')}`);
  results.push(`  18点: ${sunsetColors.map(c => c.toUpperCase()).join(' | ')}`);

  const pass = midnightBgLum < 80 && noonBgLum >= 180 && midnightBgLum <= noonBgLum;

  return { pass, results };
}
