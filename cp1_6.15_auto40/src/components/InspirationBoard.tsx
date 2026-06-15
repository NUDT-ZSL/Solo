import React, { useState, useEffect } from 'react';
import { Inspiration } from '../data/mockData';

interface InspirationBoardProps {
  inspirations: Inspiration[];
  onAddInspiration: (imageUrl: string, note: string) => void;
  loading: boolean;
  contentVisible: boolean;
}

const InspirationBoard: React.FC<InspirationBoardProps> = ({
  inspirations,
  onAddInspiration,
  loading,
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

      {loading ? (
        <div className="inspiration-board" style={styles.masonry}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div
              key={i}
              className="skeleton"
              style={{ ...styles.skeletonItem, height: 200 + (i % 3) * 80 }}
            />
          ))}
        </div>
      ) : (
        <div
          className={`inspiration-board ${contentVisible ? 'fade-in' : ''}`}
          style={{ ...styles.masonry, opacity: contentVisible ? 1 : 0 }}
        >
          {inspirations.map((inspiration, index) => (
            <div
              key={inspiration.id}
              style={styles.masonryItem}
              onMouseEnter={() => setHoveredId(inspiration.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => openPreview(index)}
            >
              <div style={styles.imageWrapper}>
                <img
                  src={inspiration.imageUrl}
                  alt={inspiration.note}
                  style={{
                    ...styles.image,
                    transform: hoveredId === inspiration.id ? 'scale(1.05)' : 'scale(1)',
                    height: inspiration.height
                  }}
                />
                {hoveredId === inspiration.id && (
                  <div style={styles.overlay}>
                    <p style={styles.overlayText}>
                      {inspiration.note.length > 60
                        ? inspiration.note.substring(0, 60) + '...'
                        : inspiration.note
                      }
                    </p>
                  </div>
                )}
              </div>
              <p style={styles.note}>{inspiration.note}</p>
            </div>
          ))}
        </div>
      )}

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
  masonry: {
    columnCount: 2,
    columnGap: '16px',
    transition: 'opacity 0.4s ease'
  },
  masonryItem: {
    breakInside: 'avoid',
    marginBottom: '16px',
    backgroundColor: '#1a1a2e',
    borderRadius: '8px',
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  skeletonItem: {
    breakInside: 'avoid',
    marginBottom: '16px'
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    transition: 'all 0.3s ease'
  },
  overlayText: {
    color: '#ffffff',
    fontSize: '14px',
    lineHeight: 1.5,
    textAlign: 'center',
    margin: 0
  },
  note: {
    padding: '12px',
    margin: 0,
    fontSize: '13px',
    color: '#a0a0a0',
    lineHeight: 1.5
  },
  previewOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    backdropFilter: 'blur(10px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
    animation: 'fadeIn 0.3s ease'
  },
  previewContent: {
    position: 'relative',
    maxWidth: '90vw',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  closeBtn: {
    position: 'absolute',
    top: '-50px',
    right: 0,
    backgroundColor: 'transparent',
    border: 'none',
    color: '#ffffff',
    fontSize: '36px',
    cursor: 'pointer',
    padding: '0 10px',
    transition: 'all 0.3s ease'
  },
  navBtnPrev: {
    position: 'absolute',
    left: '-60px',
    top: '50%',
    transform: 'translateY(-50%)',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    border: 'none',
    color: '#ffffff',
    fontSize: '48px',
    cursor: 'pointer',
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s ease'
  },
  navBtnNext: {
    position: 'absolute',
    right: '-60px',
    top: '50%',
    transform: 'translateY(-50%)',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    border: 'none',
    color: '#ffffff',
    fontSize: '48px',
    cursor: 'pointer',
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s ease'
  },
  previewImage: {
    maxWidth: '80vw',
    maxHeight: '70vh',
    objectFit: 'contain',
    borderRadius: '8px'
  },
  previewInfo: {
    marginTop: '16px',
    textAlign: 'center'
  },
  previewNote: {
    color: '#ffffff',
    fontSize: '16px',
    margin: '0 0 8px 0',
    maxWidth: '600px'
  },
  previewCounter: {
    color: '#a0a0a0',
    fontSize: '14px',
    margin: 0
  }
};

export default InspirationBoard;
