import { useState } from 'react';
import CardWall from './components/CardWall';
import CardCreator from './components/CardCreator';

export default function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCreated = () => {
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">💡 点子卡片墙</h1>
        <input
          className="search-input"
          type="text"
          placeholder="搜索点子..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <button
          className="create-btn"
          onClick={() => setCreatorOpen(true)}
        >
          + 创建新点子
        </button>
      </header>
      <CardWall searchQuery={searchQuery} refreshKey={refreshKey} />
      <CardCreator
        open={creatorOpen}
        onClose={() => setCreatorOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}
