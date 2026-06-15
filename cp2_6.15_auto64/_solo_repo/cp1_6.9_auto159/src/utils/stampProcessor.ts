export type BorderShape = 'circle' | 'ellipse' | 'rectangle' | 'hexagon';

export interface Point {
  x: number;
  y: number;
}

export interface PathData {
  points: Point[];
  color: string;
  strokeWidth: number;
}

export interface BorderConfig {
  shape: BorderShape;
  color: string;
  strokeWidth: number;
  width: number;
  height: number;
}

export interface TextConfig {
  text: string;
  font: string;
  color: string;
  fontSize: number;
}

export interface StampData {
  paths: PathData[];
  border: BorderConfig;
  text: TextConfig;
}

export const CANVAS_SIZE = 400;

export function simplifyPath(points: Point[], tolerance: number = 2): Point[] {
  if (points.length < 3) return points;

  const result: Point[] = [];
  result.push(points[0]);

  let lastKey = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistance(
      points[lastKey],
      points[i],
      points[points.length - 1]
    );
    if (dist > tolerance) {
      result.push(points[i]);
      lastKey = i;
    }
  }
  result.push(points[points.length - 1]);
  return result;
}

function perpendicularDistance(start: Point, point: Point, end: Point): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const mag = Math.sqrt(dx * dx + dy * dy);
  if (mag === 0) return Math.hypot(point.x - start.x, point.y - start.y);
  return Math.abs(dy * point.x - dx * point.y + end.x * start.y - end.y * start.x) / mag;
}

export function pointsToPathD(points: Point[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) {
    const p = points[0];
    return `M ${p.x} ${p.y} L ${p.x + 0.5} ${p.y + 0.5}`;
  }

  let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let i = 1; i < points.length; i++) {
    const p = points[i];
    d += ` L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
  }
  return d;
}

export function generateBorderSVG(config: BorderConfig): string {
  const { shape, color, strokeWidth, width, height } = config;
  const cx = CANVAS_SIZE / 2;
  const cy = CANVAS_SIZE / 2;
  const rx = width / 2;
  const ry = height / 2;

  switch (shape) {
    case 'circle':
      return `<circle cx="${cx}" cy="${cy}" r="${rx}" fill="none" stroke="${color}" stroke-width="${strokeWidth}"/>`;
    case 'ellipse':
      return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="${color}" stroke-width="${strokeWidth}"/>`;
    case 'rectangle':
      return `<rect x="${cx - rx}" y="${cy - ry}" width="${width}" height="${height}" rx="8" fill="none" stroke="${color}" stroke-width="${strokeWidth}"/>`;
    case 'hexagon': {
      const points = generateHexagonPoints(cx, cy, rx, ry);
      return `<polygon points="${points}" fill="none" stroke="${color}" stroke-width="${strokeWidth}"/>`;
    }
  }
}

function generateHexagonPoints(cx: number, cy: number, rx: number, ry: number): string {
  const points: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    const x = cx + rx * Math.cos(angle);
    const y = cy + ry * Math.sin(angle);
    points.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return points.join(' ');
}

export function getBorderInnerBounds(config: BorderConfig): { minX: number; minY: number; maxX: number; maxY: number } {
  const cx = CANVAS_SIZE / 2;
  const cy = CANVAS_SIZE / 2;
  const padding = config.strokeWidth + 10;
  const rx = config.width / 2 - padding;
  const ry = config.height / 2 - padding;

  return {
    minX: cx - rx,
    minY: cy - ry,
    maxX: cx + rx,
    maxY: cy + ry,
  };
}

export function fitPathsToBorder(paths: PathData[], config: BorderConfig): PathData[] {
  if (paths.length === 0) return paths;

  const bounds = getBorderInnerBounds(config);
  const targetW = bounds.maxX - bounds.minX;
  const targetH = bounds.maxY - bounds.minY;
  const targetCenterX = (bounds.minX + bounds.maxX) / 2;
  const targetCenterY = (bounds.minY + bounds.maxY) / 2;

  let allMinX = Infinity, allMinY = Infinity, allMaxX = -Infinity, allMaxY = -Infinity;
  for (const path of paths) {
    for (const p of path.points) {
      allMinX = Math.min(allMinX, p.x);
      allMinY = Math.min(allMinY, p.y);
      allMaxX = Math.max(allMaxX, p.x);
      allMaxY = Math.max(allMaxY, p.y);
    }
  }

  const srcW = allMaxX - allMinX;
  const srcH = allMaxY - allMinY;
  if (srcW === 0 || srcH === 0) return paths;

  const scale = Math.min(targetW / srcW, targetH / srcH, 1);
  const srcCenterX = (allMinX + allMaxX) / 2;
  const srcCenterY = (allMinY + allMaxY) / 2;
  const offsetX = targetCenterX - srcCenterX * scale;
  const offsetY = targetCenterY - srcCenterY * scale;

  return paths.map(path => ({
    ...path,
    points: path.points.map(p => ({
      x: p.x * scale + offsetX,
      y: p.y * scale + offsetY,
    })),
  }));
}

