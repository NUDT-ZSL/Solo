export interface HSL {
  h: number;
  s: number;
  l: number;
}

export const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255,
      }
    : { r: 0, g: 0, b: 0 };
};

export const rgbToHex = (r: number, g: number, b: number): string => {
  return (
    '#' +
    [r, g, b]
      .map((x) => {
        const hex = Math.round(x * 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      })
      .join('')
  );
};

export const rgbToHsl = (r: number, g: number, b: number): HSL => {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0,
    s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return { h, s, l };
};

export const hslToRgb = (h: number, s: number, l: number): { r: number; g: number; b: number } => {
  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
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

  return { r, g, b };
};

export const hexToHsl = (hex: string): HSL => {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHsl(r, g, b);
};

export const hslToHex = (h: number, s: number, l: number): string => {
  const { r, g, b } = hslToRgb(h, s, l);
  return rgbToHex(r, g, b);
};

export const lerpHsl = (start: HSL, end: HSL, t: number): HSL => {
  let dh = end.h - start.h;
  if (Math.abs(dh) > 0.5) {
    dh = dh > 0 ? dh - 1 : dh + 1;
  }
  return {
    h: (start.h + dh * t + 1) % 1,
    s: start.s + (end.s - start.s) * t,
    l: start.l + (end.l - start.l) * t,
  };
};

export const lerpHexColors = (startHex: string, endHex: string, t: number): string => {
  const startHsl = hexToHsl(startHex);
  const endHsl = hexToHsl(endHex);
  const interpolated = lerpHsl(startHsl, endHsl, t);
  return hslToHex(interpolated.h, interpolated.s, interpolated.l);
};

export const generateRandomColor = (): string => {
  const h = Math.random();
  const s = 0.4 + Math.random() * 0.4;
  const l = 0.35 + Math.random() * 0.3;
  return hslToHex(h, s, l);
};

export const generateRandomTheme = (): {
  trunkBottom: string;
  trunkTop: string;
  leaf: string;
} => {
  const baseHue = Math.random();

  const trunkHue = (baseHue + 0.05 + Math.random() * 0.1) % 1;
  const trunkBottom = hslToHex(trunkHue, 0.3 + Math.random() * 0.2, 0.35 + Math.random() * 0.15);
  const trunkTop = hslToHex(trunkHue, 0.25 + Math.random() * 0.15, 0.5 + Math.random() * 0.15);

  const leafHue = (baseHue + 0.25 + Math.random() * 0.15) % 1;
  const leaf = hslToHex(leafHue, 0.5 + Math.random() * 0.3, 0.45 + Math.random() * 0.2);

  return { trunkBottom, trunkTop, leaf };
};
