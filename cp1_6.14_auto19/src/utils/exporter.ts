export type ExportFormat = 'png' | 'gif' | 'video';

export interface ExportProgress {
  percent: number;
  stage: string;
}

export async function exportAsPNG(
  canvas: HTMLCanvasElement,
  onProgress?: (p: ExportProgress) => void
): Promise<Blob> {
  onProgress?.({ percent: 0, stage: 'Capturing canvas...' });

  return new Promise<Blob>((resolve, reject) => {
    try {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            onProgress?.({ percent: 100, stage: 'Done' });
            resolve(blob);
          } else {
            reject(new Error('Failed to create PNG blob'));
          }
        },
        'image/png',
        1.0
      );
    } catch (e) {
      reject(e);
    }
  });
}

export async function exportAsGIF(
  canvas: HTMLCanvasElement,
  onProgress?: (p: ExportProgress) => void,
  fps: number = 15,
  durationSec: number = 3
): Promise<Blob> {
  onProgress?.({ percent: 0, stage: 'Preparing GIF capture...' });

  const totalFrames = fps * durationSec;
  const frames: string[] = [];
  const interval = 1000 / fps;

  onProgress?.({ percent: 10, stage: 'Capturing frames...' });

  for (let i = 0; i < totalFrames; i++) {
    await new Promise<void>((resolve) => setTimeout(resolve, interval));
    frames.push(canvas.toDataURL('image/png'));
    const percent = 10 + Math.round((i / totalFrames) * 60);
    onProgress?.({ percent, stage: `Capturing frame ${i + 1}/${totalFrames}` });
  }

  onProgress?.({ percent: 75, stage: 'Encoding GIF...' });

  const GIF = await loadGifWorker();
  const gif = new GIF({
    workers: 2,
    quality: 10,
    width: canvas.width,
    height: canvas.height,
    workerScript: '',
  });

  for (const frame of frames) {
    const img = new Image();
    img.src = frame;
    await new Promise<void>((resolve) => {
      img.onload = () => {
        gif.addFrame(img, { delay: Math.round(interval), copy: true });
        resolve();
      };
    });
  }

  return new Promise<Blob>((resolve, reject) => {
    gif.on('finished', (blob: Blob) => {
      onProgress?.({ percent: 100, stage: 'Done' });
      resolve(blob);
    });
    gif.on('progress', (p: number) => {
      const percent = 75 + Math.round(p * 25);
      onProgress?.({ percent, stage: 'Encoding GIF...' });
    });
    gif.render();
  });
}

async function loadGifWorker(): Promise<any> {
  try {
    const mod = await import('gif.js');
    return mod.default || mod;
  } catch {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.js';
    document.head.appendChild(script);
    await new Promise<void>((resolve, reject) => {
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load gif.js'));
    });
    return (window as any).GIF;
  }
}

export async function exportAsVideo(
  canvas: HTMLCanvasElement,
  onProgress?: (p: ExportProgress) => void,
  fps: number = 30,
  durationSec: number = 3
): Promise<Blob> {
  onProgress?.({ percent: 0, stage: 'Preparing video capture...' });

  const stream = canvas.captureStream(fps);
  const recorder = new MediaRecorder(stream, {
    mimeType: 'video/webm;codecs=vp9',
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  return new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => {
      onProgress?.({ percent: 100, stage: 'Done' });
      resolve(new Blob(chunks, { type: 'video/webm' }));
    };

    recorder.onerror = (e) => reject(e);
    recorder.start();

    const totalMs = durationSec * 1000;
    const updateInterval = 100;
    let elapsed = 0;

    const timer = setInterval(() => {
      elapsed += updateInterval;
      const percent = Math.round((elapsed / totalMs) * 95);
      onProgress?.({ percent, stage: `Recording ${Math.round(elapsed / 1000)}s / ${durationSec}s` });
      if (elapsed >= totalMs) {
        clearInterval(timer);
        recorder.stop();
      }
    }, updateInterval);
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
