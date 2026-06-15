export type FontStyle = 'kaishu' | 'xingshu' | 'caoshu';

export interface StrokePoint {
  x: number;
  y: number;
  timestamp: number;
}

export interface ProcessedPoint {
  x: number;
  y: number;
  width: number;
  opacity: number;
}

export interface StyleConfig {
  smoothing: number;
  lineJoin: CanvasLineJoin;
  lineCap: CanvasLineCap;
  widthMultiplier: number;
  jitterAmount: number;
  diffusionStrength: number;
  curveTension: number;
}

const STYLE_CONFIGS: Record<FontStyle, StyleConfig> = {
  kaishu: {
    smoothing: 0.3,
    lineJoin: 'miter',
    lineCap: 'square',
    widthMultiplier: 1.0,
    jitterAmount: 0.5,
    diffusionStrength: 0.6,
    curveTension: 0.3,
  },
  xingshu: {
    smoothing: 0.5,
    lineJoin: 'round',
    lineCap: 'round',
    widthMultiplier: 0.9,
    jitterAmount: 1.0,
    diffusionStrength: 0.8,
    curveTension: 0.5,
  },
  caoshu: {
    smoothing: 0.75,
    lineJoin: 'round',
    lineCap: 'round',
    widthMultiplier: 0.8,
    jitterAmount: 2.0,
    diffusionStrength: 1.0,
    curveTension: 0.75,
  },
};

function gaussianRandom(mean: number, stdDev: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1 || 0.0001)) * Math.cos(2 * Math.PI * u2);
  return mean + z * stdDev;
}

export function getStyleConfig(style: FontStyle): StyleConfig {
  return STYLE_CONFIGS[style];
}

export function calculateVelocity(p1: StrokePoint, p2: StrokePoint): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dt = Math.max(p2.timestamp - p1.timestamp, 1);
  return Math.sqrt(dx * dx + dy * dy) / dt;
}

export function smoothVelocity(velocities: number[], windowSize: number = 5): number {
  const slice = velocities.slice(-windowSize);
  if (slice.length === 0) return 0;
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

export function velocityToWidth(
  velocity: number,
  baseBrushSize: number,
  styleConfig: StyleConfig
): number {
  const maxSpeed = 3.0;
  const minRatio = 0.15;
  const ratio = Math.max(minRatio, 1.0 - (velocity / maxSpeed) * (1.0 - minRatio));
  return baseBrushSize * styleConfig.widthMultiplier * ratio;
}

export function velocityToOpacity(velocity: number, inkDensity: number): number {
  const maxSpeed = 3.0;
  const minRatio = 0.25;
  const ratio = Math.max(minRatio, 1.0 - (velocity / maxSpeed) * (1.0 - minRatio));
  return Math.min(1.0, inkDensity * ratio);
}

export function applyJitter(
  x: number,
  y: number,
  jitterAmount: number
): { x: number; y: number } {
  return {
    x: x + gaussianRandom(0, jitterAmount),
    y: y + gaussianRandom(0, jitterAmount),
  };
}

export function catmullRomInterpolate(
  points: StrokePoint[],
  styleConfig: StyleConfig,
  numSegments: number = 6
): StrokePoint[] {
  if (points.length < 4) return points;

  const result: StrokePoint[] = [points[0]];
  const tension = styleConfig.curveTension;

  for (let i = 1; i < points.length - 2; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2];

    for (let t = 1; t <= numSegments; t++) {
      const tt = t / numSegments;
      const tt2 = tt * tt;
      const tt3 = tt2 * tt;

      const m1x = tension * (p2.x - p0.x);
      const m1y = tension * (p2.y - p0.y);
      const m2x = tension * (p3.x - p1.x);
      const m2y = tension * (p3.y - p1.y);

      const a0 = 2 * tt3 - 3 * tt2 + 1;
      const a1 = tt3 - 2 * tt2 + tt;
      const a2 = -2 * tt3 + 3 * tt2;
      const a3 = tt3 - tt2;

      const x = a0 * p1.x + a1 * m1x + a2 * p2.x + a3 * m2x;
      const y = a0 * p1.y + a1 * m1y + a2 * p2.y + a3 * m2y;

      const dt = p2.timestamp - p1.timestamp;
      result.push({
        x,
        y,
        timestamp: p1.timestamp + dt * tt,
      });
    }
  }

  result.push(points[points.length - 1]);
  return result;
}

export function processStroke(
  rawPoints: StrokePoint[],
  baseBrushSize: number,
  inkDensity: number,
  style: FontStyle
): ProcessedPoint[] {
  if (rawPoints.length === 0) return [];

  const styleConfig = getStyleConfig(style);
  const smoothed = rawPoints.length >= 4
    ? catmullRomInterpolate(rawPoints, styleConfig)
    : rawPoints;

  const velocities: number[] = [];
  const processed: ProcessedPoint[] = [];

  for (let i = 0; i < smoothed.length; i++) {
    let velocity = 0;
    if (i > 0) {
      velocity = calculateVelocity(smoothed[i - 1], smoothed[i]);
    }
    velocities.push(velocity);
    const avgVelocity = smoothVelocity(velocities);

    const width = velocityToWidth(avgVelocity, baseBrushSize, styleConfig);
    const opacity = velocityToOpacity(avgVelocity, inkDensity);

    const jittered = applyJitter(smoothed[i].x, smoothed[i].y, styleConfig.jitterAmount);

    processed.push({
      x: jittered.x,
      y: jittered.y,
      width,
      opacity,
    });
  }

  return processed;
}

