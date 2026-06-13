import { useState, useEffect, useCallback, useRef } from 'react';
import { getFavorites, removeFavorite, type Recipe } from './utils/api';

interface FavoritesPageProps {
  onRecipeClick: (recipeId: string) => void;
}

export default function FavoritesPage({ onRecipeClick }: FavoritesPageProps) {
  const [favorites, setFavorites] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const leftColRef = useRef<HTMLDivElement>(null);
  const rightColRef = useRef<HTMLDivElement>(null);

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

  const distributeCards = useCallback(() => {
    const left: Recipe[] = [];
    const right: Recipe[] = [];
    let leftH = 0;
    let rightH = 0;
    favorites.forEach(recipe => {
      const estHeight = 60 + Math.ceil(recipe.ingredients.length / 3) * 28 + 30;
      if (leftH <= rightH) {
        left.push(recipe);
        leftH += estHeight + 16;
      } else {
        right.push(recipe);
        rightH += estHeight + 16;
      }
    });
    return { left, right };
  }, [favorites]);

  const { left, right } = distributeCards();

  const renderCard = (recipe: Recipe) => (
    <div
      key={recipe.id}
      className="waterfall-card"
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
      <div className="masonry-grid">
        <div className="masonry-col" ref={leftColRef}>
          {left.map(renderCard)}
        </div>
        <div className="masonry-col" ref={rightColRef}>
          {right.map(renderCard)}
        </div>
      </div>
    </div>
  );
}
