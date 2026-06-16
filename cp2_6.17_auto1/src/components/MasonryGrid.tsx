import { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import type { Photo } from '@/types';
import { PhotoCard } from './PhotoCard';

interface MasonryGridProps {
  photos: Photo[];
  columnWidth?: number;
  gap?: number;
}

const COLUMN_WIDTH = 240;
const GAP = 16;

export function MasonryGrid({ photos, columnWidth = COLUMN_WIDTH, gap = GAP }: MasonryGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(800);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    setViewportHeight(window.innerHeight);

    const handleResize = () => {
      setViewportHeight(window.innerHeight);
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };

    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleScroll = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      if (containerRef.current) {
        const scrollContainer = containerRef.current.closest('.overflow-y-auto');
        if (scrollContainer) {
          setScrollTop(scrollContainer.scrollTop);
        }
      }
    });
  }, []);

  useEffect(() => {
    const scrollContainer = containerRef.current?.closest('.overflow-y-auto');
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
      return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  const { columnCount, positions, totalHeight } = useMemo(() => {
    if (containerWidth === 0) {
      return { columnCount: 3, positions: [] as { left: number; top: number; height: number }[], totalHeight: 0 };
    }

    const availableWidth = containerWidth + gap;
    const columnCount = Math.max(1, Math.floor(availableWidth / (columnWidth + gap)));
    const actualColumnWidth = (containerWidth - (columnCount - 1) * gap) / columnCount;

    const columnHeights = new Array(columnCount).fill(0);
    const positions: { left: number; top: number; height: number }[] = [];

    const cardHeights = photos.map(() => {
      const baseHeight = actualColumnWidth * 0.75;
      return baseHeight + 90;
    });

    cardHeights.forEach((cardHeight, index) => {
      const shortestColumn = columnHeights.indexOf(Math.min(...columnHeights));
      const left = shortestColumn * (actualColumnWidth + gap);
      const top = columnHeights[shortestColumn];

      positions.push({ left, top, height: cardHeight });
      columnHeights[shortestColumn] = top + cardHeight + gap;
    });

    const totalHeight = Math.max(...columnHeights);

    return { columnCount, positions, totalHeight, actualColumnWidth };
  }, [containerWidth, photos, columnWidth, gap]);

  const visibleRange = useMemo(() => {
    const buffer = viewportHeight * 0.5;
    const viewTop = Math.max(0, scrollTop - buffer);
    const viewBottom = scrollTop + viewportHeight + buffer;

    let startIndex = 0;
    let endIndex = photos.length;

    for (let i = 0; i < positions.length; i++) {
      if (positions[i].top + positions[i].height >= viewTop) {
        startIndex = i;
        break;
      }
    }

    for (let i = startIndex; i < positions.length; i++) {
      if (positions[i].top > viewBottom) {
        endIndex = i;
        break;
      }
    }

    return { startIndex: Math.max(0, startIndex - 10), endIndex: Math.min(positions.length, endIndex + 10) };
  }, [positions, scrollTop, viewportHeight, photos.length]);

  const actualColumnWidth = useMemo(() => {
    if (containerWidth === 0) return columnWidth;
    const availableWidth = containerWidth + gap;
    const columnCount = Math.max(1, Math.floor(availableWidth / (columnWidth + gap)));
    return (containerWidth - (columnCount - 1) * gap) / columnCount;
  }, [containerWidth, columnWidth, gap]);

  return (
    <div
      ref={containerRef}
      className="relative w-full"
      style={{ height: totalHeight }}
    >
      {photos.map((photo, index) => {
        if (index < visibleRange.startIndex || index >= visibleRange.endIndex) {
          return null;
        }

        const pos = positions[index];
        if (!pos) return null;

        return (
          <PhotoCard
            key={photo.id}
            photo={photo}
            style={{
              width: actualColumnWidth,
              height: pos.height,
              transform: `translate3d(${pos.left}px, ${pos.top}px, 0)`,
            }}
          />
        );
      })}
    </div>
  );
}
