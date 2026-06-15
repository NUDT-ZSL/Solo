export interface PixelData {
  r: number;
  g: number;
  b: number;
  imgX: number;
  imgY: number;
  imgWidth: number;
  imgHeight: number;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MIN_PARTICLES = 4000;
const MAX_PARTICLES = 6000;

export async function processImage(file: File): Promise<PixelData[]> {
  if (!file.type.startsWith('image/')) {
    throw new Error('请上传图片文件（jpg/png格式）');
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('图片大小不能超过5MB');
  }

  const img = await loadImage(file);
  const { ctx, scaledWidth, scaledHeight } = createSampleCanvas(img);

  const imageData = ctx.getImageData(0, 0, scaledWidth, scaledHeight);
  const pixels = imageData.data;

  const totalPixels = scaledWidth * scaledHeight;
  const particleCount = Math.min(
    MAX_PARTICLES,
    Math.max(MIN_PARTICLES, Math.floor(totalPixels * 0.05))
  );

  return samplePixels(pixels, scaledWidth, scaledHeight, particleCount);
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('图片加载失败'));
    };
    img.src = url;
  });
}

function createSampleCanvas(img: HTMLImageElement) {
  const maxDim = 400;
  let scaledWidth = img.naturalWidth;
  let scaledHeight = img.naturalHeight;

  if (scaledWidth > maxDim || scaledHeight > maxDim) {
    const ratio = Math.min(maxDim / scaledWidth, maxDim / scaledHeight);
    scaledWidth = Math.floor(scaledWidth * ratio);
    scaledHeight = Math.floor(scaledHeight * ratio);
  }

  const canvas = document.createElement('canvas');
  canvas.width = scaledWidth;
  canvas.height = scaledHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, scaledWidth, scaledHeight);

  return { canvas, ctx, scaledWidth, scaledHeight };
}

function samplePixels(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  count: number
): PixelData[] {
  const result: PixelData[] = [];
  const totalPixels = width * height;

  const indices = new Uint32Array(totalPixels);
  for (let i = 0; i < totalPixels; i++) indices[i] = i;

  for (let i = totalPixels - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  for (let i = 0; i < count && i < totalPixels; i++) {
    const idx = indices[i];
    const pi = idx * 4;
    const x = idx % width;
    const y = Math.floor(idx / width);

    const a = pixels[pi + 3];
    if (a < 32) continue;

    result.push({
      r: pixels[pi],
      g: pixels[pi + 1],
      b: pixels[pi + 2],
      imgX: x,
      imgY: y,
      imgWidth: width,
      imgHeight: height
    });
  }

  return result;
}
