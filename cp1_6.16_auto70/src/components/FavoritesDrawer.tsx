import React, { useState, useCallback, useEffect } from 'react';
import { X, Heart, Trash2 } from 'lucide-react';
import type { FavoriteItem } from '../types';

interface FavoritesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface RemoveButtonProps {
  onClick: () => void;
}

const RemoveButton: React.FC<RemoveButtonProps> = ({ onClick }) => {
  const [bounce, setBounce] = useState(false);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setBounce(true);
    onClick();
    setTimeout(() => setBounce(false), 300);
  }, [onClick]);

  return (
    <button
      onClick={handleClick}
      className={[
        'favorite-btn',
        'active',
        bounce ? 'bounce' : '',
      ].filter(Boolean).join(' ')}
      style={{
        position: 'relative',
        bottom: 'auto',
        right: 'auto',
        width: 36,
        height: 36,
        backgroundColor: '#F4F6F7',
      }}
    >
      <Trash2 size={16} color="#E74C3C" />
    </button>
  );
};

const FAVORITES_KEY = 'outfit_favorites';

export const FavoritesDrawer: React.FC<FavoritesDrawerProps> = ({ isOpen, onClose }) => {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);

  useEffect(() => {
    if (isOpen) {
      try {
        const stored = localStorage.getItem(FAVORITES_KEY);
        if (stored) {
          setFavorites(JSON.parse(stored));
        } else {
          setFavorites([]);
        }
      } catch (e) {
        console.error('Failed to load favorites:', e);
        setFavorites([]);
      }
    }
  }, [isOpen]);

  const removeFavorite = useCallback((id: string) => {
    const newFavorites = favorites.filter((f) => f.id !== id);
    setFavorites(newFavorites);
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavorites));
    } catch (e) {
      console.error('Failed to save favorites:', e);
    }
  }, [favorites]);

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <>
      <div className="drawer-overlay" onClick={handleOverlayClick} />
      <div className="drawer">
        <div className="drawer-header">
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Heart size={20} fill="#E74C3C" color="#E74C3C" />
            我的收藏
          </h3>
          <button
            onClick={onClose}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#F4F6F7',
              cursor: 'pointer',
              border: 'none',
              transition: 'background-color 0.2s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#E5E8E8')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#F4F6F7')}
          >
            <X size={18} color="#2C3E50" />
          </button>
        </div>
        <div className="drawer-content">
          {favorites.length > 0 ? (
            favorites.map((fav) => (
              <div key={fav.id} className="favorite-item">
                <div className="favorite-item-images">
                  {fav.items.slice(0, 3).map((item) => (
                    <img key={item.id} src={item.imageUrl} alt={item.name} loading="lazy" />
                  ))}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 15,
                    marginBottom: 4,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {fav.description}
                  </h4>
                  <p style={{
                    fontSize: 12,
                    color: '#7F8C8D',
                    marginBottom: 8,
                  }}>
                    {new Date(fav.createdAt).toLocaleDateString('zh-CN')}
                  </p>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {fav.items.map((item) => (
                      <span
                        key={item.id}
                        style={{
                          fontSize: 10,
                          padding: '1px 6px',
                          backgroundColor: item.color,
                          color: '#fff',
                          borderRadius: 999,
                          textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                        }}
                      >
                        {item.style}
                      </span>
                    ))}
                  </div>
                </div>
                <RemoveButton onClick={() => removeFavorite(fav.id)} />
              </div>
            ))
          ) : (
            <div className="empty-state">
              <Heart size={48} color="#BDC3C7" style={{ marginBottom: 16 }} />
              <p style={{ fontSize: 16, marginBottom: 4 }}>暂无收藏</p>
              <p style={{ fontSize: 13, color: '#7F8C8D' }}>点击推荐方案的爱心图标收藏喜欢的搭配</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
