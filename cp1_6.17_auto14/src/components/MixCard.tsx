import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Mixtape } from '../types';
import { formatTime } from '../business/audio-engine';
import { THEMES } from '../types';

interface MixCardProps {
  mixtape: Mixtape;
  stickerCount: number;
  searchQuery?: string;
  style?: React.CSSProperties;
}

const MixCard: React.FC<MixCardProps> = ({ mixtape, stickerCount, searchQuery = '', style }) => {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);

  const theme = THEMES[mixtape.theme];

  const highlightText = (text: string, query: string): React.ReactNode => {
    if (!query.trim()) return text;

    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <span key={index} style={{ backgroundColor: 'var(--search-highlight)', color: '#000', padding: '0 2px', borderRadius: '2px' }}>
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  const handleClick = () => {
    setIsClicked(true);
    setTimeout(() => {
      navigate(`/play/${mixtape.id}`);
    }, 400);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        width: '280px',
        borderRadius: 'var(--border-radius-card)',
        background: 'linear-gradient(135deg, var(--bg-card-start) 0%, var(--bg-card-end) 100%)',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all var(--transition-normal)',
        transform: isClicked ? 'scale(1.1)' : isHovered ? 'translateY(-4px) scale(1.02)' : 'scale(1)',
        boxShadow: isHovered
          ? '0 12px 40px rgba(255, 107, 107, 0.2)'
          : '0 4px 20px rgba(0, 0, 0, 0.3)',
        ...style
      }}
    >
      <div style={{ position: 'relative', height: '168px', overflow: 'hidden' }}>
        <img
          src={mixtape.coverUrl || mixtape.songs[0]?.albumCover}
          alt={mixtape.title}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: 'grayscale(80%)',
            transition: 'all var(--transition-normal)',
            transform: isHovered ? 'scale(1.1)' : 'scale(1)'
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(to top, rgba(30, 39, 46, 0.9) 0%, transparent 60%)'
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            padding: '4px 10px',
            borderRadius: 'var(--border-radius)',
            background: theme.primary,
            color: mixtape.theme === 'minimal' ? '#333' : '#fff',
            fontSize: '11px',
            fontWeight: 600
          }}
        >
          {theme.name}
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: '12px',
            left: '16px',
            right: '16px'
          }}
        >
          <h3
            style={{
              fontSize: '16px',
              fontWeight: 600,
              marginBottom: '4px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {highlightText(mixtape.title, searchQuery)}
          </h3>
          <p
            style={{
              fontSize: '12px',
              color: 'var(--text-secondary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {formatDate(mixtape.createdAt)}
          </p>
        </div>
      </div>

      <div style={{ padding: '16px' }}>
        <p
          style={{
            fontSize: '13px',
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
            marginBottom: '12px',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            minHeight: '38px'
          }}
        >
          {highlightText(mixtape.description, searchQuery)}
        </p>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: '12px',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--text-secondary)' }}>
            <span>🎵</span>
            <span>{mixtape.songs.length}首</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--text-secondary)' }}>
            <span>⏱️</span>
            <span>{formatTime(mixtape.totalDuration)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--text-secondary)' }}>
            <span>❤️</span>
            <span>{stickerCount}</span>
          </div>
        </div>
      </div>

      {isClicked && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'var(--bg-primary)',
            zIndex: 9999,
            animation: 'scaleIn 0.4s ease forwards',
            pointerEvents: 'none'
          }}
        />
      )}
    </div>
  );
};

export default MixCard;
