import { useState, useCallback } from 'react';
import SearchPage from './SearchPage';
import FavoritesPage from './FavoritesPage';
import RecipeDetail from './RecipeDetail';
import ShoppingListPage from './ShoppingListPage';

type PageType = 'search' | 'favorites' | 'shopping' | 'detail';

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('search');
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [pageKey, setPageKey] = useState(0);

  const handleRecipeClick = useCallback((recipeId: string) => {
    setSelectedRecipeId(recipeId);
    setCurrentPage('detail');
    setPageKey(k => k + 1);
  }, []);

  const handleBack = useCallback(() => {
    setCurrentPage('search');
    setSelectedRecipeId(null);
    setPageKey(k => k + 1);
  }, []);

  const handleTabChange = useCallback((tab: 'search' | 'favorites' | 'shopping') => {
    setCurrentPage(tab);
    setSelectedRecipeId(null);
    setPageKey(k => k + 1);
  }, []);

  const renderContent = () => {
    if (currentPage === 'detail' && selectedRecipeId) {
      return (
        <div key={pageKey} className="page-container">
          <RecipeDetail recipeId={selectedRecipeId} onBack={handleBack} />
        </div>
      );
    }

    if (currentPage === 'favorites') {
      return (
        <div key={pageKey} className="page-container">
          <FavoritesPage onRecipeClick={handleRecipeClick} />
        </div>
      );
    }

    if (currentPage === 'shopping') {
      return (
        <div key={pageKey} className="page-container">
          <ShoppingListPage />
        </div>
      );
    }

    return (
      <div key={pageKey} className="page-container">
        <SearchPage onRecipeClick={handleRecipeClick} />
      </div>
    );
  };

  return (
    <>
      <nav className="navbar">
        <div className="navbar-title">🍳 RecipeScout</div>
        <div className="navbar-tabs">
          <button
            className={`tab-button ${currentPage === 'search' ? 'active' : ''}`}
            onClick={() => handleTabChange('search')}
          >
            搜索
          </button>
          <button
            className={`tab-button ${currentPage === 'favorites' ? 'active' : ''}`}
            onClick={() => handleTabChange('favorites')}
          >
            收藏
          </button>
          <button
            className={`tab-button tab-shopping ${currentPage === 'shopping' ? 'active' : ''}`}
            onClick={() => handleTabChange('shopping')}
            title="购物清单"
          >
            🛒
          </button>
        </div>
      </nav>
      <main className="main-content">
        {renderContent()}
      </main>
    </>
  );
}
