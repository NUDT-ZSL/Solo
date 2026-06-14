export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(1, s));
  l = Math.max(0, Math.min(1, l));

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }

  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}

export function hslToHex(h: number, s: number, l: number): string {
  const [r, g, b] = hslToRgb(h, s, l);
  return rgbToHex(r, g, b);
}

export function hexToHsl(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [0, 0, 0];

  const r = parseInt(result[1], 16) / 255;
  const g = parseInt(result[2], 16) / 255;
  const b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g) h = ((b - r) / d + 2) * 60;
    else h = ((r - g) / d + 4) * 60;
  }

  return [h, s, l];
}

function generateScheme(baseHue: number, offsets: number[], saturation: number, lightness: number): string[] {
  return offsets.map((offset) => {
    const hue = (baseHue + offset + 360) % 360;
    return hslToHex(hue, saturation, lightness);
  });
}

export function generateComplementary(hue: number, saturation: number, lightness: number): string[] {
  return generateScheme(hue, [0, 15, 180, 195, 345], saturation, lightness);
}

export function generateAnalogous(hue: number, saturation: number, lightness: number): string[] {
  return generateScheme(hue, [0, 30, 60, 330, 300], saturation, lightness);
}

export function generateTriadic(hue: number, saturation: number, lightness: number): string[] {
  return generateScheme(hue, [0, 15, 120, 240, 255], saturation, lightness);
}

export function generateTetradic(hue: number, saturation: number, lightness: number): string[] {
  return generateScheme(hue, [0, 15, 90, 180, 270], saturation, lightness);
}

export function generateAllSchemes(hue: number, saturation: number, lightness: number): Record<string, string[]> {
  return {
    complementary: generateComplementary(hue, saturation, lightness),
    analogous: generateAnalogous(hue, saturation, lightness),
    triadic: generateTriadic(hue, saturation, lightness),
    tetradic: generateTetradic(hue, saturation, lightness),
  };
}
