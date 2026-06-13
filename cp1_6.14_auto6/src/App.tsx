import { useState, useCallback, useRef, useEffect } from 'react';
import SearchPage from './SearchPage';
import FavoritesPage from './FavoritesPage';
import RecipeDetail from './RecipeDetail';
import ShoppingListPage from './ShoppingListPage';

type TabType = 'search' | 'favorites' | 'shopping';
type PageType = TabType | 'detail';

const TAB_ORDER: TabType[] = ['search', 'favorites', 'shopping'];

export default function App() {
  const [currentTab, setCurrentTab] = useState<TabType>('search');
  const [currentPage, setCurrentPage] = useState<PageType>('search');
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');
  const [isAnimating, setIsAnimating] = useState(false);
  const previousTabRef = useRef<TabType>('search');

  const handleRecipeClick = useCallback((recipeId: string) => {
    setSelectedRecipeId(recipeId);
    setCurrentPage('detail');
  }, []);

  const handleBack = useCallback(() => {
    setCurrentPage(currentTab);
    setSelectedRecipeId(null);
  }, [currentTab]);

  const handleTabChange = useCallback((tab: TabType) => {
    const prevIndex = TAB_ORDER.indexOf(previousTabRef.current);
    const nextIndex = TAB_ORDER.indexOf(tab);
    setSlideDirection(nextIndex > prevIndex ? 'right' : 'left');
    previousTabRef.current = tab;
    setCurrentTab(tab);
    setCurrentPage(tab);
    setSelectedRecipeId(null);
    setIsAnimating(true);
  }, []);

  useEffect(() => {
    if (isAnimating) {
      const timer = setTimeout(() => setIsAnimating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isAnimating]);

  const getTranslateX = () => {
    if (!isAnimating) return 0;
    return slideDirection === 'right' ? 0 : 0;
  };

  const getEntryX = () => {
    if (!isAnimating) return 0;
    return slideDirection === 'right' ? 60 : -60;
  };

  const renderContent = () => {
    if (currentPage === 'detail' && selectedRecipeId) {
      return (
        <div
          key={`detail-${selectedRecipeId}`}
          className="page-slide"
          style={{
            animation: 'slideInFromRight 0.3s ease-in-out'
          }}
        >
          <RecipeDetail recipeId={selectedRecipeId} onBack={handleBack} />
        </div>
      );
    }

    const slideClass = isAnimating
      ? slideDirection === 'right' ? 'slide-in-right' : 'slide-in-left'
      : '';

    return (
      <div
        key={currentTab}
        className={`page-slide ${slideClass}`}
      >
        {currentTab === 'search' && <SearchPage onRecipeClick={handleRecipeClick} />}
        {currentTab === 'favorites' && <FavoritesPage onRecipeClick={handleRecipeClick} />}
        {currentTab === 'shopping' && <ShoppingListPage />}
      </div>
    );
  };

  return (
    <>
      <nav className="navbar">
        <div className="navbar-title">🍳 RecipeScout</div>
        <div className="navbar-tabs">
          <button
            className={`tab-button ${currentTab === 'search' ? 'active' : ''}`}
            onClick={() => handleTabChange('search')}
          >
            搜索
          </button>
          <button
            className={`tab-button ${currentTab === 'favorites' ? 'active' : ''}`}
            onClick={() => handleTabChange('favorites')}
          >
            收藏
          </button>
          <button
            className={`tab-button tab-shopping ${currentTab === 'shopping' ? 'active' : ''}`}
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
