import { useState } from 'react';
import type { Recipe } from '../types';
import './RecipeCard.css';

interface RecipeCardProps {
  recipe: Recipe;
  onToggleFavorite: (id: string, favorite: boolean) => void;
  onClick: () => void;
}

export default function RecipeCard({ recipe, onToggleFavorite, onClick }: RecipeCardProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAnimating(true);
    onToggleFavorite(recipe._id!, !recipe.favorite);
    setTimeout(() => setIsAnimating(false), 400);
  };

  return (
    <div className="recipe-card masonry-item" onClick={onClick}>
      <div className="recipe-card-image">
        <img src={recipe.image} alt={recipe.name} loading="lazy" />
        <button
          className={`favorite-btn ${recipe.favorite ? 'favorited' : ''} ${isAnimating ? 'heart-pop' : ''}`}
          onClick={handleFavoriteClick}
          aria-label={recipe.favorite ? '取消收藏' : '收藏'}
        >
          <svg viewBox="0 0 24 24" width="24" height="24" fill={recipe.favorite ? '#ef4444' : 'none'} stroke={recipe.favorite ? '#ef4444' : '#fff'} strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>
      </div>
      <div className="recipe-card-content">
        <h3 className="recipe-card-title">{recipe.name}</h3>
        <div className="recipe-card-meta">
          <span className="prep-time">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            {recipe.prepTime}分钟
          </span>
        </div>
      </div>
    </div>
  );
}
