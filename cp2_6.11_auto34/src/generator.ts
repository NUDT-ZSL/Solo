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

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randInt(min: number, max: number): number {
  return Math.floor(rand(min, max + 1));
}

function pickWeighted(weights: { triangle: number; circle: number; polygon: number }): 'triangle' | 'circle' | 'polygon' {
  const r = Math.random();
  if (r < weights.triangle) return 'triangle';
  if (r < weights.triangle + weights.circle) return 'circle';
  return 'polygon';
}

function pickColor(palette: string[], saturation: number): string {
  const hex = palette[randInt(0, palette.length - 1)];
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

function drawTriangle(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, colorBase: string, opacity: number): void {
  ctx.beginPath();
  const angle = rand(0, Math.PI * 2);
  for (let i = 0; i < 3; i++) {
    const a = angle + (Math.PI * 2 * i) / 3;
    const px = x + Math.cos(a) * size;
    const py = y + Math.sin(a) * size;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = colorBase + ',' + opacity.toFixed(2) + ')';
  ctx.fill();
}

function drawCircle(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, colorBase: string, opacity: number): void {
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.fillStyle = colorBase + ',' + opacity.toFixed(2) + ')';
  ctx.fill();
}

function drawPolygon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, colorBase: string, opacity: number): void {
  const sides = randInt(5, 8);
  const angle = rand(0, Math.PI * 2);
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = angle + (Math.PI * 2 * i) / sides;
    const px = x + Math.cos(a) * size;
    const py = y + Math.sin(a) * size;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = colorBase + ',' + opacity.toFixed(2) + ')';
  ctx.fill();
}

function drawNoiseTexture(ctx: CanvasRenderingContext2D, w: number, h: number, opacity: number): void {
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = Math.random() * 40 - 20;
    data[i] = Math.min(255, Math.max(0, data[i] + noise));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
  }
  ctx.putImageData(imageData, 0, 0);
}

function drawGradientTexture(ctx: CanvasRenderingContext2D, w: number, h: number, palette: string[], opacity: number): void {
  const color1 = palette[randInt(0, palette.length - 1)];
  const color2 = palette[randInt(0, palette.length - 1)];
  const gradient = ctx.createLinearGradient(rand(0, w), rand(0, h), rand(0, w), rand(0, h));
  gradient.addColorStop(0, color1);
  gradient.addColorStop(1, color2);
  ctx.globalAlpha = opacity * 0.3;
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 1;
}

