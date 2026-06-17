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

export function ExhibitionGrid({ galleryId, artworks, onArtworkClick, onUpdate, canEdit = true }: ExhibitionGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [draggedArtwork, setDraggedArtwork] = useState<Artwork | null>(null);
  const [draggedFromPosition, setDraggedFromPosition] = useState<number | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<number | null>(null);
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

  const handleDragStart = (e: React.DragEvent, artwork: Artwork, fromPosition: number | null) => {
    if (!canEdit) {
      e.preventDefault();
      return;
    }
    setDraggedArtwork(artwork);
    setDraggedFromPosition(fromPosition);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', artwork.id);
    
    const dragImage = e.currentTarget as HTMLElement;
    dragImage.style.opacity = '0.5';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '1';
    setDraggedArtwork(null);
    setDraggedFromPosition(null);
    setDragOverPosition(null);
  };

  const handleDragOver = (e: React.DragEvent, positionIndex: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverPosition !== positionIndex) {
      setDragOverPosition(positionIndex);
    }
  };

  const handleDragLeave = (e: React.DragEvent, positionIndex: number) => {
    if (dragOverPosition === positionIndex) {
      setDragOverPosition(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    
    if (!draggedArtwork) {
      setDragOverPosition(null);
      return;
    }

    const existingArtwork = getArtworkAtPosition(targetIndex);

    if (existingArtwork && existingArtwork.id === draggedArtwork.id) {
      setDraggedArtwork(null);
      setDraggedFromPosition(null);
      setDragOverPosition(null);
      return;
    }

    if (existingArtwork) {
      if (draggedFromPosition !== null) {
        db.placeArtworkInPosition(existingArtwork.id, draggedFromPosition);
      } else {
        db.removeArtworkFromPosition(existingArtwork.id);
      }
    }

    db.placeArtworkInPosition(draggedArtwork.id, targetIndex);

    setAnimatingCell(targetIndex);
    setTimeout(() => setAnimatingCell(null), 200);

    setDraggedArtwork(null);
    setDraggedFromPosition(null);
    setDragOverPosition(null);

    onUpdate?.();
  };

  const handleLibraryDragOver = (e: React.DragEvent) => {
    if (canEdit && draggedFromPosition !== null) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleLibraryDrop = (e: React.DragEvent) => {
    e.preventDefault();
    
    if (draggedArtwork && draggedFromPosition !== null) {
      db.removeArtworkFromPosition(draggedArtwork.id);
      onUpdate?.();
    }

    setDraggedArtwork(null);
    setDraggedFromPosition(null);
    setDragOverPosition(null);
  };

  const renderCell = (index: number) => {
    const artwork = getArtworkAtPosition(index);
    const isAnimating = animatingCell === index;
    const isDraggingThis = draggedArtwork?.positionIndex === index;
    const isDragOver = dragOverPosition === index;

    if (artwork) {
      return (
        <div
          key={index}
          className={`exhibition-cell exhibition-cell--filled ${isAnimating ? 'animating' : ''} ${isDraggingThis ? 'dragging' : ''} ${isDragOver ? 'drag-over' : ''}`}
          style={{
            width: cellSize,
            height: cellSize,
          }}
          draggable={canEdit}
          onDragStart={(e) => handleDragStart(e, artwork, index)}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => handleDragOver(e, index)}
          onDragLeave={(e) => handleDragLeave(e, index)}
          onDrop={(e) => handleDrop(e, index)}
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
        className={`exhibition-cell exhibition-cell--empty ${isDragOver ? 'drag-over' : ''}`}
        style={{
          width: cellSize,
          height: cellSize,
        }}
        onDragOver={(e) => handleDragOver(e, index)}
        onDragLeave={(e) => handleDragLeave(e, index)}
        onDrop={(e) => handleDrop(e, index)}
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
        <div
          className={`artwork-library ${draggedFromPosition !== null ? 'can-receive' : ''}`}
          onDragOver={handleLibraryDragOver}
          onDrop={handleLibraryDrop}
        >
          <h3 className="artwork-library__title">作品库</h3>
          <div className="artwork-library__grid">
            {libraryArtworks.map(artwork => (
              <div
                key={artwork.id}
                className={`library-item ${draggedArtwork?.id === artwork.id ? 'dragging' : ''}`}
                draggable={canEdit}
                onDragStart={(e) => handleDragStart(e, artwork, null)}
                onDragEnd={handleDragEnd}
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
    </div>
  );
}

export default ExhibitionGrid;
