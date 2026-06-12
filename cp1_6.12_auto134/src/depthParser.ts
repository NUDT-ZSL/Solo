export interface ParsedPointCloud {
  positions: Float32Array;
  colors: Float32Array;
  pointCount: number;
  width: number;
  height: number;
  minDepth: number;
  maxDepth: number;
}

export interface DepthParseOptions {
  maxPoints?: number;
  depthScale?: number;
  depthOffset?: number;
}

const DEFAULT_MAX_POINTS = 20000;

export function parseDepthImage(
  imageData: ImageData,
  options: DepthParseOptions = {}
): ParsedPointCloud {
  const { maxPoints = DEFAULT_MAX_POINTS, depthScale = 1.0, depthOffset = 0 } = options;
  const { width, height, data } = imageData;
  const totalPixels = width * height;

  let minDepth = Infinity;
  let maxDepth = -Infinity;
  const validDepths: number[] = [];

  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const a = data[idx + 3];

    if (a < 10 || b < 30) continue;

    const depth = (r * 256 + g) / 65535;
    if (depth <= 0) continue;

    validDepths.push(depth);
    if (depth < minDepth) minDepth = depth;
    if (depth > maxDepth) maxDepth = depth;
  }

  if (validDepths.length === 0) {
    return {
      positions: new Float32Array(),
      colors: new Float32Array(),
      pointCount: 0,
      width,
      height,
      minDepth: 0,
      maxDepth: 0,
    };
  }

  const depthRange = maxDepth - minDepth || 1;
  const actualPoints = Math.min(validDepths.length, maxPoints);
  const stride = Math.floor(validDepths.length / actualPoints) || 1;

  const positions = new Float32Array(actualPoints * 3);
  const colors = new Float32Array(actualPoints * 3);

  let pointIndex = 0;
  let validIndex = 0;

  for (let i = 0; i < totalPixels && pointIndex < actualPoints; i++) {
    const idx = i * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const a = data[idx + 3];

    if (a < 10 || b < 30) continue;

    const depth = (r * 256 + g) / 65535;
    if (depth <= 0) continue;

    if (validIndex % stride !== 0) {
      validIndex++;
      continue;
    }
    validIndex++;

    const x = ((i % width) / width - 0.5) * 2;
    const y = (-(Math.floor(i / width) / height) + 0.5) * 2;
    const z = (depth - minDepth) / depthRange * depthScale + depthOffset;

    const posIdx = pointIndex * 3;
    positions[posIdx] = x;
    positions[posIdx + 1] = y;
    positions[posIdx + 2] = z;

    const colorIdx = pointIndex * 3;
    colors[colorIdx] = r / 255;
    colors[colorIdx + 1] = g / 255;
    colors[colorIdx + 2] = b / 255;

    pointIndex++;
  }

  const actualCount = pointIndex;

  return {
    positions: positions.slice(0, actualCount * 3),
    colors: colors.slice(0, actualCount * 3),
    pointCount: actualCount,
    width,
    height,
    minDepth,
    maxDepth,
  };
}

export function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export function getImageData(img: HTMLImageElement): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法获取Canvas 2D上下文');
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}
