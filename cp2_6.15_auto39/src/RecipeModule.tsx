import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import type { Recipe } from './types';

export default function RecipeModule() {
  const navigate = useNavigate();
  const { id } = useParams();
  const detailId = id ? Number(id) : null;

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [scales, setScales] = useState<Record<number, number>>({});
  const [detailRecipe, setDetailRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [highlightIngredient, setHighlightIngredient] = useState<number | null>(null);
  const searchTimer = useRef<number | null>(null);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = window.setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [search]);

  useEffect(() => {
    fetch(`/api/recipes${debouncedSearch ? `?search=${encodeURIComponent(debouncedSearch)}` : ''}`)
      .then((r) => r.json())
      .then((data) => {
        setRecipes(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [debouncedSearch]);

  useEffect(() => {
    if (detailId) {
      fetch(`/api/recipes/${detailId}`)
        .then((r) => r.json())
        .then((data) => {
          setDetailRecipe(data);
          setScales((prev) => ({ ...prev, [detailId]: prev[detailId] ?? 100 }));
        });
    }
  }, [detailId]);

  const filteredRecipes = useMemo(() => {
    if (!debouncedSearch) return recipes;
    const kw = debouncedSearch.toLowerCase();
    return recipes.filter(
      (r) =>
        r.name.toLowerCase().includes(kw) ||
        r.ingredients.some((ing) => ing.name.toLowerCase().includes(kw)),
    );
  }, [recipes, debouncedSearch]);

  const toggleSelect = (rid: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(rid)) next.delete(rid);
      else next.add(rid);
      return next;
    });
  };

  const handleRate = async (rid: number, rating: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const res = await fetch(`/api/recipes/${rid}/rating`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating }),
    });
    if (res.ok) {
      const updated = await res.json();
      setRecipes((prev) => prev.map((r) => (r.id === rid ? updated : r)));
    }
  };

  const handleFavorite = async (rid: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const res = await fetch(`/api/recipes/${rid}/favorite`, { method: 'PATCH' });
    if (res.ok) {
      const updated = await res.json();
      setRecipes((prev) => prev.map((r) => (r.id === rid ? updated : r)));
      if (detailRecipe && detailRecipe.id === rid) setDetailRecipe(updated);
    }
  };

  const handleScale = (rid: number, value: number) => {
    setScales((prev) => ({ ...prev, [rid]: value }));
  };

  const generateGrocery = async () => {
    if (selectedIds.size === 0) return;
    const selectedScales: Record<number, number> = {};
    selectedIds.forEach((rid) => {
      selectedScales[rid] = (scales[rid] ?? 100) / 100;
    });
    const res = await fetch('/api/grocery/aggregate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipeIds: Array.from(selectedIds), scales: selectedScales }),
    });
    if (res.ok) {
      const data = await res.json();
      navigate(`/grocery?listId=${data.listId}`);
    }
  };

  const renderStars = (recipe: Recipe) => {
    const stars = [];
    const rounded = Math.round(recipe.rating);
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span
          key={i}
          className={'star' + (i <= rounded ? ' filled' : '')}
          onClick={(e) => handleRate(recipe.id, i, e)}
        >
          ★
        </span>,
      );
    }
    return <div className="star-rating">{stars}</div>;
  };

  if (detailId && detailRecipe) {
    const scalePercent = scales[detailId] ?? 100;
    return (
      <div>
        <Link to="/" className="back-link">← 返回菜谱列表</Link>
        <div className="detail-header">
          <img src={detailRecipe.thumbnail} alt={detailRecipe.name} />
          <div className="detail-header-info">
            <h2>{detailRecipe.name}</h2>
            <p>作者：{detailRecipe.author}</p>
            {renderStars(detailRecipe)}
          </div>
          <button
            className="favorite-btn"
            onClick={(e) => handleFavorite(detailRecipe.id, e)}
            style={{ marginLeft: 'auto' }}
          >
            <span className={'heart-icon' + (detailRecipe.isFavorite ? ' filled' : '')}>
              {detailRecipe.isFavorite ? '♥' : '♡'}
            </span>
          </button>
        </div>

        <div className="recipe-detail">
          <div className="detail-panel">
            <div className="panel-title">烹饪步骤</div>
            <ol className="step-list">
              {detailRecipe.steps.map((step) => (
                <li key={step.order} className="step-item">
                  <span className="step-number">{step.order}</span>
                  <span className="step-description">{step.description}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="detail-panel">
            <div className="panel-title">食材清单</div>
            <div className="recipe-scale-section">
              <label>整体用量调整：{scalePercent}%</label>
              <input
                type="range"
                min={1}
                max={500}
                value={scalePercent}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  handleScale(detailId, v);
                  setHighlightIngredient(-1);
                  setTimeout(() => setHighlightIngredient(null), 300);
                }}
                className="scale-slider"
              />
              <div className="scale-label">
                <span>1%</span>
                <span>500%</span>
              </div>
            </div>
            <div style={{ height: 16 }} />
            <div className="ingredient-list">
              {detailRecipe.ingredients.map((ing) => {
                const adjustedQ = (ing.quantity * scalePercent) / 100;
                return (
                  <div key={ing.id} className="ingredient-item">
                    <div className="ingredient-header">
                      <span className="ingredient-name">{ing.name}</span>
                      <span
                        className={
                          'ingredient-quantity' + (highlightIngredient !== null ? ' highlight' : '')
                        }
                      >
                        {adjustedQ.toFixed(ing.unit === '个' || ing.unit === '只' ? 0 : 1)} {ing.unit}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="selected-info">
          <span className="selected-info-text">
            {selectedIds.has(detailId) ? '✓ 已选中此菜谱加入清单' : '点击下方按钮将此菜谱加入购物清单'}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-secondary"
              onClick={(e) => toggleSelect(detailId, e)}
            >
              {selectedIds.has(detailId) ? '取消选中' : '选中此菜谱'}
            </button>
            <button
              className="btn"
              disabled={selectedIds.size === 0}
              onClick={generateGrocery}
            >
              🛒 生成购物清单（{selectedIds.size}个）
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">菜谱管理</div>
        <div className="page-subtitle">浏览、收藏并管理你的美食菜谱</div>
      </div>

      <div className="search-bar">
        <span className="search-icon">🔍</span>
        <input
          placeholder="搜索菜名或食材..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {selectedIds.size > 0 && (
        <div className="selected-info">
          <span className="selected-info-text">已选择 {selectedIds.size} 个菜谱</span>
          <button className="btn" onClick={generateGrocery}>
            🛒 生成购物清单
          </button>
        </div>
      )}

      {loading ? (
        <div className="empty-state"><h3>加载中...</h3></div>
      ) : filteredRecipes.length === 0 ? (
        <div className="empty-state">
          <h3>暂无菜谱</h3>
          <p>试试其他关键词搜索吧</p>
        </div>
      ) : (
        <div className="recipe-grid">
          {filteredRecipes.map((recipe) => (
            <div
              key={recipe.id}
              className={'recipe-card' + (selectedIds.has(recipe.id) ? ' selected' : '')}
              onClick={() => navigate(`/recipe/${recipe.id}`)}
            >
              <input
                type="checkbox"
                className="recipe-card-checkbox"
                checked={selectedIds.has(recipe.id)}
                onChange={(e) => toggleSelect(recipe.id, e as any)}
                onClick={(e) => e.stopPropagation()}
              />
              <img src={recipe.thumbnail} alt={recipe.name} className="recipe-thumbnail" />
              <div className="recipe-card-body">
                <div className="recipe-name">{recipe.name}</div>
                <div className="recipe-author">by {recipe.author}</div>
                <div className="recipe-card-footer">
                  {renderStars(recipe)}
                  <button className="favorite-btn" onClick={(e) => handleFavorite(recipe.id, e)}>
                    <span className={'heart-icon' + (recipe.isFavorite ? ' filled' : '')}>
                      {recipe.isFavorite ? '♥' : '♡'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
