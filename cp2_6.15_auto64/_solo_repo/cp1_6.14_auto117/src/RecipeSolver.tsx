import React, { useState, useCallback } from 'react';
import { getRecipes } from './http';
import type { Recipe } from './types';

interface RecipeSolverProps {
  onRecipeClick: (id: number) => void;
  showToast: (type: 'success' | 'error', message: string) => void;
}

const RecipeSolver: React.FC<RecipeSolverProps> = ({ onRecipeClick, showToast }) => {
  const [searchInput, setSearchInput] = useState('');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = useCallback(async () => {
    const trimmed = searchInput.trim();
    if (!trimmed) {
      showToast('error', '请输入食材名称');
      return;
    }

    setLoading(true);
    try {
      const data = await getRecipes(trimmed);
      setRecipes(data);
      setHasSearched(true);
      if (data.length > 0) {
        showToast('success', `找到 ${data.length} 道匹配的菜谱`);
      } else {
        showToast('error', '没有找到匹配的菜谱，试试其他食材');
      }
    } catch {
      showToast('error', '获取菜谱失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, [searchInput, showToast]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <>
      <header className="app-header">
        <h1 className="app-title">RecipeSolver</h1>
        <p className="app-subtitle">输入家里现有的食材，为你推荐最合适的菜谱</p>
      </header>

      <section className="search-section">
        <input
          type="text"
          className="search-input"
          placeholder="输入食材，用逗号或空格分隔（如：番茄, 鸡蛋）"
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          className="search-btn"
          onClick={handleSearch}
          disabled={loading}
        >
          {loading ? '搜索中...' : '搜索菜谱'}
        </button>
      </section>

      {loading && <div className="loading-spinner" />}

      {!loading && hasSearched && recipes.length === 0 && (
        <div className="empty-state">
          <h3>没有找到匹配的菜谱</h3>
          <p>试试输入其他食材组合，如：土豆, 牛肉</p>
        </div>
      )}

      {!loading && recipes.length > 0 && (
        <div className="recipes-grid">
          {recipes.map(recipe => (
            <div
              key={recipe.id}
              className="recipe-card"
              onClick={() => onRecipeClick(recipe.id)}
            >
              <h3 className="recipe-name">{recipe.name}</h3>
              <div className="ingredient-tags">
                {recipe.matchedIngredients.map((ing, idx) => (
                  <span key={idx} className="ingredient-tag">
                    {ing}
                  </span>
                ))}
              </div>
              <div className="recipe-footer">
                <span className="match-score">匹配度 {recipe.matchScore}%</span>
                <button
                  className="view-detail-btn"
                  onClick={e => {
                    e.stopPropagation();
                    onRecipeClick(recipe.id);
                  }}
                >
                  查看详情
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!hasSearched && !loading && (
        <div className="empty-state">
          <h3>开始你的美食之旅</h3>
          <p>输入你家里现有的食材，我们会推荐最合适的菜谱</p>
        </div>
      )}
    </>
  );
};

export default RecipeSolver;
