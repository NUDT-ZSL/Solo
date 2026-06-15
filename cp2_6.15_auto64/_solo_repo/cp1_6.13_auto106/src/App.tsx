import { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { recipeApi } from './api/recipes';
import type { Recipe } from './types';
import RecipeCard from './components/RecipeCard';
import IngredientInput from './components/IngredientInput';
import SkeletonCard from './components/SkeletonCard';
import Masonry from './components/Masonry';
import './App.css';

const RecipeDetail = lazy(() => import('./components/RecipeDetail'));
const CreateRecipe = lazy(() => import('./components/CreateRecipe'));

export default function App() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [searchIngredients, setSearchIngredients] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [currentView, setCurrentView] = useState<'home' | 'create'>('home');
  const [viewTransition, setViewTransition] = useState(false);

  const loadAllRecipes = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await recipeApi.getAll();
      setRecipes(data);
    } catch (err) {
      console.error('加载菜谱失败:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const searchRecipes = useCallback(async (ingredients: string[]) => {
    if (ingredients.length === 0) {
      loadAllRecipes();
      return;
    }

    setIsSearching(true);
    try {
      const startTime = performance.now();
      const data = await recipeApi.searchByIngredients(ingredients);
      const totalDuration = performance.now() - startTime;

      console.group(`🔍 搜索性能监控 - ${new Date().toLocaleTimeString()}`);
      console.log(`输入食材: [${ingredients.join(', ')}]`);
      console.log(`匹配菜谱数: ${data.length}`);
      console.log(`总响应时间: ${totalDuration.toFixed(2)}ms`);
      console.log(`目标: ≤300ms - ${totalDuration <= 300 ? '✅ 达标' : '⚠️ 超时'}`);
      console.groupEnd();

      setRecipes(data);
    } catch (err) {
      console.error('搜索菜谱失败:', err);
    } finally {
      setIsSearching(false);
    }
  }, [loadAllRecipes]);

  useEffect(() => {
    loadAllRecipes();
  }, [loadAllRecipes]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      searchRecipes(searchIngredients);
    }, 300);
    return () => clearTimeout(debounce);
  }, [searchIngredients, searchRecipes]);

  const handleToggleFavorite = useCallback(async (id: string, favorite: boolean) => {
    try {
      await recipeApi.toggleFavorite(id, favorite);
      setRecipes((prev) =>
        prev.map((r) => (r._id === id ? { ...r, favorite } : r))
      );
      if (selectedRecipe?._id === id) {
        setSelectedRecipe({ ...selectedRecipe, favorite });
      }
    } catch (err) {
      console.error('收藏操作失败:', err);
    }
  }, [selectedRecipe]);

  const handleRecipeCreated = useCallback((recipe: Recipe) => {
    setRecipes((prev) => [recipe, ...prev]);
    setShowCreate(false);
    navigateTo('home');
  }, []);

  const navigateTo = (view: 'home' | 'create') => {
    setViewTransition(true);
    setTimeout(() => {
      setCurrentView(view);
      setTimeout(() => setViewTransition(false), 100);
    }, 150);
  };

  const openCreate = () => {
    setShowCreate(true);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-inner">
          <div className="app-logo">
            <span className="logo-icon">🍳</span>
            <h1 className="app-title">RecipeLab</h1>
          </div>
          <button className="create-btn" onClick={openCreate}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            创建菜谱
          </button>
        </div>
      </header>

      <main className="app-main">
        <div className="hero-section">
          <h2 className="hero-title">用冰箱里的食材，做一顿美味大餐</h2>
          <p className="hero-subtitle">输入你现有的食材，AI为你智能匹配可以做的菜谱</p>
          <div className="search-section">
            <label className="search-label">我有这些食材：</label>
            <IngredientInput
              ingredients={searchIngredients}
              onChange={setSearchIngredients}
              placeholder="如：鸡蛋、番茄、土豆（按回车添加）"
            />
            {searchIngredients.length > 0 && (
              <button
                className="clear-btn"
                onClick={() => setSearchIngredients([])}
              >
                清空搜索
              </button>
            )}
          </div>
        </div>

        <div className="content-section">
          <div
            className={`view-container ${viewTransition ? 'view-transitioning' : ''}`}
            style={{
              willChange: 'opacity, transform',
              transform: 'translateZ(0)',
            }}
          >
            {currentView === 'home' && (
              <>
                <div className="section-header">
                  <h3 className="section-title">
                    {searchIngredients.length > 0
                      ? `匹配到 ${recipes.length} 个菜谱`
                      : '全部菜谱'}
                  </h3>
                </div>

                {isLoading || isSearching ? (
                  <div className="skeleton-grid">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <SkeletonCard key={i} />
                    ))}
                  </div>
                ) : recipes.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">🥘</div>
                    <p className="empty-title">暂无匹配的菜谱</p>
                    <p className="empty-desc">试试添加更多食材，或者创建一个新菜谱吧</p>
                    <button className="btn-primary" onClick={openCreate}>
                      创建第一个菜谱
                    </button>
                  </div>
                ) : (
                  <Masonry columnGap={20} rowGap={20}>
                    {recipes.map((recipe) => (
                      <RecipeCard
                        key={recipe._id}
                        recipe={recipe}
                        onToggleFavorite={handleToggleFavorite}
                        onClick={() => setSelectedRecipe(recipe)}
                      />
                    ))}
                  </Masonry>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      <Suspense fallback={
        <div className="modal-loading" style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2000, color: '#fff', fontSize: '16px'
        }}>
          加载中...
        </div>
      }>
        {selectedRecipe && (
          <RecipeDetail recipe={selectedRecipe} onClose={() => setSelectedRecipe(null)} />
        )}
        {showCreate && (
          <CreateRecipe
            onClose={() => setShowCreate(false)}
            onCreated={handleRecipeCreated}
          />
        )}
      </Suspense>

      <footer className="app-footer">
        <p>© 2024 RecipeLab · 让家庭烹饪更简单</p>
      </footer>
    </div>
  );
}
