import React from 'react';
import { Recipe } from './types';
import RecipeCard from './RecipeCard';

interface RecipeListProps {
  recipes: Recipe[];
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  onSelectRecipe: (recipe: Recipe) => void;
  searchKeyword: string;
}

const RecipeList: React.FC<RecipeListProps> = ({
  recipes,
  favorites,
  onToggleFavorite,
  onSelectRecipe,
  searchKeyword,
}) => {
  if (recipes.length === 0) {
    const suggestedKeywords = ['番茄', '牛肉', '蛋糕', '鸡蛋', '鸡肉'];
    return (
      <div className="empty-state">
        <div className="empty-illustration">
          <svg width="180" height="180" viewBox="0 0 200 200">
            <circle cx="100" cy="80" r="50" fill="#FFDAB9" />
            <circle cx="85" cy="75" r="5" fill="#333" />
            <circle cx="115" cy="75" r="5" fill="#333" />
            <path d="M85 95 Q100 105 115 95" stroke="#333" strokeWidth="3" fill="none" strokeLinecap="round" />
            <ellipse cx="100" cy="155" rx="55" ry="15" fill="#E67E22" />
            <ellipse cx="100" cy="150" rx="50" ry="12" fill="#FFF8F0" />
            <rect x="65" y="130" width="8" height="35" fill="#8B4513" rx="2" />
            <rect x="85" y="125" width="8" height="40" fill="#8B4513" rx="2" />
            <rect x="105" y="125" width="8" height="40" fill="#8B4513" rx="2" />
            <rect x="125" y="130" width="8" height="35" fill="#8B4513" rx="2" />
            <ellipse cx="100" cy="45" rx="35" ry="15" fill="#E67E22" />
            <rect x="75" y="20" width="50" height="25" fill="#E67E22" rx="5" />
            <ellipse cx="100" cy="20" rx="25" ry="8" fill="#F39C12" />
          </svg>
        </div>
        <h3 className="empty-title">没有找到匹配的食谱</h3>
        <p className="empty-message">试试其他食材组合吧</p>
        {searchKeyword && (
          <div className="suggest-keywords">
            <span>推荐搜索：</span>
            {suggestedKeywords.map(keyword => (
              <span key={keyword} className="suggest-tag">{keyword}</span>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="recipe-grid">
      {recipes.map(recipe => (
        <RecipeCard
          key={recipe.id}
          recipe={recipe}
          isFavorite={favorites.includes(recipe.id)}
          onToggleFavorite={onToggleFavorite}
          onClick={onSelectRecipe}
        />
      ))}
    </div>
  );
};

export default RecipeList;
