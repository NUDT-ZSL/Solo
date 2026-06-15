import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Recipe } from '../types/Recipe';
import { useFavoritesContext } from '../App';

interface RecipeCardProps {
  recipe: Recipe;
  index: number;
  onClick?: () => void;
}

const tagColors = [
  { bg: '#FFF3E0', color: '#E65100' },
  { bg: '#E8F5E9', color: '#2E7D32' },
  { bg: '#E3F2FD', color: '#1565C0' },
  { bg: '#FCE4EC', color: '#AD1457' },
  { bg: '#F3E5F5', color: '#6A1B9A' },
  { bg: '#FFF8E1', color: '#F57F17' },
  { bg: '#E0F7FA', color: '#00695C' },
  { bg: '#FFEBEE', color: '#C62828' },
];

function getTagColor(tag: string) {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  return tagColors[Math.abs(hash) % tagColors.length];
}

export default function RecipeCard({ recipe, index, onClick }: RecipeCardProps) {
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite, getAdjustedLikes } = useFavoritesContext();
  const [liked, setLiked] = useState(isFavorite(recipe.id));
  const [showFlash, setShowFlash] = useState<null | 'plus' | 'minus'>(null);
  const [visible, setVisible] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [heartAnimating, setHeartAnimating] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), index * 60);
    return () => clearTimeout(timer);
  }, [index]);

  useEffect(() => {
    setLiked(isFavorite(recipe.id));
  }, [isFavorite, recipe.id]);

  const handleHeartClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const wasFavorite = liked;
    const nowFavorite = toggleFavorite(recipe.id);
    setLiked(nowFavorite);
    setHeartAnimating(true);
    setShowFlash(nowFavorite ? 'plus' : 'minus');
    setTimeout(() => setHeartAnimating(false), 500);
    setTimeout(() => setShowFlash(null), 800);
  };

  const handleCardClick = () => {
    if (onClick) onClick();
    navigate(`/recipe/${recipe.id}`);
  };

  const adjustedLikes = getAdjustedLikes(recipe.id, recipe.likes);

  return (
    <div
      onClick={handleCardClick}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 0.4s ease, transform 0.4s ease, box-shadow 0.3s ease',
        backgroundColor: 'var(--card-bg)',
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
        cursor: 'pointer',
        boxShadow: 'var(--shadow-sm)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = visible ? 'translateY(-3px)' : 'translateY(20px)';
        e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = visible ? 'translateY(0)' : 'translateY(20px)';
        e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
      }}
    >
      <div style={{ position: 'relative', width: '100%', paddingTop: '66.67%', overflow: 'hidden' }}>
        {!imgLoaded && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: '#F5F5F5',
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          />
        )}
        <img
          src={recipe.image}
          alt={recipe.title}
          onLoad={() => setImgLoaded(true)}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: imgLoaded ? 1 : 0,
            transition: 'opacity 0.3s ease',
          }}
        />
        <button
          onClick={handleHeartClick}
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            transition: 'background-color 0.2s',
            animation: heartAnimating ? 'heartBeat 0.5s ease' : 'none',
            zIndex: 2,
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill={liked ? 'var(--heart-color)' : 'none'}
            stroke={liked ? 'var(--heart-color)' : '#999'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          {showFlash && (
            <span
              style={{
                position: 'absolute',
                top: '-20px',
                right: '50%',
                transform: 'translateX(50%)',
                color: showFlash === 'plus' ? 'var(--heart-color)' : '#666',
                fontWeight: 700,
                fontSize: '14px',
                animation: 'likeFlash 0.8s ease forwards',
              }}
            >
              {showFlash === 'plus' ? '+1' : '-1'}
            </span>
          )}
        </button>
      </div>

      <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
          <h3
            style={{
              fontSize: '16px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              lineHeight: 1.4,
              flex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 1,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {recipe.title}
          </h3>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              color: 'var(--text-muted)',
              fontSize: '13px',
              flexShrink: 0,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--heart-color)" stroke="none">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            <span>{adjustedLikes}</span>
          </div>
        </div>

        <p
          style={{
            fontSize: '13px',
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            minHeight: '39px',
          }}
        >
          {recipe.description}
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: 'auto' }}>
          {recipe.tags.slice(0, 3).map((tag) => {
            const tc = getTagColor(tag);
            return (
              <span
                key={tag}
                style={{
                  padding: '3px 10px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 500,
                  backgroundColor: tc.bg,
                  color: tc.color,
                }}
              >
                {tag}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
