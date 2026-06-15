export type ExportFormat = 'png' | 'gif' | 'video';

export interface ExportProgress {
  percent: number;
  stage: string;
}

function safeProgress(onProgress: ((p: ExportProgress) => void) | undefined, percent: number, stage: string) {
  try {
    onProgress?.({ percent, stage });
  } catch (e) {
    console.warn('[exporter] progress callback failed:', e);
  }
}

export async function exportAsPNG(
  canvas: HTMLCanvasElement,
  onProgress?: (p: ExportProgress) => void
): Promise<Blob> {
  safeProgress(onProgress, 0, '准备画布...');
  safeProgress(onProgress, 50, '生成图像数据...');

  return new Promise<Blob>((resolve, reject) => {
    try {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            safeProgress(onProgress, 100, '完成');
            resolve(blob);
          } else {
            reject(new Error('Failed to create PNG blob'));
          }
        },
        'image/png',
        1.0
      );
    } catch (e) {
      reject(e instanceof Error ? e : new Error(String(e)));
    }
  });
}

export async function exportAsGIF(
  canvas: HTMLCanvasElement,
  onProgress?: (p: ExportProgress) => void,
  fps: number = 15,
  durationSec: number = 3
): Promise<Blob> {
  safeProgress(onProgress, 0, '准备 GIF 捕获...');

  const totalFrames = fps * durationSec;
  const capturedCanvas: HTMLCanvasElement[] = [];
  const frameIntervalMs = 1000 / fps;

  safeProgress(onProgress, 2, `开始捕获 ${totalFrames} 帧...`);

  for (let i = 0; i < totalFrames; i++) {
    const startTime = performance.now();

    const offscreen = document.createElement('canvas');
    offscreen.width = canvas.width;
    offscreen.height = canvas.height;
    const ctx = offscreen.getContext('2d');
    if (ctx) {
      ctx.drawImage(canvas, 0, 0);
    }
    capturedCanvas.push(offscreen);

    const capturePercent = 5 + Math.round((i / totalFrames) * 60);
    safeProgress(onProgress, capturePercent, `捕获帧 ${i + 1}/${totalFrames}`);

    await new Promise<void>((resolve) => {
      const elapsed = performance.now() - startTime;
      const wait = Math.max(0, frameIntervalMs - elapsed);
      setTimeout(resolve, wait);
    });
  }

  safeProgress(onProgress, 68, '加载 GIF 编码器...');

  let GIFConstructor: any;
  try {
    GIFConstructor = await loadGifWorker();
  } catch (e) {
    throw new Error('无法加载 GIF.js 库: ' + (e instanceof Error ? e.message : String(e)));
  }

  safeProgress(onProgress, 70, '初始化编码器...');

  const gif = new GIFConstructor({
    workers: 2,
    quality: 10,
    width: canvas.width,
    height: canvas.height,
    workerScript: 'https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.worker.js',
  });

  safeProgress(onProgress, 72, '添加帧到编码器...');

  for (let i = 0; i < capturedCanvas.length; i++) {
    gif.addFrame(capturedCanvas[i], { delay: Math.round(1000 / fps), copy: true });
    const addPercent = 72 + Math.round((i / capturedCanvas.length) * 10);
    safeProgress(onProgress, addPercent, `编码帧 ${i + 1}/${capturedCanvas.length}`);
  }

  return new Promise<Blob>((resolve, reject) => {
    try {
      gif.on('finished', (blob: Blob) => {
        safeProgress(onProgress, 100, 'GIF 导出完成');
        resolve(blob);
      });
      gif.on('progress', (p: number) => {
        const progressVal = typeof p === 'number' ? p : 0;
        const percent = 82 + Math.round(progressVal * 18);
        safeProgress(onProgress, percent, `编译中 ${Math.round(progressVal * 100)}%`);
      });
      gif.on('abort', () => {
        reject(new Error('GIF 导出被中止'));
      });

      safeProgress(onProgress, 82, '开始渲染 GIF...');
      gif.render();
    } catch (e) {
      reject(e instanceof Error ? e : new Error(String(e)));
    }
  });
}

