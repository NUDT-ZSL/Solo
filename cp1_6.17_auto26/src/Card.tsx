import React, { useState, useMemo, memo } from 'react';
import type { CardData } from './types';
import { calculateAverageRating, formatTime } from './utils';

interface CardProps {
  card: CardData;
  selected?: boolean;
  isDragging?: boolean;
  themeBg?: string;
  themeBorder?: string;
  showControls?: boolean;
  scale?: number;
  onTagsChange?: (tags: string[]) => void;
  onAddRating?: (score: 1 | 2 | 3 | 4 | 5) => void;
  onAddComment?: (content: string) => void;
  onMouseDown?: (e: React.MouseEvent) => void;
}

const StarRating: React.FC<{
  value: number;
  onChange: (score: 1 | 2 | 3 | 4 | 5) => void;
  size?: number;
  color?: string;
}> = memo(({ value, onChange, size = 16, color = '#FFB300' }) => {
  return (
    <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          onClick={(e) => {
            e.stopPropagation();
            onChange(n as 1 | 2 | 3 | 4 | 5);
          }}
          style={{
            width: size,
            height: size,
            padding: 0,
            fontSize: size,
            lineHeight: 1,
            color: n <= value ? color : '#E0E0E0',
            transition: 'color 0.15s ease, transform 0.15s ease'
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.2)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
          }}
        >
          ★
        </button>
      ))}
    </div>
  );
});

