import { Project, RGB } from '../types';
import { drawFrameOnCtx, renderFramesToSpritesheet } from './canvasUtils';
import { rgbToString } from './colorUtils';
import { GIFEncoder, quantize, applyPalette } from 'gifenc';

export async function exportSpritesheet(
  project: Project,
  scale: number,
  bgColor: RGB | null,
  filename = 'spritesheet.png'
) {
  const canvas = renderFramesToSpritesheet(project, scale, bgColor);
  const dataUrl = canvas.toDataURL('image/png');
  triggerDownload(dataUrl, filename);
}

export function downloadCanvas(canvas: HTMLCanvasElement, filename: string) {
  const dataUrl = canvas.toDataURL('image/png');
  triggerDownload(dataUrl, filename);
}

function triggerDownload(dataUrl: string, filename: string) {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function exportGif(
  project: Project,
  scale: number,
  bgColor: RGB | null,
  fps: number,
  filename = 'animation.gif'
): Promise<void> {
  const { width, height, frames } = project;
  const gifW = width * scale;
  const gifH = height * scale;
  const delay = Math.round(1000 / fps);
  const palette: RGB[] = buildPalette(bgColor, frames, width, height);
  const gifPalette = palette.map(c => [c.r, c.g, c.b] as [number, number, number]);
  const encoder = GIFEncoder();
  const renderCanvas = document.createElement('canvas');
  renderCanvas.width = gifW;
  renderCanvas.height = gifH;
  const rctx = renderCanvas.getContext('2d')!;

  for (let i = 0; i < frames.length; i++) {
    if (bgColor) {
      rctx.fillStyle = rgbToString(bgColor);
      rctx.fillRect(0, 0, gifW, gifH);
    } else {
      rctx.clearRect(0, 0, gifW, gifH);
    }
    drawFrameOnCtx(rctx, frames[i], scale);
    const imgData = rctx.getImageData(0, 0, gifW, gifH);
    const indexPalette = buildQuantizedPalette(gifPalette, bgColor);
    const indexed = applyPalette(imgData, indexPalette);
    encoder.writeFrame(indexed, gifW, gifH, { palette: indexPalette, delay });
  }
  encoder.finish();
  const blob = new Blob([encoder.bytes()], { type: 'image/gif' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = filename;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function buildPalette(bgColor: RGB | null, frames: Project['frames'], w: number, h: number): RGB[] {
  const colorSet = new Map<string, RGB>();
  if (bgColor) colorSet.set(keyRGB(bgColor), bgColor);
  colorSet.set('0_0_0_0', { r: 0, g: 0, b: 0, a: 0 });
  for (const frame of frames) {
    for (const layer of frame.layers) {
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const p = layer.pixels[y]?.[x];
          if (p) colorSet.set(keyRGB(p), p);
        }
      }
    }
  }
  return Array.from(colorSet.values()).slice(0, 256);
}

function keyRGB(c: RGB): string {
  return `${c.r}_${c.g}_${c.b}_${c.a ?? 1}`;
}

function buildQuantizedPalette(colors: [number, number, number][], bgColor: RGB | null): [number, number, number][] {
  const palette: [number, number, number][] = [];
  if (bgColor) palette.push([bgColor.r, bgColor.g, bgColor.b]);
  for (const c of colors) {
    if (palette.length >= 256) break;
    if (!palette.some(p => p[0] === c[0] && p[1] === c[1] && p[2] === c[2])) {
      palette.push(c);
    }
  }
  while (palette.length < 2 && palette.length < 256) {
    palette.push([0, 0, 0]);
  }
  return palette.slice(0, 256);
}

export { quantize };
