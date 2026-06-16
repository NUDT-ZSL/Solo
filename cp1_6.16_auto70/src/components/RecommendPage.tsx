import React, { useState, useCallback, useEffect } from 'react';
import { ArrowLeft, Heart } from 'lucide-react';
import type { RecommendResult, FavoriteItem } from '../types';
import { useLazyImage } from '../hooks/useLazyLoad';

interface RecommendPageProps {
  recommendations: RecommendResult[];
  sourceItemName: string;
  onBack: () => void;
}

interface LazyImageProps {
  src: string;
  alt: string;
}

const LazyImage: React.FC<LazyImageProps> = ({ src, alt }) => {
  const [imgRef, imageSrc, isLoaded] = useLazyImage(src);

  return (
    <img
      ref={imgRef}
      src={imageSrc}
      alt={alt}
      style={{
        opacity: isLoaded ? 1 : 0.3,
        transition: 'opacity 0.3s ease',
      }}
      loading="lazy"
    />
  );
};

interface FavoriteButtonProps {
  isFavorite: boolean;
  onClick: () => void;
}

const FavoriteButton: React.FC<FavoriteButtonProps> = ({ isFavorite, onClick }) => {
  const [bounce, setBounce] = useState(false);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setBounce(true);
    onClick();
    setTimeout(() => setBounce(false), 300);
  }, [onClick]);

  const className = [
    'favorite-btn',
    isFavorite ? 'active' : '',
    bounce ? 'bounce' : '',
  ].filter(Boolean).join(' ');

  return (
    <button className={className} onClick={handleClick}>
      <Heart strokeWidth={2} />
    </button>
  );
};

interface RecommendCardProps {
  recommendation: RecommendResult;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

const RecommendCard: React.FC<RecommendCardProps> = ({
  recommendation,
  isFavorite,
  onToggleFavorite,
}) => {
  const randomHeight = 280 + Math.floor(Math.random() * 120);

  return (
    <div className="recommend-card" style={{ minHeight: randomHeight }}>
      <div className="recommend-card-images">
        {recommendation.items.slice(0, 4).map((item) => (
          <LazyImage key={item.id} src={item.imageUrl} alt={item.name} />
        ))}
      </div>
      <div className="recommend-card-content">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <h4 style={{ fontFamily: 'var(--font-display)', fontSize: 16 }}>
            {recommendation.description}
          </h4>
          <span className="match-score">
            {Math.round(recommendation.matchScore * 100)}%
          </span>
        </div>
        <p style={{ fontSize: 13, color: 'var(--color-text-light)', lineHeight: 1.5 }}>
          {recommendation.styleNote}
        </p>
        <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {recommendation.items.map((item) => (
            <span
              key={item.id}
              style={{
                fontSize: 11,
                padding: '2px 8px',
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
      <FavoriteButton isFavorite={isFavorite} onClick={onToggleFavorite} />
    </div>
  );
};

const FAVORITES_KEY = 'outfit_favorites';

export const RecommendPage: React.FC<RecommendPageProps> = ({
  recommendations,
  sourceItemName,
  onBack,
}) => {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_KEY);
      if (stored) {
        setFavorites(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load favorites:', e);
    }
  }, []);

  const saveFavorites = useCallback((newFavorites: FavoriteItem[]) => {
    setFavorites(newFavorites);
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavorites));
    } catch (e) {
      console.error('Failed to save favorites:', e);
    }
  }, []);

  const isFavorite = useCallback((recommendId: string) => {
    return favorites.some((f) => f.recommendId === recommendId);
  }, [favorites]);

  const toggleFavorite = useCallback((recommendation: RecommendResult) => {
    const existingIndex = favorites.findIndex((f) => f.recommendId === recommendation.id);

    if (existingIndex > -1) {
      const newFavorites = favorites.filter((_, i) => i !== existingIndex);
      saveFavorites(newFavorites);
    } else {
      const newFavorite: FavoriteItem = {
        id: `fav-${Date.now()}`,
        recommendId: recommendation.id,
        items: recommendation.items,
        description: recommendation.description,
        createdAt: Date.now(),
      };
      saveFavorites([...favorites, newFavorite]);
    }
  }, [favorites, saveFavorites]);

  const displayCount = Math.min(Math.max(recommendations.length, 6), 8);
  const displayRecommendations = recommendations.slice(0, displayCount);

  return (
    <div className="recommend-page">
      <button className="back-btn" onClick={onBack}>
        <ArrowLeft size={16} />
        返回
      </button>

      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, marginBottom: 8 }}>
          为「{sourceItemName}」推荐的搭配
        </h2>
        <p style={{ color: 'var(--color-text-light)' }}>
          共找到 {displayRecommendations.length} 套适合的穿搭方案
        </p>
      </div>

      {displayRecommendations.length > 0 ? (
        <div className="masonry-grid">
          {displayRecommendations.map((rec) => (
            <RecommendCard
              key={rec.id}
              recommendation={rec}
              isFavorite={isFavorite(rec.id)}
              onToggleFavorite={() => toggleFavorite(rec)}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p style={{ fontSize: 18, marginBottom: 8 }}>暂无推荐方案</p>
          <p style={{ fontSize: 14 }}>请尝试选择其他单品</p>
        </div>
      )}
    </div>
  );
};
