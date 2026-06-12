import React, { useState } from 'react';
import { Recipe } from '../types';
import './RecipeCard.css';

interface RecipeCardProps {
  recipe: Recipe;
  onClick?: () => void;
  index?: number;
  isNew?: boolean;
}

const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, onClick, index = 0, isNew = false }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      setIsExpanded(!isExpanded);
    }
  };

  const renderStars = (difficulty: number) => {
    return (
      <div className="stars">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`star ${star <= difficulty ? 'filled' : ''}`}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  const getFirstIngredient = () => {
    if (recipe.ingredients && recipe.ingredients.length > 0) {
      return recipe.ingredients[0];
    }
    return '美食';
  };

  return (
    <div
      className={`recipe-card ${isExpanded ? 'expanded' : ''} ${isNew ? 'new-card' : ''}`}
      style={{ animationDelay: `${index * 0.1}s` }}
      onClick={handleClick}
    >
      <div className="card-thumbnail">
        <div className="thumbnail-placeholder">
          <span className="food-icon">🍳</span>
        </div>
      </div>

      <div className="card-content">
        <h3 className="card-title">{recipe.title}</h3>
        
        <div className="card-meta">
          <div className="author-info">
            <div className="author-avatar">{recipe.author.charAt(0).toUpperCase()}</div>
            <span className="author-name">{recipe.author}</span>
          </div>
          {renderStars(recipe.difficulty)}
        </div>

        <p className="card-description">
          {recipe.description || '美味的家常菜肴，简单易做'}
        </p>

        <div className="card-stats">
          <span className="stat-item">
            🥗 {recipe.ingredients?.length || 0} 种食材
          </span>
          <span className="stat-item">
            📝 {recipe.steps?.length || 0} 个步骤
          </span>
        </div>
      </div>

      {isExpanded && (
        <div className="card-detail-panel">
          <div className="detail-section">
            <h4>食材清单</h4>
            <ul className="ingredient-list">
              {recipe.ingredients?.map((ing, idx) => (
                <li key={idx}>• {ing}</li>
              ))}
            </ul>
          </div>
          <div className="detail-section">
            <h4>烹饪步骤</h4>
            <ol className="step-list">
              {recipe.steps?.map((step, idx) => (
                <li key={idx}>{step}</li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecipeCard;
