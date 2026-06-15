import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Inspiration } from '../data/mockData';

interface InspirationBoardProps {
  inspirations: Inspiration[];
  loading: boolean;
  skeletonVisible: boolean;
}

const GAP = 16;
const COLUMNS_DESKTOP = 2;

interface CardPosition {
  left: number;
  top: number;
  columnIndex: number;
}

const InspirationBoard: React.FC<InspirationBoardProps> = ({ inspirations, loading, skeletonVisible }) => {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>('');
  const [isEntering, setIsEntering] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [positions, setPositions] = useState<CardPosition[]>([]);
  const [columnHeights, setColumnHeights] = useState<number[]>([0, 0]);
  const [containerHeight, setContainerHeight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [columnWidth, setColumnWidth] = useState(0);
  const measuredHeightsRef = useRef<Map<string, number>>(new Map());
  const measureRef = useRef<HTMLDivElement>(null);

  const calculatePositions = useCallback((cards: Inspiration[], width: number): { positions: CardPosition[], columnHeights: number[], containerHeight: number } => {
    const colWidth = (width - GAP) / COLUMNS_DESKTOP;
    const heights = new Array(COLUMNS_DESKTOP).fill(0);
    const pos: CardPosition[] = [];

    cards.forEach((card, index) => {
      const shortestColIndex = heights.indexOf(Math.min(...heights));
      const cardHeight = measuredHeightsRef.current.get(card.id) || (200 + Math.random() * 150);

      pos.push({
        left: shortestColIndex * (colWidth + GAP),
        top: heights[shortestColIndex],
        columnIndex: shortestColIndex
      });

      heights[shortestColIndex] += cardHeight + GAP;
    });

    return {
      positions: pos,
      columnHeights: heights,
      containerHeight: Math.max(...heights)
    };
  }, []);

  useEffect(() => {
    const measure = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      setColumnWidth((width - GAP) / COLUMNS_DESKTOP);
    };

    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  useEffect(() => {
    if (containerRef.current && columnWidth > 0 && inspirations.length > 0) {
      const width = containerRef.current.clientWidth;
      const result = calculatePositions(inspirations, width);
      setPositions(result.positions);
      setColumnHeights(result.columnHeights);
      setContainerHeight(result.containerHeight);
    }
  }, [inspirations, columnWidth, calculatePositions]);

  const openPreview = (image: string, title: string) => {
    setPreviewTitle(title);
    setPreviewImage(image);
    setIsExiting(false);
    setIsEntering(true);
    document.body.style.overflow = 'hidden';
    setTimeout(() => setIsEntering(false), 500);
  };

  const closePreview = () => {
    setIsExiting(true);
    document.body.style.overflow = '';
    setTimeout(() => {
      setPreviewImage(null);
      setPreviewTitle('');
      setIsExiting(false);
    }, 500);
  };

  const handleImageLoad = useCallback((id: string, e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const naturalHeight = img.naturalHeight;
    const naturalWidth = img.naturalWidth;
    const aspectRatio = naturalHeight / naturalWidth;
    const renderedHeight = columnWidth * aspectRatio;

    measuredHeightsRef.current.set(id, renderedHeight);

    if (containerRef.current && inspirations.length > 0) {
      const width = containerRef.current.clientWidth;
      const result = calculatePositions(inspirations, width);
      setPositions(result.positions);
      setColumnHeights(result.columnHeights);
      setContainerHeight(result.containerHeight);
    }
  }, [columnWidth, inspirations, calculatePositions]);

  const renderSkeletonCards = () => {
    const cards = [];
    for (let i = 0; i < 4; i++) {
      const height = 160 + Math.floor(Math.random() * 120);
      cards.push(
        <div
          key={i}
          style={{
            ...styles.inspirationCard,
            height: height,
            opacity: skeletonVisible ? 1 : 0,
            transition: 'opacity 0.4s ease',
            pointerEvents: skeletonVisible ? 'auto' : 'none'
          }}
          className="inspiration-card"
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              background: 'linear-gradient(90deg, #2a2a4a 25%, #3a3a5a 50%, #2a2a4a 75%)',
              backgroundSize: '200% 100%',
              animation: 'pulse 1.5s infinite',
              borderRadius: '8px'
            }}
          />
        </div>
      );
    }
    return cards;
  };

  return (
    <div ref={containerRef} style={styles.board}>
      <style>{`
        @keyframes pulse {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes scaleOut {
          from { transform: scale(1); opacity: 1; }
          to { transform: scale(0.9); opacity: 0; }
        }
        .inspiration-card {
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          position: absolute;
        }
        .inspiration-card:hover {
          transform: scale(1.05);
          box-shadow: 0 16px 32px rgba(0,0,0,0.6);
          z-index: 10;
        }
        .inspiration-card:hover .inspiration-image {
          transform: scale(1.05);
        }
        .inspiration-card:hover .inspiration-overlay {
          opacity: 1;
        }
        .preview-enter .preview-backdrop {
          animation: fadeIn 0.5s ease forwards;
        }
        .preview-enter .preview-content {
          animation: scaleIn 0.5s ease forwards;
        }
        .preview-exit .preview-backdrop {
          animation: fadeOut 0.5s ease forwards;
        }
        .preview-exit .preview-content {
          animation: scaleOut 0.5s ease forwards;
        }
        @media (max-width: 768px) {
          .inspiration-card {
            position: relative !important;
            left: 0 !important;
            top: 0 !important;
            margin-bottom: 16px;
          }
        }
      `}</style>

      <h2 style={styles.title}>灵感看板</h2>

      {loading && (
        <div style={styles.skeletonContainer}>
          {renderSkeletonCards()}
        </div>
      )}

      <div
        style={{
          ...styles.masonryContainer,
          opacity: loading ? 0 : 1,
          height: containerHeight || 'auto',
          transition: 'opacity 0.4s ease',
          display: 'relative'
        }}
        ref={measureRef}
      >
        {!loading && inspirations.map((inspiration, index) => {
          const pos = positions[index] || { left: 0, top: 0, columnIndex: 0 };
          return (
            <div
              key={inspiration.id}
              className="inspiration-card"
              style={{
                ...styles.inspirationCard,
                width: columnWidth > 0 ? columnWidth : 'calc(50% - 8px)',
                left: pos.left,
                top: pos.top,
              }}
              onClick={() => openPreview(inspiration.imageUrl, inspiration.title)}
            >
              <img
                src={inspiration.imageUrl}
                alt={inspiration.title}
                className="inspiration-image"
                style={{
                  ...styles.inspirationImage,
                  transition: 'transform 0.3s ease'
                }}
                onLoad={(e) => handleImageLoad(inspiration.id, e)}
              />
              <div
                className="inspiration-overlay"
                style={{
                  ...styles.inspirationOverlay,
                  transition: 'opacity 0.3s ease',
                  opacity: 0
                }}
              >
                <p style={styles.overlayText}>查看详情</p>
              </div>
              <div style={styles.inspirationTitle}>
                <p style={styles.titleText}>{inspiration.title}</p>
              </div>
            </div>
          );
        })}
      </div>

      {previewImage && (
        <div className={`${isEntering ? 'preview-enter' : ''} ${isExiting ? 'preview-exit' : ''}`} style={styles.previewModal}>
          <div
            className="preview-backdrop"
            style={{
              ...styles.previewBackdrop,
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)'
            }}
            onClick={closePreview}
          />
          <div className="preview-content" style={styles.previewContent}>
            <img src={previewImage} alt={previewTitle} style={styles.previewImage} />
            <div style={styles.previewCaption}>
              <h3 style={styles.previewTitle}>{previewTitle}</h3>
              <button style={styles.closeButton} onClick={closePreview}>✕ 关闭</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  board: {
    backgroundColor: '#16213e',
    borderRadius: '12px',
    padding: '24px',
    position: 'relative',
    minHeight: '400px'
  },
  title: {
    margin: '0 0 20px 0',
    fontSize: '20px',
    fontWeight: 600,
    color: '#ffffff'
  },
  skeletonContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
    position: 'absolute',
    top: '72px',
    left: '24px',
    right: '24px',
    zIndex: 5
  },
  masonryContainer: {
    position: 'relative',
    width: '100%'
  },
  inspirationCard: {
    cursor: 'pointer',
    borderRadius: '8px',
    overflow: 'hidden',
    backgroundColor: '#1a1a2e',
    boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
    position: 'absolute',
    willChange: 'transform'
  },
  inspirationImage: {
    width: '100%',
    display: 'block',
    userSelect: 'none'
  },
  inspirationOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(233, 69, 96, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none'
  },
  overlayText: {
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: 500
  },
  inspirationTitle: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: '12px',
    background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)'
  },
  titleText: {
    margin: 0,
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 500
  },
  previewModal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  previewBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)'
  },
  previewContent: {
    position: 'relative',
    maxWidth: '90vw',
    maxHeight: '90vh'
  },
  previewImage: {
    maxWidth: '100%',
    maxHeight: '80vh',
    borderRadius: '12px',
    display: 'block'
  },
  previewCaption: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '16px',
    padding: '0 8px'
  },
  previewTitle: {
    margin: 0,
    color: '#ffffff',
    fontSize: '18px',
    fontWeight: 500
  },
  closeButton: {
    padding: '10px 20px',
    backgroundColor: '#e94560',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  }
};

export default InspirationBoard;
