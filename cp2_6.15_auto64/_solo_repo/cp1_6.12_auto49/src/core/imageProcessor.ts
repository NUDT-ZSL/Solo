export interface ProcessedImage {
  thumbnailUrl: string;
  originalUrl: string;
  pixelData: ImageData;
  width: number;
  height: number;
}

export function uploadImage(
  file: File,
  canvasSize: { width: number; height: number }
): Promise<ProcessedImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const originalUrl = e.target?.result as string;

        const thumbCanvas = document.createElement('canvas');
        thumbCanvas.width = 100;
        thumbCanvas.height = 100;
        const thumbCtx = thumbCanvas.getContext('2d')!;
        const thumbScale = Math.min(100 / img.width, 100 / img.height);
        const thumbW = img.width * thumbScale;
        const thumbH = img.height * thumbScale;
        thumbCtx.fillStyle = '#16213e';
        thumbCtx.fillRect(0, 0, 100, 100);
        thumbCtx.drawImage(img, (100 - thumbW) / 2, (100 - thumbH) / 2, thumbW, thumbH);
        const thumbnailUrl = thumbCanvas.toDataURL();

        const maxDim = Math.max(canvasSize.width, canvasSize.height) * 2;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const pixelW = Math.floor(img.width * scale);
        const pixelH = Math.floor(img.height * scale);

        const pixelCanvas = document.createElement('canvas');
        pixelCanvas.width = pixelW;
        pixelCanvas.height = pixelH;
        const pixelCtx = pixelCanvas.getContext('2d')!;
        pixelCtx.drawImage(img, 0, 0, pixelW, pixelH);
        const pixelData = pixelCtx.getImageData(0, 0, pixelW, pixelH);

        resolve({
          thumbnailUrl,
          originalUrl,
          pixelData,
          width: pixelW,
          height: pixelH
        });
      };
      img.onerror = () => reject(new Error('图片加载失败'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsDataURL(file);
  });
}

export function extractColor(
  pixelData: ImageData,
  x: number,
  y: number,
  width: number
): { r: number; g: number; b: number } {
  const px = Math.max(0, Math.min(Math.floor(x), pixelData.width - 1));
  const py = Math.max(0, Math.min(Math.floor(y), pixelData.height - 1));
  const idx = (py * pixelData.width + px) * 4;
  return {
    r: pixelData.data[idx],
    g: pixelData.data[idx + 1],
    b: pixelData.data[idx + 2]
  };
}

export function getAverageColor(
  pixelData: ImageData
): { r: number; g: number; b: number } {
  let r = 0, g = 0, b = 0, count = 0;
  const step = Math.max(1, Math.floor(pixelData.width * pixelData.height / 1000));
  for (let i = 0; i < pixelData.data.length; i += 4 * step) {
    r += pixelData.data[i];
    g += pixelData.data[i + 1];
    b += pixelData.data[i + 2];
    count++;
  }
  return {
    r: Math.floor(r / count),
    g: Math.floor(g / count),
    b: Math.floor(b / count)
  };
}