export async function extractImageContours(
  file: File,
  simplificationLevel: 'low' | 'medium' | 'high' = 'medium'
): Promise<PathData[]> {
  const img = await loadImage(file);
  const maxSize = 1024;
  const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
  const w = Math.floor(img.width * scale);
  const h = Math.floor(img.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, w, h);

  const imageData = ctx.getImageData(0, 0, w, h);
  const binary = thresholdImage(imageData);
  const contours = findContours(binary, w, h);

  const toleranceMap = { low: 5, medium: 2, high: 0.5 };
  const tolerance = toleranceMap[simplificationLevel];

  const targetScale = CANVAS_SIZE / Math.max(w, h);
  const offsetX = (CANVAS_SIZE - w * targetScale) / 2;
  const offsetY = (CANVAS_SIZE - h * targetScale) / 2;

  return contours
    .filter(pts => pts.length >= 10)
    .map(pts => {
      const transformed = pts.map(p => ({
        x: p.x * targetScale + offsetX,
        y: p.y * targetScale + offsetY,
      }));
      return {
        points: simplifyPath(transformed, tolerance),
        color: '#000000',
        strokeWidth: 2,
      };
    });
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function thresholdImage(imageData: ImageData): Uint8Array {
  const { data, width, height } = imageData;
  const result = new Uint8Array(width * height);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    const idx = i / 4;

    if (a < 128) {
      result[idx] = 0;
    } else {
      result[idx] = gray < 180 ? 1 : 0;
    }
  }

  return result;
}

function findContours(binary: Uint8Array, w: number, h: number): Point[][] {
  const contours: Point[][] = [];
  const visited = new Uint8Array(w * h);
  const directions = [
    [1, 0], [1, -1], [0, -1], [-1, -1],
    [-1, 0], [-1, 1], [0, 1], [1, 1]
  ];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (binary[idx] === 1 && visited[idx] === 0) {
        const contour: Point[] = [];
        let cx = x, cy = y;
        let dir = 0;

        do {
          const cidx = cy * w + cx;
          if (visited[cidx] === 0) {
            contour.push({ x: cx, y: cy });
            visited[cidx] = 1;
          }

          let found = false;
          for (let d = 0; d < 8; d++) {
            const nd = (dir + d) % 8;
            const nx = cx + directions[nd][0];
            const ny = cy + directions[nd][1];
            if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
              const nidx = ny * w + nx;
              if (binary[nidx] === 1 && visited[nidx] === 0) {
                cx = nx;
                cy = ny;
                dir = (nd + 5) % 8;
                found = true;
                break;
              }
            }
          }
          if (!found) break;
        } while (!(cx === x && cy === y) && contour.length < 5000);

        if (contour.length >= 10) {
          contours.push(contour);
        }
      }
    }
  }

  return contours;
}

export function generateArcTextSVG(config: TextConfig, border: BorderConfig): string {
  const { text, font, color, fontSize } = config;
  if (!text) return '';

  const cx = CANVAS_SIZE / 2;
  const cy = CANVAS_SIZE / 2;
  const r = Math.min(border.width, border.height) / 2 - border.strokeWidth - 5;

  const chars = Array.from(text).slice(0, 8);
  const totalAngle = Math.PI * 0.8;
  const startAngle = Math.PI / 2 + totalAngle / 2;
  const angleStep = chars.length > 1 ? totalAngle / (chars.length - 1) : 0;

  let textElements = '';
  chars.forEach((char, i) => {
    const angle = startAngle - i * angleStep;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    const rotation = (angle * 180) / Math.PI + 90;
    textElements += `<text x="${x.toFixed(2)}" y="${y.toFixed(2)}" font-family="${font}" font-size="${fontSize}" fill="${color}" text-anchor="middle" dominant-baseline="middle" transform="rotate(${rotation.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)})">${char}</text>`;
  });

  return `<g>${textElements}</g>`;
}

export function generateFullSVG(stamp: StampData): string {
  const fittedPaths = fitPathsToBorder(stamp.paths, stamp.border);
  const borderSVG = generateBorderSVG(stamp.border);
  const textSVG = generateArcTextSVG(stamp.text, stamp.border);

  let pathsSVG = '';
  for (const path of fittedPaths) {
    const d = pointsToPathD(path.points);
    if (d) {
      pathsSVG += `<path d="${d}" fill="none" stroke="${path.color}" stroke-width="${path.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`;
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}" width="${CANVAS_SIZE}" height="${CANVAS_SIZE}">
  <g>
    ${borderSVG}
    ${pathsSVG}
    ${textSVG}
  </g>
</svg>`;
}

export function downloadSVG(svgContent: string, filename: string = 'stamp.svg'): void {
  const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    } catch {
      document.body.removeChild(textarea);
      return false;
    }
  }
}

export const COLOR_PALETTE = [
  '#000000', '#C0392B', '#E74C3C', '#922B21',
  '#1B4F72', '#2E86C1', '#117A65', '#1E8449',
  '#7D6608', '#D4AC0D', '#873600', '#6C3483',
  '#AF601A', '#566573', '#283747', '#641E16',
];

export const CHINESE_FONTS = [
  { name: '马善政楷体', value: "'Ma Shan Zheng', cursive" },
  { name: '站酷快乐体', value: "'ZCOOL KuaiLe', cursive" },
];
