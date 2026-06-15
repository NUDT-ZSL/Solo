import { useState, useEffect, useRef, useCallback } from 'react';
import IngredientInput from './components/IngredientInput';
import RecipeCard from './components/RecipeCard';
import type { MatchedRecipe } from '../server/recipeMatcher';

interface FavoriteItem {
  recipeId: string;
  name: string;
  addedAt: string;
}

interface PaginatedFavorites {
  favorites: FavoriteItem[];
  total: number;
  hasMore: boolean;
  page: number;
  pageSize: number;
}

const styles = `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    background: linear-gradient(180deg, #FFF5E1 0%, #FFFFFF 100%);
    min-height: 100vh;
    color: #333;
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(100%);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  @keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.3); }
    100% { transform: scale(1); }
  }

  @keyframes starJump {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-3px); }
  }

  .app-container {
    display: flex;
    min-height: 100vh;
  }

  .main-content {
    flex: 1;
    padding: 24px;
    padding-right: 304px;
    transition: padding-right 0.3s ease;
  }

  .header {
    text-align: center;
    margin-bottom: 32px;
  }

  .header h1 {
    font-size: 36px;
    color: #E67E22;
    margin-bottom: 8px;
    font-weight: 700;
  }

  .header p {
    color: #888;
    font-size: 16px;
  }

  .search-section {
    margin-bottom: 32px;
  }

  .section-title {
    font-size: 20px;
    font-weight: 600;
    color: #E67E22;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .recommendations-section {
    margin-bottom: 32px;
  }

  .recipe-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
  }

  .sidebar {
    position: fixed;
    right: 0;
    top: 0;
    bottom: 0;
    width: 280px;
    background: #F5F5F5;
    padding: 24px 16px;
    overflow-y: auto;
    box-shadow: -2px 0 8px rgba(0, 0, 0, 0.05);
    transition: transform 0.3s ease;
    z-index: 100;
  }

  .sidebar h2 {
    font-size: 18px;
    color: #E67E22;
    margin-bottom: 16px;
    font-weight: 600;
  }

  .favorite-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .favorite-item {
    background: #fff;
    padding: 12px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 1px 3px rgba(230, 160, 70, 0.1);
  }

  .favorite-item:hover {
    transform: translateX(-2px);
    box-shadow: 0 2px 8px rgba(230, 160, 70, 0.2);
  }

  .favorite-item-name {
    font-weight: 500;
    color: #333;
    margin-bottom: 4px;
  }

  .favorite-item-date {
    font-size: 12px;
    color: #999;
  }

  .loading-more {
    text-align: center;
    padding: 16px;
    color: #999;
    font-size: 14px;
  }

  .mobile-bottom-bar {
    display: none;
  }

  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 20px;
  }

  .modal-content {
    background: #fff;
    border-radius: 16px;
    max-width: 600px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
    animation: slideUp 400ms ease-out;
    position: relative;
  }

  .modal-close {
    position: absolute;
    top: 16px;
    right: 16px;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: none;
    background: #f0f0f0;
    cursor: pointer;
    font-size: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.2s ease;
    z-index: 10;
  }

  .modal-close:hover {
    background: #e0e0e0;
  }

  .modal-close:active {
    transform: scale(0.95);
    transition: transform 100ms ease;
  }

  .modal-body {
    padding: 32px;
  }

  .modal-title {
    font-size: 28px;
    color: #E67E22;
    margin-bottom: 24px;
    font-weight: 700;
  }

  .modal-section {
    margin-bottom: 24px;
  }

  .modal-section h3 {
    font-size: 18px;
    color: #333;
    margin-bottom: 12px;
    font-weight: 600;
  }

  .ingredients-list {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px 16px;
  }

  .ingredient-item {
    display: flex;
    justify-content: space-between;
    padding: 8px 12px;
    background: #FFF9F0;
    border-radius: 6px;
  }

  .ingredient-item.missing {
    color: #E74C3C;
    font-style: italic;
  }

  .steps-list {
    counter-reset: step;
    list-style: none;
  }

  .steps-list li {
    counter-increment: step;
    padding-left: 40px;
    position: relative;
    margin-bottom: 12px;
    line-height: 1.6;
  }

  .steps-list li::before {
    content: counter(step);
    position: absolute;
    left: 0;
    top: 0;
    width: 28px;
    height: 28px;
    background: #E67E22;
    color: #fff;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 14px;
  }

  .rating-stars {
    display: flex;
    gap: 8px;
  }

  .star {
    font-size: 32px;
    cursor: pointer;
    color: #ddd;
    transition: color 0.2s ease;
    user-select: none;
  }

  .star.active {
    color: #FFD700;
    animation: starJump 0.3s ease;
  }

  .star:hover {
    transform: scale(1.1);
  }

  .star:active {
    transform: scale(0.95);
    transition: transform 100ms ease;
  }

  @media (max-width: 768px) {
    .main-content {
      padding: 16px;
      padding-bottom: 80px;
    }

    .recipe-grid {
      grid-template-columns: 1fr;
      gap: 16px;
    }

    .sidebar {
      transform: translateY(100%);
      width: 100%;
      height: calc(100vh - 60px);
      top: auto;
      bottom: 60px;
      border-radius: 16px 16px 0 0;
      box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.1);
    }

    .sidebar.mobile-open {
      transform: translateY(0);
    }

    .mobile-bottom-bar {
      display: flex;
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: 60px;
      background: #fff;
      box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
      align-items: center;
      justify-content: space-around;
      z-index: 99;
    }

    .mobile-bar-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex: 1;
      height: 100%;
      cursor: pointer;
      transition: background-color 0.2s ease;
    }

    .mobile-bar-item:hover {
      background: #f5f5f5;
    }

    .mobile-bar-item:active {
      transform: scale(0.95);
      transition: transform 100ms ease;
    }

    .mobile-bar-icon {
      font-size: 24px;
    }

    .mobile-bar-label {
      font-size: 12px;
      color: #666;
      margin-top: 2px;
    }

    .ingredients-list {
      grid-template-columns: 1fr;
    }

    .modal-body {
      padding: 20px;
    }

    .modal-title {
      font-size: 22px;
    }

    .header h1 {
      font-size: 28px;
    }
  }

  .empty-state {
    text-align: center;
    padding: 60px 20px;
    color: #999;
  }

  .empty-state-icon {
    font-size: 64px;
    margin-bottom: 16px;
  }
`;

