import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useFavorites } from '../context/FavoritesContext';

interface Recipe {
  id: string;
  name: string;
  description: string;
  category: string;
  cookTime: string;
  gradient: string;
  favorite: boolean;
  rating: number;
}

const categories = ['全部', '中式', '西式', '甜品', '汤羹'];

interface RecipeCardProps {
  recipe: Recipe;
  isFavorite: boolean;
  onClick: () => void;
}

const RecipeCard = React.memo(({ recipe, isFavorite, onClick }: RecipeCardProps) => (
  <div className="recipe-card" onClick={onClick}>
    {isFavorite && <div className="recipe-card-favorite">❤</div>}
    <div className="recipe-card-image" style={{ background: recipe.gradient }} />
    <div className="recipe-card-body">
      <div className="recipe-card-name">{recipe.name}</div>
      <div className="recipe-card-desc">{recipe.description}</div>
      <div className="recipe-card-meta">
        <span>⏱ {recipe.cookTime}</span>
        <span>⭐ {recipe.rating.toFixed(1)}</span>
        <span>{recipe.category}</span>
      </div>
    </div>
  </div>
));

RecipeCard.displayName = 'RecipeCard';

const RecipeList: React.FC = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [category, setCategory] = useState('全部');
  const navigate = useNavigate();
  const { initFavorites, isFavorite } = useFavorites();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedKeyword(keyword), 300);
    return () => clearTimeout(timer);
  }, [keyword]);

  useEffect(() => {
    const fetchRecipes = async () => {
      setLoading(true);
      try {
        const params: Record<string, string> = {};
        if (category !== '全部') params.category = category;
        if (debouncedKeyword) params.keyword = debouncedKeyword;
        const res = await axios.get('/api/recipes', { params });
        setRecipes(res.data);
        initFavorites(res.data);
      } catch (err) {
        console.error('Failed to fetch recipes:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRecipes();
  }, [category, debouncedKeyword, initFavorites]);

  const handleCardClick = useCallback(
    (id: string) => {
      navigate(`/recipe/${id}`);
    },
    [navigate]
  );

  return (
    <div>
      <div className="search-bar">
        <input
          className="search-input"
          type="text"
          placeholder="搜索食谱名称、食材..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <div className="category-tabs">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`category-tab${category === cat ? ' active' : ''}`}
              onClick={() => setCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner">加载中...</div>
      ) : recipes.length === 0 ? (
        <div className="empty-state">没有找到匹配的食谱</div>
      ) : (
        <div className="recipe-grid">
          {recipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              isFavorite={isFavorite(recipe.id)}
              onClick={() => handleCardClick(recipe.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default RecipeList;
