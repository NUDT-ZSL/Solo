export interface FragmentData {
  id: number;
  vertices: { x: number; y: number }[];
  center: { x: number; y: number };
  color: string;
  sourceX: number;
  sourceY: number;
  width: number;
  height: number;
}

export function processImage(image: HTMLImageElement, gridCols: number, gridRows: number): FragmentData[] {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(image, 0, 0);
  const imageData = ctx.getImageData(0, 0, image.width, image.height);

  const cellW = image.width / gridCols;
  const cellH = image.height / gridRows;
  const perturbX = cellW * 0.3;
  const perturbY = cellH * 0.3;

  const gridPoints: { x: number; y: number }[][] = [];
  for (let row = 0; row <= gridRows; row++) {
    gridPoints[row] = [];
    for (let col = 0; col <= gridCols; col++) {
      let x = col * cellW;
      let y = row * cellH;
      if (col > 0 && col < gridCols) {
        x += (Math.random() - 0.5) * 2 * perturbX;
      }
      if (row > 0 && row < gridRows) {
        y += (Math.random() - 0.5) * 2 * perturbY;
      }
      gridPoints[row][col] = { x, y };
    }
  }

  const fragments: FragmentData[] = [];
  let id = 0;

  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridCols; col++) {
      const tl = gridPoints[row][col];
      const tr = gridPoints[row][col + 1];
      const br = gridPoints[row + 1][col + 1];
      const bl = gridPoints[row + 1][col];

      const center = {
        x: col * cellW + cellW / 2,
        y: row * cellH + cellH / 2,
      };

      const vertices = [
        { x: tl.x - center.x, y: tl.y - center.y },
        { x: tr.x - center.x, y: tr.y - center.y },
        { x: br.x - center.x, y: br.y - center.y },
        { x: bl.x - center.x, y: bl.y - center.y },
      ];

      const sourceX = Math.round(col * cellW);
      const sourceY = Math.round(row * cellH);
      const fragW = Math.ceil(cellW);
      const fragH = Math.ceil(cellH);

      const color = getDominantColor(imageData, sourceX, sourceY, fragW, fragH);

      fragments.push({
        id: id++,
        vertices,
        center,
        color,
        sourceX,
        sourceY,
        width: fragW,
        height: fragH,
      });
    }
  }

  return fragments;
}

export function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}

export function getGrayscaleData(image: HTMLImageElement): { data: Uint8ClampedArray; width: number; height: number } {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(image, 0, 0);
  const imageData = ctx.getImageData(0, 0, image.width, image.height);
  const gray = new Uint8ClampedArray(image.width * image.height);
  for (let i = 0; i < gray.length; i++) {
    const idx = i * 4;
    gray[i] = Math.round(
      imageData.data[idx] * 0.299 +
      imageData.data[idx + 1] * 0.587 +
      imageData.data[idx + 2] * 0.114
    );
  }
  return { data: gray, width: image.width, height: image.height };
}

export function getDominantColor(imageData: ImageData, x: number, y: number, w: number, h: number): string {
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      const px = x + dx;
      const py = y + dy;
      if (px >= 0 && px < imageData.width && py >= 0 && py < imageData.height) {
        const idx = (py * imageData.width + px) * 4;
        r += imageData.data[idx];
        g += imageData.data[idx + 1];
        b += imageData.data[idx + 2];
        count++;
      }
    }
  }
  if (count === 0) return '#000000';
  r = Math.round(r / count);
  g = Math.round(g / count);
  b = Math.round(b / count);
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}
