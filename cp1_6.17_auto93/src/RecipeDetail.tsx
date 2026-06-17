import { useState } from 'react';
import { MatchResult } from './types';

interface RecipeDetailProps {
  matchResult: MatchResult;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onBack: () => void;
  onGenerateShoppingList: () => void;
}

function RecipeDetail({
  matchResult,
  isFavorite,
  onToggleFavorite,
  onBack,
  onGenerateShoppingList
}: RecipeDetailProps) {
  const { recipe, matchedIngredients, missingIngredients } = matchResult;
  const [favoriteAnimating, setFavoriteAnimating] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleFavoriteClick = () => {
    setFavoriteAnimating(true);
    setTimeout(() => setFavoriteAnimating(false), 300);
    onToggleFavorite();
  };

  const isIngredientMatched = (ingredientName: string): boolean => {
    return matchedIngredients.some(name =>
      name === ingredientName ||
      name.includes(ingredientName) ||
      ingredientName.includes(name)
    );
  };

  const isIngredientMissing = (ingredientName: string): boolean => {
    return missingIngredients.some(ing =>
      ing.name === ingredientName ||
      ing.name.includes(ingredientName) ||
      ingredientName.includes(ing.name)
    );
  };

  const getIngredientStatus = (ingredientName: string): 'matched' | 'missing' | 'unknown' => {
    if (isIngredientMatched(ingredientName)) return 'matched';
    if (isIngredientMissing(ingredientName)) return 'missing';
    return 'unknown';
  };

  return (
    <div className={`recipe-detail ${expanded ? 'expanded' : ''}`}>
      <div className="detail-header">
        <button className="btn back-btn ripple-btn" onClick={onBack}>
          ← 返回列表
        </button>
        <div className="detail-actions">
          <button
            className={`favorite-btn ${favoriteAnimating ? 'animating' : ''} ${isFavorite ? 'favorited' : ''}`}
            onClick={handleFavoriteClick}
            style={{ color: isFavorite ? '#E91E63' : '#BDBDBD' }}
          >
            <svg
              className="heart-icon"
              viewBox="0 0 24 24"
              fill={isFavorite ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            <span>{isFavorite ? '已收藏' : '收藏'}</span>
          </button>
          <button className="btn ripple-btn shopping-list-btn" onClick={onGenerateShoppingList}>
            🛒 加入购物清单
          </button>
        </div>
      </div>

      <div 
        className="detail-content-wrapper"
        ref={() => !expanded && setTimeout(() => setExpanded(true), 50)}
      >
        <div className="recipe-title-section">
          <h1>{recipe.name}</h1>
          <p className="recipe-description">{recipe.description}</p>
          <div className="match-summary">
            <div className="match-summary-item">
              <span className="summary-label">匹配度</span>
              <span className="summary-value" style={{ color: matchResult.matchPercentage >= 70 ? '#4CAF50' : '#FF9800' }}>
                {matchResult.matchPercentage}%
              </span>
            </div>
            <div className="match-summary-item">
              <span className="summary-label">已有食材</span>
              <span className="summary-value" style={{ color: '#4CAF50' }}>
                {matchedIngredients.length}/{recipe.ingredients.length}
              </span>
            </div>
            <div className="match-summary-item">
              <span className="summary-label">缺失食材</span>
              <span className="summary-value" style={{ color: '#F44336' }}>
                {missingIngredients.length}种
              </span>
            </div>
          </div>
        </div>

        <div className="detail-sections">
          <div className="detail-section ingredients-section">
            <h2>🥬 所需食材</h2>
            <div className="ingredients-list">
              {recipe.ingredients.map((ingredient, index) => {
                const status = getIngredientStatus(ingredient.name);
                return (
                  <div
                    key={index}
                    className={`ingredient-row ${status}`}
                    style={{
                      color: status === 'matched' ? '#4CAF50' : status === 'missing' ? '#F44336' : '#333'
                    }}
                  >
                    <span className="ingredient-status-icon">
                      {status === 'matched' ? '✓' : status === 'missing' ? '✗' : '•'}
                    </span>
                    <span className="ingredient-name">{ingredient.name}</span>
                    <span className="ingredient-qty">
                      {ingredient.quantity}{ingredient.unit || ''}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="detail-section steps-section">
            <h2>👨‍🍳 烹饪步骤</h2>
            <ol className="steps-list">
              {recipe.steps.map((step, index) => (
                <li key={index} className="step-item">
                  <span className="step-number">{index + 1}</span>
                  <span className="step-text">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RecipeDetail;
