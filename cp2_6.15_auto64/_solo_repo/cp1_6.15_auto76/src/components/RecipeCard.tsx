import React, { useEffect, useRef, useCallback, useState } from 'react';
import type { Recipe, User } from '../business/RecipeEngine';
import { calculateAverageRating, getCookingTimeLabel } from '../business/RecipeEngine';

interface RecipeCardProps {
  recipe: Recipe;
  author: User | undefined;
  onClick: (id: string) => void;
  onRate: (recipeId: string, rating: number) => void;
  index: number;
}

const RecipeCard: React.FC<RecipeCardProps> = React.memo(({ recipe, author, onClick, onRate, index }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setVisible(true), (index % 20) * 30);
          observer.unobserve(card);
        }
      },
      { rootMargin: '100px', threshold: 0.01 }
    );

    observer.observe(card);
    return () => observer.disconnect();
  }, [index]);

  const avgRating = calculateAverageRating(recipe.ratings);

  const handleStarClick = useCallback((e: React.MouseEvent, rating: number) => {
    e.stopPropagation();
    onRate(recipe.id, rating);
  }, [onRate, recipe.id]);

  const handleStarEnter = useCallback((rating: number) => {
    setHoverRating(rating);
  }, []);

  const handleStarLeave = useCallback(() => {
    setHoverRating(0);
  }, []);

  const displayRating = hoverRating || avgRating;

  return (
    <div
      ref={cardRef}
      className="recipe-card"
      style={{ animationDelay: visible ? `${(index % 8) * 0.03}s` : '0s', animationPlayState: visible ? 'running' : 'paused' }}
      onClick={() => onClick(recipe.id)}
    >
      {recipe.imageUrl ? (
        <img
          className="recipe-card-image"
          src={recipe.imageUrl}
          alt={recipe.title}
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
            const placeholder = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
            if (placeholder) placeholder.style.display = 'flex';
          }}
        />
      ) : null}
      {!recipe.imageUrl && (
        <div className="recipe-card-placeholder">🍴</div>
      )}
      {recipe.imageUrl && (
        <div className="recipe-card-placeholder" style={{ display: 'none' }}>🍴</div>
      )}
      <div className="recipe-card-body">
        <div className="recipe-card-title">{recipe.title}</div>
        <div className="recipe-card-meta">
          <div className="recipe-card-author">
            {author?.avatarUrl ? (
              <img src={author.avatarUrl} alt={author.name} loading="lazy" />
            ) : (
              <div className="recipe-card-author-avatar-placeholder">👤</div>
            )}
            <span>{author?.name || '匿名'}</span>
          </div>
          <div className="recipe-card-rating">
            {[1, 2, 3, 4, 5].map((star) => (
              <span
                key={star}
                className={`star ${star <= Math.round(displayRating) ? 'filled' : ''}`}
                onClick={(e) => handleStarClick(e, star)}
                onMouseEnter={() => handleStarEnter(star)}
                onMouseLeave={handleStarLeave}
              >
                ★
              </span>
            ))}
            <span className="star-rating-value">{avgRating > 0 ? avgRating.toFixed(1) : ''}</span>
          </div>
        </div>
        <div className="recipe-card-cooking-time">
          ⏱ {getCookingTimeLabel(recipe.cookingTime)}
        </div>
        {recipe.tags.length > 0 && (
          <div className="recipe-card-tags">
            {recipe.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="recipe-card-tag">{tag}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

RecipeCard.displayName = 'RecipeCard';

export default RecipeCard;
