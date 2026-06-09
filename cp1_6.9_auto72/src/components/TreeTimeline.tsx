import { useRef, useState, useEffect, useCallback } from 'react';
import { TreeRecord } from '../types';

interface TreeTimelineProps {
  treeList: TreeRecord[];
  currentDate: string | null;
  onSelectDate: (date: string) => void;
  deletingDate?: string | null;
}

export default function TreeTimeline({
  treeList,
  currentDate,
  onSelectDate,
  deletingDate,
}: TreeTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const dragStartX = useRef(0);
  const scrollStartX = useRef(0);
  const [zoom, setZoom] = useState(1);
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  const baseSpacing = typeof window !== 'undefined' && window.innerWidth < 768 ? 40 : 60;
  const spacing = baseSpacing * zoom;
  const thumbSize = 44;

  const onMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    dragStartX.current = e.pageX;
    scrollStartX.current = containerRef.current?.scrollLeft || 0;
  };

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragging || !containerRef.current) return;
      const dx = e.pageX - dragStartX.current;
      containerRef.current.scrollLeft = scrollStartX.current - dx;
    },
    [dragging]
  );

  const onMouseUp = useCallback(() => {
    setDragging(false);
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [onMouseMove, onMouseUp]);

  const onWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom((z) => Math.max(0.5, Math.min(2, z + delta)));
    } else {
      if (containerRef.current) {
        containerRef.current.scrollLeft += e.deltaY;
      }
    }
  };

  const totalWidth = treeList.length * spacing + spacing * 2;

  return (
    <div className="timeline-wrapper">
      <div className="timeline-header">
        <h2 className="timeline-title">气候年轮</h2>
        <div className="zoom-info">
          <button
            className="zoom-btn"
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.2))}
          >
            −
          </button>
          <span className="zoom-text">{Math.round(zoom * 100)}%</span>
          <button
            className="zoom-btn"
            onClick={() => setZoom((z) => Math.min(2, z + 0.2))}
          >
            +
          </button>
        </div>
      </div>
      <div
        ref={containerRef}
        className={`timeline-container ${dragging ? 'dragging' : ''}`}
        onMouseDown={onMouseDown}
        onWheel={onWheel}
      >
        <div className="timeline-track" style={{ width: totalWidth, minWidth: '100%' }}>
          <div className="timeline-axis" />
          {treeList.length === 0 ? (
            <div className="timeline-empty">
              <p>暂无记录，快去记录今天的微气候吧！</p>
            </div>
          ) : (
            treeList.map((record, idx) => {
              const isSelected = record.date === currentDate;
              const isDeleting = record.date === deletingDate;
              const isHovered = record.date === hoveredDate;
              const scale = isSelected ? 1.2 : 1;
              const left = spacing * (idx + 1);

              return (
                <div
                  key={record.date}
                  className={`timeline-node ${isSelected ? 'selected' : ''} ${
                    isDeleting ? 'deleting' : ''
                  }`}
                  style={{
                    left,
                    transform: `translateX(-50%) scale(${isDeleting ? 0 : scale})`,
                    opacity: isDeleting ? 0 : 1,
                    transition: isDeleting
                      ? 'all 0.5s ease-in-out'
                      : 'transform 0.3s ease, opacity 0.5s ease',
                  }}
                  onClick={(e) => {
                    if (dragging) {
                      e.preventDefault();
                      return;
                    }
                    onSelectDate(record.date);
                  }}
                  onMouseEnter={() => setHoveredDate(record.date)}
                  onMouseLeave={() => setHoveredDate(null)}
                >
                  <div
                    className="tree-thumb"
                    style={{
                      width: thumbSize,
                      height: thumbSize,
                      borderRadius: '50%',
                      background: `radial-gradient(circle at 30% 30%, ${record.tree.avgLeafColor}, ${record.tree.leafColor} 70%, #1a3d18)`,
                      boxShadow: isSelected
                        ? `0 0 20px ${record.tree.avgLeafColor}99, 0 0 10px rgba(255,255,255,0.4)`
                        : '0 0 10px rgba(255,255,255,0.2)',
                    }}
                  />
                  <div
                    className="thumb-trunk"
                    style={{
                      width: Math.max(3, record.tree.trunkThickness * 0.4),
                      background: 'linear-gradient(to right, #5C4A2E, #8B6F47, #5C4A2E)',
                    }}
                  />
                  <div className="timeline-dot" />
                  <div
                    className={`date-label ${isHovered || isSelected ? 'visible' : ''}`}
                  >
                    {record.date.slice(5)}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
