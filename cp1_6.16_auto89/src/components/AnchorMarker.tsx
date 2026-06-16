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

const AnchorMarker: React.FC<AnchorMarkerProps> = ({
  anchor,
  isEditMode,
  onPositionChange,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const markerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragStartPos = useRef({ x: 0, y: 0, anchorX: 0, anchorY: 0 });

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
      if (!isEditMode) return;

      e.preventDefault();
      e.stopPropagation();

      const container = markerRef.current?.parentElement;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      containerRef.current = container;

      setIsDragging(true);
      dragStartPos.current = {
        x: e.clientX,
        y: e.clientY,
        anchorX: anchor.x,
        anchorY: anchor.y,
      };
    },
    [isEditMode, anchor.x, anchor.y]
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const deltaX = e.clientX - dragStartPos.current.x;
      const deltaY = e.clientY - dragStartPos.current.y;

      let newX = dragStartPos.current.anchorX + (deltaX / rect.width) * 100;
      let newY = dragStartPos.current.anchorY + (deltaY / rect.height) * 100;

      newX = Math.max(0, Math.min(100, newX));
      newY = Math.max(0, Math.min(100, newY));

      if (onPositionChange) {
        onPositionChange(anchor.id, newX, newY);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setShowTooltip(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, anchor.id, onPositionChange]);

  return (
    <div
      ref={markerRef}
      className={`anchor-marker ${anchor.type} ${isDragging ? 'dragging' : ''}`}
      style={{
        left: `${anchor.x}%`,
        top: `${anchor.y}%`,
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
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
