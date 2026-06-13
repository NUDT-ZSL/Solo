import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface RecommendRecipe {
  id: string;
  name: string;
  description: string;
  category: string;
  cookTime: string;
  ingredients: string[];
  gradient: string;
  rating: number;
  matchedIngredients: string[];
  matchCount: number;
}

const SmartSearch: React.FC = () => {
  const [inputValue, setInputValue] = useState('');
  const [results, setResults] = useState<RecommendRecipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const navigate = useNavigate();

  const handleSearch = useCallback(async () => {
    const ingredients = inputValue
      .split(/[,，]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (ingredients.length === 0) return;

    setLoading(true);
    setSearched(true);
    try {
      const res = await axios.post('/api/recommend', { ingredients });
      setResults(res.data);
    } catch (err) {
      console.error('Failed to get recommendations:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [inputValue]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleSearch();
    },
    [handleSearch]
  );

  const renderIngredient = useCallback(
    (ingredient: string, matchedIngredients: string[]) => {
      const isMatched = matchedIngredients.some(
        (m) => m.toLowerCase() === ingredient.toLowerCase()
      );
      if (isMatched) {
        return (
          <span key={ingredient} className="match-highlight">
            {ingredient}
          </span>
        );
      }
      return <span key={ingredient}>{ingredient}</span>;
    },
    []
  );

  return (
    <div className="smart-search-container">
      <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>🔍 智能推荐</h2>
      <p style={{ color: 'var(--text-light)', marginBottom: 20, fontSize: 14 }}>
        输入你冰箱里的食材，为你推荐可做的菜品
      </p>

      <div className="smart-input-group">
        <input
          className="smart-input"
          type="text"
          placeholder="输入食材，用逗号分隔，如：鸡肉,洋葱,土豆"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button className="smart-btn" onClick={handleSearch} disabled={loading || !inputValue.trim()}>
          {loading ? '搜索中...' : '推荐食谱'}
        </button>
      </div>

      {loading && <div className="loading-spinner">正在匹配食谱...</div>}

      {!loading && searched && results.length === 0 && (
        <div className="empty-state">
          没有找到包含这些食材的食谱，试试其他食材吧
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="recommend-result">
          <p style={{ color: 'var(--text-light)', marginBottom: 16, fontSize: 14 }}>
            为你找到 {results.length} 个推荐食谱，匹配食材已<span className="match-highlight">高亮</span>显示
          </p>
          {results.map((recipe) => (
            <div
              key={recipe.id}
              className="recommend-item"
              onClick={() => navigate(`/recipe/${recipe.id}`)}
            >
              <div className="recommend-image" style={{ background: recipe.gradient }} />
              <div className="recommend-info">
                <div className="recommend-name">{recipe.name}</div>
                <div className="recommend-match">
                  匹配 {recipe.matchCount} 种食材 · ⏱ {recipe.cookTime} · ⭐ {recipe.rating.toFixed(1)}
                </div>
                <div className="recommend-ingredients">
                  {recipe.ingredients.map((ing, idx) => (
                    <React.Fragment key={ing}>
                      {idx > 0 ? ' · ' : ''}
                      {renderIngredient(ing, recipe.matchedIngredients)}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SmartSearch;