function App() {
  const [recipes, setRecipes] = useState<MatchedRecipe[]>([]);
  const [recommendations, setRecommendations] = useState<MatchedRecipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<MatchedRecipe | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [hasMoreFavorites, setHasMoreFavorites] = useState(true);
  const [favoritesPage, setFavoritesPage] = useState(0);
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const sidebarRef = useRef<HTMLDivElement>(null);
  const throttleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    loadFavorites(0);
    fetchRecommendations();
  }, []);

  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  const loadFavorites = useCallback(async (page: number) => {
    if (isLoadingFavorites) return;
    setIsLoadingFavorites(true);
    try {
      const res = await fetch(`/api/preferences/favorites?page=${page}&pageSize=10`);
      const data: PaginatedFavorites = await res.json();
      if (page === 0) {
        setFavorites(data.favorites);
      } else {
        setFavorites((prev) => [...prev, ...data.favorites]);
      }
      setHasMoreFavorites(data.hasMore);
      setFavoritesPage(page);
      setFavoriteIds(new Set(data.favorites.map((f) => f.recipeId)));
    } catch (err) {
      console.error('Failed to load favorites:', err);
    } finally {
      setIsLoadingFavorites(false);
    }
  }, [isLoadingFavorites]);

  const fetchRecommendations = async () => {
    try {
      const res = await fetch('/api/recipes?ingredients=');
      const data = await res.json();
      setRecommendations(data.recommendations || []);
      if (data.preferences) {
        setRatings(data.preferences.ratings || {});
      }
    } catch (err) {
      console.error('Failed to fetch recommendations:', err);
    }
  };

  const handleSidebarScroll = useCallback(() => {
    if (throttleTimerRef.current) return;
    if (!sidebarRef.current || isLoadingFavorites || !hasMoreFavorites) return;
    const { scrollTop, scrollHeight, clientHeight } = sidebarRef.current;
    if (scrollTop + clientHeight >= scrollHeight - 50) {
      loadFavorites(favoritesPage + 1);
      throttleTimerRef.current = setTimeout(() => {
        throttleTimerRef.current = null;
      }, 300);
    }
  }, [favoritesPage, hasMoreFavorites, isLoadingFavorites, loadFavorites]);

  const handleSearch = async (ingredients: string[]) => {
    if (ingredients.length === 0) return;
    setIsSearching(true);
    try {
      const res = await fetch(
        `/api/recipes?ingredients=${encodeURIComponent(ingredients.join(','))}`
      );
      const data = await res.json();
      setRecipes(data.recipes || []);
      setRecommendations(data.recommendations || []);
    } catch (err) {
      console.error('Failed to search recipes:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleFavoriteToggle = async (recipeId: string, favorited: boolean) => {
    try {
      await fetch('/api/preferences/favorite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipeId, favorited })
      });
      if (favorited) {
        setFavoriteIds((prev) => new Set([...prev, recipeId]));
      } else {
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          next.delete(recipeId);
          return next;
        });
      }
      loadFavorites(0);
      fetchRecommendations();
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  const handleRate = async (recipeId: string, rating: number) => {
    try {
      await fetch('/api/preferences/rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipeId, rating })
      });
      setRatings((prev) => ({ ...prev, [recipeId]: rating }));
      fetchRecommendations();
    } catch (err) {
      console.error('Failed to rate recipe:', err);
    }
  };

  const scrollToRecipe = (recipeId: string) => {
    const element = document.querySelector(`[data-recipe-id="${recipeId}"]`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    if (isMobile) {
      setMobileSidebarOpen(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const renderRatingStars = (recipeId: string) => {
    const currentRating = ratings[recipeId] || 0;
    return (
      <div className="rating-stars">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`star ${star <= currentRating ? 'active' : ''}`}
            onClick={() => handleRate(recipeId, star)}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="app-container">
      <div className="main-content">
        <div className="header">
          <h1>🍳 FlavorVault</h1>
          <p>智能食材配对，发现美味可能</p>
        </div>

        <div className="search-section">
          <IngredientInput onSearch={handleSearch} />
        </div>

        {recommendations.length > 0 && (
          <div className="recommendations-section">
            <h2 className="section-title">✨ 今日推荐</h2>
            <div className="recipe-grid">
              {recommendations.map((recipe) => (
                <div data-recipe-id={recipe.id} key={recipe.id}>
                  <RecipeCard
                    recipe={recipe}
                    isFavorite={favoriteIds.has(recipe.id)}
                    isRecommended={true}
                    onFavoriteToggle={handleFavoriteToggle}
                    onClick={() => setSelectedRecipe(recipe)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {recipes.length > 0 && (
          <div>
            <h2 className="section-title">🍽️ 搜索结果</h2>
            <div className="recipe-grid">
              {recipes.map((recipe) => (
                <div data-recipe-id={recipe.id} key={recipe.id}>
                  <RecipeCard
                    recipe={recipe}
                    isFavorite={favoriteIds.has(recipe.id)}
                    isRecommended={false}
                    onFavoriteToggle={handleFavoriteToggle}
                    onClick={() => setSelectedRecipe(recipe)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {recipes.length === 0 && !isSearching && (
          <div className="empty-state">
            <div className="empty-state-icon">🥗</div>
            <p>输入您家中的食材，我们为您推荐美味菜谱</p>
          </div>
        )}

        {isSearching && (
          <div className="empty-state">
            <div className="empty-state-icon">⏳</div>
            <p>正在为您匹配最佳菜谱...</p>
          </div>
        )}
      </div>

      <div
        ref={sidebarRef}
        className={`sidebar ${isMobile && mobileSidebarOpen ? 'mobile-open' : ''}`}
        onScroll={handleSidebarScroll}
      >
        <h2>⭐ 我的收藏</h2>
        <div className="favorite-list">
          {favorites.length === 0 ? (
            <p style={{ color: '#999', textAlign: 'center', padding: '20px' }}>
              暂无收藏
            </p>
          ) : (
            favorites.map((fav) => (
              <div
                key={fav.recipeId}
                className="favorite-item"
                onClick={() => scrollToRecipe(fav.recipeId)}
              >
                <div className="favorite-item-name">{fav.name}</div>
                <div className="favorite-item-date">
                  收藏于 {formatDate(fav.addedAt)}
                </div>
              </div>
            ))
          )}
          {isLoadingFavorites && (
            <div className="loading-more">加载中...</div>
          )}
          {!hasMoreFavorites && favorites.length > 0 && (
            <div className="loading-more">已加载全部收藏</div>
          )}
        </div>
      </div>

      {isMobile && (
        <div className="mobile-bottom-bar">
          <div
            className="mobile-bar-item"
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          >
            <span className="mobile-bar-icon">⭐</span>
            <span className="mobile-bar-label">收藏</span>
          </div>
          <div className="mobile-bar-item">
            <span className="mobile-bar-icon">🏠</span>
            <span className="mobile-bar-label">首页</span>
          </div>
          <div className="mobile-bar-item">
            <span className="mobile-bar-icon">👤</span>
            <span className="mobile-bar-label">我的</span>
          </div>
        </div>
      )}

      {selectedRecipe && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedRecipe(null);
            }
          }}
        >
          <div className="modal-content">
            <button
              className="modal-close"
              onClick={() => setSelectedRecipe(null)}
            >
              ×
            </button>
            <div className="modal-body">
              <h2 className="modal-title">{selectedRecipe.name}</h2>

              <div className="modal-section">
                <h3>📝 所需食材</h3>
                <div className="ingredients-list">
                  {selectedRecipe.ingredients.map((ing, idx) => {
                    const isMissing = selectedRecipe.missingIngredients.includes(
                      ing.name
                    );
                    return (
                      <div
                        key={idx}
                        className={`ingredient-item ${
                          isMissing ? 'missing' : ''
                        }`}
                      >
                        <span>{ing.name}</span>
                        <span>{ing.amount}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="modal-section">
                <h3>👨‍🍳 制作步骤</h3>
                <ol className="steps-list">
                  {selectedRecipe.steps.map((step, idx) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ol>
              </div>

              <div className="modal-section">
                <h3>⭐ 用户评分</h3>
                {renderRatingStars(selectedRecipe.id)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
