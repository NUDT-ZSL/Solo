import { useRef, useCallback, useEffect } from 'react';
import './SplitView.css';

interface SplitViewProps {
  position: number;
  onPositionChange: (position: number) => void;
  isDragging: boolean;
  setIsDragging: (dragging: boolean) => void;
}

function SplitView({ position, onPositionChange, isDragging, setIsDragging }: SplitViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startPositionRef = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startXRef.current = e.clientX;
    startPositionRef.current = position;
  }, [position, setIsDragging]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setIsDragging(true);
    startXRef.current = e.touches[0].clientX;
    startPositionRef.current = position;
  }, [position, setIsDragging]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const deltaX = e.clientX - startXRef.current;
      const deltaPercent = (deltaX / rect.width) * 100;
      const newPosition = Math.max(0, Math.min(100, startPositionRef.current + deltaPercent));
      onPositionChange(newPosition);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const deltaX = e.touches[0].clientX - startXRef.current;
      const deltaPercent = (deltaX / rect.width) * 100;
      const newPosition = Math.max(0, Math.min(100, startPositionRef.current + deltaPercent));
      onPositionChange(newPosition);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, onPositionChange, setIsDragging]);

  return (
    <div
      ref={containerRef}
      className="split-view-container"
    >
      <div
        className={`split-divider ${isDragging ? 'dragging' : ''}`}
        style={{ left: `${position}%` }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <div className="divider-line" />
        <div className="divider-handle">
          <div className="handle-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="8" y2="18" />
              <line x1="16" y1="6" x2="16" y2="18" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SplitView;
