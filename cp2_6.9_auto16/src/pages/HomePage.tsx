import React, { useState, useEffect, useRef, useCallback } from 'react';
import RecipeCard from '../components/RecipeCard';
import { getAllRecipes } from '../data';
import { Recipe, CATEGORIES, CATEGORY_COLORS } from '../types';

const ITEMS_PER_PAGE = 12;

const HomePage: React.FC = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [displayedRecipes, setDisplayedRecipes] = useState<Recipe[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('全部');
  const observerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const allRecipes = getAllRecipes();
    setRecipes(allRecipes);
    setDisplayedRecipes(allRecipes.slice(0, ITEMS_PER_PAGE));
    setHasMore(allRecipes.length > ITEMS_PER_PAGE);
    setPage(1);
  }, []);

  const filteredRecipes = activeCategory === '全部'
    ? recipes
    : recipes.filter(r => r.category === activeCategory);

  useEffect(() => {
    setDisplayedRecipes(filteredRecipes.slice(0, ITEMS_PER_PAGE));
    setHasMore(filteredRecipes.length > ITEMS_PER_PAGE);
    setPage(1);
  }, [activeCategory, recipes]);

  const loadMore = useCallback(() => {
    if (loading || !hasMore) return;
    setLoading(true);
    setTimeout(() => {
      const nextPage = page + 1;
      const start = page * ITEMS_PER_PAGE;
      const end = start + ITEMS_PER_PAGE;
      const nextItems = filteredRecipes.slice(start, end);
      if (nextItems.length > 0) {
        setDisplayedRecipes(prev => [...prev, ...nextItems]);
        setPage(nextPage);
        if (end >= filteredRecipes.length) {
          setHasMore(false);
        }
      } else {
        setHasMore(false);
      }
      setLoading(false);
    }, 200);
  }, [page, loading, hasMore, filteredRecipes]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    );
    if (observerRef.current) {
      observer.observe(observerRef.current);
    }
    return () => observer.disconnect();
  }, [loadMore]);

  return (
    <div className="home-page">
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            探索美食的<span className="accent">无限可能</span>
          </h1>
          <p className="hero-subtitle">发现、收藏、分享你最爱的食谱，让每一餐都充满创意</p>
          <div className="hero-stats">
            <div className="stat-item">
              <span className="stat-number">{recipes.length}</span>
              <span className="stat-label">精选食谱</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <span className="stat-number">{CATEGORIES.length}</span>
              <span className="stat-label">美食分类</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <span className="stat-number">5</span>
              <span className="stat-label">美食达人</span>
            </div>
          </div>
        </div>
      </section>

      <div className="category-filter">
        <button
          className={`category-chip ${activeCategory === '全部' ? 'active' : ''}`}
          onClick={() => setActiveCategory('全部')}
        >
          全部
        </button>
        {CATEGORIES.map(category => (
          <button
            key={category}
            className={`category-chip ${activeCategory === category ? 'active' : ''}`}
            onClick={() => setActiveCategory(category)}
            style={activeCategory === category ? { backgroundColor: CATEGORY_COLORS[category] } : {}}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="recipe-grid">
        {displayedRecipes.map((recipe, index) => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            style={{
              animation: `fadeInUp 0.5s ease ${index * 0.05}s both`
            }}
          />
        ))}
      </div>

      <div ref={observerRef} className="load-more-trigger">
        {loading && (
          <div className="loading-spinner">
            <div className="spinner" />
            <span>加载中...</span>
          </div>
        )}
        {!hasMore && !loading && displayedRecipes.length > 0 && (
          <p className="end-message">🎉 已经到底啦，没有更多食谱了</p>
        )}
      </div>

      <style>{`
        .home-page {
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 24px 48px;
        }
        .hero-section {
          padding: 48px 0 32px;
          text-align: center;
        }
        .hero-content {
          max-width: 700px;
          margin: 0 auto;
        }
        .hero-title {
          font-size: 42px;
          font-weight: 800;
          color: #2c3e50;
          margin: 0 0 16px;
          line-height: 1.2;
        }
        .accent {
          background: linear-gradient(135deg, #E67E22 0%, #F39C12 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .hero-subtitle {
          font-size: 16px;
          color: #7f8c8d;
          margin: 0 0 32px;
          line-height: 1.6;
        }
        .hero-stats {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 32px;
          padding: 24px;
          background: linear-gradient(135deg, #FFF8EE 0%, #FFF0DC 100%);
          border-radius: 16px;
          border: 1px solid #FCE4BC;
        }
        .stat-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }
        .stat-number {
          font-size: 28px;
          font-weight: 800;
          color: #E67E22;
        }
        .stat-label {
          font-size: 13px;
          color: #7f8c8d;
          font-weight: 500;
        }
        .stat-divider {
          width: 1px;
          height: 40px;
          background: #F3D7A8;
        }
        .category-filter {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 24px;
          padding: 8px 0;
        }
        .category-chip {
          padding: 8px 20px;
          border-radius: 24px;
          border: none;
          background: #ffffff;
          color: #7f8c8d;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }
        .category-chip:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }
        .category-chip:active {
          transform: scale(0.95);
        }
        .category-chip.active {
          color: #ffffff;
          background: #E67E22;
          box-shadow: 0 4px 12px rgba(230, 126, 34, 0.3);
        }
        .recipe-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
        }
        .load-more-trigger {
          padding: 40px 0;
          text-align: center;
        }
        .loading-spinner {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          color: #7f8c8d;
          font-size: 14px;
        }
        .spinner {
          width: 24px;
          height: 24px;
          border: 3px solid #FCE4BC;
          border-top-color: #E67E22;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .end-message {
          color: #95a5a6;
          font-size: 14px;
          margin: 0;
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @media (max-width: 1024px) {
          .recipe-grid {
            grid-template-columns: repeat(3, 1fr);
          }
          .hero-title {
            font-size: 32px;
          }
        }
        @media (max-width: 768px) {
          .home-page {
            padding: 0 16px 32px;
          }
          .recipe-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 14px;
          }
          .hero-section {
            padding: 32px 0 24px;
          }
          .hero-title {
            font-size: 26px;
          }
          .hero-subtitle {
            font-size: 14px;
          }
          .hero-stats {
            gap: 20px;
            padding: 16px;
          }
          .stat-number {
            font-size: 22px;
          }
          .category-filter {
            gap: 6px;
            overflow-x: auto;
            flex-wrap: nowrap;
            padding-bottom: 8px;
            margin: 0 -16px;
            padding-left: 16px;
            padding-right: 16px;
            scrollbar-width: none;
          }
          .category-filter::-webkit-scrollbar {
            display: none;
          }
          .category-chip {
            flex-shrink: 0;
            padding: 6px 16px;
            font-size: 13px;
          }
        }
        @media (max-width: 480px) {
          .recipe-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default HomePage;
