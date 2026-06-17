import { useState, useEffect, useCallback } from 'react';
import InventoryInput from './InventoryInput';
import RecipeMatcher from './RecipeMatcher';
import RecipeDetail from './RecipeDetail';
import { UserIngredient, MatchResult, Recipe, FavoriteRecipe, ShoppingItem } from './types';

type View = 'list' | 'detail';

function App() {
  const [userIngredients, setUserIngredients] = useState<UserIngredient[]>([]);
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  const [currentView, setCurrentView] = useState<View>('list');
  const [selectedRecipe, setSelectedRecipe] = useState<MatchResult | null>(null);
  const [favorites, setFavorites] = useState<FavoriteRecipe[]>([]);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [showShoppingList, setShowShoppingList] = useState(false);
  const [loading, setLoading] = useState(false);
  const [removingFavoriteId, setRemovingFavoriteId] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('recipe-favorites');
    if (saved) {
      try {
        setFavorites(JSON.parse(saved));
      } catch (e) {
        console.error('加载收藏失败', e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('recipe-favorites', JSON.stringify(favorites));
  }, [favorites]);

  const handleMatch = useCallback(async (ingredients: UserIngredient[]) => {
    setUserIngredients(ingredients);
    setLoading(true);
    try {
      const response = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients })
      });
      const data = await response.json();
      setMatchResults(data.matches || []);
    } catch (error) {
      console.error('匹配失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRecipeClick = useCallback((match: MatchResult) => {
    setSelectedRecipe(match);
    setCurrentView('detail');
  }, []);

  const handleBackToList = useCallback(() => {
    setCurrentView('list');
    setSelectedRecipe(null);
  }, []);

  const handleToggleFavorite = useCallback((recipe: Recipe) => {
    setFavorites(prev => {
      const exists = prev.find(f => f.id === recipe.id);
      if (exists) {
        return prev.filter(f => f.id !== recipe.id);
      }
      return [...prev, { id: recipe.id, name: recipe.name, addedAt: Date.now() }];
    });
  }, []);

  const isFavorite = useCallback((recipeId: string) => {
    return favorites.some(f => f.id === recipeId);
  }, [favorites]);

  const handleRemoveFavorite = useCallback((recipeId: string) => {
    setRemovingFavoriteId(recipeId);
    setTimeout(() => {
      setFavorites(prev => prev.filter(f => f.id !== recipeId));
      setRemovingFavoriteId(null);
    }, 300);
  }, []);

  const handleGenerateShoppingList = useCallback(async (recipeId: string) => {
    try {
      const response = await fetch('/api/shopping-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipeId, ingredients: userIngredients })
      });
      const data = await response.json();
      const items = (data.shoppingList || []).map((item: ShoppingItem) => ({ ...item, checked: false }));
      setShoppingList(items);
      setShowShoppingList(true);
    } catch (error) {
      console.error('生成购物清单失败:', error);
    }
  }, [userIngredients]);

  const handleToggleShoppingItem = useCallback((index: number) => {
    setShoppingList(prev => prev.map((item, i) => 
      i === index ? { ...item, checked: !item.checked } : item
    ));
  }, []);

  const handleFavoriteClick = useCallback(async (favoriteId: string) => {
    const match = matchResults.find(m => m.recipe.id === favoriteId);
    if (match) {
      handleRecipeClick(match);
      return;
    }
    try {
      const response = await fetch(`/api/recipes/${favoriteId}`);
      const recipe: Recipe = await response.json();
      const mockMatch: MatchResult = {
        recipe,
        matchPercentage: 0,
        matchLevel: 'low',
        matchedIngredients: [],
        missingIngredients: recipe.ingredients
      };
      handleRecipeClick(mockMatch);
    } catch (error) {
      console.error('加载食谱详情失败:', error);
    }
  }, [matchResults, handleRecipeClick]);

  return (
    <div className="app-container">
      <aside 
        className={`sidebar ${sidebarExpanded ? 'expanded' : ''}`}
        style={{ background: '#F5F5DC' }}
      >
        <div className="sidebar-header" onClick={() => setSidebarExpanded(!sidebarExpanded)}>
          <span className="sidebar-title">我的收藏</span>
          <span className={`expand-icon ${sidebarExpanded ? 'rotated' : ''}`}>▶</span>
        </div>
        {sidebarExpanded && (
          <div className="sidebar-content">
            {favorites.length === 0 ? (
              <p className="empty-favorites">还没有收藏的食谱</p>
            ) : (
              <div className="favorites-list">
                {favorites.map(fav => (
                  <div 
                    key={fav.id} 
                    className={`favorite-card ${removingFavoriteId === fav.id ? 'slide-out' : ''}`}
                  >
                    <div 
                      className="favorite-card-content"
                      onClick={() => handleFavoriteClick(fav.id)}
                    >
                      <span className="favorite-icon">❤️</span>
                      <span className="favorite-name">{fav.name}</span>
                    </div>
                    <button 
                      className="remove-favorite-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFavorite(fav.id);
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </aside>

      <main className="main-content">
        <header className="app-header">
          <h1>🍳 食谱小助手</h1>
          {showShoppingList && (
            <button className="header-btn" onClick={() => setShowShoppingList(false)}>
              隐藏购物清单
            </button>
          )}
        </header>

        <InventoryInput onMatch={handleMatch} />

        <div className="content-area">
          {currentView === 'list' && (
            <>
              {showShoppingList && shoppingList.length > 0 && (
                <div className="shopping-list-section">
                  <h3>🛒 购物清单</h3>
                  <div className="shopping-list">
                    {shoppingList.map((item, index) => (
                      <div 
                        key={`${item.name}-${index}`} 
                        className={`shopping-item ${item.checked ? 'checked' : ''}`}
                      >
                        <input 
                          type="checkbox" 
                          checked={item.checked || false}
                          onChange={() => handleToggleShoppingItem(index)}
                          className="shopping-checkbox"
                        />
                        <span className="shopping-item-name">{item.name}</span>
                        <span className="shopping-item-qty">
                          {item.quantity}{item.unit || ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <RecipeMatcher 
                results={matchResults} 
                loading={loading}
                onRecipeClick={handleRecipeClick}
              />
            </>
          )}
          {currentView === 'detail' && selectedRecipe && (
            <RecipeDetail
              matchResult={selectedRecipe}
              isFavorite={isFavorite(selectedRecipe.recipe.id)}
              onToggleFavorite={() => handleToggleFavorite(selectedRecipe.recipe)}
              onBack={handleBackToList}
              onGenerateShoppingList={() => handleGenerateShoppingList(selectedRecipe.recipe.id)}
            />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
