import { useState, useEffect, useCallback } from 'react';
import { getFavorites, removeFavorite, type Recipe } from './utils/api';

interface FavoritesPageProps {
  onRecipeClick: (recipeId: string) => void;
}

export default function FavoritesPage({ onRecipeClick }: FavoritesPageProps) {
  const [favorites, setFavorites] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFavorites = useCallback(async () => {
    setLoading(true);
    try {
      const favs = await getFavorites();
      setFavorites(favs);
    } catch {
      setFavorites([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const handleUnfavorite = useCallback(async (e: React.MouseEvent, recipeId: string) => {
    e.stopPropagation();
    await removeFavorite(recipeId);
    setFavorites(prev => prev.filter(r => r.id !== recipeId));
  }, []);

  const renderCard = (recipe: Recipe) => (
    <div
      key={recipe.id}
      className="masonry-item waterfall-card"
      onClick={() => onRecipeClick(recipe.id)}
    >
      {recipe.hasNote && <div className="note-badge">有笔记</div>}
      <div className="waterfall-card-header">
        <div className="recipe-name">{recipe.name}</div>
        <button
          className="favorite-btn favorited"
          onClick={e => handleUnfavorite(e, recipe.id)}
        >
          ★
        </button>
      </div>
      <div className="recipe-ingredients">
        {recipe.ingredients.map(ing => (
          <span key={ing.name} className="ingredient-tag">{ing.name}</span>
        ))}
      </div>
    </div>
  );

  if (loading) {
    return <div className="empty-state"><div className="empty-state-icon">⏳</div><div className="empty-state-text">加载中...</div></div>;
  }

  if (favorites.length === 0) {
    return (
      <div className="favorites-container">
        <div className="empty-state">
          <div className="empty-state-icon">💝</div>
          <div className="empty-state-text">还没有收藏的菜谱，去搜索页添加吧</div>
        </div>
      </div>
    );
  }

  return (
    <div className="favorites-container">
      <div className="masonry-container">
        {favorites.map(renderCard)}
      </div>
    </div>
  );
}
