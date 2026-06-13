import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Recipe } from '../types';

interface RecipeCardProps {
  recipe: Recipe;
  featured?: boolean;
  onToggleFavorite?: (id: string) => void;
  isFavorite?: boolean;
}

export function RecipeCard({ recipe, featured = false, onToggleFavorite, isFavorite = false }: RecipeCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);
  const [userRating, setUserRating] = useState(recipe.rating);

  const renderStars = () => {
    const stars = [];
    const displayRating = hoverRating || userRating;
    for (let i = 1; i <= 5; i++) {
      const filled = i <= displayRating;
      stars.push(
        <svg
          key={i}
          className={`star ${filled ? 'filled' : 'empty'}`}
          viewBox="0 0 24 24"
          fill="currentColor"
          onMouseEnter={() => setHoverRating(i)}
          onMouseLeave={() => setHoverRating(0)}
          onClick={() => setUserRating(i)}
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      );
    }
    return stars;
  };

  const displayTags = recipe.tags.slice(0, 3);

  return (
    <Link
      to={`/recipe/${recipe.id}`}
      className={`recipe-card ${featured ? 'featured' : ''}`}
    >
      <div className="card-cover">
        {featured && (
          <div className="card-flame-corner">
            <span className="flame-badge">🔥</span>
          </div>
        )}
        {!imageLoaded && <div className="image-placeholder" style={{ width: '100%', height: '100%' }} />}
        {recipe.imageUrl ? (
          <img
            src={recipe.imageUrl}
            alt={recipe.name}
            loading="lazy"
            onLoad={() => setImageLoaded(true)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: imageLoaded ? 'block' : 'none'
            }}
          />
        ) : (
          <div
            className="image-placeholder"
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '64px'
            }}
          >
            {getFoodEmoji(recipe.cuisine)}
          </div>
        )}
        {onToggleFavorite && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleFavorite(recipe.id);
            }}
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              zIndex: 2,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
          >
            {isFavorite ? '❤️' : '🤍'}
          </button>
        )}
      </div>
      <div className="card-body">
        <h3 className="card-title">{recipe.name}</h3>
        <div className="card-tags">
          {displayTags.map(tag => (
            <span key={tag} className="tag-chip">{tag}</span>
          ))}
        </div>
        <div className="rating-stars">{renderStars()}</div>
      </div>
    </Link>
  );
}

function getFoodEmoji(cuisine: string): string {
  const map: Record<string, string> = {
    '川菜': '🌶️',
    '粤菜': '🍗',
    '湘菜': '🐟',
    '鲁菜': '🍖',
    '日料': '🍣',
    '西餐': '🍝'
  };
  return map[cuisine] || '🍲';
}
