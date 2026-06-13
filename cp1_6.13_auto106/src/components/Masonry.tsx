import { useEffect, useRef, useState, useCallback, ReactNode } from 'react';
import './Masonry.css';

interface MasonryProps {
  children: ReactNode[];
  columnGap?: number;
  rowGap?: number;
}

const getColumnCount = (width: number): number => {
  if (width < 420) return 1;
  if (width < 768) return 2;
  if (width < 1280) return 3;
  if (width < 1920) return 4;
  return 5;
};

export default function Masonry({ children, columnGap = 16, rowGap = 16 }: MasonryProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [columnCount, setColumnCount] = useState(1);
  const [containerWidth, setContainerWidth] = useState(0);
  const [itemPositions, setItemPositions] = useState<{ left: number; top: number; width: number }[]>([]);
  const [containerHeight, setContainerHeight] = useState(0);
  const resizeTimeoutRef = useRef<number | null>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  const calculatePositions = useCallback(() => {
    if (!containerRef.current || children.length === 0) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const cols = getColumnCount(width);
    const colWidth = (width - (cols - 1) * columnGap) / cols;

    const columnHeights = new Array(cols).fill(0);
    const positions: { left: number; top: number; width: number }[] = [];

    for (let i = 0; i < children.length; i++) {
      const itemEl = itemRefs.current[i];
      if (!itemEl) {
        positions.push({
          left: 0,
          top: 0,
          width: colWidth,
        });
        continue;
      }

      const shortestCol = columnHeights.indexOf(Math.min(...columnHeights));
      const itemHeight = itemEl.offsetHeight;

      positions.push({
        left: shortestCol * (colWidth + columnGap),
        top: columnHeights[shortestCol],
        width: colWidth,
      });

      columnHeights[shortestCol] += itemHeight + rowGap;
    }

    setItemPositions(positions);
    setContainerHeight(Math.max(...columnHeights));
  }, [children.length, columnGap, rowGap]);

  useEffect(() => {
    const handleResize = () => {
      if (resizeTimeoutRef.current) {
        window.clearTimeout(resizeTimeoutRef.current);
      }
      resizeTimeoutRef.current = window.setTimeout(() => {
        if (containerRef.current) {
          const width = containerRef.current.clientWidth;
          setContainerWidth(width);
          setColumnCount(getColumnCount(width));
        }
      }, 100);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimeoutRef.current) {
        window.clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (containerWidth > 0) {
      // 等待DOM更新后计算
      const timeoutId = setTimeout(calculatePositions, 50);
      return () => clearTimeout(timeoutId);
    }
  }, [children, containerWidth, columnCount, calculatePositions]);

  return (
    <div
      ref={containerRef}
      className="masonry-wrapper"
      style={{ height: containerHeight }}
    >
      {children.map((child, index) => (
        <div
          key={index}
          ref={(el) => {
            itemRefs.current[index] = el;
          }}
          className="masonry-item-wrapper"
          style={{
            position: 'absolute',
            left: itemPositions[index]?.left ?? 0,
            top: itemPositions[index]?.top ?? 0,
            width: itemPositions[index]?.width ?? 'calc(100% - 16px)',
            transform: 'translateZ(0)',
            willChange: 'transform',
          }}
        >
          {child}
        </div>
      ))}
    </div>
  );
}
