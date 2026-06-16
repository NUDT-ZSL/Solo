import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { CATEGORIES, type Category, type Emoji } from './types';
import { mockEmojis } from './data/mockEmojis';
import { EmojiGrid } from './components/EmojiGrid';
import { EmojiModal } from './components/EmojiModal';
import { useEmojiFilter } from './hooks/useEmojiFilter';

const FAVORITES_STORAGE_KEY = 'emoji-dictionary-favorites';

const App: React.FC = () => {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [favorites, setFavorites] = useState<Set<number>>(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
      if (stored) {
        return new Set(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
    return new Set();
  });
  const [selectedEmoji, setSelectedEmoji] = useState<Emoji | null>(null);
  const [favoritesPanelOpen, setFavoritesPanelOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(searchKeyword);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchKeyword]);

  useEffect(() => {
    try {
      localStorage.setItem(
        FAVORITES_STORAGE_KEY,
        JSON.stringify(Array.from(favorites))
      );
    } catch {
      // ignore
    }
  }, [favorites]);

  useEffect(() => {
    if (selectedEmoji) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedEmoji]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedEmoji(null);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const filteredEmojis = useEmojiFilter(
    mockEmojis,
    debouncedKeyword,
    selectedCategory
  );

  const dailyRecommend = useMemo(() => {
    const today = new Date();
    const dateKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
    let hash = 0;
    for (let i = 0; i < dateKey.length; i++) {
      hash = dateKey.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % mockEmojis.length;
    return mockEmojis[index];
  }, []);

  const handleToggleFavorite = useCallback((emojiId: number) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(emojiId)) {
        next.delete(emojiId);
      } else {
        next.add(emojiId);
      }
      return next;
    });
  }, []);

  const handleEmojiClick = useCallback((emoji: Emoji) => {
    setSelectedEmoji(emoji);
  }, []);

  const handleFavoriteItemClick = useCallback(
    (emoji: Emoji) => {
      setSelectedEmoji(emoji);
    },
    []
  );

  const handleModalSelectEmoji = useCallback((emoji: Emoji) => {
    setSelectedEmoji(emoji);
  }, []);

  const favoriteEmojis = useMemo(() => {
    return mockEmojis.filter((e) => favorites.has(e.id));
  }, [favorites]);

  const [displayCountKey, setDisplayCountKey] = useState(0);
  const [favoritesCountKey, setFavoritesCountKey] = useState(0);

  useEffect(() => {
    setDisplayCountKey((k) => k + 1);
  }, [filteredEmojis.length]);

  useEffect(() => {
    setFavoritesCountKey((k) => k + 1);
  }, [favorites.size]);

  return (
    <div className="app">
      <div className="header">
        <h1>😀 Emoji 词典</h1>
        <input
          type="text"
          className="search-box"
          placeholder="搜索表情符号（关键词、名称、释义）..."
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
        />
        <div className="category-tabs">
          <button
            className={`category-tab ${selectedCategory === null ? 'active' : ''}`}
            onClick={() => setSelectedCategory(null)}
          >
            全部
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`category-tab ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className={`app-main ${favoritesPanelOpen ? 'with-favorites' : ''}`}>
        <EmojiGrid
          emojis={filteredEmojis}
          favorites={favorites}
          searchKeyword={debouncedKeyword}
          selectedCategory={selectedCategory}
          onEmojiClick={handleEmojiClick}
          onToggleFavorite={handleToggleFavorite}
        />
      </div>

      <div
        className={`favorites-panel ${favoritesPanelOpen ? 'expanded' : 'collapsed'}`}
      >
        <button
          className="favorites-toggle"
          onClick={() => setFavoritesPanelOpen((v) => !v)}
          aria-label={favoritesPanelOpen ? '收起收藏面板' : '展开收藏面板'}
        >
          {favoritesPanelOpen ? '›' : '‹'}
        </button>
        {favoritesPanelOpen && (
          <div className="favorites-content">
            <div className="favorites-title">
              ❤️ 我的收藏 ({favorites.size})
            </div>
            {favoriteEmojis.length === 0 ? (
              <div className="favorites-empty">
                还没有收藏表情哦~
              </div>
            ) : (
              <div className="favorites-list">
                {favoriteEmojis.map((emoji) => (
                  <div key={emoji.id} className="favorite-item">
                    <span
                      className="emoji"
                      onClick={() => handleFavoriteItemClick(emoji)}
                    >
                      {emoji.unicode}
                    </span>
                    <span
                      className="name"
                      onClick={() => handleFavoriteItemClick(emoji)}
                    >
                      {emoji.name}
                    </span>
                    <button
                      className="remove-btn"
                      onClick={() => handleToggleFavorite(emoji.id)}
                      aria-label="取消收藏"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="stats-bar">
        <div className="stats-info">
          <div className="stat-item">
            当前显示：
            <span className="number" key={`display-${displayCountKey}`}>
              {filteredEmojis.length}
            </span>
          </div>
          <div className="stat-item">
            表情总数：
            <span className="number">{mockEmojis.length}</span>
          </div>
          <div className="stat-item">
            已收藏：
            <span className="number" key={`fav-${favoritesCountKey}`}>
              {favorites.size}
            </span>
          </div>
        </div>
        <div className="daily-recommend">
          <span>今日推荐：</span>
          <span className="emoji">{dailyRecommend.unicode}</span>
          <span>{dailyRecommend.name}</span>
        </div>
      </div>

      {selectedEmoji && (
        <EmojiModal
          key={selectedEmoji.id}
          emoji={selectedEmoji}
          isFavorited={favorites.has(selectedEmoji.id)}
          onClose={() => setSelectedEmoji(null)}
          onToggleFavorite={handleToggleFavorite}
          onSelectEmoji={handleModalSelectEmoji}
        />
      )}
    </div>
  );
};

export default App;
