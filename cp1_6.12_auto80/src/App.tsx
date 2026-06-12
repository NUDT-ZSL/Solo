import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import SnippetList from './SnippetList';
import SnippetPreview from './SnippetPreview';
import CodeEditor from './CodeEditor';

export interface Snippet {
  id: string;
  title: string;
  language: string;
  tags: string;
  code: string;
  description: string;
  favorited: number;
  created_at: string;
  updated_at: string;
}

interface AppContextType {
  snippets: Snippet[];
  selectedSnippet: Snippet | null;
  setSelectedSnippet: (s: Snippet | null) => void;
  favorites: Snippet[];
  showEditor: boolean;
  setShowEditor: (v: boolean) => void;
  editingSnippet: Snippet | null;
  setEditingSnippet: (s: Snippet | null) => void;
  showFavoritesSidebar: boolean;
  setShowFavoritesSidebar: (v: boolean) => void;
  fetchSnippets: () => void;
  toggleFavorite: (id: string) => void;
  saveSnippet: (data: Partial<Snippet>) => void;
  deleteSnippet: (id: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filterLanguage: string;
  setFilterLanguage: (l: string) => void;
  filterTag: string;
  setFilterTag: (t: string) => void;
  mobileTab: 'list' | 'detail';
  setMobileTab: (t: 'list' | 'detail') => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function useAppContext(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppContext.Provider');
  return ctx;
}

export default function App() {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [selectedSnippet, setSelectedSnippet] = useState<Snippet | null>(null);
  const [favorites, setFavorites] = useState<Snippet[]>([]);
  const [showEditor, setShowEditor] = useState(false);
  const [editingSnippet, setEditingSnippet] = useState<Snippet | null>(null);
  const [showFavoritesSidebar, setShowFavoritesSidebar] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLanguage, setFilterLanguage] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [mobileTab, setMobileTab] = useState<'list' | 'detail'>('list');
  const [listWidth, setListWidth] = useState(35);

  const fetchSnippets = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('q', searchQuery);
      if (filterLanguage) params.set('language', filterLanguage);
      if (filterTag) params.set('tag', filterTag);
      const url = params.toString() ? `/api/snippets/search?${params.toString()}` : '/api/snippets';
      const res = await fetch(url);
      const data = await res.json();
      setSnippets(data);
    } catch (err) {
      console.error('Failed to fetch snippets:', err);
    }
  }, [searchQuery, filterLanguage, filterTag]);

  const fetchFavorites = useCallback(async () => {
    try {
      const res = await fetch('/api/snippets/favorites');
      const data = await res.json();
      setFavorites(data);
    } catch (err) {
      console.error('Failed to fetch favorites:', err);
    }
  }, []);

  useEffect(() => {
    fetchSnippets();
  }, [fetchSnippets]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites, snippets]);

  const toggleFavorite = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/snippets/${id}/fav`, { method: 'POST' });
      const updated = await res.json();
      if (selectedSnippet?.id === id) {
        setSelectedSnippet(updated);
      }
      fetchSnippets();
      fetchFavorites();
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  }, [selectedSnippet, fetchSnippets, fetchFavorites]);

  const saveSnippet = useCallback(async (data: Partial<Snippet>) => {
    try {
      if (editingSnippet) {
        await fetch(`/api/snippets/${editingSnippet.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
      } else {
        await fetch('/api/snippets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
      }
      setShowEditor(false);
      setEditingSnippet(null);
      fetchSnippets();
    } catch (err) {
      console.error('Failed to save snippet:', err);
    }
  }, [editingSnippet, fetchSnippets]);

  const deleteSnippet = useCallback(async (id: string) => {
    try {
      await fetch(`/api/snippets/${id}`, { method: 'DELETE' });
      if (selectedSnippet?.id === id) {
        setSelectedSnippet(null);
      }
      fetchSnippets();
      fetchFavorites();
    } catch (err) {
      console.error('Failed to delete snippet:', err);
    }
  }, [selectedSnippet, fetchSnippets, fetchFavorites]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = listWidth;

    const onMouseMove = (ev: MouseEvent) => {
      const container = document.querySelector('.app-layout') as HTMLElement;
      if (!container) return;
      const containerWidth = container.offsetWidth;
      const delta = ev.clientX - startX;
      const newPercent = ((startWidth / 100) * containerWidth + delta) / containerWidth * 100;
      setListWidth(Math.max(20, Math.min(60, newPercent)));
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [listWidth]);

  const handleSelectSnippet = useCallback((s: Snippet) => {
    setSelectedSnippet(s);
    setMobileTab('detail');
  }, []);

  const ctxValue: AppContextType = {
    snippets,
    selectedSnippet,
    setSelectedSnippet: handleSelectSnippet,
    favorites,
    showEditor,
    setShowEditor,
    editingSnippet,
    setEditingSnippet,
    showFavoritesSidebar,
    setShowFavoritesSidebar,
    fetchSnippets,
    toggleFavorite,
    saveSnippet,
    deleteSnippet,
    searchQuery,
    setSearchQuery,
    filterLanguage,
    setFilterLanguage,
    filterTag,
    setFilterTag,
    mobileTab,
    setMobileTab,
  };

  return (
    <AppContext.Provider value={ctxValue}>
      <div className="app-container">
        <header className="app-header">
          <div className="header-left">
            <h1 className="app-title">
              <span className="title-icon">⚡</span> CodeSnipHub
            </h1>
          </div>
          <div className="header-right">
            <button
              className="btn-favorites-toggle"
              onClick={() => setShowFavoritesSidebar(!showFavoritesSidebar)}
            >
              ★ 收藏
            </button>
            <button
              className="btn-new-snippet"
              onClick={() => { setEditingSnippet(null); setShowEditor(true); }}
            >
              + 新建片段
            </button>
          </div>
        </header>

        <div className="app-layout">
          <div className="list-panel" style={{ width: `${listWidth}%` }}>
            <SnippetList />
          </div>
          <div className="resize-handle" onMouseDown={handleMouseDown}>
            <div className="resize-line" />
          </div>
          <div className="detail-panel" style={{ width: `${100 - listWidth}%` }}>
            <SnippetPreview />
          </div>
        </div>

        <div className="mobile-tabs">
          <button
            className={`mobile-tab ${mobileTab === 'list' ? 'active' : ''}`}
            onClick={() => setMobileTab('list')}
          >
            列表
          </button>
          <button
            className={`mobile-tab ${mobileTab === 'detail' ? 'active' : ''}`}
            onClick={() => setMobileTab('detail')}
          >
            详情
          </button>
        </div>

        <div className="mobile-layout">
          <div className={`mobile-list ${mobileTab === 'list' ? 'visible' : ''}`}>
            <SnippetList />
          </div>
          <div className={`mobile-detail ${mobileTab === 'detail' ? 'visible' : ''}`}>
            <SnippetPreview />
          </div>
        </div>

        {showEditor && <CodeEditor />}

        <div className={`favorites-sidebar ${showFavoritesSidebar ? 'open' : ''}`}>
          <div className="sidebar-header">
            <h2>★ 收藏列表</h2>
            <button className="btn-close-sidebar" onClick={() => setShowFavoritesSidebar(false)}>✕</button>
          </div>
          <div className="sidebar-content">
            {favorites.length === 0 && <p className="empty-msg">暂无收藏</p>}
            {favorites.map(s => (
              <div
                key={s.id}
                className="sidebar-snippet-card"
                onClick={() => { handleSelectSnippet(s); setShowFavoritesSidebar(false); }}
              >
                <span className={`lang-icon lang-${s.language.toLowerCase().replace(/[\/]/g, '-')}`}>
                  {getLangIcon(s.language)}
                </span>
                <div className="sidebar-snippet-info">
                  <div className="sidebar-snippet-title">{s.title}</div>
                  <div className="sidebar-snippet-lang">{s.language}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        {showFavoritesSidebar && (
          <div className="sidebar-overlay" onClick={() => setShowFavoritesSidebar(false)} />
        )}
      </div>
    </AppContext.Provider>
  );
}

function getLangIcon(language: string): string {
  switch (language) {
    case 'JavaScript': return '⚡';
    case 'TypeScript': return 'TS';
    case 'Python': return '🐍';
    case 'HTML/CSS': return '#';
    default: return '</>';
  }
}
