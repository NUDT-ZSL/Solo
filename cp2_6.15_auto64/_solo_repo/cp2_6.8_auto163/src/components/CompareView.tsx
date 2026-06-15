import React, { useRef, useState, useEffect, useCallback } from 'react';

interface CompareViewProps {
  originalUrl: string;
  editedUrl: string;
}

const CompareView: React.FC<CompareViewProps> = ({ originalUrl, editedUrl }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [splitPos, setSplitPos] = useState(50);
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pos = ((e.clientX - rect.left) / rect.width) * 100;
      setSplitPos(Math.min(100, Math.max(0, pos)));
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'grabbing';
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleTouchStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDragging || !containerRef.current) return;
      const touch = e.touches[0];
      const rect = containerRef.current.getBoundingClientRect();
      const pos = ((touch.clientX - rect.left) / rect.width) * 100;
      setSplitPos(Math.min(100, Math.max(0, pos)));
    },
    [isDragging]
  );

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleTouchEnd);
    }
    return () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, handleTouchMove, handleTouchEnd]);

  return (
    <div
      ref={containerRef}
      className="compare-container"
    >
      <div className="compare-image-wrapper">
        <img src={originalUrl} alt="原图" className="compare-image" />
      </div>

      <div
        className="compare-image-wrapper compare-edited"
        style={{ clipPath: `inset(0 0 0 ${splitPos}%)` }}
      >
        <img src={editedUrl} alt="处理后" className="compare-image" />
      </div>

      <div
        className={`compare-divider ${isDragging ? 'dragging' : ''}`}
        style={{ left: `${splitPos}%` }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <div className="divider-handle">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5h2v14H8V5zm6 0h2v14h-2V5z" />
          </svg>
        </div>
      </div>

      <div className="compare-labels">
        <span className="label-original">原图</span>
        <span className="label-edited">处理后</span>
      </div>
    </div>
  );
};

export default CompareView;
