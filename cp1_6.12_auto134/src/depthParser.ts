export interface ParsedPointCloud {
  positions: Float32Array;
  colors: Float32Array;
  rawDepthValues: Float32Array;
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
  foregroundThreshold?: number;
}

export interface ParseError {
  code: 'INVALID_FILE_TYPE' | 'INVALID_IMAGE' | 'CANVAS_ERROR' | 'NO_VALID_POINTS';
  message: string;
}

const DEFAULT_MAX_POINTS = 20000;
const DEFAULT_FOREGROUND_THRESHOLD = 30;
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg'];
const MAX_IMAGE_DIMENSION = 4096;

export function validateFile(file: File): ParseError | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      code: 'INVALID_FILE_TYPE',
      message: `不支持的文件格式 "${file.type}"，请上传 PNG 或 JPEG 格式的深度图`,
    };
  }
  return null;
}

export function parseDepthImage(
  imageData: ImageData,
  options: DepthParseOptions = {}
): ParsedPointCloud {
  const {
    maxPoints = DEFAULT_MAX_POINTS,
    depthScale = 1.0,
    depthOffset = 0,
    foregroundThreshold = DEFAULT_FOREGROUND_THRESHOLD,
  } = options;

  const { width, height, data } = imageData;
  const totalPixels = width * height;

  if (width === 0 || height === 0) {
    throw new Error('图像尺寸无效');
  }

  const validIndices: number[] = [];
  const depths: number[] = [];
  let minDepth = Infinity;
  let maxDepth = -Infinity;

  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const a = data[idx + 3];

    if (a < 10) continue;
    if (b < foregroundThreshold) continue;

    const depth = (r * 256 + g) / 65535;
    if (depth <= 0 || depth > 1) continue;

    validIndices.push(i);
    depths.push(depth);
    if (depth < minDepth) minDepth = depth;
    if (depth > maxDepth) maxDepth = depth;
  }

  if (validIndices.length === 0) {
    return {
      positions: new Float32Array(),
      colors: new Float32Array(),
      rawDepthValues: new Float32Array(),
      pointCount: 0,
      width,
      height,
      minDepth: 0,
      maxDepth: 0,
    };
  }

  const depthRange = maxDepth - minDepth || 1;
  const actualPoints = Math.min(validIndices.length, maxPoints);
  const stride = Math.floor(validIndices.length / actualPoints) || 1;

  const positions = new Float32Array(actualPoints * 3);
  const colors = new Float32Array(actualPoints * 3);
  const rawDepthValues = new Float32Array(actualPoints);

  let outIndex = 0;

  for (let i = 0; i < validIndices.length && outIndex < actualPoints; i++) {
    if (i % stride !== 0) continue;

    const pixelIdx = validIndices[i];
    const idx = pixelIdx * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const depth = depths[i];

    const x = ((pixelIdx % width) / width - 0.5) * 2;
    const y = (-(Math.floor(pixelIdx / width) / height) + 0.5) * 2;
    const z = (depth - minDepth) / depthRange * depthScale + depthOffset;

    const posIdx = outIndex * 3;
    positions[posIdx] = x;
    positions[posIdx + 1] = y;
    positions[posIdx + 2] = z;

    const colorIdx = outIndex * 3;
    colors[colorIdx] = r / 255;
    colors[colorIdx + 1] = g / 255;
    colors[colorIdx + 2] = b / 255;

    rawDepthValues[outIndex] = (depth - minDepth) / depthRange;

    outIndex++;
  }

  const actualCount = outIndex;

  return {
    positions: positions.slice(0, actualCount * 3),
    colors: colors.slice(0, actualCount * 3),
    rawDepthValues: rawDepthValues.slice(0, actualCount),
    pointCount: actualCount,
    width,
    height,
    minDepth,
    maxDepth,
  };
}

export async function loadImage(file: File): Promise<HTMLImageElement> {
  const validationError = validateFile(file);
  if (validationError) {
    throw new Error(validationError.message);
  }

  return new Promise((resolve, reject) => {
    const img = new Image();

    const timeout = setTimeout(() => {
      reject(new Error('图片加载超时'));
      URL.revokeObjectURL(img.src);
    }, 10000);

    img.onload = () => {
      clearTimeout(timeout);

      if (img.width === 0 || img.height === 0) {
        reject(new Error('加载的图像尺寸无效'));
        URL.revokeObjectURL(img.src);
        return;
      }

      if (img.width > MAX_IMAGE_DIMENSION || img.height > MAX_IMAGE_DIMENSION) {
        reject(new Error(`图像尺寸过大 (${img.width}x${img.height})，最大支持 ${MAX_IMAGE_DIMENSION}x${MAX_IMAGE_DIMENSION}`));
        URL.revokeObjectURL(img.src);
        return;
      }

      resolve(img);
    };

    img.onerror = () => {
      clearTimeout(timeout);
      reject(new Error('图片加载失败，请检查文件是否损坏'));
      URL.revokeObjectURL(img.src);
    };

    img.src = URL.createObjectURL(file);
  });
}

export function getImageData(img: HTMLImageElement): ImageData {
  let canvas: HTMLCanvasElement | null = null;
  let ctx: CanvasRenderingContext2D | null = null;

  try {
    canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;

    ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      throw new Error('浏览器不支持 Canvas 2D 上下文');
    }

    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    if (!imageData || !imageData.data || imageData.data.length === 0) {
      throw new Error('无法读取图像像素数据');
    }

    return imageData;
  } catch (e) {
    if (e instanceof Error) {
      throw e;
    }
    throw new Error('图像解析过程中发生未知错误');
  } finally {
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
      canvas = null;
    }
    ctx = null;
  }
}
