import { useCallback, useRef, useEffect, memo } from 'react';
import './Timeline.css';

interface TimelineProps {
  currentHour: number;
  onHourChange: (hour: number) => void;
}

function TimelineComponent({ currentHour, onHourChange }: TimelineProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const rafId = useRef<number | null>(null);
  const pendingHour = useRef<number | null>(null);

  const updateHourFromPosition = useCallback((clientY: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const percentage = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    const hour = percentage * 24;
    pendingHour.current = hour;
    if (rafId.current === null) {
      rafId.current = requestAnimationFrame(() => {
        if (pendingHour.current !== null) {
          onHourChange(pendingHour.current);
          pendingHour.current = null;
        }
        rafId.current = null;
      });
    }
  }, [onHourChange]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current) return;
    updateHourFromPosition(e.clientY);
  }, [updateHourFromPosition]);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    if (rafId.current !== null) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove]);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    updateHourFromPosition(e.clientY);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [updateHourFromPosition, handleMouseMove, handleMouseUp]);

  const handleTrackClick = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) {
      updateHourFromPosition(e.clientY);
    }
  }, [updateHourFromPosition]);

  useEffect(() => {
    return () => {
      if (rafId.current !== null) cancelAnimationFrame(rafId.current);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const handleTop = (currentHour / 24) * 100;
  const selectedHour = Math.round(currentHour);

  return (
    <div className="timeline-container">
      <div className="timeline-header">
        <h2 className="timeline-title">时间轴</h2>
        <p className="timeline-subtitle">
          {String(Math.floor(currentHour)).padStart(2, '0')}:
          {String(Math.floor((currentHour % 1) * 60)).padStart(2, '0')}
        </p>
      </div>
      <div className="timeline-track-wrapper">
        <div
          ref={trackRef}
          className="timeline-track"
          onClick={handleTrackClick}
          onMouseDown={handleDragStart}
        >
          <div className="timeline-line" />
          {hours.map((hour) => {
            const isSelected = selectedHour === hour;
            return (
              <div
                key={hour}
                className={`timeline-node ${isSelected ? 'selected' : ''}`}
                style={{ top: `${(hour / 24) * 100}%` }}
                onClick={(e) => {
                  e.stopPropagation();
                  onHourChange(hour);
                }}
              >
                {isSelected && (
                  <>
                    <div className="timeline-pulse timeline-pulse-1" />
                    <div className="timeline-pulse timeline-pulse-2" />
                  </>
                )}
                <div className="timeline-dot" />
                <span className="timeline-label">{String(hour).padStart(2, '0')}:00</span>
              </div>
            );
          })}
          <div
            className="timeline-handle"
            style={{ top: `calc(${handleTop}% - 10px)` }}
            onMouseDown={handleDragStart}
          />
        </div>
      </div>
    </div>
  );
}

export const Timeline = memo(TimelineComponent);
