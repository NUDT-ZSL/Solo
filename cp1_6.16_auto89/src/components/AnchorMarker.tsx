import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { Anchor, CraftType } from '../types';

interface AnchorMarkerProps {
  anchor: Anchor;
  isEditMode: boolean;
  onPositionChange?: (id: string, x: number, y: number) => void;
}

const typeLabels: Record<CraftType, string> = {
  material: '材料',
  technique: '技法',
  tool: '工具',
};

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const AnchorMarker: React.FC<AnchorMarkerProps> = ({
  anchor,
  isEditMode,
  onPositionChange,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const markerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLElement | null>(null);
  const dragStartPos = useRef({ x: 0, y: 0, anchorX: 0, anchorY: 0 });

  const handleDragStart = useCallback(
    (clientX: number, clientY: number) => {
      if (!isEditMode) return;

      const container = markerRef.current?.parentElement;
      if (!container) return;

      containerRef.current = container;

      setIsDragging(true);
      setShowTooltip(false);
      dragStartPos.current = {
        x: clientX,
        y: clientY,
        anchorX: anchor.x,
        anchorY: anchor.y,
      };
    },
    [isEditMode, anchor.x, anchor.y]
  );

  const handleDragMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!isDragging) return;

      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const deltaX = clientX - dragStartPos.current.x;
      const deltaY = clientY - dragStartPos.current.y;

      const newX = clamp(
        dragStartPos.current.anchorX + (deltaX / rect.width) * 100,
        0,
        100
      );
      const newY = clamp(
        dragStartPos.current.anchorY + (deltaY / rect.height) * 100,
        0,
        100
      );

      if (onPositionChange) {
        onPositionChange(anchor.id, newX, newY);
      }
    },
    [isDragging, anchor.id, onPositionChange]
  );

  const handleDragEnd = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
    }
  }, [isDragging]);

  const handleMouseEnter = useCallback(() => {
    if (!isDragging) {
      setShowTooltip(true);
    }
  }, [isDragging]);

  const handleMouseLeave = useCallback(() => {
    if (!isDragging) {
      setShowTooltip(false);
    }
  }, [isDragging]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      handleDragStart(e.clientX, e.clientY);
    },
    [handleDragStart]
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length !== 1) return;
      e.preventDefault();
      e.stopPropagation();
      const touch = e.touches[0];
      handleDragStart(touch.clientX, touch.clientY);
    },
    [handleDragStart]
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      handleDragMove(e.clientX, e.clientY);
    };

    const handleMouseUp = () => {
      handleDragEnd();
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      e.preventDefault();
      const touch = e.touches[0];
      handleDragMove(touch.clientX, touch.clientY);
    };

    const handleTouchEnd = () => {
      handleDragEnd();
    };

    document.addEventListener('mousemove', handleMouseMove, { passive: false });
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  return (
    <div
      ref={markerRef}
      className={`anchor-marker ${anchor.type} ${isDragging ? 'dragging' : ''}`}
      style={{
        left: `${anchor.x}%`,
        top: `${anchor.y}%`,
        transition: isDragging ? 'none' : 'transform 0.15s ease, box-shadow 0.2s ease',
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={isEditMode ? handleMouseDown : undefined}
      onTouchStart={isEditMode ? handleTouchStart : undefined}
    >
      <div
        className={`anchor-tooltip ${showTooltip ? 'visible' : ''}`}
      >
        <span className={`anchor-tooltip-type ${anchor.type}`}>
          {typeLabels[anchor.type]}
        </span>
        <div className="anchor-tooltip-desc">{anchor.description}</div>
      </div>
    </div>
  );
};

export default AnchorMarker;
