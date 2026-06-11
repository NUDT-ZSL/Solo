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
}

export const ColorGrid: React.FC<ColorGridProps> = ({
  cells,
  onCellDrop,
  onCellDragOver,
  onCellClear,
  highlightedCells,
  hintCells,
}) => {
  const [dragOverCell, setDragOverCell] = useState<string | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const handleDragOver = useCallback(
    (e: React.DragEvent, row: number, col: number) => {
      e.preventDefault();
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
  }, []);

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
              }}
              onDragOver={(e) => handleDragOver(e, rowIndex, colIndex)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, rowIndex, colIndex)}
              onClick={() => handleCellClick(rowIndex, colIndex, cell.color)}
            >
              {hintColor && (
                <div
                  className="hint-color-preview"
                  style={{ backgroundColor: rgbToString(hintColor) }}
                  title="目标颜色提示"
                />
              )}
            </div>
          );
        })
      )}
    </div>
  );
};
