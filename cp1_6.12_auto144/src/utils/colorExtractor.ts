export interface ColorItem {
  hex: string;
  rgb: [number, number, number];
  percentage: number;
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

export function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ] : [0, 0, 0];
}

export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return [h * 360, s * 100, l * 100];
}

export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360;
  s /= 100;
  l /= 100;
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

  return [
    Math.round(r * 255),
    Math.round(g * 255),
    Math.round(b * 255)
  ];
}

export function shiftHue(hex: string, degrees: number): string {
  const [r, g, b] = hexToRgb(hex);
  const [h, s, l] = rgbToHsl(r, g, b);
  const newH = (h + degrees + 360) % 360;
  const [newR, newG, newB] = hslToRgb(newH, s, l);
  return rgbToHex(newR, newG, newB);
}

interface ColorBucket {
  pixels: [number, number, number][];
  rMin: number; rMax: number;
  gMin: number; gMax: number;
  bMin: number; bMax: number;
}

function createBucket(pixels: [number, number, number][]): ColorBucket {
  let rMin = 255, rMax = 0;
  let gMin = 255, gMax = 0;
  let bMin = 255, bMax = 0;

  for (const [r, g, b] of pixels) {
    if (r < rMin) rMin = r;
    if (r > rMax) rMax = r;
    if (g < gMin) gMin = g;
    if (g > gMax) gMax = g;
    if (b < bMin) bMin = b;
    if (b > bMax) bMax = b;
  }

  return { pixels, rMin, rMax, gMin, gMax, bMin, bMax };
}

function getRangeSize(bucket: ColorBucket): number {
  const rRange = bucket.rMax - bucket.rMin;
  const gRange = bucket.gMax - bucket.gMin;
  const bRange = bucket.bMax - bucket.bMin;
  return Math.max(rRange, gRange, bRange);
}

function splitBucket(bucket: ColorBucket): ColorBucket[] {
  const rRange = bucket.rMax - bucket.rMin;
  const gRange = bucket.gMax - bucket.gMin;
  const bRange = bucket.bMax - bucket.bMin;

  let channel: 'r' | 'g' | 'b' = 'r';
  if (gRange >= rRange && gRange >= bRange) channel = 'g';
  else if (bRange >= rRange && bRange >= gRange) channel = 'b';

  const sorted = [...bucket.pixels].sort((a, b) => {
    if (channel === 'r') return a[0] - b[0];
    if (channel === 'g') return a[1] - b[1];
    return a[2] - b[2];
  });

  const mid = Math.floor(sorted.length / 2);
  const left = sorted.slice(0, mid);
  const right = sorted.slice(mid);

  if (left.length === 0 || right.length === 0) {
    return [bucket];
  }

  return [createBucket(left), createBucket(right)];
}

function getAverageColor(bucket: ColorBucket): [number, number, number] {
  let rSum = 0, gSum = 0, bSum = 0;
  for (const [r, g, b] of bucket.pixels) {
    rSum += r;
    gSum += g;
    bSum += b;
  }
  const count = bucket.pixels.length;
  return [
    Math.round(rSum / count),
    Math.round(gSum / count),
    Math.round(bSum / count)
  ];
}

function colorDistance(rgb1: [number, number, number], rgb2: [number, number, number]): number {
  const r = rgb1[0] - rgb2[0];
  const g = rgb1[1] - rgb2[1];
  const b = rgb1[2] - rgb2[2];
  return r * r + g * g + b * b;
}

export function extractColorsFromImageElement(img: HTMLImageElement, colorCount: number = 5): ColorItem[] {
  const maxSize = 150;
  const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
  const sw = Math.max(1, Math.floor(img.width * scale));
  const sh = Math.max(1, Math.floor(img.height * scale));

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];

  canvas.width = sw;
  canvas.height = sh;
  ctx.drawImage(img, 0, 0, sw, sh);

  const imageData = ctx.getImageData(0, 0, sw, sh);
  const pixels = imageData.data;
  
  const pixelList: [number, number, number][] = [];
  
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const a = pixels[i + 3];
    
    if (a < 128) continue;
    pixelList.push([r, g, b]);
  }

  if (pixelList.length === 0) return [];

  const initialBucket = createBucket(pixelList);
  let buckets: ColorBucket[] = [initialBucket];

  while (buckets.length < colorCount) {
    let maxRange = -1;
    let maxIndex = 0;

    for (let i = 0; i < buckets.length; i++) {
      const range = getRangeSize(buckets[i]);
      if (range > maxRange && buckets[i].pixels.length > 2) {
        maxRange = range;
        maxIndex = i;
      }
    }

    if (maxRange <= 0) break;

    const bucketToSplit = buckets[maxIndex];
    const split = splitBucket(bucketToSplit);
    
    if (split.length === 1) break;
    
    buckets.splice(maxIndex, 1, ...split);
  }

  const result: ColorItem[] = buckets.map(bucket => {
    const avgColor = getAverageColor(bucket);
    return {
      hex: rgbToHex(avgColor[0], avgColor[1], avgColor[2]),
      rgb: avgColor,
      percentage: Math.round((bucket.pixels.length / pixelList.length) * 1000) / 10
    };
  });

  result.sort((a, b) => b.percentage - a.percentage);

  while (result.length < colorCount && result.length > 0) {
    result.push({ ...result[result.length - 1] });
  }

  return result.slice(0, colorCount);
}
