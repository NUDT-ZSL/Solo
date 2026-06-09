export type AlgorithmType = 'ink' | 'watercolor' | 'sand' | 'pencil';

export interface BrushPreset {
  id: string;
  name: string;
  particleDensity: number;
  diffusionRadius: number;
  randomOffset: number;
  opacityRange: [number, number];
  algorithm: AlgorithmType;
  colorPalette: string[];
}

export interface Particle {
  x: number;
  y: number;
  size: number;
  opacity: number;
  color: string;
  rotation: number;
  shape?: 'circle' | 'ellipse' | 'line' | 'speck';
  stretch?: number;
}

export interface TextureParams {
  density: number;
  radius: number;
  offset: number;
  opacityMin: number;
  opacityMax: number;
}

export const BRUSH_PRESETS: BrushPreset[] = [
  {
    id: 'ink',
    name: '墨迹扩散',
    particleDensity: 70,
    diffusionRadius: 10,
    randomOffset: 6,
    opacityRange: [0.4, 0.95],
    algorithm: 'ink',
    colorPalette: ['#1a1a1a', '#2d2d2d', '#111111', '#0a0a0a', '#333333']
  },
  {
    id: 'watercolor',
    name: '水彩晕染',
    particleDensity: 55,
    diffusionRadius: 12,
    randomOffset: 8,
    opacityRange: [0.25, 0.7],
    algorithm: 'watercolor',
    colorPalette: ['#E63946', '#457B9D', '#2A9D8F', '#F4A261', '#6A4C93', '#E9C46A']
  },
  {
    id: 'sand',
    name: '沙粒堆积',
    particleDensity: 100,
    diffusionRadius: 4,
    randomOffset: 3,
    opacityRange: [0.5, 1.0],
    algorithm: 'sand',
    colorPalette: ['#D4A373', '#CCD5AE', '#E9EDC9', '#C9B99B', '#A98467', '#B08968', '#DDD8C4']
  },
  {
    id: 'pencil',
    name: '铅笔划痕',
    particleDensity: 85,
    diffusionRadius: 2,
    randomOffset: 4,
    opacityRange: [0.3, 0.8],
    algorithm: 'pencil',
    colorPalette: ['#4A4A4A', '#3D3D3D', '#5C5C5C', '#2E2E2E', '#6B6B6B', '#454545']
  }
];

const rand = (min: number, max: number): number => Math.random() * (max - min) + min;
const randInt = (min: number, max: number): number => Math.floor(rand(min, max + 1));
const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));
const gaussianRand = (): number => {
  let sum = 0;
  for (let i = 0; i < 3; i++) sum += Math.random();
  return sum / 3;
};

const pickColor = (palette: string[]): string =>
  palette[Math.floor(Math.random() * palette.length)];

export interface TextMaskPoint {
  x: number;
  y: number;
  alpha: number;
  edgeDistance: number;
}

