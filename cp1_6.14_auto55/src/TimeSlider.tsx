import { useRef, useCallback, useEffect, useState } from 'react';
import type { Dataset } from './types';

interface TimeSliderProps {
  min: number;
  max: number;
  value: number;
  onChange: (index: number) => void;
  dataset: Dataset;
}

function TimeSlider({ min, max, value, onChange, dataset }: TimeSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const percentage = max > 0 ? (value / max) * 100 : 0;

  const handlePosition = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track) return;

      const rect = track.getBoundingClientRect();
      let pct = (clientX - rect.left) / rect.width;
      pct = Math.max(0, Math.min(1, pct));

      const index = Math.round(pct * max);
      onChange(index);
    },
    [max, onChange]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      setIsDragging(true);
      handlePosition(e.clientX);
    },
    [handlePosition]
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        handlePosition(e.clientX);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handlePosition]);

  const currentPoint = dataset.data[value];
  const formatTime = (date: Date) => {
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
    });
  };

  const startLabel = dataset.data.length > 0 ? formatTime(dataset.data[0].time) : '';
  const endLabel = dataset.data.length > 0 ? formatTime(dataset.data[dataset.data.length - 1].time) : '';

  return (
    <div className="time-slider-wrapper">
      <div className="slider-labels">
        <span className="slider-label">{startLabel}</span>
        <span className="slider-current">
          {currentPoint ? formatTime(currentPoint.time) : ''}
        </span>
        <span className="slider-label">{endLabel}</span>
      </div>
      <div
        className="slider-track"
        ref={trackRef}
        onMouseDown={handleMouseDown}
      >
        <div className="slider-progress" style={{ width: `${percentage}%` }} />
        <div
          className={`slider-handle ${isDragging ? 'dragging' : ''}`}
          style={{ left: `calc(${percentage}% - 10px)` }}
          onMouseDown={handleMouseDown}
        />
      </div>
    </div>
  );
}

export default TimeSlider;