export function generatePaperTexture(
  width: number,
  height: number
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#F5E6C8';
  ctx.fillRect(0, 0, width, height);

  const grainCanvas = document.createElement('canvas');
  grainCanvas.width = width;
  grainCanvas.height = height;
  const grainCtx = grainCanvas.getContext('2d')!;

  const imageData = grainCtx.createImageData(width, height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const noise = Math.random() * 20 - 10;
    data[i] = 128 + noise;
    data[i + 1] = 128 + noise;
    data[i + 2] = 128 + noise;
    data[i + 3] = 12;
  }
  grainCtx.putImageData(imageData, 0, 0);
  ctx.drawImage(grainCanvas, 0, 0);

  ctx.globalAlpha = 0.08;
  const fiberCount = Math.floor((width * height) / 2000);
  for (let i = 0; i < fiberCount; i++) {
    const startX = Math.random() * width;
    const startY = Math.random() * height;
    const angle = (Math.random() - 0.5) * Math.PI * 0.6;
    const length = 15 + Math.random() * 50;

    ctx.beginPath();
    ctx.strokeStyle = Math.random() > 0.5 ? '#C4A97D' : '#B8A080';
    ctx.lineWidth = 0.3 + Math.random() * 0.5;
    ctx.moveTo(startX, startY);
    ctx.lineTo(
      startX + Math.cos(angle) * length,
      startY + Math.sin(angle) * length
    );
    ctx.stroke();
  }

  const crossFibers = Math.floor(fiberCount * 0.3);
  for (let i = 0; i < crossFibers; i++) {
    const startX = Math.random() * width;
    const startY = Math.random() * height;
    const angle = Math.PI / 2 + (Math.random() - 0.5) * 0.8;
    const length = 10 + Math.random() * 30;

    ctx.beginPath();
    ctx.strokeStyle = '#BFA882';
    ctx.lineWidth = 0.2 + Math.random() * 0.3;
    ctx.moveTo(startX, startY);
    ctx.lineTo(
      startX + Math.cos(angle) * length,
      startY + Math.sin(angle) * length
    );
    ctx.stroke();
  }

  ctx.globalAlpha = 0.03;
  for (let i = 0; i < 20; i++) {
    const cx = Math.random() * width;
    const cy = Math.random() * height;
    const r = 30 + Math.random() * 80;
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    gradient.addColorStop(0, '#D4C4A8');
    gradient.addColorStop(1, 'rgba(212, 196, 168, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  }

  ctx.globalAlpha = 1.0;
  return canvas;
}

export function drawInkStroke(
  ctx: CanvasRenderingContext2D,
  points: ProcessedPoint[],
  styleConfig: StyleConfig
): void {
  if (points.length < 2) return;

  const inkColor = [44, 24, 16];

  ctx.save();
  ctx.lineJoin = styleConfig.lineJoin;
  ctx.lineCap = styleConfig.lineCap;

  ctx.shadowColor = `rgba(${inkColor[0]}, ${inkColor[1]}, ${inkColor[2]}, 0.3)`;
  ctx.shadowBlur = 8 * styleConfig.diffusionStrength;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];

    const avgWidth = (prev.width + curr.width) / 2;
    const avgOpacity = (prev.opacity + curr.opacity) / 2;

    ctx.beginPath();
    ctx.strokeStyle = `rgba(${inkColor[0]}, ${inkColor[1]}, ${inkColor[2]}, ${avgOpacity})`;
    ctx.lineWidth = avgWidth;
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(curr.x, curr.y);
    ctx.stroke();
  }

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;

  ctx.globalAlpha = 0.15 * styleConfig.diffusionStrength;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const avgWidth = (prev.width + curr.width) / 2;
    const avgOpacity = (prev.opacity + curr.opacity) / 2;

    ctx.beginPath();
    ctx.strokeStyle = `rgba(${inkColor[0]}, ${inkColor[1]}, ${inkColor[2]}, ${avgOpacity * 0.5})`;
    ctx.lineWidth = avgWidth * 1.8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(curr.x, curr.y);
    ctx.stroke();
  }

  ctx.globalAlpha = 1.0;
  ctx.restore();
}

export function compositeForExport(
  textureCanvas: HTMLCanvasElement,
  inkCanvas: HTMLCanvasElement,
  width: number,
  height: number
): HTMLCanvasElement {
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = width;
  exportCanvas.height = height;
  const ctx = exportCanvas.getContext('2d')!;

  ctx.drawImage(textureCanvas, 0, 0);
  ctx.drawImage(inkCanvas, 0, 0);

  return exportCanvas;
}

export function exportToPNG(canvas: HTMLCanvasElement, filename: string = '墨韵流芳.png'): void {
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  link.click();
}
