import React, { useState } from 'react';

interface Recipe {
  id: string;
  title: string;
  imageUrl: string;
  description: string;
  ingredients: string[];
  steps: string;
  ratings: number[];
  averageRating: number;
}

interface RecipeCardProps {
  recipe: Recipe;
  onRate: (id: string, rating: number) => void;
  onSelect?: (id: string) => void;
  selected?: boolean;
  isSelectable?: boolean;
}

const STAR_KEY = 'rated_recipes';

function getRatedRecipes(): Record<string, number> {
  try {
    const data = localStorage.getItem(STAR_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

function setRatedRecipe(id: string, rating: number) {
  const rated = getRatedRecipes();
  rated[id] = rating;
  localStorage.setItem(STAR_KEY, JSON.stringify(rated));
}

const StarIcon: React.FC<{ filled: boolean; animate: boolean; onClick: () => void }> = ({
  filled,
  animate,
  onClick,
}) => (
  <svg
    className={`star ${animate ? 'animate' : ''}`}
    onClick={onClick}
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill={filled ? '#FFD700' : '#CCCCCC'}
    stroke={filled ? '#FFD700' : '#CCCCCC'}
    strokeWidth="1"
  >
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const RecipeCard: React.FC<RecipeCardProps> = ({
  recipe,
  onRate,
  onSelect,
  selected,
  isSelectable,
}) => {
  const [animatingStar, setAnimatingStar] = useState<number | null>(null);
  const ratedRecipes = getRatedRecipes();
  const userRating = ratedRecipes[recipe.id];
  const displayRating = userRating || recipe.averageRating;

  const handleRate = (rating: number) => {
    if (userRating) return;
    setAnimatingStar(rating);
    setTimeout(() => setAnimatingStar(null), 200);
    setRatedRecipe(recipe.id, rating);
    onRate(recipe.id, rating);
  };

  const handleClick = () => {
    if (isSelectable && onSelect) {
      onSelect(recipe.id);
    }
  };

  return (
    <div
      className={`recipe-card ${selected ? 'selected' : ''}`}
      onClick={handleClick}
    >
      <img
        src={recipe.imageUrl}
        alt={recipe.title}
        className="recipe-card-image"
      />
      <div className="recipe-card-body">
        <h3 className="recipe-card-title">{recipe.title}</h3>
        <p className="recipe-card-desc">{recipe.description}</p>
        <div className="rating-stars" onClick={(e) => e.stopPropagation()}>
          {[1, 2, 3, 4, 5].map((star) => (
            <StarIcon
              key={star}
              filled={star <= Math.round(displayRating)}
              animate={animatingStar === star}
              onClick={() => handleRate(star)}
            />
          ))}
          <span className="rating-text">
            {displayRating > 0 ? displayRating.toFixed(1) : '暂无评分'}
            {recipe.ratings.length > 0 && ` (${recipe.ratings.length})`}
            {userRating && ' · 已评'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default RecipeCard;
