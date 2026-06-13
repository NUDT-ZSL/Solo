import { useState, useEffect, useRef, useCallback } from 'react';

interface UseVirtualScrollOptions<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  maxVisibleItems?: number;
  overscan?: number;
}

interface UseVirtualScrollResult<T> {
  visibleItems: T[];
  startIndex: number;
  endIndex: number;
  containerRef: React.RefObject<HTMLDivElement>;
  scrollTop: number;
  totalHeight: number;
  offsetY: number;
}

export function useVirtualScroll<T>({
  items,
  itemHeight,
  containerHeight,
  maxVisibleItems = 20,
  overscan = 5,
}: UseVirtualScrollOptions<T>): UseVirtualScrollResult<T> {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();

  const totalHeight = items.length * itemHeight;

  const handleScroll = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      if (containerRef.current) {
        setScrollTop(containerRef.current.scrollTop);
      }
    });
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
      return () => {
        container.removeEventListener('scroll', handleScroll);
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }
  }, [handleScroll]);

  const visibleCount = Math.min(
    maxVisibleItems,
    Math.ceil(containerHeight / itemHeight) + overscan * 2
  );

  let startIndex = Math.floor(scrollTop / itemHeight) - overscan;
  startIndex = Math.max(0, startIndex);

  let endIndex = startIndex + visibleCount;
  endIndex = Math.min(items.length, endIndex);

  if (endIndex - startIndex < visibleCount) {
    startIndex = Math.max(0, endIndex - visibleCount);
  }

  const visibleItems = items.slice(startIndex, endIndex);
  const offsetY = startIndex * itemHeight;

  return {
    visibleItems,
    startIndex,
    endIndex,
    containerRef,
    scrollTop,
    totalHeight,
    offsetY,
  };
}
