import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Exhibit } from '../types';
import ExhibitCard from './ExhibitCard';
import './GridMap.css';

interface GridMapProps {
  exhibits: Exhibit[];
  onExhibitDrop: (exhibitId: string, gridX: number, gridY: number) => void;
  onExhibitClick: (exhibit: Exhibit) => void;
  onRotate: (exhibitId: string, direction: 'left' | 'right') => void;
  draggingExhibitId: string | null;
  dragPosition: { x: number; y: number } | null;
  rippleExhibits: { [key: string]: number };
}

const GRID_SIZE = 15;
const CELL_SIZE = 60;

const GridMap: React.FC<GridMapProps> = ({
  exhibits,
  onExhibitDrop,
  onExhibitClick,
  onRotate,
  draggingExhibitId,
  dragPosition,
  rippleExhibits,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number } | null>(null);
  const [highlightCell, setHighlightCell] = useState<{ x: number; y: number } | null>(null);
  const [spacingSlider, setSpacingSlider] = useState<{
    visible: boolean;
    exhibitId: string;
    x: number;
    y: number;
    value: number;
  } | null>(null);

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

  const handleDragOver = useCallback(
    (e: React.MouseEvent) => {
      if (!draggingExhibitId) return;
      const gridPos = getGridFromPosition(e.clientX, e.clientY);
      setHoveredCell(gridPos);
    },
    [draggingExhibitId, getGridFromPosition]
  );

  const handleDrop = useCallback(
    (e: React.MouseEvent) => {
      if (!draggingExhibitId) return;
      const gridPos = getGridFromPosition(e.clientX, e.clientY);
      if (gridPos) {
        onExhibitDrop(draggingExhibitId, gridPos.x, gridPos.y);
        setHighlightCell(gridPos);
        setTimeout(() => setHighlightCell(null), 500);
      }
      setHoveredCell(null);
    },
    [draggingExhibitId, getGridFromPosition, onExhibitDrop]
  );

  useEffect(() => {
    if (!draggingExhibitId && hoveredCell) {
      setHoveredCell(null);
    }
  }, [draggingExhibitId, hoveredCell]);

  const handleRotate = (exhibitId: string, direction: 'left' | 'right') => {
    onRotate(exhibitId, direction);
  };

  const handleCardMouseDown = (e: React.MouseEvent, exhibit: Exhibit) => {
    e.stopPropagation();
  };

  const handleSpacingClick = (e: React.MouseEvent, exhibit: Exhibit) => {
    e.stopPropagation();
    if (e.shiftKey) {
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      setSpacingSlider({
        visible: true,
        exhibitId: exhibit.id,
        x: rect.left + rect.width / 2,
        y: rect.top - 20,
        value: exhibit.spacing,
      });
    }
  };

  const renderGrid = () => {
    const cells = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const isHovered = hoveredCell?.x === x && hoveredCell?.y === y;
        const isHighlighted = highlightCell?.x === x && highlightCell?.y === y;
        cells.push(
          <div
            key={`${x}-${y}`}
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
    <div className="grid-map-wrapper">
      <div
        ref={mapRef}
        className="grid-map"
        style={{
          width: GRID_SIZE * CELL_SIZE,
          height: GRID_SIZE * CELL_SIZE,
        }}
        onMouseMove={handleDragOver}
        onMouseUp={handleDrop}
      >
        <div className="grid-labels grid-labels-top">
          {Array.from({ length: GRID_SIZE }, (_, i) => (
            <span key={i} className="grid-label" style={{ width: CELL_SIZE }}>
              {i + 1}
            </span>
          ))}
        </div>
        <div className="grid-labels grid-labels-left">
          {Array.from({ length: GRID_SIZE }, (_, i) => (
            <span key={i} className="grid-label" style={{ height: CELL_SIZE }}>
              {String.fromCharCode(65 + i)}
            </span>
          ))}
        </div>

        <div className="grid-cells">{renderGrid()}</div>

        {placedExhibits.map((exhibit) => (
          <div
            key={exhibit.id}
            className="placed-exhibit"
            style={{
              left: exhibit.gridX! * CELL_SIZE + 4,
              top: exhibit.gridY! * CELL_SIZE + 4,
              width: CELL_SIZE - 8,
              height: CELL_SIZE - 8,
            }}
            onClick={() => onExhibitClick(exhibit)}
            onMouseDown={(e) => handleCardMouseDown(e, exhibit)}
            onShiftClick={(e: any) => handleSpacingClick(e, exhibit)}
          >
            <ExhibitCard
              exhibit={exhibit}
              isOnMap={true}
              showRotationControls={true}
              onRotate={(dir) => handleRotate(exhibit.id, dir)}
              showRipple={!!rippleExhibits[exhibit.id]}
              rippleKey={rippleExhibits[exhibit.id] || 0}
            />
          </div>
        ))}

        {draggingExhibit && dragPosition && (
          <div
            className="dragging-exhibit-ghost"
            style={{
              left: dragPosition.x - 100,
              top: dragPosition.y - 40,
            }}
          >
            <ExhibitCard exhibit={draggingExhibit} isDragging={true} />
          </div>
        )}
      </div>

      {spacingSlider?.visible && (
        <div
          className="spacing-slider-popup"
          style={{
            left: spacingSlider.x,
            top: spacingSlider.y,
          }}
        >
          <div className="spacing-label">间距: {spacingSlider.value}px</div>
          <input
            type="range"
            min="50"
            max="200"
            value={spacingSlider.value}
            onChange={(e) => {
              setSpacingSlider({ ...spacingSlider, value: Number(e.target.value) });
            }}
            onMouseUp={() => setSpacingSlider(null)}
            className="spacing-slider"
          />
        </div>
      )}
    </div>
  );
};

export default GridMap;