function drawStripesTexture(ctx: CanvasRenderingContext2D, w: number, h: number, palette: string[], thin: boolean, opacity: number): void {
  const gap = thin ? randInt(3, 6) : randInt(10, 25);
  const angle = rand(0, Math.PI);
  const color = palette[randInt(0, palette.length - 1)];
  ctx.save();
  ctx.globalAlpha = opacity * 0.25;
  ctx.strokeStyle = color;
  ctx.lineWidth = thin ? 1 : 2;
  ctx.translate(w / 2, h / 2);
  ctx.rotate(angle);
  for (let i = -w; i < w * 2; i += gap) {
    ctx.beginPath();
    ctx.moveTo(i, -h);
    ctx.lineTo(i, h * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawGridTexture(ctx: CanvasRenderingContext2D, w: number, h: number, palette: string[], opacity: number): void {
  const gap = randInt(20, 50);
  const color = palette[randInt(0, palette.length - 1)];
  ctx.save();
  ctx.globalAlpha = opacity * 0.2;
  ctx.strokeStyle = color;
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
}

function drawGlowTexture(ctx: CanvasRenderingContext2D, w: number, h: number, palette: string[], opacity: number): void {
  const cx = rand(w * 0.2, w * 0.8);
  const cy = rand(h * 0.2, h * 0.8);
  const r = rand(100, 300);
  const color = palette[randInt(0, palette.length - 1)];
  const rr = parseInt(color.slice(1, 3), 16);
  const gg = parseInt(color.slice(3, 5), 16);
  const bb = parseInt(color.slice(5, 7), 16);
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  gradient.addColorStop(0, `rgba(${rr},${gg},${bb},${(opacity * 0.5).toFixed(2)})`);
  gradient.addColorStop(1, `rgba(${rr},${gg},${bb},0)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
}

function drawBlurTexture(ctx: CanvasRenderingContext2D, w: number, h: number, palette: string[], opacity: number): void {
  for (let i = 0; i < 5; i++) {
    const cx = rand(0, w);
    const cy = rand(0, h);
    const r = rand(50, 200);
    const color = palette[randInt(0, palette.length - 1)];
    const rr = parseInt(color.slice(1, 3), 16);
    const gg = parseInt(color.slice(3, 5), 16);
    const bb = parseInt(color.slice(5, 7), 16);
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    gradient.addColorStop(0, `rgba(${rr},${gg},${bb},${(opacity * 0.4).toFixed(2)})`);
    gradient.addColorStop(0.6, `rgba(${rr},${gg},${bb},${(opacity * 0.15).toFixed(2)})`);
    gradient.addColorStop(1, `rgba(${rr},${gg},${bb},0)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  }
}

function drawHalftoneTexture(ctx: CanvasRenderingContext2D, w: number, h: number, palette: string[], opacity: number): void {
  const gap = randInt(8, 16);
  const color = palette[randInt(0, palette.length - 1)];
  const rr = parseInt(color.slice(1, 3), 16);
  const gg = parseInt(color.slice(3, 5), 16);
  const bb = parseInt(color.slice(5, 7), 16);
  ctx.save();
  ctx.globalAlpha = opacity * 0.3;
  ctx.fillStyle = `rgb(${rr},${gg},${bb})`;
  for (let x = gap / 2; x < w; x += gap) {
    for (let y = gap / 2; y < h; y += gap) {
      const dotR = rand(1, gap / 3);
      ctx.beginPath();
      ctx.arc(x, y, dotR, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

export function generate(ctx: CanvasRenderingContext2D, config: GenerateConfig): ImageData {
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
    switch (texType) {
      case 'noise':
        drawNoiseTexture(ctx, w, h, avgOpacity);
        break;
      case 'gradient':
        drawGradientTexture(ctx, w, h, template.palette, avgOpacity);
        break;
      case 'stripes':
        drawStripesTexture(ctx, w, h, template.palette, false, avgOpacity);
        break;
      case 'thin-stripes':
        drawStripesTexture(ctx, w, h, template.palette, true, avgOpacity);
        break;
      case 'grid':
        drawGridTexture(ctx, w, h, template.palette, avgOpacity);
        break;
      case 'glow':
        drawGlowTexture(ctx, w, h, template.palette, avgOpacity);
        break;
      case 'blur':
        drawBlurTexture(ctx, w, h, template.palette, avgOpacity);
        break;
      case 'halftone':
        drawHalftoneTexture(ctx, w, h, template.palette, avgOpacity);
        break;
    }
  }

  for (let i = 0; i < config.shapeCount; i++) {
    const shapeType = pickWeighted(template.shapeWeights);
    const x = rand(0, w);
    const y = rand(0, h);
    const size = rand(15, 120);
    const colorBase = pickColor(template.palette, config.saturation);
    const opacity = rand(config.opacityMin, config.opacityMax);

    switch (shapeType) {
      case 'triangle':
        drawTriangle(ctx, x, y, size, colorBase, opacity);
        break;
      case 'circle':
        drawCircle(ctx, x, y, size, colorBase, opacity);
        break;
      case 'polygon':
        drawPolygon(ctx, x, y, size, colorBase, opacity);
        break;
    }
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

  const scale = (exportSize - border * 2) / canvas.width;
  ectx.drawImage(canvas, border, border, canvas.width * scale, canvas.height * scale);

  ectx.fillStyle = 'rgba(0,0,0,0.3)';
  ectx.font = '12px "Noto Sans SC", sans-serif';
  ectx.textAlign = 'center';
  ectx.fillText('拼贴梦境机', exportSize / 2, exportSize - 10);

  const link = document.createElement('a');
  link.download = 'collage-dream-' + Date.now() + '.png';
  link.href = exportCanvas.toDataURL('image/png');
  link.click();
}
