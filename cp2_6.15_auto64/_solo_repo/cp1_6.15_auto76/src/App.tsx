import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { Recipe, User, FilterOptions } from './business/RecipeEngine';
import { filterRecipes } from './business/RecipeEngine';
import RecipeCard from './components/RecipeCard';
import RecipeDetail from './components/RecipeDetail';

const CUISINE_OPTIONS = ['中餐', '西餐', '日料', '烘焙'];
const COOKING_TIME_OPTIONS = [
  { label: '<15分钟', value: '<15' },
  { label: '15-30分钟', value: '15-30' },
  { label: '>30分钟', value: '>30' },
];

const App: React.FC = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [navbarScrolled, setNavbarScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterOptions>({});
  const [isTransitioning, setIsTransitioning] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const handleScroll = () => {
      setNavbarScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [recipesRes, usersRes] = await Promise.all([
          fetch('/api/recipes'),
          fetch('/api/users'),
        ]);
        const recipesData = await recipesRes.json();
        const usersData = await usersRes.json();
        setRecipes(recipesData.recipes || []);
        setUsers(usersData || []);
      } catch {
        setRecipes([]);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredRecipes = useMemo(() => {
    const allFilters: FilterOptions = {
      ...filters,
      search: searchQuery,
    };
    return filterRecipes(recipes, allFilters);
  }, [recipes, filters, searchQuery]);

  const getUserById = useCallback((id: string) => users.find((u) => u.id === id), [users]);

  const selectedRecipe = useMemo(
    () => (selectedRecipeId ? recipes.find((r) => r.id === selectedRecipeId) : null),
    [selectedRecipeId, recipes]
  );

  const handleCardClick = useCallback((id: string) => {
    setSelectedRecipeId(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleBack = useCallback(() => {
    setSelectedRecipeId(null);
  }, []);

  const handleRate = useCallback(async (recipeId: string, rating: number) => {
    try {
      const res = await fetch(`/api/recipes/${recipeId}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating }),
      });
      const data = await res.json();
      setRecipes((prev) =>
        prev.map((r) =>
          r.id === recipeId
            ? { ...r, ratings: [...r.ratings, rating] }
            : r
        )
      );
    } catch {}
  }, []);

  const handleAddComment = useCallback(async (recipeId: string, content: string) => {
    try {
      const currentUser = users[0];
      const res = await fetch(`/api/recipes/${recipeId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser?.id || 'user-1', content }),
      });
      const newComment = await res.json();
      setRecipes((prev) =>
        prev.map((r) =>
          r.id === recipeId
            ? { ...r, comments: [newComment, ...r.comments] }
            : r
        )
      );
    } catch {}
  }, [users]);

  const handleFilterChange = useCallback((key: keyof FilterOptions, value: string) => {
    setIsTransitioning(true);
    setFilters((prev) => ({
      ...prev,
      [key]: prev[key] === value ? undefined : value,
    }));
    setTimeout(() => setIsTransitioning(false), 300);
  }, []);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setIsTransitioning(true);
      setSearchQuery(val);
      setTimeout(() => setIsTransitioning(false), 300);
    }, 150);
  }, []);

  if (loading) {
    return (
      <div className="loading-spinner">
        <span style={{ marginRight: 12 }}>🍲</span> 加载食谱中...
      </div>
    );
  }

  if (selectedRecipe && selectedRecipeId) {
    return (
      <>
        <nav className={`navbar ${navbarScrolled ? 'scrolled' : ''}`}>
          <div className="navbar-brand" onClick={handleBack} style={{ cursor: 'pointer' }}>
            <span className="navbar-brand-icon">🍳</span>
            <span>食谱分享</span>
          </div>
        </nav>
        <RecipeDetail
          recipe={selectedRecipe}
          author={getUserById(selectedRecipe.authorId)}
          users={users}
          onBack={handleBack}
          onRate={handleRate}
          onAddComment={handleAddComment}
        />
      </>
    );
  }

  return (
    <>
      <nav className={`navbar ${navbarScrolled ? 'scrolled' : ''}`}>
        <div className="navbar-brand">
          <span className="navbar-brand-icon">🍳</span>
          <span>食谱分享</span>
        </div>
        <div className="navbar-search">
          <span className="navbar-search-icon">🔍</span>
          <input
            type="text"
            placeholder="搜索食谱、食材..."
            onChange={handleSearchChange}
          />
        </div>
      </nav>

      <div style={{ height: 64 }} />

      <div className="filter-bar">
        <div className="filter-group">
          <span className="filter-label">菜系：</span>
          {CUISINE_OPTIONS.map((c) => (
            <button
              key={c}
              className={`filter-btn ${filters.cuisine === c ? 'active' : ''}`}
              onClick={() => handleFilterChange('cuisine', c)}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="filter-group">
          <span className="filter-label">烹饪时长：</span>
          {COOKING_TIME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`filter-btn ${filters.cookingTime === opt.value ? 'active' : ''}`}
              onClick={() => handleFilterChange('cookingTime', opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {(filters.cuisine || filters.cookingTime || searchQuery) && (
          <button
            className="filter-btn"
            style={{ borderColor: 'var(--accent-orange)', color: 'var(--accent-orange)' }}
            onClick={() => {
              setFilters({});
              setSearchQuery('');
              setIsTransitioning(true);
              setTimeout(() => setIsTransitioning(false), 300);
            }}
          >
            ✕ 清除筛选
          </button>
        )}
      </div>

      <div
        className="waterfall-container"
        style={{ opacity: isTransitioning ? 0.6 : 1 }}
      >
        {filteredRecipes.length === 0 ? (
          <div className="empty-state" style={{ columnSpan: 'all' }}>
            <div className="empty-state-icon">🔍</div>
            <div className="empty-state-text">没有找到匹配的食谱</div>
          </div>
        ) : (
          filteredRecipes.map((recipe, idx) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              author={getUserById(recipe.authorId)}
              onClick={handleCardClick}
              onRate={handleRate}
              index={idx}
            />
          ))
        )}
      </div>
    </>
  );
};

export default App;
