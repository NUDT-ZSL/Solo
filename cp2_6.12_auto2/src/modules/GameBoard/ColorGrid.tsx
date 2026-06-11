import React, { useCallback, useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  onCellDrop: (row: number, col: number, color: RGB, paletteItemId: string, altPaletteId?: string) => void;
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
  const [, forceUpdate] = useState(0);
  const cellRefsMap = useRef<Map<string, HTMLDivElement>>(new Map());
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
      e.stopPropagation();
      setDragOverCell(null);

      let colorData = e.dataTransfer.getData('application/json');
      if (!colorData) colorData = e.dataTransfer.getData('text/plain');
      let paletteItemId = e.dataTransfer.getData('text/palette-id');
      if (!paletteItemId) paletteItemId = e.dataTransfer.getData('text/color-id');

      if (colorData) {
        try {
          const color: RGB = JSON.parse(colorData);
          if (color && typeof color.r === 'number') {
            onCellDrop(row, col, color, paletteItemId, paletteItemId);
          }
        } catch {
          // ignore parse errors
        }
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

  useEffect(() => {
    const handleResize = () => {
      forceUpdate((n) => n + 1);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (hintCells.size > 0) {
      const timer = setTimeout(() => forceUpdate((n) => n + 1), 0);
      return () => clearTimeout(timer);
    }
  }, [hintCells]);

  useEffect(() => {
    const timer = setTimeout(() => forceUpdate((n) => n + 1), 100);
    return () => clearTimeout(timer);
  }, []);

  const getCellClasses = (cell: Cell, isDragOver: boolean) => {
    const classes = ['color-grid-cell'];
    if (isDragOver) classes.push('drag-over');
    if (cell.isHighlighted || highlightedCells.includes(cell.id)) {
      classes.push('highlighted');
    }
    if (cell.justPlaced) classes.push('just-placed');
    return classes.join(' ');
  };

  const hintPreviews: React.ReactNode[] = [];

  cells.forEach((row) => {
    row.forEach((cell) => {
      const hintColor = hintCells.get(cell.id);
      if (hintColor) {
        const cellEl = cellRefsMap.current.get(cell.id);
        if (cellEl) {
          const rect = cellEl.getBoundingClientRect();
          const previewWidth = 120;
          const previewHeight = 40;

          let left = rect.right - previewWidth;
          let top = rect.bottom + 4;

          if (left < 8) left = 8;
          if (left + previewWidth > window.innerWidth - 8) {
            left = window.innerWidth - previewWidth - 8;
          }
          if (top + previewHeight > window.innerHeight - 8) {
            top = rect.top - previewHeight - 4;
          }

          hintPreviews.push(
            createPortal(
              <div
                key={`hint-${cell.id}`}
                className="hint-color-preview"
                style={{
                  position: 'fixed',
                  top,
                  left,
                  zIndex: 10000,
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
                  pointerEvents: 'none',
                }}
              >
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    backgroundColor: rgbToString(hintColor),
                    borderRadius: '4px',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    flexShrink: 0,
                  }}
                />
                <span>目标色</span>
              </div>,
              document.body
            )
          );
        }
      }
    });
  });

  return (
    <div className="color-grid">
      {cells.map((row, rowIndex) =>
        row.map((cell, colIndex) => {
          const isDragOver = dragOverCell === `${rowIndex}-${colIndex}`;

          return (
            <div
              key={cell.id}
              ref={(el) => {
                if (el) {
                  cellRefsMap.current.set(cell.id, el);
                } else {
                  cellRefsMap.current.delete(cell.id);
                }
              }}
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
            />
          );
        })
      )}
      {hintPreviews}
    </div>
  );
};
