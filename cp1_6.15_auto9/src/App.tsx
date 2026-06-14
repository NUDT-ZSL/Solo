import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Recipe, SortOrder, CategoryFilter } from './types';
import { recipes, ingredients } from './mockData';
import RecipeList from './RecipeList';
import IngredientSelector from './IngredientSelector';

const CATEGORIES: CategoryFilter[] = ['全部', '中餐', '西餐', '甜品', '日料', '韩餐'];
const FAVORITES_KEY = 'recipe_favorites';

const App: React.FC = () => {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<SortOrder>(null);
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('全部');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [listAnimating, setListAnimating] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(FAVORITES_KEY);
    if (saved) {
      try {
        setFavorites(JSON.parse(saved));
      } catch (e) {
        setFavorites([]);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(searchKeyword);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchKeyword]);

  const filterRecipes = useCallback(() => {
    let result = [...recipes];

    if (debouncedKeyword.trim()) {
      const keyword = debouncedKeyword.toLowerCase().trim();
      result = result.filter(
        r =>
          r.name.toLowerCase().includes(keyword) ||
          r.description.toLowerCase().includes(keyword)
      );
    }

    if (selectedIngredients.length > 0) {
      result = result.filter(recipe =>
        selectedIngredients.every(id =>
          recipe.ingredients.some(ing => ing.ingredientId === id)
        )
      );
    }

    if (activeCategory !== '全部') {
      result = result.filter(r => r.category === activeCategory);
    }

    if (sortOrder) {
      result.sort((a, b) =>
        sortOrder === 'asc' ? a.cookingTime - b.cookingTime : b.cookingTime - a.cookingTime
      );
    }

    return result;
  }, [debouncedKeyword, selectedIngredients, activeCategory, sortOrder]);

  const filteredRecipes = useMemo(() => filterRecipes(), [filterRecipes]);

  const handleCategoryChange = (category: CategoryFilter) => {
    if (category !== activeCategory) {
      setListAnimating(true);
      setTimeout(() => {
        setActiveCategory(category);
        setListAnimating(false);
      }, 150);
    }
  };

  const toggleFavorite = (id: string) => {
    setFavorites(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const openRecipeModal = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setIsModalOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setTimeout(() => {
      setSelectedRecipe(null);
      document.body.style.overflow = '';
    }, 200);
  };

  const renderStars = (rating: number) => {
    return (
      <div className="modal-rating-stars">
        {[1, 2, 3, 4, 5].map(i => (
          <span key={i} className={`star ${i <= Math.floor(rating) ? 'filled' : ''}`}>★</span>
        ))}
        <span className="rating-value">{rating.toFixed(1)}</span>
      </div>
    );
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <button className="hamburger-btn" onClick={() => setMobileDrawerOpen(true)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <div className="logo">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M6 2v6a6 6 0 0 0 12 0V2" stroke="#E67E22" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="9" cy="20" r="2" fill="#E67E22"/>
              <circle cx="15" cy="20" r="2" fill="#E67E22"/>
              <path d="M4 20h16" stroke="#E67E22" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span>美食厨房</span>
          </div>
        </div>
        <div className="search-box">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="搜索食谱名称或描述..."
            value={searchKeyword}
            onChange={e => setSearchKeyword(e.target.value)}
          />
          {searchKeyword && (
            <button className="clear-search" onClick={() => setSearchKeyword('')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>
        <div className="header-right">
          <div className="favorites-count">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            <span>{favorites.length}</span>
          </div>
        </div>
      </header>

      <div className="app-body">
        <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${mobileDrawerOpen ? 'mobile-open' : ''}`}>
          <IngredientSelector
            ingredients={ingredients}
            selectedIngredients={selectedIngredients}
            onSelect={setSelectedIngredients}
            isCollapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
        </aside>

        {mobileDrawerOpen && (
          <div className="mobile-overlay" onClick={() => setMobileDrawerOpen(false)} />
        )}

        <main className="main-content">
          <div className="filter-bar">
            <div className="category-tabs">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  className={`category-tab ${activeCategory === cat ? 'active' : ''}`}
                  onClick={() => handleCategoryChange(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="sort-controls">
              <span className="sort-label">烹饪时长:</span>
              <button
                className={`sort-btn ${sortOrder === 'asc' ? 'active' : ''}`}
                onClick={() => setSortOrder(sortOrder === 'asc' ? null : 'asc')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="19" x2="12" y2="5"/>
                  <polyline points="5,12 12,5 19,12"/>
                </svg>
                升序
              </button>
              <button
                className={`sort-btn ${sortOrder === 'desc' ? 'active' : ''}`}
                onClick={() => setSortOrder(sortOrder === 'desc' ? null : 'desc')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <polyline points="19,12 12,19 5,12"/>
                </svg>
                降序
              </button>
            </div>
          </div>

          <div className={`recipe-list-wrapper ${listAnimating ? 'fading' : ''}`}>
            <RecipeList
              recipes={filteredRecipes}
              favorites={favorites}
              onToggleFavorite={toggleFavorite}
              onSelectRecipe={openRecipeModal}
              searchKeyword={debouncedKeyword}
            />
          </div>
        </main>
      </div>

      {selectedRecipe && (
        <div className={`modal-overlay ${isModalOpen ? 'open' : ''}`} onClick={closeModal}>
          <div
            className={`modal ${isModalOpen ? 'open' : ''}`}
            onClick={e => e.stopPropagation()}
          >
            <button className="modal-close" onClick={closeModal}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>

            <div className="modal-image-wrapper">
              <img src={selectedRecipe.imageUrl} alt={selectedRecipe.name} className="modal-image" />
              <div className="modal-image-overlay">
                <span className="modal-category-badge">{selectedRecipe.category}</span>
                <button
                  className={`modal-favorite ${favorites.includes(selectedRecipe.id) ? 'active' : ''}`}
                  onClick={() => toggleFavorite(selectedRecipe.id)}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill={favorites.includes(selectedRecipe.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                </button>
              </div>
            </div>

            <div className="modal-content">
              <div className="modal-header-info">
                <h2 className="modal-title">{selectedRecipe.name}</h2>
                <p className="modal-description">{selectedRecipe.description}</p>
                <div className="modal-meta">
                  {renderStars(selectedRecipe.rating)}
                  <span className="modal-time">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12,6 12,12 16,14"/>
                    </svg>
                    {selectedRecipe.cookingTime}分钟
                  </span>
                </div>
                <div className="modal-tags">
                  {selectedRecipe.tags.map(tag => (
                    <span key={tag} className="modal-tag">{tag}</span>
                  ))}
                </div>
              </div>

              <div className="modal-sections">
                <div className="modal-section">
                  <h3 className="section-title">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                      <path d="M2 17l10 5 10-5"/>
                      <path d="M2 12l10 5 10-5"/>
                    </svg>
                    食材清单
                  </h3>
                  <ul className="ingredient-list-modal">
                    {selectedRecipe.ingredients.map(ing => (
                      <li key={ing.ingredientId} className="ingredient-item-modal">
                        <span className="ingredient-dot"></span>
                        <span className="ingredient-name-modal">{ing.ingredientName}</span>
                        <span className="ingredient-quantity">{ing.quantity}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="modal-section">
                  <h3 className="section-title">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="8" y1="6" x2="21" y2="6"/>
                      <line x1="8" y1="12" x2="21" y2="12"/>
                      <line x1="8" y1="18" x2="21" y2="18"/>
                      <line x1="3" y1="6" x2="3.01" y2="6"/>
                      <line x1="3" y1="12" x2="3.01" y2="12"/>
                      <line x1="3" y1="18" x2="3.01" y2="18"/>
                    </svg>
                    烹饪步骤
                  </h3>
                  <ol className="steps-list">
                    {selectedRecipe.steps.map((step, index) => (
                      <li key={index} className="step-item">
                        <span className="step-number">{index + 1}</span>
                        <span className="step-text">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
