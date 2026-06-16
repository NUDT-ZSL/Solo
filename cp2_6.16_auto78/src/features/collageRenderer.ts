import type { StyleMatchResult, Artwork } from './styleMatcher';
import { artworks, getArtworkById } from './styleMatcher';

export function renderArtworkPattern(
  ctx: CanvasRenderingContext2D,
  artwork: Artwork,
  x: number,
  y: number,
  width: number,
  height: number,
  seed: number = 0
): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, width, height);
  ctx.clip();

  const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
  
  const colors = artwork.colors;
  const colorCount = colors.length;
  
  for (let i = 0; i < colorCount; i++) {
    const [r, g, b] = colors[i];
    gradient.addColorStop(i / (colorCount - 1), `rgb(${r}, ${g}, ${b})`);
  }
  
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, width, height);

  const patternType = seed % 4;
  ctx.globalAlpha = 0.3;
  
  if (patternType === 0) {
    for (let i = 0; i < 8; i++) {
      const angle = (seed * 30 + i * 45) * Math.PI / 180;
      const cx = x + width / 2 + Math.cos(angle) * width * 0.3;
      const cy = y + height / 2 + Math.sin(angle) * height * 0.3;
      const r = width * (0.15 + (seed % 5) * 0.02);
      
      const [cr, cg, cb] = colors[i % colorCount];
      ctx.fillStyle = `rgb(${cr}, ${cg}, ${cb})`;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (patternType === 1) {
    const stripeCount = 6 + (seed % 4);
    const stripeAngle = (seed * 20) * Math.PI / 180;
    
    ctx.translate(x + width / 2, y + height / 2);
    ctx.rotate(stripeAngle);
    
    for (let i = 0; i < stripeCount; i++) {
      const sx = -width + i * (width * 2 / stripeCount);
      const [sr, sg, sb] = colors[i % colorCount];
      ctx.fillStyle = `rgb(${sr}, ${sg}, ${sb})`;
      ctx.fillRect(sx, -height, width * 0.3, height * 2);
    }
  } else if (patternType === 2) {
    const blockSize = width / (4 + seed % 3);
    for (let row = 0; row < Math.ceil(height / blockSize) + 2; row++) {
      for (let col = 0; col < Math.ceil(width / blockSize) + 2; col++) {
        const colorIdx = (row + col + seed) % colorCount;
        const [br, bg, bb] = colors[colorIdx];
        ctx.fillStyle = `rgb(${br}, ${bg}, ${bb})`;
        ctx.fillRect(
          x + col * blockSize - blockSize,
          y + row * blockSize - blockSize,
          blockSize * 0.8,
          blockSize * 0.8
        );
      }
    }
  } else {
    const waveCount = 3 + seed % 3;
    for (let i = 0; i < waveCount; i++) {
      const [wr, wg, wb] = colors[i % colorCount];
      ctx.strokeStyle = `rgb(${wr}, ${wg}, ${wb})`;
      ctx.lineWidth = width * 0.06;
      ctx.beginPath();
      
      const baseY = y + height * (0.3 + i * 0.15);
      for (let px = 0; px <= width; px += 2) {
        const waveY = baseY + Math.sin((px / width) * Math.PI * (2 + seed % 3) + seed * 0.5) * height * 0.1;
        if (px === 0) {
          ctx.moveTo(x + px, waveY);
        } else {
          ctx.lineTo(x + px, waveY);
        }
      }
      ctx.stroke();
    }
  }

  ctx.restore();
}

export function renderCollage(
  canvas: HTMLCanvasElement,
  results: StyleMatchResult[],
  gridSize: number
): void {
  const ctx = canvas.getContext('2d')!;
  const cellWidth = canvas.width / gridSize;
  const cellHeight = canvas.height / gridSize;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  results.forEach((result, index) => {
    const row = Math.floor(index / gridSize);
    const col = index % gridSize;
    const x = col * cellWidth;
    const y = row * cellHeight;
    const seed = result.artworkId * 7 + index * 13;

    renderArtworkPattern(ctx, result.artwork, x, y, cellWidth, cellHeight, seed);
  });
}

export async function exportHighRes(
  results: StyleMatchResult[],
  gridSize: number,
  size: number = 2048
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const cellSize = size / gridSize;

  results.forEach((result, index) => {
    const row = Math.floor(index / gridSize);
    const col = index % gridSize;
    const x = col * cellSize;
    const y = row * cellSize;
    const seed = result.artworkId * 7 + index * 13;

    renderArtworkPattern(ctx, result.artwork, x, y, cellSize, cellSize, seed);
  });

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to generate image'));
      }
    }, 'image/png');
  });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
