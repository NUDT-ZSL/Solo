export interface FilterParams {
  oilPaint?: number;
  watercolor?: number;
  sketch?: number;
  mosaic?: number;
  filmGrain?: number;
}

export interface FilterConfig {
  name: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
}

export interface AppliedFilter {
  type: keyof FilterParams;
  value: number;
  name: string;
  unit: string;
}

let offscreenCanvas: OffscreenCanvas | null = null;
let offscreenCtx: OffscreenCanvasRenderingContext2D | null = null;
let mosaicCanvas: OffscreenCanvas | null = null;
let mosaicCtx: OffscreenCanvasRenderingContext2D | null = null;

function getOffscreenContext(width: number, height: number): OffscreenCanvasRenderingContext2D {
  if (!offscreenCanvas || offscreenCanvas.width !== width || offscreenCanvas.height !== height) {
    offscreenCanvas = new OffscreenCanvas(width, height);
    offscreenCtx = offscreenCanvas.getContext('2d', { willReadFrequently: true });
  }
  return offscreenCtx!;
}

function getMosaicContext(width: number, height: number): OffscreenCanvasRenderingContext2D {
  if (!mosaicCanvas || mosaicCanvas.width !== width || mosaicCanvas.height !== height) {
    mosaicCanvas = new OffscreenCanvas(width, height);
    mosaicCtx = mosaicCanvas.getContext('2d', { willReadFrequently: true });
  }
  return mosaicCtx!;
}

export function applyOilPaint(imageData: ImageData, blockSize: number): ImageData {
  const startTime = performance.now();
  const { width, height } = imageData;

  const ctx = getOffscreenContext(width, height);
  ctx.clearRect(0, 0, width, height);
  ctx.putImageData(imageData, 0, 0);

  const smallWidth = Math.ceil(width / blockSize);
  const smallHeight = Math.ceil(height / blockSize);
  const smallCanvas = new OffscreenCanvas(smallWidth, smallHeight);
  const smallCtx = smallCanvas.getContext('2d')!;
  smallCtx.imageSmoothingEnabled = true;
  (smallCtx as unknown as { imageSmoothingQuality: string }).imageSmoothingQuality = 'low';
  smallCtx.drawImage(offscreenCanvas!, 0, 0, smallWidth, smallHeight);

  const tempCanvas = new OffscreenCanvas(width, height);
  const tempCtx = tempCanvas.getContext('2d')!;
  tempCtx.imageSmoothingEnabled = false;
  tempCtx.drawImage(smallCanvas, 0, 0, width, height);

  const result = tempCtx.getImageData(0, 0, width, height);

  console.debug(`油画滤镜处理时间: ${(performance.now() - startTime).toFixed(2)}ms`);
  return result;
}

export function applyWatercolor(imageData: ImageData, blurRadius: number): ImageData {
  const startTime = performance.now();
  const { width, height } = imageData;
  
  const ctx = getOffscreenContext(width, height);
  ctx.clearRect(0, 0, width, height);
  ctx.putImageData(imageData, 0, 0);
  
  ctx.filter = `blur(${blurRadius}px) saturate(1.2)`;
  ctx.drawImage(offscreenCanvas!, 0, 0);
  
  const result = ctx.getImageData(0, 0, width, height);
  
  const data = result.data;
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.min(255, data[i] * 1.05);
    data[i + 1] = Math.min(255, data[i + 1] * 1.05);
    data[i + 2] = Math.min(255, data[i + 2] * 1.05);
  }
  
  console.debug(`水彩滤镜处理时间: ${(performance.now() - startTime).toFixed(2)}ms`);
  return result;
}

export function applySketch(imageData: ImageData, edgeStrength: number): ImageData {
  const startTime = performance.now();
  const { width, height, data } = imageData;
  const result = new ImageData(width, height);
  const resultData = result.data;

  const grayData = new Float32Array(width * height);
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    grayData[j] = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
  }

  const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
        const idx = (y * width + x) * 4;
        resultData[idx] = 255;
        resultData[idx + 1] = 255;
        resultData[idx + 2] = 255;
        resultData[idx + 3] = 255;
        continue;
      }

      let gx = 0, gy = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const grayIdx = (y + ky) * width + (x + kx);
          const kernelIdx = (ky + 1) * 3 + (kx + 1);
          gx += grayData[grayIdx] * sobelX[kernelIdx];
          gy += grayData[grayIdx] * sobelY[kernelIdx];
        }
      }

      const magnitude = Math.sqrt(gx * gx + gy * gy);
      const edge = Math.max(0, 255 - magnitude * edgeStrength);
      
      const idx = (y * width + x) * 4;
      resultData[idx] = edge;
      resultData[idx + 1] = edge;
      resultData[idx + 2] = edge;
      resultData[idx + 3] = 255;
    }
  }

  console.debug(`素描滤镜处理时间: ${(performance.now() - startTime).toFixed(2)}ms`);
  return result;
}

