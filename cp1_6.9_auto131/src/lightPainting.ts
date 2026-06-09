export interface Point {
  x: number;
  y: number;
}

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface HSL {
  h: number;
  s: number;
  l: number;
}

export interface Particle {
  pathProgress: number;
  speed: number;
  size: number;
  hueOffset: number;
  alpha: number;
}

export interface ProcessImageResult {
  primaryColor: RGB;
  controlPoints: Point[];
  particles: Particle[];
}

const SAMPLE_SIZE = 100;
const KMEANS_K = 5;
const KMEANS_ITER = 3;
const EDGE_THRESHOLD = 30;
const CONTROL_POINTS_COUNT = 50;
const PARTICLE_COUNT = 120;
const CANVAS_W = 800;
const CANVAS_H = 600;

export function rgbToHex(rgb: RGB): string {
  const toHex = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0');
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

export function rgbToHsl(rgb: RGB): HSL {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

export function hslToRgb(hsl: HSL): RGB {
  const h = hsl.h / 360;
  const s = hsl.s / 100;
  const l = hsl.l / 100;
  let r: number, g: number, b: number;
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
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

export function getCenterSampleData(imageData: ImageData): ImageData {
  const srcW = imageData.width;
  const srcH = imageData.height;
  const sx = Math.max(0, Math.floor((srcW - SAMPLE_SIZE) / 2));
  const sy = Math.max(0, Math.floor((srcH - SAMPLE_SIZE) / 2));
  const actualW = Math.min(SAMPLE_SIZE, srcW - sx);
  const actualH = Math.min(SAMPLE_SIZE, srcH - sy);
  const tmpCanvas = document.createElement('canvas');
  tmpCanvas.width = SAMPLE_SIZE;
  tmpCanvas.height = SAMPLE_SIZE;
  const tmpCtx = tmpCanvas.getContext('2d')!;
  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = srcW;
  srcCanvas.height = srcH;
  const srcCtx = srcCanvas.getContext('2d')!;
  srcCtx.putImageData(imageData, 0, 0);
  tmpCtx.drawImage(srcCanvas, sx, sy, actualW, actualH, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
  return tmpCtx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
}

export function extractPrimaryColor(sampleData: ImageData): RGB {
  const pixels: number[][] = [];
  const data = sampleData.data;
  for (let i = 0; i < data.length; i += 4) {
    pixels.push([data[i], data[i + 1], data[i + 2]]);
  }
  const total = pixels.length;
  const centers: number[][] = [];
  const step = Math.floor(total / KMEANS_K);
  for (let i = 0; i < KMEANS_K; i++) {
    centers.push([...pixels[Math.min(i * step + Math.floor(Math.random() * step), total - 1)]]);
  }
  for (let iter = 0; iter < KMEANS_ITER; iter++) {
    const sums = Array.from({ length: KMEANS_K }, () => [0, 0, 0, 0]);
    for (let p = 0; p < total; p++) {
      const px = pixels[p];
      let minDist = Infinity;
      let bestK = 0;
      for (let k = 0; k < KMEANS_K; k++) {
        const dr = px[0] - centers[k][0];
        const dg = px[1] - centers[k][1];
        const db = px[2] - centers[k][2];
        const d = dr * dr + dg * dg + db * db;
        if (d < minDist) { minDist = d; bestK = k; }
      }
      sums[bestK][0] += px[0];
      sums[bestK][1] += px[1];
      sums[bestK][2] += px[2];
      sums[bestK][3] += 1;
    }
    for (let k = 0; k < KMEANS_K; k++) {
      if (sums[k][3] > 0) {
        centers[k][0] = sums[k][0] / sums[k][3];
        centers[k][1] = sums[k][1] / sums[k][3];
        centers[k][2] = sums[k][2] / sums[k][3];
      }
    }
  }
  const counts = new Array(KMEANS_K).fill(0);
  for (let p = 0; p < total; p++) {
    const px = pixels[p];
    let minDist = Infinity;
    let bestK = 0;
    for (let k = 0; k < KMEANS_K; k++) {
      const dr = px[0] - centers[k][0];
      const dg = px[1] - centers[k][1];
      const db = px[2] - centers[k][2];
      const d = dr * dr + dg * dg + db * db;
      if (d < minDist) { minDist = d; bestK = k; }
    }
    counts[bestK]++;
  }
  let maxIdx = 0;
  for (let k = 1; k < KMEANS_K; k++) {
    if (counts[k] > counts[maxIdx]) maxIdx = k;
  }
  return {
    r: Math.round(centers[maxIdx][0]),
    g: Math.round(centers[maxIdx][1]),
    b: Math.round(centers[maxIdx][2]),
  };
}

export function detectEdges(sampleData: ImageData): Point[] {
  const w = sampleData.width;
  const h = sampleData.height;
  const data = sampleData.data;
  const gray = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const idx = i * 4;
    gray[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
  }
  const edgePoints: Point[] = [];
  const gx = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
  const gy = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      let sx = 0;
      let sy = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const g = gray[(y + ky) * w + (x + kx)];
          sx += gx[ky + 1][kx + 1] * g;
          sy += gy[ky + 1][kx + 1] * g;
        }
      }
      const mag = Math.sqrt(sx * sx + sy * sy);
      if (mag >= EDGE_THRESHOLD) {
        edgePoints.push({ x, y });
      }
    }
  }
  return edgePoints;
}

