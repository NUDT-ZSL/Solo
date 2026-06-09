export interface BarcodeStripe {
  x: number;
  width: number;
  colorIndex: number;
}

export interface BarcodeOptions {
  text: string;
  colors: string[];
  density: number;
  opacity: number;
  maxWidth: number;
  gap: number;
}

export interface BarcodeData {
  stripes: BarcodeStripe[];
  totalWidth: number;
  height: number;
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : { r: 0, g: 0, b: 0 };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function interpolateColor(colors: string[], t: number): string {
  if (colors.length === 0) return '#000000';
  if (colors.length === 1) return colors[0];
  if (t <= 0) return colors[0];
  if (t >= 1) return colors[colors.length - 1];

  const segmentT = t * (colors.length - 1);
  const index = Math.floor(segmentT);
  const localT = segmentT - index;

  const c1 = hexToRgb(colors[index]);
  const c2 = hexToRgb(colors[Math.min(index + 1, colors.length - 1)]);

  const r = Math.round(lerp(c1.r, c2.r, localT));
  const g = Math.round(lerp(c1.g, c2.g, localT));
  const b = Math.round(lerp(c1.b, c2.b, localT));

  return `rgb(${r}, ${g}, ${b})`;
}

export function generateBarcodeData(options: BarcodeOptions): BarcodeData {
  const { text, density, maxWidth, gap } = options;
  const stripes: BarcodeStripe[] = [];

  if (!text) {
    return { stripes, totalWidth: 0, height: 0 };
  }

  const seed = hashString(text);
  const random = seededRandom(seed);

  const charCodes: number[] = [];
  for (let i = 0; i < text.length; i++) {
    charCodes.push(text.charCodeAt(i));
  }

  const charsForStripes: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const code = charCodes[i];
    const numStripes = Math.max(1, Math.floor((code % 5) + 2));
    for (let j = 0; j < numStripes; j++) {
      charsForStripes.push(code + j * 7);
    }
  }

  let currentX = 0;

  for (let i = 0; i < charsForStripes.length; i++) {
    const charCode = charsForStripes[i];
    const widthRand = random();
    const width = Math.max(1, Math.round(density * (0.5 + widthRand * 0.8)));

    if (currentX + width > maxWidth) {
      break;
    }

    const colorIndex = (charCode + i) % 1000;

    stripes.push({
      x: currentX,
      width,
      colorIndex
    });

    currentX += width + gap;
  }

  const totalWidth = stripes.length > 0
    ? stripes[stripes.length - 1].x + stripes[stripes.length - 1].width
    : 0;

  return {
    stripes,
    totalWidth,
    height: 260
  };
}

export function drawBarcode(
  ctx: CanvasRenderingContext2D,
  data: BarcodeData,
  options: BarcodeOptions,
  canvasWidth: number,
  canvasHeight: number
): void {
  const { colors, opacity } = options;

  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  ctx.globalAlpha = opacity;

  const offsetX = Math.floor((canvasWidth - data.totalWidth) / 2);
  const offsetY = Math.floor((canvasHeight - data.height) / 2);

  for (let i = 0; i < data.stripes.length; i++) {
    const stripe = data.stripes[i];
    const t = data.stripes.length > 1 ? i / (data.stripes.length - 1) : 0;
    const color = interpolateColor(colors, t);

    ctx.fillStyle = color;
    ctx.fillRect(
      offsetX + stripe.x,
      offsetY,
      stripe.width,
      data.height
    );
  }

  ctx.globalAlpha = 1;
}

export function generateSVG(
  data: BarcodeData,
  options: BarcodeOptions,
  width: number,
  height: number
): string {
  const { colors, opacity } = options;

  const offsetX = Math.floor((width - data.totalWidth) / 2);
  const offsetY = Math.floor((height - data.height) / 2);

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">\n`;
  svg += `  <rect width="${width}" height="${height}" fill="transparent"/>\n`;

  for (let i = 0; i < data.stripes.length; i++) {
    const stripe = data.stripes[i];
    const t = data.stripes.length > 1 ? i / (data.stripes.length - 1) : 0;
    const color = interpolateColor(colors, t);

    svg += `  <rect x="${offsetX + stripe.x}" y="${offsetY}" width="${stripe.width}" height="${data.height}" fill="${color}" opacity="${opacity}"/>\n`;
  }

  svg += `</svg>`;
  return svg;
}
