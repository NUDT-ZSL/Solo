import html2canvas from 'html2canvas';
import pixelmatch from 'pixelmatch';
import type { DiffResult, DiffRegion } from '../types';

export async function captureAllPanels(
  panelRefs: Record<string, HTMLDivElement | null>
): Promise<Record<string, string> | null> {
  const screenshots: Record<string, string> = {};
  const entries = Object.entries(panelRefs);
  if (entries.length === 0) return null;

  for (const [name, el] of entries) {
    if (!el) continue;
    try {
      const canvas = await html2canvas(el, {
        backgroundColor: null,
        useCORS: true,
        allowTaint: true,
        scale: 1,
      });
      screenshots[name] = canvas.toDataURL('image/png');
    } catch (e) {
      console.warn(`Failed to capture ${name}:`, e);
    }
  }

  return Object.keys(screenshots).length > 0 ? screenshots : null;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function findConnectedRegions(diffPixels: Uint8Array, width: number, height: number): DiffRegion[] {
  const visited = new Set<number>();
  const regions: DiffRegion[] = [];
  const threshold = 10;

  const floodFill = (startX: number, startY: number) => {
    const stack: [number, number][] = [[startX, startY]];
    let minX = startX;
    let maxX = startX;
    let minY = startY;
    let maxY = startY;
    let count = 0;

    while (stack.length > 0) {
      const [x, y] = stack.pop()!;
      const idx = y * width + x;
      if (visited.has(idx)) continue;
      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      if (diffPixels[idx] === 0) continue;

      visited.add(idx);
      count++;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);

      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }

    const w = maxX - minX + 1;
    const h = maxY - minY + 1;
    const area = w * h;
    if (area >= threshold) {
      return { x: minX, y: minY, width: w, height: h, area, count };
    }
    return null;
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (diffPixels[idx] > 0 && !visited.has(idx)) {
        const region = floodFill(x, y);
        if (region) {
          regions.push({
            x: region.x,
            y: region.y,
            width: region.width,
            height: region.height,
            diffPercentage: 0,
            domPath: '',
          });
        }
      }
    }
  }

  return regions.sort((a, b) => b.width * b.height - a.width * a.height);
}

function generateDomPath(region: DiffRegion, totalPixels: number, viewportName: string): string {
  const area = region.width * region.height;
  const percent = area / totalPixels;

  let element = 'div';
  if (percent > 0.3) element = 'section';
  else if (percent > 0.15) element = 'article';
  else if (percent > 0.05) element = 'div.container';
  else if (percent > 0.01) element = 'div.card';
  else element = 'span';

  return `${viewportName} > body > main > ${element}[${region.x},${region.y}]`;
}

export async function computeDiff(
  imgSrcA: string,
  imgSrcB: string,
  viewportName: string = 'Desktop'
): Promise<DiffResult> {
  const [imgA, imgB] = await Promise.all([loadImage(imgSrcA), loadImage(imgSrcB)]);

  const width = Math.max(imgA.width, imgB.width);
  const height = Math.max(imgA.height, imgB.height);

  const canvasA = document.createElement('canvas');
  const canvasB = document.createElement('canvas');
  const diffCanvas = document.createElement('canvas');
  canvasA.width = width;
  canvasA.height = height;
  canvasB.width = width;
  canvasB.height = height;
  diffCanvas.width = width;
  diffCanvas.height = height;

  const ctxA = canvasA.getContext('2d')!;
  const ctxB = canvasB.getContext('2d')!;
  const diffCtx = diffCanvas.getContext('2d')!;

  ctxA.fillStyle = '#ffffff';
  ctxA.fillRect(0, 0, width, height);
  ctxA.drawImage(imgA, 0, 0, imgA.width, imgA.height);

  ctxB.fillStyle = '#ffffff';
  ctxB.fillRect(0, 0, width, height);
  ctxB.drawImage(imgB, 0, 0, imgB.width, imgB.height);

  const imgDataA = ctxA.getImageData(0, 0, width, height);
  const imgDataB = ctxB.getImageData(0, 0, width, height);
  const diffImgData = diffCtx.createImageData(width, height);

  const totalDiff = pixelmatch(
    imgDataA.data,
    imgDataB.data,
    diffImgData.data,
    width,
    height,
    { threshold: 30 / 255, includeAA: false }
  );

  const diffMaskCanvas = document.createElement('canvas');
  diffMaskCanvas.width = width;
  diffMaskCanvas.height = height;
  const maskCtx = diffMaskCanvas.getContext('2d')!;
  const maskImgData = maskCtx.createImageData(width, height);

  const diffPixels = new Uint8Array(width * height);
  for (let i = 0; i < diffImgData.data.length; i += 4) {
    const isDiff = diffImgData.data[i] > 0 || diffImgData.data[i + 1] > 0 || diffImgData.data[i + 2] > 0;
    const pixelIdx = i / 4;
    if (isDiff) {
      diffPixels[pixelIdx] = 1;
      maskImgData.data[i] = 255;
      maskImgData.data[i + 1] = 0;
      maskImgData.data[i + 2] = 0;
      maskImgData.data[i + 3] = 77;
    } else {
      maskImgData.data[i + 3] = 0;
    }
  }

  maskCtx.putImageData(maskImgData, 0, 0);

  const regions = findConnectedRegions(diffPixels, width, height);
  const totalPixels = width * height;

  const enrichedRegions: DiffRegion[] = regions.map((r) => {
    const area = r.width * r.height;
    return {
      ...r,
      diffPercentage: (area / totalPixels) * 100,
      domPath: generateDomPath(r, totalPixels, viewportName),
    };
  });

  let maxRegionArea = 0;
  for (const r of enrichedRegions) {
    maxRegionArea = Math.max(maxRegionArea, r.width * r.height);
  }

  return {
    diffImage: diffMaskCanvas.toDataURL('image/png'),
    regions: enrichedRegions.slice(0, 20),
    totalDiffPixels: totalDiff,
    regionCount: enrichedRegions.length,
    maxRegionArea,
  };
}
