import { useRef, useCallback, useEffect } from 'react';
import type { Point } from '@/types';

interface UseDragAndDropOptions {
  onStart?: (startPos: Point) => void;
  onMove: (delta: Point, currentPos: Point) => void;
  onEnd?: (finalPos: Point) => void;
  zoom?: number;
}

export function useDragAndDrop({ onStart, onMove, onEnd, zoom = 1 }: UseDragAndDropOptions) {
  const isDragging = useRef(false);
  const startPos = useRef<Point>({ x: 0, y: 0 });
  const lastPos = useRef<Point>({ x: 0, y: 0 });
  const rafId = useRef<number>(0);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      isDragging.current = true;
      const pos = { x: e.clientX, y: e.clientY };
      startPos.current = pos;
      lastPos.current = pos;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      onStart?.(pos);
    },
    [onStart]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return;
      e.preventDefault();

      const currentPos = { x: e.clientX, y: e.clientY };

      if (rafId.current) cancelAnimationFrame(rafId.current);

      rafId.current = requestAnimationFrame(() => {
        const delta = {
          x: (currentPos.x - lastPos.current.x) / zoom,
          y: (currentPos.y - lastPos.current.y) / zoom,
        };
        onMove(delta, currentPos);
        lastPos.current = currentPos;
      });
    },
    [onMove, zoom]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return;
      isDragging.current = false;
      if (rafId.current) cancelAnimationFrame(rafId.current);
      const finalPos = { x: e.clientX, y: e.clientY };
      onEnd?.(finalPos);
    },
    [onEnd]
  );

  useEffect(() => {
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, []);

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    isDragging: isDragging.current,
  };
}