export function generateControlPoints(edgePoints: Point[]): Point[] {
  if (edgePoints.length < 2) {
    const pts: Point[] = [];
    for (let i = 0; i < CONTROL_POINTS_COUNT; i++) {
      const t = i / (CONTROL_POINTS_COUNT - 1);
      pts.push({
        x: 100 + t * (CANVAS_W - 200) + (Math.random() - 0.5) * 30,
        y: CANVAS_H / 2 + Math.sin(t * Math.PI * 2) * 100 + (Math.random() - 0.5) * 20,
      });
    }
    return pts;
  }
  const sorted = [...edgePoints].sort((a, b) => a.x - b.x);
  const selected: Point[] = [];
  const srcCount = sorted.length;
  for (let i = 0; i < CONTROL_POINTS_COUNT; i++) {
    const ratio = i / (CONTROL_POINTS_COUNT - 1);
    const idx = Math.min(Math.floor(ratio * (srcCount - 1)), srcCount - 1);
    const p = sorted[idx];
    const scaledX = 80 + (p.x / SAMPLE_SIZE) * (CANVAS_W - 160);
    const scaledY = 80 + (p.y / SAMPLE_SIZE) * (CANVAS_H - 160);
    const noise = (Math.random() - 0.5) * 4;
    selected.push({ x: scaledX + noise, y: scaledY + noise });
  }
  for (let i = 1; i < selected.length - 1; i++) {
    selected[i].x = selected[i - 1].x * 0.3 + selected[i].x * 0.4 + selected[i + 1].x * 0.3;
    selected[i].y = selected[i - 1].y * 0.3 + selected[i].y * 0.4 + selected[i + 1].y * 0.3;
  }
  return selected;
}

export function generateParticles(): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push({
      pathProgress: Math.random(),
      speed: 0.4 + Math.random() * 0.8,
      size: 1.5 + Math.random() * 2.5,
      hueOffset: (Math.random() - 0.5) * 60,
      alpha: 0.5 + Math.random() * 0.5,
    });
  }
  return particles;
}

