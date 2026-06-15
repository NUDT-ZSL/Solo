import type { ProgrammingLanguage, AlgorithmType } from '../types';

const ALGORITHM_BASE_TIME: Record<AlgorithmType, number> = {
  bubbleSort: 800,
  binarySearch: 300,
  fibonacciRecursive: 1200
};

const LANGUAGE_PERFORMANCE_RATIO: Record<ProgrammingLanguage, number> = {
  'C++': 1.0,
  'Go': 1.8,
  'JavaScript': 3.5,
  'Python': 7.2
};

export interface RunProgress {
  progress: number;
  elapsedMs: number;
  fps: number;
  finished: boolean;
}

export interface AlgorithmRunnerCallbacks {
  onProgress: (update: RunProgress) => void;
  onComplete: (elapsedMs: number) => void;
}

export function runAlgorithm(
  language: ProgrammingLanguage,
  algorithm: AlgorithmType,
  callbacks: AlgorithmRunnerCallbacks
): () => void {
  const baseTime = ALGORITHM_BASE_TIME[algorithm];
  const ratio = LANGUAGE_PERFORMANCE_RATIO[language];
  const totalTime = baseTime * ratio * (0.85 + Math.random() * 0.3);

  const startTime = performance.now();
  let rafId: number | null = null;
  let lastFrameTime = startTime;
  let frameCount = 0;
  let currentFps = 60;
  let cancelled = false;

  const tick = () => {
    if (cancelled) return;

    const now = performance.now();
    const elapsed = now - startTime;
    const frameDelta = now - lastFrameTime;
    frameCount++;

    if (frameDelta >= 500) {
      currentFps = Math.round((frameCount * 1000) / frameDelta);
      frameCount = 0;
      lastFrameTime = now;
    }

    let progress = Math.min(100, (elapsed / totalTime) * 100);

    progress = easeOutCubic(progress / 100) * 100;

    if (progress >= 100) {
      callbacks.onProgress({
        progress: 100,
        elapsedMs: Math.round(totalTime),
        fps: currentFps,
        finished: true
      });
      callbacks.onComplete(Math.round(totalTime));
      return;
    }

    callbacks.onProgress({
      progress,
      elapsedMs: Math.round(elapsed),
      fps: currentFps,
      finished: false
    });

    rafId = requestAnimationFrame(tick);
  };

  const executeChunked = () => {
    const chunkSize = 10;
    const iterations = 50;
    let i = 0;

    const runChunk = () => {
      if (cancelled) return;
      const chunkStart = performance.now();
      while (i < iterations && performance.now() - chunkStart < 8) {
        const dummy = Math.sqrt(i * Math.PI) * Math.sin(i);
        void dummy;
        i++;
      }
      if (i < iterations) {
        rafId = requestAnimationFrame(runChunk);
      } else {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(runChunk);
  };

  executeChunked();

  return () => {
    cancelled = true;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
    }
  };
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}
