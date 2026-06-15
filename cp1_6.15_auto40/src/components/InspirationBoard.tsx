import React, { useState, useEffect } from 'react';
import { Inspiration } from '../data/mockData';

interface InspirationBoardProps {
  inspirations: Inspiration[];
  onAddInspiration: (imageUrl: string, note: string) => void;
  loading: boolean;
  skeletonVisible: boolean;
  contentVisible: boolean;
}

const InspirationBoard: React.FC<InspirationBoardProps> = ({
  inspirations,
  onAddInspiration,
  loading,
  skeletonVisible,
  contentVisible
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newNote, setNewNote] = useState('');
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newImageUrl.trim() || !newNote.trim()) return;
    onAddInspiration(newImageUrl.trim(), newNote.trim());
    setNewImageUrl('');
    setNewNote('');
    setShowAddForm(false);
  };

  const openPreview = (index: number) => {
    setPreviewIndex(index);
    setPreviewVisible(true);
  };

  const closePreview = () => {
    setPreviewVisible(false);
    setTimeout(() => setPreviewIndex(null), 500);
  };

  const prevImage = () => {
    if (previewIndex === null) return;
    const newIndex = previewIndex > 0 ? previewIndex - 1 : inspirations.length - 1;
    setPreviewVisible(false);
    setTimeout(() => {
      setPreviewIndex(newIndex);
      setPreviewVisible(true);
    }, 250);
  };

  const nextImage = () => {
    if (previewIndex === null) return;
    const newIndex = previewIndex < inspirations.length - 1 ? previewIndex + 1 : 0;
    setPreviewVisible(false);
    setTimeout(() => {
      setPreviewIndex(newIndex);
      setPreviewVisible(true);
    }, 250);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (previewIndex === null) return;
      if (e.key === 'Escape') closePreview();
      if (e.key === 'ArrowLeft') prevImage();
      if (e.key === 'ArrowRight') nextImage();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewIndex, inspirations.length]);

  return (
    <div style={styles.container}>
      <style>{`
        .masonry-layout {
          column-count: 2;
          column-gap: 16px;
        }
        @media (max-width: 768px) {
          .masonry-layout {
            column-count: 1 !important;
          }
        }
        .masonry-item {
          break-inside: avoid;
          margin-bottom: 16px;
        }
        .skeleton-masonry {
          column-count: 2;
          column-gap: 16px;
        }
        @media (max-width: 768px) {
          .skeleton-masonry {
            column-count: 1 !important;
          }
        }
        .inspiration-card:hover .inspiration-image {
          transform: scale(1.05);
        }
        .inspiration-card:hover .inspiration-overlay {
          opacity: 1;
        }
      `}</style>

      <div style={styles.header}>
        <h3 style={styles.title}>💡 灵感看板</h3>
        <button
          style={styles.addButton}
          onClick={() => setShowAddForm(true)}
        >
          + 添加灵感
        </button>
      </div>

      {showAddForm && (
        <div style={styles.addForm}>
          <form onSubmit={handleSubmit} style={styles.form}>
            <input
              type="url"
              placeholder="图片URL"
              value={newImageUrl}
              onChange={(e) => setNewImageUrl(e.target.value)}
              style={styles.input}
            />
            <textarea
              placeholder="文字备注"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              style={styles.textarea}
              rows={2}
            />
            <div style={styles.formActions}>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                style={{ ...styles.btn, ...styles.cancelBtn }}
              >
                取消
              </button>
              <button type="submit" style={styles.btn}>
                添加
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{ position: 'relative', minHeight: '400px' }}>
        {loading || skeletonVisible ? (
          <div
            className={`skeleton-masonry ${skeletonVisible && !loading ? 'skeleton-fade-out' : ''}`}
            style={{
              animation: skeletonVisible && !loading ? 'fadeOut 0.4s ease forwards' : undefined
            }}
          >
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div
                key={i}
                className="skeleton masonry-item"
                style={{ height: 180 + (i % 3) * 100 }}
              />
            ))}
          </div>
        ) : null}

        {!loading && contentVisible ? (
          <div
            className="masonry-layout content-fade-in"
            style={{
              animation: 'fadeIn 0.4s ease forwards'
            }}
          >
            {inspirations.map((inspiration, index) => (
              <div
                key={inspiration.id}
                className="inspiration-card masonry-item"
                style={styles.masonryItem}
                onMouseEnter={() => setHoveredId(inspiration.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => openPreview(index)}
              >
                <div style={styles.imageWrapper}>
                  <img
                    src={inspiration.imageUrl}
                    alt={inspiration.note}
                    className="inspiration-image"
                    style={{
                      ...styles.image,
                      height: inspiration.height
                    }}
                    loading="lazy"
                  />
                  <div
                    className="inspiration-overlay"
                    style={{
                      ...styles.overlay,
                      opacity: hoveredId === inspiration.id ? 1 : 0
                    }}
                  >
                    <p style={styles.overlayText}>
                      {inspiration.note.length > 80
                        ? inspiration.note.substring(0, 80) + '...'
                        : inspiration.note
                      }
                    </p>
                  </div>
                </div>
                <p style={styles.note}>{inspiration.note}</p>
                <div style={styles.itemFooter}>
                  <span style={styles.itemDate}>{inspiration.createdAt}</span>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {previewIndex !== null && (
        <div style={styles.previewOverlay} onClick={closePreview}>
          <div
            style={{
              ...styles.previewContent,
              opacity: previewVisible ? 1 : 0,
              transition: 'opacity 0.5s ease'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button style={styles.closeBtn} onClick={closePreview}>
              ×
            </button>
            <button style={styles.navBtnPrev} onClick={prevImage}>
              ‹
            </button>
            <img
              src={inspirations[previewIndex].imageUrl}
              alt={inspirations[previewIndex].note}
              style={styles.previewImage}
            />
            <button style={styles.navBtnNext} onClick={nextImage}>
              ›
            </button>
            <div style={styles.previewInfo}>
              <p style={styles.previewNote}>{inspirations[previewIndex].note}</p>
              <p style={styles.previewCounter}>
                {previewIndex + 1} / {inspirations.length}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    backgroundColor: '#16213e',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
    height: '100%'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  title: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 600
  },
  addButton: {
    padding: '8px 16px',
    backgroundColor: '#e94560',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'all 0.3s ease'
  },
  addForm: {
    marginBottom: '20px',
    padding: '16px',
    backgroundColor: '#1a1a2e',
    borderRadius: '8px'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  input: {
    padding: '10px 14px',
    backgroundColor: '#16213e',
    border: '1px solid #3a3a5a',
    borderRadius: '6px',
    color: '#ffffff',
    fontSize: '13px',
    transition: 'all 0.3s ease'
  },
  textarea: {
    padding: '10px 14px',
    backgroundColor: '#16213e',
    border: '1px solid #3a3a5a',
    borderRadius: '6px',
    color: '#ffffff',
    fontSize: '13px',
    resize: 'vertical',
    fontFamily: 'inherit',
    transition: 'all 0.3s ease'
  },
  formActions: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'flex-end'
  },
  btn: {
    padding: '8px 16px',
    backgroundColor: '#e94560',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 500,
    transition: 'all 0.3s ease'
  },
  cancelBtn: {
    backgroundColor: 'transparent',
    border: '1px solid #3a3a5a'
  },
  masonryItem: {
    backgroundColor: '#1a1a2e',
    borderRadius: '8px',
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
    ':hover': {
      transform: 'translateY(-4px)',
      boxShadow: '0 8px 16px rgba(0,0,0,0.4)'
    }
  },
  imageWrapper: {
    position: 'relative',
    overflow: 'hidden',
    width: '100%'
  },
  image: {
    width: '100%',
    objectFit: 'cover',
    display: 'block',
    transition: 'transform 0.3s ease'
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.85) 100%)',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    padding: '20px',
    transition: 'opacity 0.3s ease',
    pointerEvents: 'none'
  },
  overlayText: {
    color: '#ffffff',
    fontSize: '13px',
    lineHeight: 1.6,
    textAlign: 'center',
    margin: 0,
    fontWeight: 400,
    textShadow: '0 1px 3px rgba(0,0,0,0.5)'
  },
  note: {
    padding: '12px 14px',
    margin: 0,
    fontSize: '13px',
    color: '#a0a0a0',
    lineHeight: 1.5
  },
  itemFooter: {
    padding: '0 14px 12px 14px',
    display: 'flex',
    justifyContent: 'flex-end'
  },
  itemDate: {
    fontSize: '11px',
    color: '#505070'
  },
  previewOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
    animation: 'fadeIn 0.3s ease'
  },
  previewContent: {
    position: 'relative',
    maxWidth: '92vw',
    maxHeight: '92vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  closeBtn: {
    position: 'absolute',
    top: '-56px',
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.1)',
    border: 'none',
    color: '#ffffff',
    fontSize: '32px',
    cursor: 'pointer',
    padding: '4px 14px',
    borderRadius: '8px',
    transition: 'all 0.3s ease',
    lineHeight: 1
  },
  navBtnPrev: {
    position: 'absolute',
    left: '-72px',
    top: '50%',
    transform: 'translateY(-50%)',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    border: 'none',
    color: '#ffffff',
    fontSize: '42px',
    cursor: 'pointer',
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s ease',
    fontWeight: 300,
    lineHeight: 1,
    paddingBottom: '6px'
  },
  navBtnNext: {
    position: 'absolute',
    right: '-72px',
    top: '50%',
    transform: 'translateY(-50%)',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    border: 'none',
    color: '#ffffff',
    fontSize: '42px',
    cursor: 'pointer',
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s ease',
    fontWeight: 300,
    lineHeight: 1,
    paddingBottom: '6px'
  },
  previewImage: {
    maxWidth: '78vw',
    maxHeight: '68vh',
    objectFit: 'contain',
    borderRadius: '12px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
  },
  previewInfo: {
    marginTop: '20px',
    textAlign: 'center',
    maxWidth: '700px'
  },
  previewNote: {
    color: '#ffffff',
    fontSize: '16px',
    margin: '0 0 10px 0',
    lineHeight: 1.6
  },
  previewCounter: {
    color: '#8080a0',
    fontSize: '13px',
    margin: 0
  }
};

export default InspirationBoard;