const Card: React.FC<CardProps> = ({
  card,
  selected = false,
  isDragging = false,
  themeBg,
  themeBorder,
  showControls = true,
  scale = 1,
  onTagsChange,
  onAddRating,
  onAddComment,
  onMouseDown
}) => {
  const [tagInput, setTagInput] = useState('');
  const [commentInput, setCommentInput] = useState('');
  const [showComments, setShowComments] = useState(false);

  const avgRating = useMemo(() => calculateAverageRating(card), [card.ratings]);
  const userRating = useMemo(() => {
    const r = card.ratings.find(r => r.userId === 'user1');
    return r ? r.score : 0;
  }, [card.ratings]);

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim() && onTagsChange) {
      const newTags = [...card.tags, tagInput.trim()];
      onTagsChange(newTags);
      setTagInput('');
    }
  };

  const handleRemoveTag = (idx: number) => {
    if (!onTagsChange) return;
    onTagsChange(card.tags.filter((_, i) => i !== idx));
  };

  const handleAddComment = () => {
    if (commentInput.trim() && onAddComment) {
      onAddComment(commentInput);
      setCommentInput('');
    }
  };

  const bgColor = themeBg || '#FFFFFF';
  const borderColor = selected ? '#1565C0' : (themeBorder || 'transparent');
  const opacity = 1;
  const transform = isDragging ? 'scale(1.05)' : 'scale(1)';
  const zIndex = isDragging ? 1000 : (selected ? 10 : 1);

  return (
    <div
      onMouseDown={onMouseDown}
      style={{
        position: 'absolute',
        left: card.x,
        top: card.y,
        width: card.width,
        minHeight: card.height,
        background: bgColor,
        borderRadius: 8,
        border: `2px solid ${borderColor}`,
        boxShadow: isDragging
          ? '0 8px 24px rgba(0,0,0,0.15)'
          : '0 2px 8px rgba(0,0,0,0.08)',
        opacity,
        transform,
        transition: isDragging ? 'none' : 'transform 0.3s ease, box-shadow 0.2s ease',
        zIndex,
        overflow: 'hidden',
        userSelect: 'none',
        cursor: onMouseDown ? 'grab' : 'default'
      }}>
      <div style={{
        width: '100%',
        aspectRatio: '4 / 3',
        background: '#F0F0F0',
        overflow: 'hidden',
        position: 'relative'
      }}>
        <img
          src={card.imageUrl}
          alt=""
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block'
          }}
          draggable={false}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
        {avgRating > 0 && (
          <div style={{
            position: 'absolute',
            top: 8,
            right: 8,
            background: 'rgba(255,255,255,0.95)',
            padding: '2px 8px',
            borderRadius: 10,
            fontSize: 12,
            fontWeight: 600,
            color: '#FF9800',
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            boxShadow: '0 1px 4px rgba(0,0,0,0.1)'
          }}>
            ★ {avgRating.toFixed(1)}
          </div>
        )}
      </div>

      <div style={{ padding: 12 }}>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
          marginBottom: 10
        }}>
          {card.tags.map((tag, idx) => (
            <span
              key={idx}
              style={{
                background: themeBg ? `${themeBorder}CC` : '#ECEFF1',
                color: themeBorder ? '#37474F' : '#546E7A',
                padding: '3px 10px',
                borderRadius: 12,
                fontSize: 12,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              #{tag}
              {showControls && onTagsChange && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveTag(idx);
                  }}
                  style={{
                    fontSize: 12,
                    color: '#90A4AE',
                    cursor: 'pointer',
                    lineHeight: 1,
                    padding: 0,
                    width: 14,
                    height: 14,
                    borderRadius: 7,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.1)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  }}
                >
                  ×
                </button>
              )}
            </span>
          ))}
          {showControls && onTagsChange && (
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              onClick={(e) => e.stopPropagation()}
              placeholder="+ 标签"
              style={{
                width: 72,
                border: '1px dashed #CFD8DC',
                borderRadius: 12,
                padding: '3px 8px',
                fontSize: 12,
                background: 'transparent',
                color: '#607D8B'
              }}
            />
          )}
        </div>

        {showControls && onAddRating && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 0',
            borderTop: '1px solid rgba(0,0,0,0.05)',
            gap: 8
          }}>
            <StarRating
              value={userRating}
              onChange={onAddRating}
              size={Math.max(14, Math.round(16 / Math.max(scale, 0.8)))}
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowComments(!showComments);
              }}
              style={{
                fontSize: 12,
                color: '#607D8B',
                padding: '4px 8px',
                borderRadius: 4,
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = '#F5F5F5';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
              }}
            >
              💬 {card.comments.length}
            </button>
          </div>
        )}

        {showControls && showComments && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              borderTop: '1px solid rgba(0,0,0,0.05)',
              paddingTop: 10,
              marginTop: 4,
              maxHeight: 160,
              overflowY: 'auto'
            }}
          >
            {card.comments.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
                {card.comments.slice(-3).map(c => (
                  <div key={c.id} style={{
                    background: '#FAFAFA',
                    borderRadius: 6,
                    padding: '6px 10px'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: 2,
                      fontSize: 11,
                      color: '#90A4AE'
                    }}>
                      <span style={{ fontWeight: 500, color: '#546E7A' }}>{c.userId}</span>
                      <span>{formatTime(c.createdAt)}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#455A64', lineHeight: 1.5 }}>
                      {c.content}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: '#B0BEC5', textAlign: 'center', padding: 8 }}>
                暂无评论
              </div>
            )}
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                type="text"
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                placeholder="写下你的评论..."
                style={{
                  flex: 1,
                  border: '1px solid #ECEFF1',
                  borderRadius: 4,
                  padding: '6px 10px',
                  fontSize: 12,
                  minWidth: 0
                }}
              />
              <button
                onClick={handleAddComment}
                style={{
                  background: '#1565C0',
                  color: '#fff',
                  borderRadius: 4,
                  padding: '6px 12px',
                  fontSize: 12,
                  fontWeight: 500
                }}
              >
                发送
              </button>
            </div>
          </div>
        )}
      </div>

      {isDragging && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(176, 190, 197, 0.5)',
          pointerEvents: 'none',
          transition: 'background 0.3s ease'
        }} />
      )}
    </div>
  );
};

export default memo(Card);
