import { useState, useCallback, useRef, useEffect } from 'react';
import type { TextureParams, HistoryState } from './types';

const MAX_HISTORY = 10;

const deepClone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));

const paramsEqual = (a: TextureParams, b: TextureParams): boolean => {
  return JSON.stringify(a) === JSON.stringify(b);
};

export function useHistory(initialState: TextureParams) {
  const [state, setState] = useState<HistoryState>({
    snapshots: [deepClone(initialState)],
    currentIndex: 0
  });

  const isPushingRef = useRef(false);

  const currentParams = state.snapshots[state.currentIndex];

  const pushState = useCallback((newParams: TextureParams) => {
    setState(prev => {
      const current = prev.snapshots[prev.currentIndex];
      if (paramsEqual(current, newParams)) return prev;

      const newSnapshots = prev.snapshots.slice(0, prev.currentIndex + 1);
      newSnapshots.push(deepClone(newParams));

      if (newSnapshots.length > MAX_HISTORY) {
        newSnapshots.splice(0, newSnapshots.length - MAX_HISTORY);
      }

      return {
        snapshots: newSnapshots,
        currentIndex: newSnapshots.length - 1
      };
    });
  }, []);

  const undo = useCallback(() => {
    setState(prev => {
      if (prev.currentIndex <= 0) return prev;
      return {
        ...prev,
        currentIndex: prev.currentIndex - 1
      };
    });
  }, []);

  const redo = useCallback(() => {
    setState(prev => {
      if (prev.currentIndex >= prev.snapshots.length - 1) return prev;
      return {
        ...prev,
        currentIndex: prev.currentIndex + 1
      };
    });
  }, []);

  const canUndo = state.currentIndex > 0;
  const canRedo = state.currentIndex < state.snapshots.length - 1;

  useEffect(() => {
    isPushingRef.current = false;
  }, [state]);

  return {
    currentParams,
    pushState,
    undo,
    redo,
    canUndo,
    canRedo,
    historyCount: state.snapshots.length,
    currentIndex: state.currentIndex
  };
}

export function useDebouncedCallback<T extends (...args: unknown[]) => void>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      callbackRef.current(...args);
    }, delay);
  }, [delay]);
}

export const formatRgb = (r: number, g: number, b: number): string => {
  return `RGB(${r}, ${g}, ${b})`;
};

export const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

export const rgbToHex = (r: number, g: number, b: number): string => {
  return '#' + [r, g, b].map(x => {
    const hex = Math.max(0, Math.min(255, x)).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
};
