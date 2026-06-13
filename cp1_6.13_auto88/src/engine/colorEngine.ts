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
  return 0.5 + 0.25 * Math.sin(angle);
}

function getSaturation(hour: number): number {
  const isDaytime = hour >= 6 && hour <= 18;
  if (isDaytime) {
    const transition = Math.sin(((hour - 6) / 12) * Math.PI);
    return 0.55 + 0.2 * transition;
  } else {
    const nightProgress = hour < 6 ? (hour + 6) / 12 : (hour - 18) / 12;
    return 0.55 - 0.15 * Math.sin(nightProgress * Math.PI);
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
  const secondaryHue = (baseHue + 30) % 360;
  const accentHue = (baseHue + 180) % 360;

  const primary = hslToHex(primaryHue, saturation, lightness);
  const secondary = hslToHex(secondaryHue, saturation * 0.9, lightness * 0.95);
  const accent = hslToHex(accentHue, saturation * 1.1, Math.min(lightness * 1.1, 0.9));

  const bgLightness = lightness > 0.5 ? 0.95 : 0.1;
  const bgSaturation = saturation * 0.1;
  const background = hslToHex(baseHue, bgSaturation, bgLightness);

  const textLightness = lightness > 0.5 ? 0.15 : 0.9;
  const text = hslToHex(baseHue, saturation * 0.2, textLightness);

  return [primary, secondary, accent, background, text];
}
