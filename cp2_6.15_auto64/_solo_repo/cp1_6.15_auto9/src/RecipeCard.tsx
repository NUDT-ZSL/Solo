import React, { useState } from 'react';
import { Recipe } from './types';

interface RecipeCardProps {
  recipe: Recipe;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onClick: (recipe: Recipe) => void;
}

const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, isFavorite, onToggleFavorite, onClick }) => {
  const [heartAnimating, setHeartAnimating] = useState(false);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setHeartAnimating(true);
    onToggleFavorite(recipe.id);
    setTimeout(() => setHeartAnimating(false), 200);
  };

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      const filled = i <= Math.floor(rating);
      const half = !filled && i - rating < 1 && i - rating > 0;
      stars.push(
        <span key={i} className={`star ${filled ? 'filled' : half ? 'half' : ''}`}>
          ★
        </span>
      );
    }
    return stars;
  };

  return (
    <div className="recipe-card" onClick={() => onClick(recipe)}>
      <div className="recipe-image-wrapper">
        <img src={recipe.imageUrl} alt={recipe.name} className="recipe-image" />
        <div className="recipe-category">{recipe.category}</div>
      </div>
      <div className="recipe-content">
        <h3 className="recipe-name">{recipe.name}</h3>
        <p className="recipe-description">{recipe.description}</p>
        <div className="recipe-tags">
          {recipe.tags.slice(0, 3).map(tag => (
            <span key={tag} className="recipe-tag">{tag}</span>
          ))}
        </div>
        <div className="recipe-footer">
          <div className="recipe-rating">
            {renderStars(recipe.rating)}
            <span className="rating-text">{recipe.rating.toFixed(1)}</span>
          </div>
          <div className="recipe-meta">
            <span className="cooking-time">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12,6 12,12 16,14"/>
              </svg>
              {recipe.cookingTime}分钟
            </span>
            <button
              className={`favorite-btn ${isFavorite ? 'active' : ''} ${heartAnimating ? 'animating' : ''}`}
              onClick={handleFavoriteClick}
              aria-label={isFavorite ? '取消收藏' : '收藏'}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecipeCard;
