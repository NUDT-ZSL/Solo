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
}

export interface ParseError {
  code:
    | 'INVALID_FILE_TYPE'
    | 'FILE_TOO_LARGE'
    | 'INVALID_IMAGE'
    | 'IMAGE_TOO_LARGE'
    | 'CANVAS_UNSUPPORTED'
    | 'CANVAS_READ_ERROR'
    | 'DECODE_ERROR'
    | 'NO_VALID_POINTS';
  message: string;
}

const DEFAULT_MAX_POINTS = 20000;
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg'];
const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg'];
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 8192;
const MIN_IMAGE_DIMENSION = 4;
const FOREGROUND_B_THRESHOLD = 128;

export function validateFile(file: File): ParseError | null {
  if (!file) {
    return { code: 'INVALID_FILE_TYPE', message: '未选择文件' };
  }

  const mimeOk = ALLOWED_MIME_TYPES.includes(file.type.toLowerCase());
  const name = file.name.toLowerCase();
  const extOk = ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext));

  if (!mimeOk && !extOk) {
    return {
      code: 'INVALID_FILE_TYPE',
      message: `不支持的文件格式。请上传 PNG 或 JPEG 格式的深度图（当前：${
        file.type || '未知类型'
      }）`,
    };
  }

  if (file.size === 0) {
    return { code: 'INVALID_FILE_TYPE', message: '文件为空，请重新选择' };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      code: 'FILE_TOO_LARGE',
      message: `文件过大（${(file.size / 1048576).toFixed(
        1
      )} MB），最大支持 50 MB`,
    };
  }

  return null;
}

export function validateImageDimensions(
  width: number,
  height: number
): ParseError | null {
  if (!width || !height || width < MIN_IMAGE_DIMENSION || height < MIN_IMAGE_DIMENSION) {
    return {
      code: 'INVALID_IMAGE',
      message: `图像尺寸无效（${width}×${height}），最小支持 ${MIN_IMAGE_DIMENSION}×${MIN_IMAGE_DIMENSION}`,
    };
  }

  if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
    return {
      code: 'IMAGE_TOO_LARGE',
      message: `图像尺寸过大（${width}×${height}），最大支持 ${MAX_IMAGE_DIMENSION}×${MAX_IMAGE_DIMENSION}`,
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
  } = options;

  const { width, height, data } = imageData;
  const totalPixels = width * height;

  if (!data || data.length !== totalPixels * 4) {
    throw Object.assign(new Error('ImageData 结构异常'), {
      code: 'DECODE_ERROR',
    });
  }

  const validIndices: number[] = [];
  const validDepths: number[] = [];
  let minDepth = Infinity;
  let maxDepth = -Infinity;

  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const a = data[idx + 3];

    if (a < 8) continue;

    if (b <= FOREGROUND_B_THRESHOLD) continue;

    const depth16 = (r << 8) | g;
    if (depth16 <= 0 || depth16 >= 65535) continue;

    const depthNormalized = depth16 / 65535;

    validIndices.push(i);
    validDepths.push(depthNormalized);

    if (depthNormalized < minDepth) minDepth = depthNormalized;
    if (depthNormalized > maxDepth) maxDepth = depthNormalized;
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
  const stride = Math.max(1, Math.floor(validIndices.length / actualPoints));

  const positions = new Float32Array(actualPoints * 3);
  const colors = new Float32Array(actualPoints * 3);
  const rawDepthValues = new Float32Array(actualPoints);

  let outIndex = 0;
  const aspectRatio = width / height;

  for (let v = 0; v < validIndices.length && outIndex < actualPoints; v++) {
    if (v % stride !== 0) continue;

    const pixelIdx = validIndices[v];
    const idx = pixelIdx * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const depthNormalized = validDepths[v];

    const u = (pixelIdx % width) / width;
    const vTex = Math.floor(pixelIdx / width) / height;

    const x = (u - 0.5) * 2 * aspectRatio;
    const y = (0.5 - vTex) * 2;
    const z = ((depthNormalized - minDepth) / depthRange) * depthScale + depthOffset;

    const posIdx = outIndex * 3;
    positions[posIdx] = x;
    positions[posIdx + 1] = y;
    positions[posIdx + 2] = z;

    const colorIdx = outIndex * 3;
    colors[colorIdx] = r / 255;
    colors[colorIdx + 1] = g / 255;
    colors[colorIdx + 2] = b / 255;

    rawDepthValues[outIndex] = (depthNormalized - minDepth) / depthRange;

    outIndex++;
  }

  const finalCount = outIndex;

  return {
    positions: positions.slice(0, finalCount * 3),
    colors: colors.slice(0, finalCount * 3),
    rawDepthValues: rawDepthValues.slice(0, finalCount),
    pointCount: finalCount,
    width,
    height,
    minDepth,
    maxDepth,
  };
}

export async function loadImage(file: File): Promise<HTMLImageElement> {
  const fileErr = validateFile(file);
  if (fileErr) {
    throw Object.assign(new Error(fileErr.message), { code: fileErr.code });
  }

  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';

    const url = URL.createObjectURL(file);
    let cleanedUp = false;
    const cleanup = () => {
      if (!cleanedUp) {
        cleanedUp = true;
        try {
          URL.revokeObjectURL(url);
        } catch (_) {
          /* ignore */
        }
      }
    };

    const timeoutId = window.setTimeout(() => {
      cleanup();
      reject(
        Object.assign(new Error('图片加载超时，请检查网络或文件'), {
          code: 'INVALID_IMAGE',
        })
      );
    }, 15000);

    img.onerror = () => {
      window.clearTimeout(timeoutId);
      cleanup();
      reject(
        Object.assign(new Error('图片解码失败，文件可能已损坏'), {
          code: 'DECODE_ERROR',
        })
      );
    };

    img.onload = () => {
      window.clearTimeout(timeoutId);

      const dimErr = validateImageDimensions(img.naturalWidth, img.naturalHeight);
      if (dimErr) {
        cleanup();
        reject(Object.assign(new Error(dimErr.message), { code: dimErr.code }));
        return;
      }

      resolve(img);
    };

    img.src = url;
  });
}

export function getImageData(img: HTMLImageElement): ImageData {
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;

  if (w <= 0 || h <= 0) {
    throw Object.assign(new Error('图像尺寸无效'), { code: 'INVALID_IMAGE' });
  }

  let canvas: HTMLCanvasElement | null = null;
  let ctx: CanvasRenderingContext2D | null = null;

  try {
    canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;

    ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      throw Object.assign(new Error('当前浏览器不支持 Canvas 2D 上下文'), {
        code: 'CANVAS_UNSUPPORTED',
      });
    }

    try {
      ctx.drawImage(img, 0, 0, w, h);
    } catch (e) {
      throw Object.assign(
        new Error(
          '无法绘制图像到 Canvas（可能是跨域污染或文件格式不支持）'
        ),
        { code: 'DECODE_ERROR' }
      );
    }

    let imageData: ImageData;
    try {
      imageData = ctx.getImageData(0, 0, w, h);
    } catch (e) {
      throw Object.assign(
        new Error('无法读取图像像素（跨域受限，请上传本地文件）'),
        { code: 'CANVAS_READ_ERROR' }
      );
    }

    if (!imageData || !imageData.data || imageData.data.length === 0) {
      throw Object.assign(new Error('像素数据为空'), { code: 'DECODE_ERROR' });
    }

    return imageData;
  } finally {
    if (ctx) {
      try {
        ctx.clearRect(0, 0, w, h);
      } catch (_) {
        /* ignore */
      }
    }
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
      canvas = null;
    }
    ctx = null;
  }
}
