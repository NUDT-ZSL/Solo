import { useEffect, useRef } from 'react';
import { useAppStore } from '../data/store';

export function useFPSCounter() {
  const setFps = useAppStore((s) => s.setFps);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());

  useEffect(() => {
    let animationId: number;

    const updateFPS = () => {
      frameCountRef.current++;
      const now = performance.now();
      const delta = now - lastTimeRef.current;

      if (delta >= 1000) {
        const fps = Math.round((frameCountRef.current * 1000) / delta);
        setFps(fps);
        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }

      animationId = requestAnimationFrame(updateFPS);
    };

    animationId = requestAnimationFrame(updateFPS);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [setFps]);
}

export function takeScreenshot(): string | null {
  try {
    const canvas = document.querySelector('canvas');
    if (!canvas) return null;
    const dataUrl = canvas.toDataURL('image/png');
    return dataUrl;
  } catch (e) {
    console.error('Failed to take screenshot:', e);
    return null;
  }
}
