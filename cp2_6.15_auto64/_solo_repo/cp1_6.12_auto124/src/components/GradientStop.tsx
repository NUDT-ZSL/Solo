import React, { useState, useRef, useCallback, memo } from 'react';
import { GradientStop as GradientStopType } from '../types';
import { rafThrottle, clamp } from '../utils/performanceUtils';

interface GradientStopProps {
  stop: GradientStopType;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<GradientStopType>) => void;
  onDelete: () => void;
}

const GradientStop: React.FC<GradientStopProps> = memo(function GradientStop({
  stop,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
}) {
  const stopRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const dragStartOffset = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect();
    
    const track = stopRef.current?.parentElement;
    if (!track) return;
    
    trackRef.current = track;
    const rect = track.getBoundingClientRect();
    
    setIsDragging(true);
    dragStartX.current = e.clientX;
    dragStartOffset.current = stop.offset;
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [stop.offset, onSelect]);

  const handleMouseMove = useCallback(
    rafThrottle((e: MouseEvent) => {
      if (!trackRef.current) return;
      
      const rect = trackRef.current.getBoundingClientRect();
      const deltaX = e.clientX - dragStartX.current;
      const deltaOffset = deltaX / rect.width;
      
      let newOffset = dragStartOffset.current + deltaOffset;
      newOffset = clamp(newOffset, 0, 1);
      newOffset = Math.round(newOffset * 100) / 100;
      
      onUpdate({ offset: newOffset });
    }),
    [onUpdate]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    trackRef.current = null;
  }, [handleMouseMove]);

  const handleColorChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({ color: e.target.value });
  }, [onUpdate]);

  const handleColorClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  const leftPercent = stop.offset * 100;

  return (
    <div
      ref={stopRef}
      className={`gradient-stop ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
      style={{ left: `${leftPercent}%` }}
      onMouseDown={handleMouseDown}
    >
      <div className="gradient-stop-marker" />
      <input
        type="color"
        className="gradient-stop-color"
        value={stop.color}
        onChange={handleColorChange}
        onClick={handleColorClick}
        title="点击修改颜色"
      />
    </div>
  );
});

export default GradientStop;
