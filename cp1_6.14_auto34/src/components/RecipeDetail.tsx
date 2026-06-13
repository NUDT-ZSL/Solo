import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useFavorites } from '../context/FavoritesContext';

interface Recipe {
  id: string;
  name: string;
  description: string;
  category: string;
  cookTime: string;
  ingredients: string[];
  steps: string[];
  rating: number;
  ratingCount: number;
  favorite: boolean;
  notes: string;
  gradient: string;
}

const RecipeDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [preparedSet, setPreparedSet] = useState<Set<string>>(new Set());
  const [userRating, setUserRating] = useState(0);
  const [noteText, setNoteText] = useState('');
  const [saving, setSaving] = useState(false);
  const { setFavorite, isFavorite, initFavorites } = useFavorites();

  useEffect(() => {
    if (!id) return;
    const fetchRecipe = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`/api/recipes/${id}`);
        setRecipe(res.data);
        setNoteText(res.data.notes || '');
        initFavorites([res.data]);
      } catch (err) {
        console.error('Failed to fetch recipe:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRecipe();
  }, [id, initFavorites]);

  const toggleIngredient = useCallback((ingredient: string) => {
    setPreparedSet((prev) => {
      const next = new Set(prev);
      if (next.has(ingredient)) {
        next.delete(ingredient);
      } else {
        next.add(ingredient);
      }
      return next;
    });
  }, []);

  const handleRating = useCallback(
    async (star: number) => {
      if (!recipe || saving) return;
      setUserRating(star);
      setSaving(true);
      try {
        const res = await axios.put(`/api/recipes/${recipe.id}`, { rating: star });
        setRecipe(res.data);
      } catch (err) {
        console.error('Failed to save rating:', err);
      } finally {
        setSaving(false);
      }
    },
    [recipe, saving]
  );

  const handleSaveNotes = useCallback(async () => {
    if (!recipe) return;
    try {
      const res = await axios.put(`/api/recipes/${recipe.id}`, { notes: noteText });
      setRecipe(res.data);
    } catch (err) {
      console.error('Failed to save notes:', err);
    }
  }, [recipe, noteText]);

  const handleToggleFavorite = useCallback(async () => {
    if (!recipe) return;
    const nextValue = !isFavorite(recipe.id);
    setFavorite(recipe.id, nextValue);
    try {
      const res = await axios.put(`/api/recipes/${recipe.id}`, {
        favorite: nextValue,
      });
      setRecipe(res.data);
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
      setFavorite(recipe.id, !nextValue);
    }
  }, [recipe, isFavorite, setFavorite]);

  const favorited = recipe ? isFavorite(recipe.id) : false;

  if (loading) {
    return <div className="loading-spinner">加载中...</div>;
  }

  if (!recipe) {
    return <div className="empty-state">食谱未找到</div>;
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => navigate(-1)}
        style={{
          marginBottom: 16,
          padding: '6px 14px',
          background: 'var(--secondary)',
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 500,
          color: 'var(--primary-dark)',
        }}
      >
        ← 返回
      </button>

      <div className="detail-layout">
        <div className="detail-image-section" style={{ background: recipe.gradient }} />

        <div className="detail-text-section" style={{ position: 'relative' }}>
          <button
            className={`detail-favorite-btn${favorited ? ' favorited' : ''}`}
            onClick={handleToggleFavorite}
            title={favorited ? '取消收藏' : '收藏'}
          >
            {favorited ? '❤️' : '🤍'}
          </button>

          <h1 className="detail-title">{recipe.name}</h1>
          <p className="detail-desc">{recipe.description}</p>
          <div className="recipe-card-meta" style={{ marginBottom: 12 }}>
            <span>⏱ {recipe.cookTime}</span>
            <span>⭐ {recipe.rating.toFixed(1)} ({recipe.ratingCount}人评)</span>
            <span>{recipe.category}</span>
          </div>

          <h3 className="detail-section-title">用料</h3>
          <ul className="ingredient-list">
            {recipe.ingredients.map((ing, idx) => (
              <li key={idx} className="ingredient-item">
                <div
                  className={`ingredient-check${preparedSet.has(ing) ? ' checked' : ''}`}
                  onClick={() => toggleIngredient(ing)}
                >
                  {preparedSet.has(ing) ? '✓' : ''}
                </div>
                <span className={`ingredient-name${preparedSet.has(ing) ? ' prepared' : ''}`}>
                  {ing}
                </span>
              </li>
            ))}
          </ul>

          <h3 className="detail-section-title">步骤</h3>
          <ol className="step-list">
            {recipe.steps.map((step, idx) => (
              <li key={idx} className="step-item">
                <span className="step-dot">{idx + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>

          <h3 className="detail-section-title">评分</h3>
          <div className="star-rating">
            {[1, 2, 3, 4, 5].map((star) => (
              <span
                key={star}
                className={`star${star <= (userRating || Math.round(recipe.rating)) ? ' filled' : ''}`}
                onClick={() => handleRating(star)}
              >
                ★
              </span>
            ))}
          </div>

          <h3 className="detail-section-title">个人笔记</h3>
          <textarea
            className="note-area"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="记录你的烹饪心得..."
          />
          <button className="note-save-btn" onClick={handleSaveNotes}>
            保存笔记
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecipeDetail;
