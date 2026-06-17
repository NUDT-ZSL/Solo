import React from 'react';
import { Photo } from '../types';

interface Props {
  photos: Photo[];
  onToggleFavorite: (id: string) => void;
}

const PhotoMasonry: React.FC<Props> = ({ photos, onToggleFavorite }) => {
  const masonryStyle: React.CSSProperties = {
    columnWidth: '250px',
    columns: 'auto',
    columnGap: '8px',
    width: '100%',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  };

  const itemStyle: React.CSSProperties = {
    breakInside: 'avoid',
    marginBottom: '8px',
    position: 'relative'
  };

  const imgWrapperStyle: React.CSSProperties = {
    position: 'relative',
    borderRadius: '12px',
    overflow: 'hidden',
    transition: 'all 0.3s ease',
    cursor: 'pointer'
  };

  const imgStyle: React.CSSProperties = {
    width: '100%',
    display: 'block',
    borderRadius: '12px'
  };

  const heartStyle = (favorite: boolean, bouncing: boolean): React.CSSProperties => ({
    position: 'absolute',
    bottom: '10px',
    right: '10px',
    fontSize: '24px',
    cursor: 'pointer',
    color: favorite ? '#f44336' : '#fff',
    textShadow: '0 1px 4px rgba(0,0,0,0.3)',
    userSelect: 'none',
    transform: bouncing ? 'scale(1.2)' : 'scale(1)',
    transition: 'transform 0.3s ease, color 0.2s ease',
    WebkitTextStroke: favorite ? '0px' : '1.5px #f44336'
  });

  const [bouncingId, setBouncingId] = React.useState<string | null>(null);

  const handleHeartClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setBouncingId(id);
    onToggleFavorite(id);
    setTimeout(() => setBouncingId(null), 300);
  };

  if (photos.length === 0) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 20px',
        color: '#999'
      }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>📁❓</div>
        <div style={{ fontSize: '1rem' }}>暂无照片</div>
      </div>
    );
  }

  return (
    <div style={masonryStyle}>
      {photos.map((photo) => (
        <div key={photo.id} style={itemStyle}>
          <div
            style={imgWrapperStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <img src={photo.url} alt="" style={imgStyle} loading="lazy" />
            <span
              style={heartStyle(photo.favorite, bouncingId === photo.id)}
              onClick={(e) => handleHeartClick(e, photo.id)}
            >
              {photo.favorite ? '♥' : '♡'}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PhotoMasonry;
