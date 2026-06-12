import { useState } from 'react';
import type { MatchedRecipe } from '../../server/recipeMatcher';

interface RecipeCardProps {
  recipe: MatchedRecipe;
  isFavorite: boolean;
  isRecommended: boolean;
  onFavoriteToggle: (recipeId: string, favorited: boolean) => void;
  onClick: () => void;
}

const styles = `
  .recipe-card {
    background: #fff;
    border-radius: 16px;
    padding: 20px;
    cursor: pointer;
    transition: all 300ms ease;
    box-shadow: 0 2px 8px rgba(230, 160, 70, 0.2);
    position: relative;
    overflow: hidden;
  }

  .recipe-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(230, 160, 70, 0.3);
  }

  .recipe-card:active {
    transform: scale(0.98);
    transition: transform 100ms ease;
  }

  .recommended-badge {
    position: absolute;
    top: 12px;
    left: 12px;
    width: 48px;
    height: 48px;
    background: linear-gradient(135deg, #E67E22 0%, #F39C12 100%);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    color: #fff;
    animation: spin 2s linear infinite;
    z-index: 2;
    box-shadow: 0 2px 8px rgba(230, 126, 34, 0.4);
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .favorite-btn {
    position: absolute;
    top: 16px;
    right: 16px;
    background: none;
    border: none;
    font-size: 28px;
    cursor: pointer;
    color: #ddd;
    transition: color 0.2s ease;
    z-index: 2;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .favorite-btn:hover {
    color: #E74C3C;
  }

  .favorite-btn.active {
    color: #E74C3C;
  }

  .favorite-btn.pulsing {
    animation: heartPulse 300ms ease;
  }

  @keyframes heartPulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.3); }
    100% { transform: scale(1); }
  }

  .favorite-btn:active {
    transform: scale(0.9);
    transition: transform 100ms ease;
  }

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
    padding-right: 40px;
  }

  .card-header.recommended {
    padding-left: 56px;
  }

  .recipe-name {
    font-size: 20px;
    font-weight: 700;
    color: #333;
    margin: 0;
  }

  .match-percentage {
    font-size: 32px;
    font-weight: 800;
    background: linear-gradient(135deg, #27AE60 0%, #2ECC71 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    line-height: 1;
  }

  .card-body {
    margin-top: 16px;
  }

  .ingredients-title {
    font-size: 14px;
    font-weight: 600;
    color: #666;
    margin-bottom: 8px;
  }

  .ingredients-preview {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .ingredient-chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    background: #F8F9FA;
    border-radius: 12px;
    font-size: 13px;
    color: #555;
  }

  .ingredient-chip.missing {
    color: #E74C3C;
    font-style: italic;
    background: #FDECEA;
  }

  .category-tag {
    display: inline-block;
    padding: 4px 12px;
    background: linear-gradient(135deg, #FFF5E1 0%, #FFE8CC 100%);
    color: #E67E22;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
    margin-top: 12px;
  }

  @media (max-width: 768px) {
    .recipe-name {
      font-size: 18px;
    }

    .match-percentage {
      font-size: 26px;
    }

    .recommended-badge {
      width: 40px;
      height: 40px;
      font-size: 18px;
    }

    .card-header.recommended {
      padding-left: 48px;
    }
  }
`;

function RecipeCard({
  recipe,
  isFavorite,
  isRecommended,
  onFavoriteToggle,
  onClick
}: RecipeCardProps) {
  const [isPulsing, setIsPulsing] = useState(false);
  const stylesInjected = useState(false);

  if (!stylesInjected[0]) {
    const styleElement = document.createElement('style');
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);
    stylesInjected[1](true);
  }

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newFavorited = !isFavorite;
    if (newFavorited) {
      setIsPulsing(true);
      setTimeout(() => setIsPulsing(false), 300);
    }
    onFavoriteToggle(recipe.id, newFavorited);
  };

  return (
    <div className="recipe-card" onClick={onClick}>
      {isRecommended && <div className="recommended-badge">⭐</div>}

      <button
        className={`favorite-btn ${isFavorite ? 'active' : ''} ${
          isPulsing ? 'pulsing' : ''
        }`}
        onClick={handleFavoriteClick}
        aria-label={isFavorite ? '取消收藏' : '收藏'}
      >
        {isFavorite ? '♥' : '♡'}
      </button>

      <div
        className={`card-header ${isRecommended ? 'recommended' : ''}`}
      >
        <h3 className="recipe-name">{recipe.name}</h3>
        <div className="match-percentage">{recipe.matchPercentage}%</div>
      </div>

      <div className="card-body">
        <div className="ingredients-title">所需食材</div>
        <div className="ingredients-preview">
          {recipe.ingredients.slice(0, 5).map((ing, idx) => {
            const isMissing = recipe.missingIngredients.includes(ing.name);
            return (
              <span
                key={idx}
                className={`ingredient-chip ${
                  isMissing ? 'missing' : ''
                }`}
              >
                {ing.name}
              </span>
            );
          })}
          {recipe.ingredients.length > 5 && (
            <span className="ingredient-chip">
              +{recipe.ingredients.length - 5}
            </span>
          )}
        </div>

        <div className="category-tag">{recipe.category}</div>
      </div>
    </div>
  );
}

export default RecipeCard;
