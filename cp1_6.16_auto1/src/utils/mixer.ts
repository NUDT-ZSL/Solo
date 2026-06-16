function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return '#' + [clamp(r), clamp(g), clamp(b)]
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('');
}

function srgbToLinear(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function linearToSrgb(c: number): number {
  return c <= 0.0031308
    ? c * 12.92
    : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

function rgbToXyz(r: number, g: number, b: number): [number, number, number] {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);
  const x = 0.4124564 * lr + 0.3575761 * lg + 0.1804375 * lb;
  const y = 0.2126729 * lr + 0.7151522 * lg + 0.0721750 * lb;
  const z = 0.0193339 * lr + 0.1191920 * lg + 0.9503041 * lb;
  return [x * 100, y * 100, z * 100];
}

function xyzToRgb(x: number, y: number, z: number): [number, number, number] {
  const xn = x / 100;
  const yn = y / 100;
  const zn = z / 100;
  const r = 3.2404542 * xn - 1.5371385 * yn - 0.4985314 * zn;
  const g = -0.9692660 * xn + 1.8760108 * yn + 0.0415560 * zn;
  const b = 0.0556434 * xn - 0.2040259 * yn + 1.0572252 * zn;
  return [linearToSrgb(r) * 255, linearToSrgb(g) * 255, linearToSrgb(b) * 255];
}

const D50_WHITE: [number, number, number] = [96.422, 82.521, 100.0];

function xyzToLab(x: number, y: number, z: number): [number, number, number] {
  const eps = 0.008856;
  const kappa = 903.3;
  const fx = (v: number) => (v > eps ? Math.cbrt(v) : (kappa * v + 16) / 116);
  const xn = x / D50_WHITE[0];
  const yn = y / D50_WHITE[1];
  const zn = z / D50_WHITE[2];
  const L = 116 * fx(yn) - 16;
  const a = 500 * (fx(xn) - fx(yn));
  const b = 200 * (fx(yn) - fx(zn));
  return [L, a, b];
}

function labToXyz(L: number, a: number, b: number): [number, number, number] {
  const eps = 0.008856;
  const kappa = 903.3;
  const fy = (L + 16) / 116;
  const fx = a / 500 + fy;
  const fz = fy - b / 200;
  const xr = Math.pow(fx, 3) > eps ? Math.pow(fx, 3) : (116 * fx - 16) / kappa;
  const yr = L > kappa * eps ? Math.pow((L + 16) / 116, 3) : L / kappa;
  const zr = Math.pow(fz, 3) > eps ? Math.pow(fz, 3) : (116 * fz - 16) / kappa;
  return [xr * D50_WHITE[0], yr * D50_WHITE[1], zr * D50_WHITE[2]];
}

function labToLch(L: number, a: number, b: number): [number, number, number] {
  const C = Math.sqrt(a * a + b * b);
  let H = Math.atan2(b, a) * (180 / Math.PI);
  if (H < 0) H += 360;
  return [L, C, H];
}

function lchToLab(L: number, C: number, H: number): [number, number, number] {
  const rad = H * (Math.PI / 180);
  const a = C * Math.cos(rad);
  const b = C * Math.sin(rad);
  return [L, a, b];
}

function hexToLch(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex);
  const [x, y, z] = rgbToXyz(r, g, b);
  const [L, a, bv] = xyzToLab(x, y, z);
  return labToLch(L, a, bv);
}

function lchToHex(L: number, C: number, H: number): string {
  const [l, a, b] = lchToLab(L, C, H);
  const [x, y, z] = labToXyz(l, a, b);
  const [r, g, bv] = xyzToRgb(x, y, z);
  return rgbToHex(r, g, bv);
}

export function mixColorsLch(hex1: string, hex2: string, steps: number = 5): string[] {
  const [L1, C1, H1] = hexToLch(hex1);
  const [L2, C2, H2] = hexToLch(hex2);

  let dH = H2 - H1;
  if (dH > 180) dH -= 360;
  if (dH < -180) dH += 360;

  const result: string[] = [];
  for (let i = 1; i <= steps; i++) {
    const t = i / (steps + 1);
    const L = L1 + (L2 - L1) * t;
    const C = C1 + (C2 - C1) * t;
    const H = H1 + dH * t;
    const normalizedH = ((H % 360) + 360) % 360;
    result.push(lchToHex(L, C, normalizedH));
  }
  return result;
}

export function randomMix(baseColors: string[]): { color1: string; color2: string; mixed: string[] } {
  if (baseColors.length < 2) {
    return { color1: baseColors[0] || '#FF5733', color2: baseColors[1] || '#33FF57', mixed: [] };
  }
  const indices = new Set<number>();
  while (indices.size < 2) {
    indices.add(Math.floor(Math.random() * baseColors.length));
  }
  const [i1, i2] = Array.from(indices);
  const color1 = baseColors[i1];
  const color2 = baseColors[i2];
  const mixed = mixColorsLch(color1, color2);
  return { color1, color2, mixed };
}
