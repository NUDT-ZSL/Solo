export type TemplateType = 'minimal-bw' | 'neon-cyber' | 'watercolor' | 'geometric' | 'retro-pop';

export interface GenerateConfig {
  shapeCount: number;
  opacityMin: number;
  opacityMax: number;
  saturation: number;
  template: TemplateType;
}

export interface TemplatePreset {
  name: string;
  type: TemplateType;
  icon: string;
  shapeWeights: { triangle: number; circle: number; polygon: number };
  textureTypes: string[];
  palette: string[];
  primaryColor: string;
}

export interface HistoryEntry {
  id: number;
  thumbnail: string;
  config: GenerateConfig;
  imageData: ImageData;
}

export const TEMPLATES: TemplatePreset[] = [
  {
    name: '极简黑白',
    type: 'minimal-bw',
    icon: '◻',
    shapeWeights: { triangle: 0.33, circle: 0.34, polygon: 0.33 },
    textureTypes: ['noise', 'thin-stripes'],
    palette: ['#111111', '#333333', '#555555', '#888888', '#BBBBBB', '#EEEEEE', '#FFFFFF'],
    primaryColor: '#888888',
  },
  {
    name: '霓虹赛博',
    type: 'neon-cyber',
    icon: '⚡',
    shapeWeights: { triangle: 0.2, circle: 0.5, polygon: 0.3 },
    textureTypes: ['gradient', 'glow'],
    palette: ['#FF00FF', '#00FFFF', '#FF0066', '#6600FF', '#00FF88', '#FF3399', '#3300CC'],
    primaryColor: '#FF00FF',
  },
  {
    name: '水彩晕染',
    type: 'watercolor',
    icon: '🎨',
    shapeWeights: { triangle: 0.2, circle: 0.55, polygon: 0.25 },
    textureTypes: ['gradient', 'blur'],
    palette: ['#FFB3C6', '#B3D9FF', '#C6FFB3', '#FFE0B3', '#D9B3FF', '#B3FFF0', '#FFD9E8'],
    primaryColor: '#FFB3C6',
  },
  {
    name: '几何构成',
    type: 'geometric',
    icon: '△',
    shapeWeights: { triangle: 0.4, circle: 0.15, polygon: 0.45 },
    textureTypes: ['stripes', 'grid'],
    palette: ['#E63946', '#457B9D', '#F1C40F', '#1D3557', '#A8DADC', '#2A9D8F', '#E76F51'],
    primaryColor: '#E63946',
  },
  {
    name: '复古波普',
    type: 'retro-pop',
    icon: '◈',
    shapeWeights: { triangle: 0.33, circle: 0.34, polygon: 0.33 },
    textureTypes: ['halftone', 'noise'],
    palette: ['#FF6B35', '#F7C948', '#FF3F5C', '#00B4D8', '#FF8FA3', '#C1FF72', '#FFA62B'],
    primaryColor: '#FF6B35',
  },
];

export const DEFAULT_CONFIG: GenerateConfig = {
  shapeCount: 20,
  opacityMin: 0.2,
  opacityMax: 0.9,
  saturation: 70,
  template: 'neon-cyber',
};

const SHAPE_POOL_SIZE = 5;

interface CachedShape {
  path: Path2D;
  type: 'triangle' | 'circle' | 'polygon';
  variant: number;
}

interface CachedTexture {
  canvas: HTMLCanvasElement;
  type: string;
}

const shapePool: CachedShape[] = [];
const textureCache: Map<string, CachedTexture> = new Map();
const randomCache: number[] = [];
let randomIndex = 0;

function initRandomCache(): void {
  randomCache.length = 0;
  for (let i = 0; i < 10000; i++) {
    randomCache.push(Math.random());
  }
  randomIndex = 0;
}

function rand(min: number, max: number): number {
  const r = randomCache[randomIndex++];
  if (randomIndex >= randomCache.length) randomIndex = 0;
  return r * (max - min) + min;
}

function randInt(min: number, max: number): number {
  return Math.floor(rand(min, max + 1));
}