export function applyMosaic(imageData: ImageData, cellSize: number): ImageData {
  const startTime = performance.now();
  const { width, height } = imageData;

  const ctx = getMosaicContext(width, height);
  ctx.clearRect(0, 0, width, height);
  ctx.putImageData(imageData, 0, 0);

  const smallWidth = Math.max(1, Math.ceil(width / cellSize));
  const smallHeight = Math.max(1, Math.ceil(height / cellSize));
  const smallCanvas = new OffscreenCanvas(smallWidth, smallHeight);
  const smallCtx = smallCanvas.getContext('2d')!;
  smallCtx.imageSmoothingEnabled = true;
  (smallCtx as unknown as { imageSmoothingQuality: string }).imageSmoothingQuality = 'low';
  smallCtx.drawImage(mosaicCanvas!, 0, 0, smallWidth, smallHeight);

  const resultCanvas = new OffscreenCanvas(width, height);
  const resultCtx = resultCanvas.getContext('2d')!;
  resultCtx.imageSmoothingEnabled = false;
  resultCtx.drawImage(smallCanvas, 0, 0, width, height);

  const result = resultCtx.getImageData(0, 0, width, height);

  console.debug(`马赛克滤镜处理时间: ${(performance.now() - startTime).toFixed(2)}ms`);
  return result;
}

export function applyFilmGrain(imageData: ImageData, density: number): ImageData {
  const startTime = performance.now();
  const { width, height, data } = imageData;
  const result = new ImageData(width, height);
  const resultData = result.data;

  const intensity = density / 80;

  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * intensity * 60;
    resultData[i] = Math.max(0, Math.min(255, data[i] + noise));
    resultData[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise * 0.9));
    resultData[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise * 0.8));
    resultData[i + 3] = data[i + 3];
  }

  console.debug(`胶片颗粒滤镜处理时间: ${(performance.now() - startTime).toFixed(2)}ms`);
  return result;
}

export function applySingleFilter(
  imageData: ImageData,
  filterType: keyof FilterParams,
  value: number
): ImageData {
  switch (filterType) {
    case 'oilPaint':
      return applyOilPaint(imageData, value);
    case 'watercolor':
      return applyWatercolor(imageData, value);
    case 'sketch':
      return applySketch(imageData, value);
    case 'mosaic':
      return applyMosaic(imageData, value);
    case 'filmGrain':
      return applyFilmGrain(imageData, value);
    default:
      return imageData;
  }
}

export function applyFilters(
  imageData: ImageData,
  filters: FilterParams
): ImageData {
  let result = imageData;

  if (filters.oilPaint !== undefined) {
    result = applyOilPaint(result, filters.oilPaint);
  }
  if (filters.watercolor !== undefined) {
    result = applyWatercolor(result, filters.watercolor);
  }
  if (filters.sketch !== undefined) {
    result = applySketch(result, filters.sketch);
  }
  if (filters.mosaic !== undefined) {
    result = applyMosaic(result, filters.mosaic);
  }
  if (filters.filmGrain !== undefined) {
    result = applyFilmGrain(result, filters.filmGrain);
  }

  return result;
}

export function applyFiltersSequential(
  imageData: ImageData,
  appliedFilters: AppliedFilter[]
): ImageData {
  let result = imageData;
  
  for (const filter of appliedFilters) {
    result = applySingleFilter(result, filter.type, filter.value);
  }
  
  return result;
}

export const filterConfigs: Record<keyof FilterParams, FilterConfig> = {
  oilPaint: {
    name: '油画',
    value: 8,
    min: 3,
    max: 20,
    step: 1,
    unit: 'px'
  },
  watercolor: {
    name: '水彩',
    value: 5,
    min: 0,
    max: 15,
    step: 0.5,
    unit: 'px'
  },
  sketch: {
    name: '素描',
    value: 0.8,
    min: 0.1,
    max: 2.0,
    step: 0.1,
    unit: ''
  },
  mosaic: {
    name: '马赛克',
    value: 10,
    min: 5,
    max: 30,
    step: 1,
    unit: 'px'
  },
  filmGrain: {
    name: '胶片颗粒',
    value: 30,
    min: 5,
    max: 80,
    step: 1,
    unit: ''
  }
};
