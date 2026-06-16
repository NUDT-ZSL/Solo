import React, { useState, useRef, useEffect } from 'react';
import type { StyleMatchResult } from '../features/styleMatcher';
import { artworks } from '../features/styleMatcher';

interface CollageGridProps {
  results: StyleMatchResult[];
  gridSize: number;
  isAnimating: boolean;
  onCellStyleChange: (cellIndex: number, artworkId: number) => void;
}

const CollageGrid: React.FC<CollageGridProps> = ({
  results,
  gridSize,
  isAnimating,
  onCellStyleChange,
}) => {
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const gridRef = useRef<HTMLDivElement>(null);
  const [visibleCells, setVisibleCells] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (isAnimating) {
      setVisibleCells(new Set());
      const totalCells = gridSize * gridSize;
      let current = 0;
      
      const animate = () => {
        if (current < totalCells) {
          setVisibleCells(prev => new Set([...prev, current]));
          current++;
          setTimeout(animate, 50);
        }
      };
      
      setTimeout(animate, 100);
    } else {
      setVisibleCells(new Set(results.map((_, i) => i)));
    }
  }, [results, gridSize, isAnimating]);

  const handleCellClick = (index: number, event: React.MouseEvent) => {
    event.stopPropagation();
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const gridRect = gridRef.current?.getBoundingClientRect();
    
    if (gridRect) {
      setDropdownPos({
        top: rect.bottom - gridRect.top + 4,
        left: rect.left - gridRect.left,
      });
    }
    setSelectedCell(index);
  };

  const handleStyleSelect = (artworkId: number) => {
    if (selectedCell !== null) {
      onCellStyleChange(selectedCell, artworkId);
    }
    setSelectedCell(null);
  };

  useEffect(() => {
    const handleClickOutside = () => setSelectedCell(null);
    if (selectedCell !== null) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => document.removeEventListener('click', handleClickOutside);
  }, [selectedCell]);

  const getCellStyle = (result: StyleMatchResult, index: number) => {
    const visible = visibleCells.has(index);
    const delay = index * 0.02;
    
    return {
      background: result.artwork.gradient,
      opacity: visible ? 1 : 0,
      transform: visible ? 'scale(1)' : 'scale(0.95)',
      transition: `opacity 0.5s ease-out ${delay}s, transform 0.5s ease-out ${delay}s`,
    } as React.CSSProperties;
  };

  return (
    <div style={styles.container}>
      <style>{`
        .grid-cell {
          cursor: pointer;
          position: relative;
          overflow: hidden;
        }
        .grid-cell:hover {
          filter: brightness(1.1);
          z-index: 2;
        }
        .grid-cell:hover .match-score {
          opacity: 1;
        }
        .match-score {
          position: absolute;
          left: 4px;
          bottom: 4px;
          font-size: 10px;
          color: #ffffff80;
          background: #00000040;
          padding: 2px 6px;
          border-radius: 4px;
          opacity: 0.8;
          transition: opacity 0.2s ease-out;
          backdrop-filter: blur(2px);
          pointer-events: none;
        }
        .style-dropdown {
          position: absolute;
          z-index: 100;
          background: #16213e;
          border: 1px solid #6b7280;
          border-radius: 8px;
          padding: 8px;
          max-height: 300px;
          overflow-y: auto;
          width: 160px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        }
        .style-option {
          padding: 8px 12px;
          cursor: pointer;
          border-radius: 6px;
          font-size: 13px;
          color: #e5e7eb;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: background 0.15s ease;
        }
        .style-option:hover {
          background: #1f3a6e;
        }
        .style-preview {
          width: 20px;
          height: 20px;
          border-radius: 4px;
          flex-shrink: 0;
        }
        .style-dropdown::-webkit-scrollbar {
          width: 6px;
        }
        .style-dropdown::-webkit-scrollbar-track {
          background: #1a1a2e;
          border-radius: 3px;
        }
        .style-dropdown::-webkit-scrollbar-thumb {
          background: #6b7280;
          border-radius: 3px;
        }
      `}</style>
      
      <div ref={gridRef} style={styles.gridWrapper}>
        <div
          style={{
            ...styles.grid,
            gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
            gridTemplateRows: `repeat(${gridSize}, 1fr)`,
          }}
        >
          {results.map((result, index) => (
            <div
              key={index}
              className="grid-cell"
              style={getCellStyle(result, index)}
              onClick={(e) => handleCellClick(index, e)}
            >
              <div className="match-score">{result.matchScore}%</div>
            </div>
          ))}
        </div>

        {selectedCell !== null && (
          <div
            className="style-dropdown"
            style={{ top: dropdownPos.top, left: dropdownPos.left }}
            onClick={(e) => e.stopPropagation()}
          >
            {artworks.map((artwork) => (
              <div
                key={artwork.id}
                className="style-option"
                onClick={() => handleStyleSelect(artwork.id)}
              >
                <div
                  className="style-preview"
                  style={{ background: artwork.gradient }}
                />
                <span>{artwork.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridWrapper: {
    position: 'relative',
    width: '100%',
    height: '100%',
    maxWidth: '100%',
    maxHeight: '100%',
    aspectRatio: '1 / 1',
  },
  grid: {
    display: 'grid',
    width: '100%',
    height: '100%',
    gap: '0px',
  },
};

export default CollageGrid;
