import { useState, useMemo, useEffect } from 'react';
import { useArticles } from './hooks/useArticles';
import { useStats } from './hooks/useStats';
import { ArticleCard } from './components/ArticleCard';
import { StatsPanel } from './components/StatsPanel';
import { Article, Tag } from './types';
import './App.css';

const ALL_TAGS: (Tag | 'All')[] = ['All', 'React', 'CSS', 'JavaScript', 'Performance'];

function App() {
  const { articles, loading } = useArticles();
  const [selectedTag, setSelectedTag] = useState<Tag | 'All'>('All');
  const [sortDesc, setSortDesc] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [animateKey, setAnimateKey] = useState(0);

  const filteredArticles = useMemo(() => {
    let result = [...articles];

    if (selectedTag !== 'All') {
      result = result.filter((a) => a.tags.includes(selectedTag));
    }

    result.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortDesc ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [articles, selectedTag, sortDesc]);

  const stats = useStats(filteredArticles);

  useEffect(() => {
    setAnimateKey((prev) => prev + 1);
  }, [selectedTag, sortDesc]);

  const handleTagClick = (tag: Tag | 'All') => {
    setSelectedTag(tag);
  };

  const handleSortToggle = () => {
    setSortDesc((prev) => !prev);
  };

  const handleArticleClick = (article: Article) => {
    console.log('Article clicked:', article.title);
  };

  return (
    <div className="app">
      <header className="top-bar">
        <div className="top-bar-content">
          <h1 className="app-title">DevDigest</h1>
          <div className="top-bar-actions">
            <div className="tag-filters">
              {ALL_TAGS.map((tag) => (
                <button
                  key={tag}
                  className={`tag-btn ${selectedTag === tag ? 'active' : ''}`}
                  onClick={() => handleTagClick(tag)}
                >
                  {tag === 'All' ? '全部' : tag}
                </button>
              ))}
            </div>
            <button
              className="sort-btn"
              onClick={handleSortToggle}
              title={sortDesc ? '切换为升序' : '切换为降序'}
            >
              {sortDesc ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12l7-7 7 7" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 19V5M5 12l7 7 7-7" />
                </svg>
              )}
            </button>
            <button
              className="drawer-toggle"
              onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="9" y1="21" x2="9" y2="9" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <div className={`mobile-drawer ${isDrawerOpen ? 'open' : ''}`}>
        <StatsPanel stats={stats} />
      </div>

      <main className="main-content">
        <section className="articles-section">
          {loading ? (
            <div className="loading">加载中...</div>
          ) : filteredArticles.length === 0 ? (
            <div className="empty-state">暂无相关文章</div>
          ) : (
            <div className="articles-grid" key={animateKey}>
              {filteredArticles.map((article, index) => (
                <div
                  key={article.id}
                  className="article-item"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <ArticleCard article={article} onClick={handleArticleClick} />
                </div>
              ))}
            </div>
          )}
        </section>

        <aside className="stats-section">
          <StatsPanel stats={stats} />
        </aside>
      </main>
    </div>
  );
}

export default App;
