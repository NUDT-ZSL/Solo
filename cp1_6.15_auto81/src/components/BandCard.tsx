import { useState } from 'react';
import type { Band } from '../types';
import { GENRE_COLORS, GENRE_LABELS } from '../types';

interface BandCardProps {
  band: Band;
  isFavorite: boolean;
  onToggleFavorite: (bandId: string) => void;
  onClick: (band: Band) => void;
  style?: React.CSSProperties;
  compact?: boolean;
  showConflict?: boolean;
}

export default function BandCard({
  band,
  isFavorite,
  onToggleFavorite,
  onClick,
  style,
  compact = false,
  showConflict = false,
}: BandCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPulsing, setIsPulsing] = useState(false);

  const handleStarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPulsing(true);
    onToggleFavorite(band.id);
    setTimeout(() => setIsPulsing(false), 150);
  };

  const handleCardClick = () => {
    onClick(band);
  };

  const bgColor = GENRE_COLORS[band.genre];

  if (compact) {
    return (
      <div
        style={{
          height: '36px',
          backgroundColor: showConflict ? '#FADBD8' : bgColor,
          borderRadius: '6px',
          padding: '0 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: showConflict ? '#2c3e50' : 'white',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          position: 'relative',
          ...style,
        }}
        onClick={handleCardClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {showConflict && (
          <span
            style={{
              position: 'absolute',
              left: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '11px',
              color: '#E74C3C',
              fontWeight: 'bold',
              backgroundColor: 'white',
              padding: '2px 6px',
              borderRadius: '4px',
            }}
          >
            冲突!
          </span>
        )}
        <span
          style={{
            fontWeight: 'bold',
            fontSize: '13px',
            marginLeft: showConflict ? '50px' : '0',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {band.name}
        </span>
        <span style={{ fontSize: '12px', opacity: 0.9 }}>
          {band.startTime} - {band.endTime}
        </span>
        <button
          style={{
            background: 'none',
            fontSize: '18px',
            color: isFavorite ? '#F1C40F' : showConflict ? '#BDC3C7' : 'rgba(255,255,255,0.8)',
            transform: isPulsing ? 'scale(1.3)' : 'scale(1)',
            transition: 'all 0.15s ease',
            padding: '0 4px',
          }}
          onClick={handleStarClick}
        >
          {isFavorite ? '★' : '☆'}
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'absolute',
        backgroundColor: bgColor,
        borderRadius: '6px',
        padding: '8px 12px',
        color: 'white',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: isHovered ? '0 4px 12px rgba(0,0,0,0.2)' : 'none',
        transform: isHovered ? 'translateY(-2px)' : 'none',
        overflow: 'hidden',
        ...style,
      }}
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          height: '100%',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontWeight: 'bold',
              fontSize: '14px',
              marginBottom: '4px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {band.name}
          </div>
          <div style={{ fontSize: '11px', opacity: 0.9 }}>
            {GENRE_LABELS[band.genre]} · {band.startTime}-{band.endTime}
          </div>
        </div>
        <button
          style={{
            background: 'none',
            fontSize: '18px',
            color: isFavorite ? '#F1C40F' : 'rgba(255,255,255,0.6)',
            transform: isPulsing ? 'scale(1.3)' : 'scale(1)',
            transition: 'all 0.15s ease',
            padding: '0 4px',
            flexShrink: 0,
          }}
          onClick={handleStarClick}
        >
          {isFavorite ? '★' : '☆'}
        </button>
      </div>

      {isHovered && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: '0',
            minWidth: '240px',
            maxWidth: '320px',
            backgroundColor: 'white',
            color: '#2c3e50',
            borderRadius: '8px',
            padding: '12px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            zIndex: 10,
            animation: 'fadeIn 0.2s ease',
            fontSize: '12px',
            pointerEvents: 'none',
          }}
        >
          <div style={{ fontWeight: 'bold', marginBottom: '6px', fontSize: '14px' }}>
            {band.name}
          </div>
          <div style={{ color: '#7f8c8d', marginBottom: '8px' }}>
            发源地：{band.origin}
          </div>
          <div style={{ marginBottom: '6px' }}>
            <span style={{ color: '#7f8c8d' }}>简介：</span>
            {band.description}
          </div>
          <div>
            <span style={{ color: '#7f8c8d' }}>热门歌曲：</span>
            {band.popularSongs.join('、')}
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
