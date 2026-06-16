export interface CellFeatures {
  avgR: number;
  avgG: number;
  avgB: number;
  variance: number;
}

export interface GridCell {
  x: number;
  y: number;
  width: number;
  height: number;
  features: CellFeatures;
  imageData: ImageData;
}

export function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export function loadImageFromSrc(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export function extractFeatures(imageData: ImageData): CellFeatures {
  const { data, width, height } = imageData;
  let r = 0, g = 0, b = 0;
  const pixelCount = width * height;

  for (let i = 0; i < data.length; i += 4) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
  }

  const avgR = r / pixelCount;
  const avgG = g / pixelCount;
  const avgB = b / pixelCount;

  let variance = 0;
  for (let i = 0; i < data.length; i += 4) {
    const dr = data[i] - avgR;
    const dg = data[i + 1] - avgG;
    const db = data[i + 2] - avgB;
    variance += (dr * dr + dg * dg + db * db) / 3;
  }
  variance /= pixelCount;

  return { avgR, avgG, avgB, variance };
}

export function splitIntoGrid(image: HTMLImageElement, gridSize: number): GridCell[] {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  
  const size = Math.min(image.width, image.height);
  const offsetX = (image.width - size) / 2;
  const offsetY = (image.height - size) / 2;
  
  const cellSize = Math.floor(size / gridSize);
  const actualSize = cellSize * gridSize;
  
  canvas.width = actualSize;
  canvas.height = actualSize;
  ctx.drawImage(image, offsetX, offsetY, size, size, 0, 0, actualSize, actualSize);

  const cells: GridCell[] = [];

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const x = col * cellSize;
      const y = row * cellSize;
      const cellImageData = ctx.getImageData(x, y, cellSize, cellSize);
      const features = extractFeatures(cellImageData);
      
      cells.push({
        x,
        y,
        width: cellSize,
        height: cellSize,
        features,
        imageData: cellImageData
      });
    }
  }

  return cells;
}

export function getImagePreview(image: HTMLImageElement, maxWidth: number, maxHeight: number): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  
  const ratio = Math.min(maxWidth / image.width, maxHeight / image.height);
  canvas.width = image.width * ratio;
  canvas.height = image.height * ratio;
  
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL();
}
