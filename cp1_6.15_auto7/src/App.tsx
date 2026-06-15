import { useState, useEffect } from 'react';
import type { Inspiration, TagDictionary } from './types/inspiration';
import InspirationBoard from './pages/InspirationBoard';
import AddInspiration from './pages/AddInspiration';

type Page = 'board' | 'add';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('board');
  const [inspirations, setInspirations] = useState<Inspiration[]>([]);
  const [tagDictionary, setTagDictionary] = useState<TagDictionary>({ tags: [], projects: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [inspRes, tagRes] = await Promise.all([
        fetch('/api/inspirations'),
        fetch('/api/tags'),
      ]);
      const [inspData, tagData] = await Promise.all([
        inspRes.json(),
        tagRes.json(),
      ]);
      setInspirations(inspData);
      setTagDictionary(tagData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddInspiration = async (newInspiration: Omit<Inspiration, 'id' | 'isFavorite' | 'favoriteCount' | 'createdAt'>) => {
    try {
      const response = await fetch('/api/inspirations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newInspiration),
      });
      const data = await response.json();
      setInspirations((prev) => [data, ...prev]);

      if (!tagDictionary.projects.includes(newInspiration.project)) {
        setTagDictionary((prev) => ({
          ...prev,
          projects: [...prev.projects, newInspiration.project],
        }));
      }
      newInspiration.tags.forEach((tag) => {
        if (!tagDictionary.tags.includes(tag)) {
          setTagDictionary((prev) => ({
            ...prev,
            tags: [...prev.tags, tag],
          }));
        }
      });

      setCurrentPage('board');
    } catch (error) {
      console.error('Failed to add inspiration:', error);
    }
  };

  const handleToggleFavorite = async (id: string) => {
    try {
      const response = await fetch(`/api/inspirations/${id}/favorite`, {
        method: 'PUT',
      });
      const updated = await response.json();
      setInspirations((prev) =>
        prev.map((item) => (item.id === id ? updated : item))
      );
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>加载中...</p>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1 className="app-title" onClick={() => setCurrentPage('board')}>
            ✨ 灵感看板
          </h1>
          <nav className="app-nav">
            <button
              className={`nav-btn ${currentPage === 'board' ? 'active' : ''}`}
              onClick={() => setCurrentPage('board')}
            >
              看板
            </button>
            <button
              className={`nav-btn add-btn ${currentPage === 'add' ? 'active' : ''}`}
              onClick={() => setCurrentPage('add')}
            >
              + 添加灵感
            </button>
          </nav>
        </div>
      </header>

      <main className="app-main">
        {currentPage === 'board' ? (
          <InspirationBoard
            inspirations={inspirations}
            onToggleFavorite={handleToggleFavorite}
          />
        ) : (
          <AddInspiration
            onSubmit={handleAddInspiration}
            tagDictionary={tagDictionary}
          />
        )}
      </main>
    </div>
  );
}

export default App;
