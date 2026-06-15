export function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

export function generateGaussianKernel(radius: number): number[] {
  const size = radius * 2 + 1;
  const kernel: number[] = [];
  const sigma = radius / 2;
  let sum = 0;
  for (let i = 0; i < size; i++) {
    const x = i - radius;
    const val = Math.exp(-(x * x) / (2 * sigma * sigma));
    kernel.push(val);
    sum += val;
  }
  return kernel.map(v => v / sum);
}

export function applyGaussianBlur(
  imageData: ImageData,
  radius: number
): ImageData {
  if (radius <= 0) return imageData;
  const w = imageData.width;
  const h = imageData.height;
  const src = new Uint8ClampedArray(imageData.data);
  const dst = new Uint8ClampedArray(imageData.data.length);
  const kernel = generateGaussianKernel(radius);
  const kSize = kernel.length;
  const half = Math.floor(kSize / 2);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let k = 0; k < kSize; k++) {
        const sx = Math.min(w - 1, Math.max(0, x + k - half));
        const idx = (y * w + sx) * 4;
        r += src[idx] * kernel[k];
        g += src[idx + 1] * kernel[k];
        b += src[idx + 2] * kernel[k];
        a += src[idx + 3] * kernel[k];
      }
      const idx = (y * w + x) * 4;
      dst[idx] = r;
      dst[idx + 1] = g;
      dst[idx + 2] = b;
      dst[idx + 3] = a;
    }
  }

  const dst2 = new Uint8ClampedArray(imageData.data.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let k = 0; k < kSize; k++) {
        const sy = Math.min(h - 1, Math.max(0, y + k - half));
        const idx = (sy * w + x) * 4;
        r += dst[idx] * kernel[k];
        g += dst[idx + 1] * kernel[k];
        b += dst[idx + 2] * kernel[k];
        a += dst[idx + 3] * kernel[k];
      }
      const idx = (y * w + x) * 4;
      dst2[idx] = r;
      dst2[idx + 1] = g;
      dst2[idx + 2] = b;
      dst2[idx + 3] = a;
    }
  }

  return new ImageData(dst2, w, h);
}

export function exportCanvasToPNG(canvas: HTMLCanvasElement): void {
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = 800;
  exportCanvas.height = 500;
  const ctx = exportCanvas.getContext('2d')!;

  ctx.clearRect(0, 0, 800, 500);
  ctx.drawImage(canvas, 0, 0, 800, 500);

  exportCanvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'furniture-shadow-scene.png';
    a.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
}