export function catmullRomPoint(points: Point[], t: number): Point {
  const n = points.length;
  const total = n - 1;
  const scaled = t * total;
  const i = Math.min(Math.floor(scaled), total - 1);
  const localT = scaled - i;
  const p0 = points[Math.max(0, i - 1)];
  const p1 = points[i];
  const p2 = points[Math.min(n - 1, i + 1)];
  const p3 = points[Math.min(n - 1, i + 2)];
  const t2 = localT * localT;
  const t3 = t2 * localT;
  const x = 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * localT +
    (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
    (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);
  const y = 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * localT +
    (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
    (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);
  return { x, y };
}

export async function processImage(imageData: ImageData): Promise<ProcessImageResult> {
  const sample = getCenterSampleData(imageData);
  const primaryColor = extractPrimaryColor(sample);
  const edgePoints = detectEdges(sample);
  const controlPoints = generateControlPoints(edgePoints);
  const particles = generateParticles();
  return { primaryColor, controlPoints, particles };
}

export interface RenderContext {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  primaryColor: RGB;
  controlPoints: Point[];
  particles: Particle[];
  cycleProgress: number;
  playbackProgress: number;
  isPlaybackMode: boolean;
}

export function renderFrame(ctxData: RenderContext): void {
  const { ctx, width, height, primaryColor, controlPoints, particles, cycleProgress, playbackProgress, isPlaybackMode } = ctxData;
  ctx.clearRect(0, 0, width, height);
  const bgHsl = rgbToHsl(primaryColor);
  const bgAlpha = 0.3 + 0.3 * Math.sin(Math.PI * cycleProgress);
  const grad = ctx.createRadialGradient(width / 2, height / 2, 50, width / 2, height / 2, Math.max(width, height) * 0.7);
  const col1 = hslToRgb({ h: bgHsl.h, s: Math.max(bgHsl.s, 40), l: Math.min(bgHsl.l + 15, 70) });
  const col2 = hslToRgb({ h: (bgHsl.h + 40) % 360, s: Math.max(bgHsl.s - 10, 25), l: Math.max(bgHsl.l - 5, 20) });
  grad.addColorStop(0, `rgba(${col1.r},${col1.g},${col1.b},${bgAlpha})`);
  grad.addColorStop(1, `rgba(${col2.r},${col2.g},${col2.b},${Math.max(bgAlpha - 0.15, 0.05)})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
  const baseHsl = rgbToHsl(primaryColor);
  const drawEnd = isPlaybackMode ? playbackProgress : 1;
  ctx.save();
  ctx.shadowBlur = 12;
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    let prog = (p.pathProgress + cycleProgress * p.speed) % 1;
    if (isPlaybackMode && prog > drawEnd) continue;
    const drawProg = isPlaybackMode ? prog : prog;
    const pos = catmullRomPoint(controlPoints, drawProg);
    const pulse = 0.5 + 0.5 * Math.sin(Math.PI * p.pathProgress);
    const lw = 2 + 4 * pulse;
    const hueShift = p.hueOffset * Math.sin(2 * Math.PI * cycleProgress);
    const h = (baseHsl.h + hueShift + 360) % 360;
    const s = Math.max(baseHsl.s, 55);
    const l = Math.min(baseHsl.l + 10 + pulse * 12, 80);
    const c = hslToRgb({ h, s, l });
    const alpha = p.alpha * (0.7 + 0.3 * pulse);
    ctx.beginPath();
    ctx.strokeStyle = `rgba(${c.r},${c.g},${c.b},${alpha})`;
    ctx.lineWidth = lw;
    ctx.lineCap = 'round';
    ctx.shadowColor = `rgba(${c.r},${c.g},${c.b},${0.7})`;
    const prevProg = Math.max(0, drawProg - 0.008);
    const prev = catmullRomPoint(controlPoints, prevProg);
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.fillStyle = `rgba(${c.r},${c.g},${c.b},${alpha * 1.1})`;
    ctx.arc(pos.x, pos.y, lw * 0.55, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  if (isPlaybackMode) {
    const head = catmullRomPoint(controlPoints, Math.min(drawEnd, 0.9999));
    const headCol = hslToRgb({ h: baseHsl.h, s: 80, l: 85 });
    ctx.save();
    ctx.shadowColor = `rgba(${headCol.r},${headCol.g},${headCol.b},1)`;
    ctx.shadowBlur = 25;
    ctx.beginPath();
    ctx.fillStyle = `rgba(${headCol.r},${headCol.g},${headCol.b},0.95)`;
    ctx.arc(head.x, head.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export function renderThumbnail(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  primaryColor: RGB
): void {
  const hsl = rgbToHsl(primaryColor);
  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, rgbToHex(primaryColor));
  const c2 = hslToRgb({ h: (hsl.h + 35) % 360, s: Math.max(hsl.s - 10, 35), l: Math.min(hsl.l + 10, 75) });
  grad.addColorStop(1, rgbToHex(c2));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = 'rgba(255,255,255,0.65)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    const x = t * width;
    const y = height / 2 + Math.sin(t * Math.PI * 2 + (hsl.h / 50)) * (height * 0.25);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(width * 0.75, height * 0.3, Math.min(width, height) * 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
