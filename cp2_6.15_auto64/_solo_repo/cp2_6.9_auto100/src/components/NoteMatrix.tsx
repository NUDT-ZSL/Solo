import React, { useState, useRef, useCallback } from 'react';
import { InstrumentType, TimbreType } from '../SoundEngine';

interface CellState {
  row: number;
  col: number;
  instrument: InstrumentType;
  pulseColor: string | null;
  isHighlight: boolean;
  highlightColor: string | null;
}

interface NoteMatrixProps {
  rows: number;
  cols: number;
  isMobile: boolean;
  cellSize: number;
  onCellClick?: (row: number, col: number, instrument: InstrumentType) => void;
  onNoteChange?: (row: number, col: number) => void;
  highlightedCells: { row: number; col: number; color: string }[];
  pulseCells: { row: number; col: number; color: string }[];
  onReorder?: (newOrder: { row: number; col: number }[]) => void;
  getNoteName: (row: number, col: number) => string;
}

const INSTRUMENTS: InstrumentType[] = ['synth', 'guitar', 'drum', 'flute', 'piano'];
const INSTRUMENT_NAMES: Record<InstrumentType, string> = {
  synth: '合成器',
  guitar: '吉他',
  drum: '鼓',
  flute: '长笛',
  piano: '钢琴'
};

const lerpColor = (color1: string, color2: string, t: number): string => {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  const r = Math.round(c1.r + (c2.r - c1.r) * t);
  const g = Math.round(c1.g + (c2.g - c1.g) * t);
  const b = Math.round(c1.b + (c2.b - c1.b) * t);
  return `rgb(${r}, ${g}, ${b})`;
};

const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : { r: 0, g: 0, b: 0 };
};

const NoteMatrix: React.FC<NoteMatrixProps> = ({
  rows,
  cols,
  isMobile,
  cellSize,
  onCellClick,
  highlightedCells,
  pulseCells,
  getNoteName
}) => {
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);
  const [cells, setCells] = useState<CellState[][]>(() => {
    const arr: CellState[][] = [];
    for (let r = 0; r < rows; r++) {
      arr[r] = [];
      for (let c = 0; c < cols; c++) {
        arr[r][c] = {
          row: r,
          col: c,
          instrument: INSTRUMENTS[(r + c) % INSTRUMENTS.length],
          pulseColor: null,
          isHighlight: false,
          highlightColor: null
        };
      }
    }
    return arr;
  });

  const dragStartRef = useRef<{ row: number; col: number } | null>(null);

  React.useEffect(() => {
    setCells(prev => {
      const newCells = prev.map(row => row.map(cell => ({ ...cell, isHighlight: false, highlightColor: null, pulseColor: null })));
      for (const h of highlightedCells) {
        if (newCells[h.row] && newCells[h.row][h.col]) {
          newCells[h.row][h.col].isHighlight = true;
          newCells[h.row][h.col].highlightColor = h.color;
        }
      }
      for (const p of pulseCells) {
        if (newCells[p.row] && newCells[p.row][p.col]) {
          newCells[p.row][p.col].pulseColor = p.color;
        }
      }
      return newCells;
    });
  }, [highlightedCells, pulseCells, rows, cols]);

  const handleCellClick = useCallback((row: number, col: number) => {
    setCells(prev => {
      const newCells = prev.map(r => r.map(c => ({ ...c })));
      const currentIdx = INSTRUMENTS.indexOf(newCells[row][col].instrument);
      newCells[row][col].instrument = INSTRUMENTS[(currentIdx + 1) % INSTRUMENTS.length];
      return newCells;
    });
    if (onCellClick) {
      onCellClick(row, col, cells[row][col].instrument);
    }
  }, [cells, onCellClick]);

  const handleDragStart = (row: number, col: number) => {
    dragStartRef.current = { row, col };
  };

  const handleDragOver = (e: React.DragEvent, row: number, col: number) => {
    e.preventDefault();
  };

  const handleDrop = (targetRow: number, targetCol: number) => {
    if (!dragStartRef.current) return;
    const { row: fromRow, col: fromCol } = dragStartRef.current;
    if (fromRow === targetRow && fromCol === targetCol) return;

    setCells(prev => {
      const newCells = prev.map(r => r.map(c => ({ ...c })));
      const temp = newCells[fromRow][fromCol].instrument;
      newCells[fromRow][fromCol].instrument = newCells[targetRow][targetCol].instrument;
      newCells[targetRow][targetCol].instrument = temp;
      return newCells;
    });
    dragStartRef.current = null;
  };

  const containerStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
    gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
    gap: '6px',
    padding: '16px',
    borderRadius: '12px',
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.1)'
  };

  return (
    <div style={containerStyle}>
      {cells.map((rowArr, r) =>
        rowArr.map((cell, c) => {
          const t = (r * cols + c) / (rows * cols - 1);
          const bgColor = lerpColor('#FF6B35', '#1E90FF', t);
          const isHovered = hoveredCell?.row === r && hoveredCell?.col === c;
          const isHighlight = cell.isHighlight;
          const pulseColor = cell.pulseColor;
          const highlightColor = cell.highlightColor;

          let finalBg = bgColor;
          let boxShadow = 'none';
          let transform = 'scale(1)';

          if (pulseColor) {
            finalBg = pulseColor;
            boxShadow = `0 0 25px ${pulseColor}, 0 0 50px ${pulseColor}`;
            transform = 'scale(1.15)';
          } else if (isHighlight && highlightColor) {
            finalBg = highlightColor;
            boxShadow = `0 0 20px ${highlightColor}`;
          }

          if (isHovered) {
            transform = pulseColor ? 'scale(1.15)' : 'scale(1.2)';
            boxShadow = pulseColor ? boxShadow : `0 0 20px rgba(255,255,255,0.5)`;
          }

          return (
            <div
              key={`${r}-${c}`}
              draggable={!isMobile}
              onDragStart={() => handleDragStart(r, c)}
              onDragOver={(e) => handleDragOver(e, r, c)}
              onDrop={() => handleDrop(r, c)}
              onClick={() => handleCellClick(r, c)}
              onMouseEnter={() => setHoveredCell({ row: r, col: c })}
              onMouseLeave={() => setHoveredCell(null)}
              style={{
                width: `${cellSize}px`,
                height: `${cellSize}px`,
                borderRadius: '8px',
                background: finalBg,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                transform: transform,
                boxShadow: boxShadow,
                userSelect: 'none',
                color: '#fff',
                fontWeight: 'bold',
                textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
                position: 'relative',
                overflow: 'visible'
              }}
            >
              <span style={{ fontSize: isHovered ? '14px' : '12px', transition: 'font-size 0.2s' }}>
                {isHovered ? getNoteName(r, c) : ''}
              </span>
              <span style={{ fontSize: '9px', opacity: 0.8 }}>
                {isHovered ? INSTRUMENT_NAMES[cell.instrument] : ''}
              </span>
            </div>
          );
        })
      )}
    </div>
  );
};

export default NoteMatrix;
