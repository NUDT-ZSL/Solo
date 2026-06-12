import React, { useCallback, useRef, useState } from 'react';
import { Task, TaskPosition, CATEGORY_COLORS } from '../types';

interface MinimapProps {
  tasks: Task[];
  positions: TaskPosition[];
  totalWidth: number;
  totalHeight: number;
  scrollLeft: number;
  viewportWidth: number;
  onScrollChange: (scrollLeft: number) => void;
}

const MINIMAP_WIDTH = 200;
const MINIMAP_ROW_HEIGHT = 4;

export default function Minimap({
  tasks,
  positions,
  totalWidth,
  totalHeight,
  scrollLeft,
  viewportWidth,
  onScrollChange,
}: MinimapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const minimapHeight = Math.max(tasks.length * MINIMAP_ROW_HEIGHT + 20, 60);
  const scaleX = MINIMAP_WIDTH / totalWidth;
  const viewX = scrollLeft * scaleX;
  const viewW = Math.max(viewportWidth * scaleX, 20);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const startX = e.clientX;
    const startScrollLeft = scrollLeft;

    const handleMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX;
      const newScrollLeft = Math.max(0, Math.min(
        totalWidth - viewportWidth,
        startScrollLeft + dx / scaleX
      ));
      onScrollChange(newScrollLeft);
    };

    const handleUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  }, [scrollLeft, scaleX, totalWidth, viewportWidth, onScrollChange]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (isDragging) return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newScrollLeft = Math.max(0, Math.min(
      totalWidth - viewportWidth,
      clickX / scaleX - viewportWidth * scaleX / 2
    ));
    onScrollChange(newScrollLeft / scaleX * scaleX);
  }, [isDragging, scaleX, totalWidth, viewportWidth, onScrollChange]);

  return (
    <div
      className="minimap-panel"
      style={{
        width: MINIMAP_WIDTH,
        background: '#f5f5f5',
        borderLeft: '1px solid #e0e0e0',
        flexShrink: 0,
      }}
    >
      <div style={{
        padding: '6px 8px',
        fontSize: 11,
        color: '#888',
        borderBottom: '1px solid #e0e0e0',
        fontWeight: 600,
      }}>
        概览
      </div>
      <svg
        ref={svgRef}
        width={MINIMAP_WIDTH}
        height={minimapHeight}
        onClick={handleClick}
        style={{ display: 'block' }}
      >
        {positions.map(pos => {
          const task = tasks.find(t => t.id === pos.id);
          if (!task) return null;
          return (
            <rect
              key={pos.id}
              x={pos.x * scaleX}
              y={pos.row * MINIMAP_ROW_HEIGHT + 4}
              width={Math.max(pos.width * scaleX, 2)}
              height={MINIMAP_ROW_HEIGHT - 1}
              rx={1}
              fill={CATEGORY_COLORS[task.category]}
              opacity={0.7}
            />
          );
        })}
        <rect
          x={viewX}
          y={0}
          width={viewW}
          height={minimapHeight}
          fill="rgba(220, 60, 60, 0.15)"
          stroke="rgba(220, 60, 60, 0.6)"
          strokeWidth={1.5}
          rx={2}
          style={{ cursor: 'grab' }}
          onMouseDown={handleDragStart}
        />
      </svg>
    </div>
  );
}