function buildShapePool(): void {
  shapePool.length = 0;
  const types: Array<'triangle' | 'circle' | 'polygon'> = ['triangle', 'circle', 'polygon'];

  for (const type of types) {
    for (let variant = 0; variant < SHAPE_POOL_SIZE; variant++) {
      const path = new Path2D();
      const cx = 0;
      const cy = 0;

      if (type === 'circle') {
        const r = 0.7 + variant * 0.06;
        path.arc(cx, cy, r, 0, Math.PI * 2);
      } else if (type === 'triangle') {
        const angle = variant * 0.3;
        const scale = 0.8 + variant * 0.04;
        for (let i = 0; i < 3; i++) {
          const a = angle + (Math.PI * 2 * i) / 3;
          const px = cx + Math.cos(a) * scale;
          const py = cy + Math.sin(a) * scale;
          if (i === 0) path.moveTo(px, py);
          else path.lineTo(px, py);
        }
        path.closePath();
      } else if (type === 'polygon') {
        const sides = 5 + (variant % 4);
        const angle = variant * 0.25;
        const scale = 0.85 + variant * 0.03;
        for (let i = 0; i < sides; i++) {
          const a = angle + (Math.PI * 2 * i) / sides;
          const px = cx + Math.cos(a) * scale;
          const py = cy + Math.sin(a) * scale;
          if (i === 0) path.moveTo(px, py);
          else path.lineTo(px, py);
        }
        path.closePath();
      }

      shapePool.push({ path, type, variant });
    }
  }
}

function prebuildTextures(): void {
  textureCache.clear();
  const types = ['noise', 'gradient', 'stripes', 'thin-stripes', 'grid', 'glow', 'blur', 'halftone'];
  for (const type of types) {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 800;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#1E1E2E';
    ctx.fillRect(0, 0, 800, 800);
    renderTextureToCanvas(ctx, type, 800, 800);
    textureCache.set(type, { canvas, type });
  }
}

