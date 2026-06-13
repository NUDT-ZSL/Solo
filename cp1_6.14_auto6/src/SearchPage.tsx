import { useState, useCallback } from 'react';
import { searchRecipes, addFavorite, removeFavorite, checkFavorite, type Recipe } from './utils/api';

interface SearchPageProps {
  onRecipeClick: (recipeId: string) => void;
}

export default function SearchPage({ onRecipeClick }: SearchPageProps) {
  const [input, setInput] = useState('');
  const [results, setResults] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [favoriteMap, setFavoriteMap] = useState<Record<string, boolean>>({});

  const handleSearch = useCallback(async () => {
    if (!input.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const recipes = await searchRecipes(input.trim());
      setResults(recipes);
      const favChecks = await Promise.all(
        recipes.map(r => checkFavorite(r.id).then(res => ({ id: r.id, favorited: res.favorited })))
      );
      const map: Record<string, boolean> = {};
      favChecks.forEach(f => { map[f.id] = f.favorited; });
      setFavoriteMap(map);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [input]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  }, [handleSearch]);

  const toggleFavorite = useCallback(async (e: React.MouseEvent, recipeId: string) => {
    e.stopPropagation();
    const isFav = favoriteMap[recipeId];
    if (isFav) {
      await removeFavorite(recipeId);
    } else {
      await addFavorite(recipeId);
    }
    setFavoriteMap(prev => ({ ...prev, [recipeId]: !isFav }));
  }, [favoriteMap]);

  return (
    <div className="search-container">
      <div className="search-input-wrapper">
        <input
          className="search-input"
          type="text"
          placeholder="输入食材，用逗号分隔（如：鸡肉、洋葱、番茄）"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button className="search-button" onClick={handleSearch} disabled={loading}>
          {loading ? '搜索中...' : '🔍 搜索菜谱'}
        </button>
      </div>

      {!searched && (
        <div className="empty-state">
          <div className="empty-state-icon">🍳</div>
          <div className="empty-state-text">输入冰箱里的食材，为你推荐合适的菜谱</div>
        </div>
      )}

      {searched && results.length === 0 && !loading && (
        <div className="empty-state">
          <div className="empty-state-icon">😕</div>
          <div className="empty-state-text">没有找到匹配的菜谱，试试其他食材吧</div>
        </div>
      )}

      <div className="recipe-grid">
        {results.map(recipe => (
          <div
            key={recipe.id}
            className="recipe-card"
            onClick={() => onRecipeClick(recipe.id)}
          >
            <div className="recipe-card-header">
              <div className="recipe-name">{recipe.name}</div>
              <button
                className={`favorite-btn ${favoriteMap[recipe.id] ? 'favorited' : ''}`}
                onClick={e => toggleFavorite(e, recipe.id)}
              >
                {favoriteMap[recipe.id] ? '★' : '☆'}
              </button>
            </div>
            <div className="recipe-ingredients">
              {recipe.ingredients.map(ing => (
                <span key={ing.name} className="ingredient-tag">{ing.name}</span>
              ))}
            </div>
            <div className="match-percentage">
              匹配度 {recipe.matchPercentage}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
