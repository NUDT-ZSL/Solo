export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export function throttle<T extends (...args: any[]) => void>(
  fn: T,
  delay: number
): T {
  let lastCall = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  return function (this: any, ...args: Parameters<T>) {
    const now = Date.now();
    const remaining = delay - (now - lastCall);
    if (remaining <= 0) {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      lastCall = now;
      fn.apply(this, args);
    } else if (!timer) {
      timer = setTimeout(() => {
        lastCall = Date.now();
        timer = null;
        fn.apply(this, args);
      }, remaining);
    }
  } as T;
}

export function calculateErasePercentage(
  canvas: HTMLCanvasElement,
  sampleSize: number = 200
): number {
  const ctx = canvas.getContext('2d');
  if (!ctx) return 0;

  const { width, height } = canvas;
  const stepX = Math.max(1, Math.floor(width / sampleSize));
  const stepY = Math.max(1, Math.floor(height / sampleSize));

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  let transparentPixels = 0;
  let totalPixels = 0;

  for (let y = 0; y < height; y += stepY) {
    for (let x = 0; x < width; x += stepX) {
      const index = (y * width + x) * 4;
      const alpha = data[index + 3];
      if (alpha < 128) {
        transparentPixels++;
      }
      totalPixels++;
    }
  }

  return totalPixels > 0 ? transparentPixels / totalPixels : 0;
}

export function exportCanvasAsPNG(
  backgroundCanvas: HTMLCanvasElement,
  coverCanvas: HTMLCanvasElement
): void {
  const merged = document.createElement('canvas');
  merged.width = backgroundCanvas.width;
  merged.height = backgroundCanvas.height;
  const ctx = merged.getContext('2d');
  if (!ctx) return;

  ctx.drawImage(backgroundCanvas, 0, 0);
  ctx.drawImage(coverCanvas, 0, 0);

  const link = document.createElement('a');
  link.download = `scratch-result-${Date.now()}.png`;
  link.href = merged.toDataURL('image/png');
  link.click();
}