export const generateTextMask = (
  canvas: HTMLCanvasElement,
  text: string,
  fontFamily: string,
  fontSize: number
): TextMaskPoint[] => {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return [];

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#000';
  ctx.font = `bold ${fontSize}px ${fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const points: TextMaskPoint[] = [];
  const w = canvas.width;
  const h = canvas.height;

  for (let y = 0; y < h; y += 2) {
    for (let x = 0; x < w; x += 2) {
      const idx = (y * w + x) * 4;
      const alpha = data[idx + 3] / 255;
      if (alpha > 0.1) {
        let edgeDist = 999;
        for (let dy = -5; dy <= 5 && edgeDist > 5; dy++) {
          for (let dx = -5; dx <= 5 && edgeDist > 5; dx++) {
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || nx >= w || ny < 0 || ny >= h) { edgeDist = Math.min(edgeDist, Math.abs(dx) + Math.abs(dy)); continue; }
            const nidx = (ny * w + nx) * 4;
            if (data[nidx + 3] / 255 < 0.1) edgeDist = Math.min(edgeDist, Math.abs(dx) + Math.abs(dy));
          }
        }
        points.push({ x, y, alpha, edgeDistance: edgeDist });
      }
    }
  }
  return points;
};

const generateInkParticles = (
  points: TextMaskPoint[],
  params: TextureParams,
  palette: string[]
): Particle[] => {
  const particles: Particle[] = [];
  const sampleRate = clamp(params.density / 100, 0.2, 1);

  for (const pt of points) {
    if (Math.random() > sampleRate) continue;

    const isEdge = pt.edgeDistance < 4;
    const bleedCount = isEdge ? randInt(1, 3) : 1;

    for (let i = 0; i < bleedCount; i++) {
      const ox = rand(-params.offset, params.offset);
      const oy = rand(-params.offset, params.offset);
      const edgeBleed = isEdge ? rand(1, params.radius * 1.5) : rand(0.5, params.radius * 0.8);

      particles.push({
        x: pt.x + ox + (isEdge ? rand(-params.radius, params.radius) * 0.5 : 0),
        y: pt.y + oy + (isEdge ? rand(-params.radius, params.radius) * 0.5 : 0),
        size: gaussianRand() * edgeBleed + 1,
        opacity: clamp(
          rand(params.opacityMin, params.opacityMax) * pt.alpha * (isEdge ? rand(0.2, 0.6) : rand(0.6, 1)),
          params.opacityMin,
          params.opacityMax
        ),
        color: pickColor(palette),
        rotation: rand(0, Math.PI * 2),
        shape: 'ellipse',
        stretch: rand(1, 2.5)
      });
    }
  }
  return particles;
};

const generateWatercolorParticles = (
  points: TextMaskPoint[],
  params: TextureParams,
  palette: string[]
): Particle[] => {
  const particles: Particle[] = [];
  const sampleRate = clamp(params.density / 100, 0.15, 0.8);
  const layers = 3;

  for (let layer = 0; layer < layers; layer++) {
    const layerPalette = [palette[layer % palette.length], palette[(layer + 1) % palette.length]];

    for (const pt of points) {
      if (Math.random() > sampleRate * (0.7 + layer * 0.15)) continue;

      const wetEdge = pt.edgeDistance < 3;
      const spread = wetEdge ? params.radius * 1.8 : params.radius * 0.9;

      for (let i = 0; i < (wetEdge ? randInt(2, 5) : randInt(1, 2)); i++) {
        particles.push({
          x: pt.x + rand(-spread * 0.6, spread * 0.6) + rand(-params.offset, params.offset),
          y: pt.y + rand(-spread * 0.6, spread * 0.6) + rand(-params.offset, params.offset),
          size: gaussianRand() * spread * (wetEdge ? 1.2 : 0.8) + 2,
          opacity: clamp(
            rand(params.opacityMin, params.opacityMax * 0.85) * pt.alpha * (wetEdge ? rand(0.15, 0.45) : rand(0.35, 0.7)),
            params.opacityMin * 0.5,
            params.opacityMax
          ),
          color: pickColor(layerPalette),
          rotation: rand(0, Math.PI * 2),
          shape: 'ellipse',
          stretch: rand(1.2, 3)
        });
      }
    }
  }
  return particles;
};

const generateSandParticles = (
  points: TextMaskPoint[],
  params: TextureParams,
  palette: string[]
): Particle[] => {
  const particles: Particle[] = [];
  const sampleRate = clamp(params.density / 100, 0.5, 1);

  for (const pt of points) {
    if (Math.random() > sampleRate) continue;

    const isInner = pt.edgeDistance > 5;
    const clusters = isInner ? randInt(2, 4) : randInt(1, 2);

    for (let c = 0; c < clusters; c++) {
      const cx = pt.x + rand(-params.offset * 0.8, params.offset * 0.8);
      const cy = pt.y + rand(-params.offset * 0.8, params.offset * 0.8);

      for (let i = 0; i < randInt(2, 5); i++) {
        const shadow = i === 0 && isInner;
        particles.push({
          x: cx + rand(-params.radius * 0.6, params.radius * 0.6),
          y: cy + rand(-params.radius * 0.6, params.radius * 0.6),
          size: rand(0.8, params.radius * 0.7),
          opacity: clamp(
            rand(params.opacityMin, params.opacityMax) * pt.alpha * (shadow ? 0.3 : 1),
            params.opacityMin,
            params.opacityMax
          ),
          color: shadow ? '#6B4423' : pickColor(palette),
          rotation: rand(0, Math.PI * 2),
          shape: 'speck'
        });
      }
    }
  }
  return particles;
};

const generatePencilParticles = (
  points: TextMaskPoint[],
  params: TextureParams,
  palette: string[]
): Particle[] => {
  const particles: Particle[] = [];
  const sampleRate = clamp(params.density / 100, 0.4, 1);
  const hatchingAngle = rand(Math.PI * 0.2, Math.PI * 0.4);

  for (const pt of points) {
    if (Math.random() > sampleRate) continue;

    const strokeCount = pt.edgeDistance < 3 ? randInt(3, 6) : randInt(1, 3);
    const isEdge = pt.edgeDistance < 4;

    for (let i = 0; i < strokeCount; i++) {
      const angle = hatchingAngle + rand(-0.3, 0.3) * (i % 2 === 0 ? 1 : -1);
      const ox = rand(-params.offset, params.offset);
      const oy = rand(-params.offset, params.offset);

      particles.push({
        x: pt.x + ox,
        y: pt.y + oy,
        size: rand(params.radius * 1.5, params.radius * 4) * (isEdge ? 1.3 : 1),
        opacity: clamp(
          rand(params.opacityMin, params.opacityMax) * pt.alpha * (isEdge ? rand(0.6, 1) : rand(0.3, 0.7)),
          params.opacityMin,
          params.opacityMax
        ),
        color: pickColor(palette),
        rotation: angle,
        shape: 'line',
        stretch: rand(0.3, 1)
      });

      if (isEdge && i % 2 === 0) {
        particles.push({
          x: pt.x + rand(-params.offset * 1.5, params.offset * 1.5),
          y: pt.y + rand(-params.offset * 1.5, params.offset * 1.5),
          size: rand(0.5, 1.5),
          opacity: clamp(rand(0.1, 0.3), 0.1, 0.3),
          color: pickColor(palette),
          rotation: rand(0, Math.PI * 2),
          shape: 'circle'
        });
      }
    }
  }
  return particles;
};

export const generateParticles = (
  points: TextMaskPoint[],
  preset: BrushPreset,
  customParams?: Partial<TextureParams>
): Particle[] => {
  const params: TextureParams = {
    density: customParams?.density ?? preset.particleDensity,
    radius: customParams?.radius ?? preset.diffusionRadius,
    offset: customParams?.offset ?? preset.randomOffset,
    opacityMin: customParams?.opacityMin ?? preset.opacityRange[0],
    opacityMax: customParams?.opacityMax ?? preset.opacityRange[1]
  };

  switch (preset.algorithm) {
    case 'ink':
      return generateInkParticles(points, params, preset.colorPalette);
    case 'watercolor':
      return generateWatercolorParticles(points, params, preset.colorPalette);
    case 'sand':
      return generateSandParticles(points, params, preset.colorPalette);
    case 'pencil':
      return generatePencilParticles(points, params, preset.colorPalette);
    default:
      return generateInkParticles(points, params, preset.colorPalette);
  }
};

export const interpolateParticles = (
  from: Particle[],
  to: Particle[],
  progress: number
): Particle[] => {
  const len = Math.max(from.length, to.length);
  const result: Particle[] = new Array(len);
  const p = clamp(progress, 0, 1);

  for (let i = 0; i < len; i++) {
    const a = from[Math.min(i, from.length - 1)];
    const b = to[Math.min(i, to.length - 1)];
    if (!a && !b) continue;
    if (a && !b) { result[i] = { ...a, opacity: a.opacity * (1 - p) }; continue; }
    if (!a && b) { result[i] = { ...b, opacity: b.opacity * p }; continue; }

    result[i] = {
      x: a.x + (b.x - a.x) * p,
      y: a.y + (b.y - a.y) * p,
      size: a.size + (b.size - a.size) * p,
      opacity: a.opacity + (b.opacity - a.opacity) * p,
      color: p < 0.5 ? a.color : b.color,
      rotation: a.rotation + (b.rotation - a.rotation) * p,
      shape: p < 0.5 ? a.shape : b.shape,
      stretch: (a.stretch ?? 1) + ((b.stretch ?? 1) - (a.stretch ?? 1)) * p
    };
  }
  return result.filter(Boolean) as Particle[];
};

export const renderParticles = (
  ctx: CanvasRenderingContext2D,
  particles: Particle[],
  driftParticles?: { x: number; y: number; size: number; opacity: number; vx: number; vy: number; color: string }[]
): void => {
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';

  for (const p of particles) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.globalAlpha = p.opacity;
    ctx.fillStyle = p.color;
    ctx.strokeStyle = p.color;

    switch (p.shape) {
      case 'ellipse':
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size * (p.stretch ?? 1.5), p.size / (p.stretch ?? 1.5), 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'line':
        ctx.lineWidth = Math.max(0.4, p.size * 0.15 * (p.stretch ?? 1));
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-p.size / 2, 0);
        ctx.lineTo(p.size / 2, 0);
        ctx.stroke();
        break;
      case 'speck':
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'circle':
      default:
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size);
        grad.addColorStop(0, p.color);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
  }

  if (driftParticles && driftParticles.length > 0) {
    for (const d of driftParticles) {
      ctx.save();
      ctx.globalAlpha = d.opacity;
      ctx.fillStyle = d.color;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  ctx.restore();
};