function renderTextureToCanvas(ctx: CanvasRenderingContext2D, type: string, w: number, h: number): void {
  const palette = ['#FF00FF', '#00FFFF', '#FF6B35', '#6C63FF', '#FFB3C6'];
  const saveIndex = randomIndex;

  if (type === 'noise') {
    const img = ctx.createImageData(w, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = Math.floor(rand(-30, 30));
      d[i] = 30 + n;
      d[i + 1] = 30 + n;
      d[i + 2] = 46 + n;
      d[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  } else if (type === 'gradient') {
    const c1 = palette[Math.floor(rand(0, palette.length))];
    const c2 = palette[Math.floor(rand(0, palette.length))];
    const grad = ctx.createLinearGradient(rand(0, w), rand(0, h), rand(0, w), rand(0, h));
    grad.addColorStop(0, c1);
    grad.addColorStop(1, c2);
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;
  } else if (type === 'stripes' || type === 'thin-stripes') {
    const gap = type === 'thin-stripes' ? Math.floor(rand(4, 7)) : Math.floor(rand(12, 20));
    const ang = rand(0, Math.PI);
    const col = palette[Math.floor(rand(0, palette.length))];
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = col;
    ctx.lineWidth = type === 'thin-stripes' ? 1 : 2;
    ctx.translate(w / 2, h / 2);
    ctx.rotate(ang);
    for (let i = -w; i < w * 2; i += gap) {
      ctx.beginPath();
      ctx.moveTo(i, -h);
      ctx.lineTo(i, h * 2);
      ctx.stroke();
    }
    ctx.restore();
  } else if (type === 'grid') {
    const gap = Math.floor(rand(25, 40));
    const col = palette[Math.floor(rand(0, palette.length))];
    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.strokeStyle = col;
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += gap) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += gap) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.restore();
  } else if (type === 'glow') {
    const cx = rand(w * 0.2, w * 0.8);
    const cy = rand(h * 0.2, h * 0.8);
    const r = rand(150, 300);
    const col = palette[Math.floor(rand(0, palette.length))];
    const rr = parseInt(col.slice(1, 3), 16);
    const gg = parseInt(col.slice(3, 5), 16);
    const bb = parseInt(col.slice(5, 7), 16);
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, `rgba(${rr},${gg},${bb},0.35)`);
    grad.addColorStop(1, `rgba(${rr},${gg},${bb},0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  } else if (type === 'blur') {
    for (let i = 0; i < 5; i++) {
      const cx = rand(0, w);
      const cy = rand(0, h);
      const r = rand(60, 200);
      const col = palette[Math.floor(rand(0, palette.length))];
      const rr = parseInt(col.slice(1, 3), 16);
      const gg = parseInt(col.slice(3, 5), 16);
      const bb = parseInt(col.slice(5, 7), 16);
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      grad.addColorStop(0, `rgba(${rr},${gg},${bb},0.3)`);
      grad.addColorStop(0.6, `rgba(${rr},${gg},${bb},0.1)`);
      grad.addColorStop(1, `rgba(${rr},${gg},${bb},0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }
  } else if (type === 'halftone') {
    const gap = Math.floor(rand(10, 14));
    const col = palette[Math.floor(rand(0, palette.length))];
    const rr = parseInt(col.slice(1, 3), 16);
    const gg = parseInt(col.slice(3, 5), 16);
    const bb = parseInt(col.slice(5, 7), 16);
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = `rgb(${rr},${gg},${bb})`;
    for (let x = gap / 2; x < w; x += gap) {
      for (let y = gap / 2; y < h; y += gap) {
        const dr = rand(1, gap / 3);
        ctx.beginPath();
        ctx.arc(x, y, dr, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  randomIndex = saveIndex;
}

function initCache(): void {
  initRandomCache();
  buildShapePool();
  prebuildTextures();
}

function getRandomShape(type: 'triangle' | 'circle' | 'polygon'): CachedShape {
  const candidates = shapePool.filter(s => s.type === type);
  return candidates[Math.floor(rand(0, candidates.length))];
}

function getCachedTexture(type: string): CachedTexture | undefined {
  return textureCache.get(type);
}

function pickWeighted(weights: { triangle: number; circle: number; polygon: number }): 'triangle' | 'circle' | 'polygon' {
  const r = rand(0, 1);
  if (r < weights.triangle) return 'triangle';
  if (r < weights.triangle + weights.circle) return 'circle';
  return 'polygon';
}

function applySaturation(hex: string, saturation: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const gray = 0.299 * r + 0.587 * g + 0.114 * b;
  const sat = saturation / 100;
  const nr = Math.round(gray + (r - gray) * sat);
  const ng = Math.round(gray + (g - gray) * sat);
  const nb = Math.round(gray + (b - gray) * sat);
  return `rgba(${nr},${ng},${nb}`;
}

function drawShapeFromPool(
  ctx: CanvasRenderingContext2D,
  type: 'triangle' | 'circle' | 'polygon',
  x: number,
  y: number,
  size: number,
  colorBase: string,
  opacity: number
): void {
  const cached = getRandomShape(type);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size, size);
  ctx.fillStyle = colorBase + ',' + opacity.toFixed(2) + ')';
  ctx.fill(cached.path);
  ctx.restore();
}

export function generate(ctx: CanvasRenderingContext2D, config: GenerateConfig): ImageData {
  if (shapePool.length === 0) {
    initCache();
  }

  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const template = TEMPLATES.find(t => t.type === config.template) || TEMPLATES[0];

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#1E1E2E';
  ctx.fillRect(0, 0, w, h);

  const allTextures = [...template.textureTypes];
  while (allTextures.length < 3) {
    const extras = ['noise', 'gradient', 'stripes', 'glow', 'blur', 'halftone', 'grid', 'thin-stripes'];
    const extra = extras[randInt(0, extras.length - 1)];
    if (!allTextures.includes(extra)) allTextures.push(extra);
  }

  const avgOpacity = (config.opacityMin + config.opacityMax) / 2;

  for (const texType of allTextures) {
    const cachedTex = getCachedTexture(texType);
    if (cachedTex) {
      ctx.save();
      ctx.globalAlpha = avgOpacity * 0.35;
      ctx.drawImage(cachedTex.canvas, 0, 0, w, h);
      ctx.restore();
    }
  }

  const palette = template.palette;
  const paletteMax = palette.length - 1;
  for (let i = 0; i < config.shapeCount; i++) {
    const shapeType = pickWeighted(template.shapeWeights);
    const x = rand(0, w);
    const y = rand(0, h);
    const size = rand(15, 120);
    const hexColor = palette[randInt(0, paletteMax)];
    const colorBase = applySaturation(hexColor, config.saturation);
    const opacity = rand(config.opacityMin, config.opacityMax);
    drawShapeFromPool(ctx, shapeType, x, y, size, colorBase, opacity);
  }

  return ctx.getImageData(0, 0, w, h);
}

export function exportPNG(canvas: HTMLCanvasElement): void {
  const exportSize = 1080;
  const border = 30;
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = exportSize;
  exportCanvas.height = exportSize;
  const ectx = exportCanvas.getContext('2d')!;

  ectx.fillStyle = '#FFFFFF';
  ectx.fillRect(0, 0, exportSize, exportSize);

  const innerSize = exportSize - border * 2;
  ectx.drawImage(canvas, border, border, innerSize, innerSize);

  ectx.fillStyle = 'rgba(0,0,0,0.3)';
  ectx.font = '12px "Noto Sans SC", sans-serif';
  ectx.textAlign = 'center';
  ectx.fillText('拼贴梦境机', exportSize / 2, exportSize - 10);

  const link = document.createElement('a');
  link.download = 'collage-dream-' + Date.now() + '.png';
  link.href = exportCanvas.toDataURL('image/png');
  link.click();
}
