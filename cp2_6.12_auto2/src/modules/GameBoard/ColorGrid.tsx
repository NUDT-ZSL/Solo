import React, { useCallback, useRef, useState } from 'react';
import { RGB, rgbToString } from '../../utils/helpers';

export interface Cell {
  id: string;
  row: number;
  col: number;
  color: RGB | null;
  targetColor: RGB;
  isHighlighted: boolean;
  hintColor?: RGB;
  justPlaced?: boolean;
}

interface ColorGridProps {
  cells: Cell[][];
  onCellDrop: (row: number, col: number, color: RGB, paletteItemId: string) => void;
  onCellDragOver: (row: number, col: number) => void;
  onCellClear: (row: number, col: number) => void;
  highlightedCells: string[];
  hintCells: Map<string, RGB>;
  onDragEnter?: () => void;
  onDragLeave?: () => void;
}

export const ColorGrid: React.FC<ColorGridProps> = ({
  cells,
  onCellDrop,
  onCellDragOver,
  onCellClear,
  highlightedCells,
  hintCells,
  onDragEnter,
  onDragLeave: onDragLeaveProp,
}) => {
  const [dragOverCell, setDragOverCell] = useState<string | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const handleDragEnter = useCallback(
    (e: React.DragEvent, row: number, col: number) => {
      e.preventDefault();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      setDragOverCell(`${row}-${col}`);
      if (onDragEnter) {
        onDragEnter();
      }
    },
    [onDragEnter]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent, row: number, col: number) => {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'copy';

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      animationFrameRef.current = requestAnimationFrame(() => {
        setDragOverCell(`${row}-${col}`);
        onCellDragOver(row, col);
      });
    },
    [onCellDragOver]
  );

  const handleDragLeave = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setDragOverCell(null);
    if (onDragLeaveProp) {
      onDragLeaveProp();
    }
  }, [onDragLeaveProp]);

  const handleDrop = useCallback(
    (e: React.DragEvent, row: number, col: number) => {
      e.preventDefault();
      setDragOverCell(null);

      const colorData = e.dataTransfer.getData('application/json');
      const paletteItemId = e.dataTransfer.getData('text/palette-id');

      if (colorData && paletteItemId) {
        const color: RGB = JSON.parse(colorData);
        onCellDrop(row, col, color, paletteItemId);
      }
    },
    [onCellDrop]
  );

  const handleCellClick = useCallback(
    (row: number, col: number, color: RGB | null) => {
      if (color) {
        onCellClear(row, col);
      }
    },
    [onCellClear]
  );

  const getCellClasses = (cell: Cell, isDragOver: boolean) => {
    const classes = ['color-grid-cell'];
    if (isDragOver) classes.push('drag-over');
    if (cell.isHighlighted || highlightedCells.includes(cell.id)) {
      classes.push('highlighted');
    }
    if (cell.justPlaced) classes.push('just-placed');
    return classes.join(' ');
  };

  return (
    <div className="color-grid">
      {cells.map((row, rowIndex) =>
        row.map((cell, colIndex) => {
          const isDragOver = dragOverCell === `${rowIndex}-${colIndex}`;
          const hintColor = hintCells.get(cell.id);

          return (
            <div
              key={cell.id}
              className={getCellClasses(cell, isDragOver)}
              style={{
                backgroundColor: cell.color ? rgbToString(cell.color) : 'var(--cell-empty-bg)',
                position: 'relative',
              }}
              onDragEnter={(e) => handleDragEnter(e, rowIndex, colIndex)}
              onDragOver={(e) => handleDragOver(e, rowIndex, colIndex)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, rowIndex, colIndex)}
              onClick={() => handleCellClick(rowIndex, colIndex, cell.color)}
            >
              {hintColor && (
                <div
                  className="hint-color-preview"
                  style={{
                    position: 'absolute',
                    bottom: '-40px',
                    right: 0,
                    zIndex: 10,
                    backgroundColor: 'rgba(0, 0, 0, 0.75)',
                    borderRadius: '8px',
                    padding: '6px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: '#fff',
                    fontSize: '12px',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                  }}
                >
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      backgroundColor: rgbToString(hintColor),
                      borderRadius: '4px',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                    }}
                  />
                  <span>目标色</span>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};
