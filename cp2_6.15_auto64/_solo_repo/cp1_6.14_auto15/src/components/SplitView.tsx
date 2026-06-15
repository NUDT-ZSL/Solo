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
  const pendingPositionRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  const updatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const deltaX = clientX - startXRef.current;
    const deltaPercent = (deltaX / rect.width) * 100;
    const newPosition = Math.max(0, Math.min(100, startPositionRef.current + deltaPercent));
    
    pendingPositionRef.current = newPosition;
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(() => {
        if (pendingPositionRef.current !== null) {
          onPositionChange(pendingPositionRef.current);
          pendingPositionRef.current = null;
        }
        rafRef.current = null;
      });
    }
  }, [onPositionChange]);

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
      e.preventDefault();
      updatePosition(e.clientX);
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length > 0) {
        updatePosition(e.touches[0].clientX);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (pendingPositionRef.current !== null) {
        onPositionChange(pendingPositionRef.current);
        pendingPositionRef.current = null;
      }
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (pendingPositionRef.current !== null) {
        onPositionChange(pendingPositionRef.current);
        pendingPositionRef.current = null;
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: false });
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [isDragging, setIsDragging, updatePosition, onPositionChange]);

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