async function loadGifWorker(): Promise<any> {
  if ((window as any).GIF) {
    return (window as any).GIF;
  }

  try {
    const mod = await import('gif.js');
    const GIFClass = mod.default || mod;
    (window as any).GIF = GIFClass;
    return GIFClass;
  } catch {
    // fallback
  }

  const existingScript = document.querySelector('script[src*="gif.js"]');
  if (!existingScript) {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.js';
    script.crossOrigin = 'anonymous';
    document.head.appendChild(script);

    await new Promise<void>((resolve, reject) => {
      const timeoutId = setTimeout(() => reject(new Error('GIF.js 加载超时')), 15000);
      script.onload = () => {
        clearTimeout(timeoutId);
        resolve();
      };
      script.onerror = () => {
        clearTimeout(timeoutId);
        reject(new Error('GIF.js 加载失败'));
      };
    });
  } else {
    await new Promise<void>((resolve, reject) => {
      let tries = 0;
      const check = setInterval(() => {
        if ((window as any).GIF) {
          clearInterval(check);
          resolve();
        } else if (tries++ > 50) {
          clearInterval(check);
          reject(new Error('GIF.js 加载超时'));
        }
      }, 100);
    });
  }

  return (window as any).GIF;
}

export async function exportAsVideo(
  canvas: HTMLCanvasElement,
  onProgress?: (p: ExportProgress) => void,
  fps: number = 30,
  durationSec: number = 3
): Promise<Blob> {
  safeProgress(onProgress, 0, '准备视频捕获...');

  let mimeType = 'video/webm;codecs=vp9';
  if (typeof MediaRecorder !== 'undefined' && !MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = 'video/webm;codecs=vp8';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm';
    }
  }

  safeProgress(onProgress, 5, `使用编码器: ${mimeType}`);

  const stream = canvas.captureStream(fps);
  let recorder: MediaRecorder;
  try {
    recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 8_000_000,
    });
  } catch (e) {
    recorder = new MediaRecorder(stream);
  }

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      chunks.push(e.data);
      const currentProgress = Math.min(90, 5 + Math.round(chunks.length * 3));
      safeProgress(onProgress, currentProgress, `接收数据块 (${chunks.length})`);
    }
  };

  return new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => {
      safeProgress(onProgress, 95, '合成视频文件...');
      try {
        const blob = new Blob(chunks, { type: chunks[0]?.type || 'video/webm' });
        safeProgress(onProgress, 100, '视频导出完成');
        resolve(blob);
      } catch (e) {
        reject(e instanceof Error ? e : new Error(String(e)));
      }
    };

    recorder.onerror = (e: any) => {
      reject(new Error('录制错误: ' + (e?.error?.message || String(e))));
    };

    try {
      recorder.start(100);
    } catch (e) {
      reject(e instanceof Error ? e : new Error(String(e)));
      return;
    }

    safeProgress(onProgress, 10, `录制中 (${fps}fps, ${durationSec}s)...`);

    const totalMs = durationSec * 1000;
    const updateInterval = 100;
    let elapsed = 0;

    const timer = setInterval(() => {
      elapsed += updateInterval;
      const rawPercent = elapsed / totalMs;
      const percent = 10 + Math.round(rawPercent * 80);
      const seconds = Math.min(durationSec, Math.round(elapsed / 100) / 10);
      safeProgress(
        onProgress,
        Math.min(90, percent),
        `录制 ${seconds.toFixed(1)}s / ${durationSec.toFixed(1)}s`
      );
      if (elapsed >= totalMs) {
        clearInterval(timer);
        safeProgress(onProgress, 90, '停止录制...');
        setTimeout(() => {
          if (recorder.state !== 'inactive') {
            recorder.stop();
          }
        }, 200);
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
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}
