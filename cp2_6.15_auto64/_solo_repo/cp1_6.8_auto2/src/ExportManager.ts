import GIF from 'gif.js';
import { FrameData, GRID_SIZE } from './FrameEditor';

export interface ExportOptions {
  frames: FrameData[];
  fps: number;
  scale: number;
  loop: boolean;
  onProgress?: (progress: number) => void;
}

export class ExportManager {
  static async exportToGif(options: ExportOptions): Promise<Blob> {
    const { frames, fps, scale, loop, onProgress } = options;
    const width = GRID_SIZE * scale;
    const height = GRID_SIZE * scale;
    const delay = Math.round(1000 / fps);

    const offscreen = document.createElement('canvas');
    offscreen.width = width;
    offscreen.height = height;
    const ctx = offscreen.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    const gif = new GIF({
      workers: 2,
      quality: 10,
      width,
      height,
      repeat: loop ? 0 : -1,
    });

    for (const frame of frames) {
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, width, height);

      for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
          const color = frame[y][x];
          if (color) {
            ctx.fillStyle = color;
            ctx.fillRect(x * scale, y * scale, scale, scale);
          }
        }
      }

      gif.addFrame(ctx, { delay, copy: true });
    }

    return new Promise<Blob>((resolve, reject) => {
      gif.on('finished', (blob: Blob) => {
        resolve(blob);
      });

      if (onProgress) {
        gif.on('progress', (p: number) => {
          onProgress(p);
        });
      }

      gif.render();
    });
  }

  static downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  static exportFramesAsPngs(frames: FrameData[], scale: number): Blob[] {
    const width = GRID_SIZE * scale;
    const height = GRID_SIZE * scale;
    const blobs: Blob[] = [];

    const offscreen = document.createElement('canvas');
    offscreen.width = width;
    offscreen.height = height;
    const ctx = offscreen.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    for (const frame of frames) {
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, width, height);

      for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
          const color = frame[y][x];
          if (color) {
            ctx.fillStyle = color;
            ctx.fillRect(x * scale, y * scale, scale, scale);
          }
        }
      }

      const dataUrl = offscreen.toDataURL('image/png');
      const byteString = atob(dataUrl.split(',')[1]);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      blobs.push(new Blob([ab], { type: 'image/png' }));
    }

    return blobs;
  }
}
