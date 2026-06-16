import { useState, useRef, useEffect, useCallback } from 'react';
import { Artwork } from '../db/Database';
import db from '../db/Database';
import './ExhibitionGrid.css';

interface ExhibitionGridProps {
  galleryId: string;
  artworks: Artwork[];
  onArtworkClick: (artwork: Artwork) => void;
  onUpdate?: () => void;
  canEdit?: boolean;
}

interface DragState {
  artwork: Artwork;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
  currentX: number;
  currentY: number;
  fromPosition: number | null;
}

export function ExhibitionGrid({ galleryId, artworks, onArtworkClick, onUpdate, canEdit = true }: ExhibitionGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [animatingCell, setAnimatingCell] = useState<number | null>(null);
  const [cellSize, setCellSize] = useState(120);

  const positionedArtworks = artworks.filter(a => a.positionIndex !== null);
  const libraryArtworks = artworks.filter(a => a.positionIndex === null);

  const getArtworkAtPosition = useCallback((index: number): Artwork | undefined => {
    return positionedArtworks.find(a => a.positionIndex === index);
  }, [positionedArtworks]);

  useEffect(() => {
    const updateCellSize = () => {
      if (gridRef.current) {
        const containerWidth = gridRef.current.clientWidth;
        const size = Math.max(120, Math.floor((containerWidth - 48) / 3));
        setCellSize(size);
      }
    };

    updateCellSize();
    window.addEventListener('resize', updateCellSize);
    return () => window.removeEventListener('resize', updateCellSize);
  }, []);

  const handleDragStart = (e: React.MouseEvent, artwork: Artwork, fromPosition: number | null) => {
    if (!canEdit) return;
    e.preventDefault();

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    
    setDragState({
      artwork,
      startX: e.clientX,
      startY: e.clientY,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      currentX: e.clientX,
      currentY: e.clientY,
      fromPosition
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (dragState) {
        setDragState(prev => prev ? { ...prev, currentX: e.clientX, currentY: e.clientY } : null);
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!dragState || !gridRef.current) {
        setDragState(null);
        return;
      }

      const gridRect = gridRef.current.getBoundingClientRect();
      const gap = 16;
      const cellTotalSize = cellSize + gap;
      const paddingLeft = 16;
      const paddingTop = 16;

      const relativeX = e.clientX - gridRect.left - paddingLeft;
      const relativeY = e.clientY - gridRect.top - paddingTop;

      const col = Math.floor(relativeX / cellTotalSize);
      const row = Math.floor(relativeY / cellTotalSize);

      if (col >= 0 && col < 3 && row >= 0 && row < 3) {
        const targetIndex = row * 3 + col;
        const existingArtwork = getArtworkAtPosition(targetIndex);

        if (existingArtwork && existingArtwork.id === dragState.artwork.id) {
          setDragState(null);
          return;
        }

        if (existingArtwork) {
          if (dragState.fromPosition !== null) {
            db.placeArtworkInPosition(existingArtwork.id, dragState.fromPosition);
          } else {
            db.removeArtworkFromPosition(existingArtwork.id);
          }
        }

        db.placeArtworkInPosition(dragState.artwork.id, targetIndex);
        
        setAnimatingCell(targetIndex);
        setTimeout(() => setAnimatingCell(null), 200);
        
        onUpdate?.();
      }

      setDragState(null);
    };

    if (dragState) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, cellSize, getArtworkAtPosition, onUpdate]);

  const renderCell = (index: number) => {
    const artwork = getArtworkAtPosition(index);
    const isAnimating = animatingCell === index;
    const isDraggingFromHere = dragState?.fromPosition === index;

    if (artwork) {
      return (
        <div
          key={index}
          className={`exhibition-cell exhibition-cell--filled ${isAnimating ? 'animating' : ''} ${isDraggingFromHere ? 'dragging' : ''}`}
          style={{
            width: cellSize,
            height: cellSize,
          }}
          onMouseDown={(e) => handleDragStart(e, artwork, index)}
          onClick={(e) => {
            e.stopPropagation();
            onArtworkClick(artwork);
          }}
        >
          <div
            className="exhibition-cell__artwork"
            style={{ backgroundColor: artwork.color }}
          >
            <span className="exhibition-cell__title">{artwork.title}</span>
          </div>
          <div className="exhibition-cell__bid-tag">
            ¥{artwork.currentBid}
          </div>
          <button
            className="exhibition-cell__bid-button"
            onClick={(e) => {
              e.stopPropagation();
              onArtworkClick(artwork);
            }}
          >
            竞拍
          </button>
        </div>
      );
    }

    return (
      <div
        key={index}
        className="exhibition-cell exhibition-cell--empty"
        style={{
          width: cellSize,
          height: cellSize,
        }}
      >
        <span className="exhibition-cell__empty-text">空展位</span>
      </div>
    );
  };

  return (
    <div className="exhibition-container">
      <div className="exhibition-grid-wrapper" ref={gridRef}>
        <div
          className="exhibition-grid"
          style={{
            gridTemplateColumns: `repeat(3, ${cellSize}px)`,
            gridTemplateRows: `repeat(3, ${cellSize}px)`,
          }}
        >
          {Array.from({ length: 9 }, (_, i) => renderCell(i))}
        </div>
      </div>

      {canEdit && (
        <div className="artwork-library">
          <h3 className="artwork-library__title">作品库</h3>
          <div className="artwork-library__grid">
            {libraryArtworks.map(artwork => (
              <div
                key={artwork.id}
                className="library-item"
                onMouseDown={(e) => handleDragStart(e, artwork, null)}
              >
                <div
                  className="library-item__thumb"
                  style={{ backgroundColor: artwork.color }}
                >
                  <span className="library-item__title">{artwork.title}</span>
                </div>
              </div>
            ))}
            {libraryArtworks.length === 0 && (
              <div className="library-item library-item--empty">
                <span>所有作品已布展</span>
              </div>
            )}
          </div>
        </div>
      )}

      {dragState && (
        <div
          className="drag-ghost"
          style={{
            left: dragState.currentX - dragState.offsetX,
            top: dragState.currentY - dragState.offsetY,
            width: 80,
            height: 80,
            backgroundColor: dragState.artwork.color,
          }}
        >
          <span className="drag-ghost__title">{dragState.artwork.title}</span>
        </div>
      )}
    </div>
  );
}

export default ExhibitionGrid;
