import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Exhibit } from '../types';
import ExhibitCard from './ExhibitCard';
import './GridMap.css';

interface GridMapProps {
  exhibits: Exhibit[];
  draggingExhibitId: string | null;
  dragPosition: { x: number; y: number } | null;
  onExhibitDrop: (exhibitId: string, gridX: number, gridY: number) => void;
  onExhibitClick: (exhibit: Exhibit) => void;
  onRotate: (exhibitId: string, direction: 'left' | 'right') => void;
  onSpacingChange: (exhibitId: string, spacing: number) => void;
  rippleExhibits: Record<string, number>;
}

const GRID_SIZE = 15;
const CELL_SIZE = 56;

const GridMap: React.FC<GridMapProps> = ({
  exhibits,
  draggingExhibitId,
  dragPosition,
  onExhibitDrop,
  onExhibitClick,
  onRotate,
  onSpacingChange,
  rippleExhibits,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number } | null>(null);
  const [highlightCells, setHighlightCells] = useState<Record<string, number>>({});
  const [spacingSlider, setSpacingSlider] = useState<{
    visible: boolean;
    exhibitId: string;
    x: number;
    y: number;
    value: number;
  } | null>(null);
  const [newlyPlaced, setNewlyPlaced] = useState<Set<string>>(new Set());
  const rafRef = useRef<number | null>(null);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  const placedExhibits = exhibits.filter((e) => e.isPlaced);
  const draggingExhibit = exhibits.find((e) => e.id === draggingExhibitId);

  const getGridFromPosition = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      if (!mapRef.current) return null;
      const rect = mapRef.current.getBoundingClientRect();
      const x = Math.floor((clientX - rect.left) / CELL_SIZE);
      const y = Math.floor((clientY - rect.top) / CELL_SIZE);
      if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
        return { x, y };
      }
      return null;
    },
    []
  );

  const updateHoveredCell = useCallback(
    (clientX: number, clientY: number) => {
      const gridPos = getGridFromPosition(clientX, clientY);
      if (!gridPos) {
        if (hoveredCell) setHoveredCell(null);
        return;
      }
      if (!hoveredCell || hoveredCell.x !== gridPos.x || hoveredCell.y !== gridPos.y) {
        setHoveredCell(gridPos);
      }
    },
    [hoveredCell, getGridFromPosition]
  );

  useEffect(() => {
    if (!draggingExhibitId || !dragPosition) {
      if (hoveredCell) setHoveredCell(null);
      return;
    }

    const animate = () => {
      if (lastPosRef.current) {
        updateHoveredCell(lastPosRef.current.x, lastPosRef.current.y);
      }
      rafRef.current = requestAnimationFrame(animate);
    };

    lastPosRef.current = dragPosition;
    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [draggingExhibitId, dragPosition, updateHoveredCell]);

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (!draggingExhibitId) return;
      const gridPos = getGridFromPosition(e.clientX, e.clientY);
      if (gridPos) {
        onExhibitDrop(draggingExhibitId, gridPos.x, gridPos.y);
        const cellKey = `${gridPos.x}-${gridPos.y}`;
        setHighlightCells((prev) => ({ ...prev, [cellKey]: Date.now() }));
        setTimeout(() => {
          setHighlightCells((prev) => {
            const next = { ...prev };
            delete next[cellKey];
            return next;
          });
        }, 500);
        setNewlyPlaced((prev) => {
          const next = new Set(prev);
          next.add(draggingExhibitId);
          return next;
        });
        setTimeout(() => {
          setNewlyPlaced((prev) => {
            const next = new Set(prev);
            next.delete(draggingExhibitId);
            return next;
          });
        }, 300);
      }
      setHoveredCell(null);
    },
    [draggingExhibitId, getGridFromPosition, onExhibitDrop]
  );

  const handleCardClick = (exhibit: Exhibit, e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.shiftKey) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setSpacingSlider({
        visible: true,
        exhibitId: exhibit.id,
        x: rect.left + rect.width / 2,
        y: rect.top - 50,
        value: exhibit.spacing,
      });
      return;
    }
    onExhibitClick(exhibit);
  };

  const handleRotate = (exhibitId: string, direction: 'left' | 'right') => {
    onRotate(exhibitId, direction);
  };

  const handleSpacingChange = (value: number) => {
    if (spacingSlider) {
      setSpacingSlider({ ...spacingSlider, value });
    }
  };

  const handleSpacingEnd = () => {
    if (spacingSlider) {
      onSpacingChange(spacingSlider.exhibitId, spacingSlider.value);
      setSpacingSlider(null);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (spacingSlider?.visible) {
        const target = e.target as HTMLElement;
        if (!target.closest('.spacing-slider-popup')) {
          handleSpacingEnd();
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [spacingSlider]);

  const renderGrid = () => {
    const cells = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const cellKey = `${x}-${y}`;
        const isHovered = hoveredCell?.x === x && hoveredCell?.y === y;
        const isHighlighted = !!highlightCells[cellKey];
        cells.push(
          <div
            key={cellKey}
            className={`grid-cell ${isHovered ? 'hovered' : ''} ${isHighlighted ? 'highlighted' : ''}`}
            style={{
              left: x * CELL_SIZE,
              top: y * CELL_SIZE,
              width: CELL_SIZE,
              height: CELL_SIZE,
            }}
          />
        );
      }
    }
    return cells;
  };

  return (
    <div className="grid-map-container">
      <div className="grid-map-wrapper">
        <div className="grid-coords-top">
          {Array.from({ length: GRID_SIZE }, (_, i) => (
            <span key={i} className="coord-label" style={{ width: CELL_SIZE }}>
              {i + 1}
            </span>
          ))}
        </div>
        <div className="grid-coords-left">
          {Array.from({ length: GRID_SIZE }, (_, i) => (
            <span key={i} className="coord-label" style={{ height: CELL_SIZE }}>
              {String.fromCharCode(65 + i)}
            </span>
          ))}
        </div>

        <div
          ref={mapRef}
          className="grid-map"
          style={{
            width: GRID_SIZE * CELL_SIZE,
            height: GRID_SIZE * CELL_SIZE,
          }}
          onMouseUp={handleMouseUp}
        >
          {renderGrid()}

          {placedExhibits.map((exhibit) => (
            <div
              key={exhibit.id}
              className={`placed-exhibit ${newlyPlaced.has(exhibit.id) ? 'spring-enter' : ''}`}
              style={{
                left: exhibit.gridX! * CELL_SIZE + 4,
                top: exhibit.gridY! * CELL_SIZE + 4,
                width: CELL_SIZE - 8,
                height: CELL_SIZE - 8,
                transition: 'left 0.4s ease-out, top 0.4s ease-out',
              }}
              onClick={(e) => handleCardClick(exhibit, e)}
            >
              <ExhibitCard
                exhibit={exhibit}
                isOnMap={true}
                showRotation={true}
                onRotate={(dir) => handleRotate(exhibit.id, dir)}
                showRipple={!!rippleExhibits[exhibit.id]}
                rippleKey={rippleExhibits[exhibit.id] || 0}
              />
            </div>
          ))}
        </div>
      </div>

      {draggingExhibit && dragPosition && (
        <div
          className="drag-ghost"
          style={{
            left: dragPosition.x - 100,
            top: dragPosition.y - 40,
          }}
        >
          <ExhibitCard exhibit={draggingExhibit} isDragging={true} />
        </div>
      )}

      {spacingSlider?.visible && (
        <div
          className="spacing-slider-popup"
          style={{
            left: spacingSlider.x,
            top: spacingSlider.y,
          }}
        >
          <div className="spacing-info">间距: {spacingSlider.value}px</div>
          <input
            type="range"
            min="50"
            max="200"
            value={spacingSlider.value}
            onChange={(e) => handleSpacingChange(Number(e.target.value))}
            onMouseUp={handleSpacingEnd}
            onTouchEnd={handleSpacingEnd}
            className="spacing-range"
          />
        </div>
      )}
    </div>
  );
};

export default GridMap;
