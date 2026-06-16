import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import StarRating from '../components/StarRating';
import { fetchGames } from '../business/DataFetcher';
import { sortGamesByRating } from '../business/RatingAggregator';
import type { GameListItem } from '../business/types';
import { ALL_TAGS_OPTION } from '../components/Header';

interface GalleryPageProps {
  selectedTag: string;
  searchQuery: string;
  sortBy: 'default' | 'rating-desc' | 'rating-asc';
}

export default function GalleryPage({
  selectedTag,
  searchQuery,
  sortBy,
}: GalleryPageProps) {
  const navigate = useNavigate();
  const [games, setGames] = useState<GameListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterKey, setFilterKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    fetchGames()
      .then((data) => {
        setGames(data);
        setError(null);
      })
      .catch((e) => {
        setError(e.message || '加载失败');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setFilterKey((k) => k + 1);
  }, [selectedTag, searchQuery, sortBy]);

  const filteredGames = useMemo(() => {
    let result = games;

    if (selectedTag !== ALL_TAGS_OPTION && selectedTag) {
      result = result.filter((g) => g.tags.includes(selectedTag as any));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (g) =>
          g.title.toLowerCase().includes(q) ||
          g.description.toLowerCase().includes(q)
      );
    }

    if (sortBy === 'rating-desc') {
      result = sortGamesByRating(result, false);
    } else if (sortBy === 'rating-asc') {
      result = sortGamesByRating(result, true);
    }

    return result;
  }, [games, selectedTag, searchQuery, sortBy]);

  const handleCardClick = useCallback(
    (id: string) => {
      navigate(`/game/${id}`);
    },
    [navigate]
  );

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          正在加载游戏列表...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="loading-spinner" style={{ color: '#e74c3c' }}>
          加载失败：{error}
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {filteredGames.length === 0 ? (
        <div className="empty-state">
          <svg
            className="empty-state-illustration"
            viewBox="0 0 200 200"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="100" cy="100" r="80" stroke="#ddd" strokeWidth="4" fill="#fafafa" />
            <path
              d="M65 80 L135 80 L135 130 C135 138 128 145 120 145 L80 145 C72 145 65 138 65 130 Z"
              fill="#f0f0f0"
              stroke="#ddd"
              strokeWidth="3"
            />
            <path d="M75 80 L75 65 C75 55 85 50 100 50 C115 50 125 55 125 65 L125 80" fill="#f5f5f5" stroke="#ddd" strokeWidth="3" />
            <circle cx="90" cy="95" r="4" fill="#ccc" />
            <circle cx="110" cy="95" r="4" fill="#ccc" />
            <path d="M85 115 Q100 108 115 115" stroke="#ccc" strokeWidth="3" fill="none" strokeLinecap="round" />
          </svg>
          <div className="empty-state-text">没找到相关游戏</div>
          <div className="empty-state-subtext">试试更换标签或搜索关键词</div>
        </div>
      ) : (
        <div key={filterKey} className="gallery-fade-wrap">
          <div className="waterfall">
            {filteredGames.map((game, index) => (
              <div
                key={game.id}
                className="waterfall-item"
                style={{
                  animationDelay: `${Math.min(index * 30, 300)}ms`,
                }}
              >
                <div
                  className="game-card"
                  onClick={() => handleCardClick(game.id)}
                >
                  <div className="game-card-cover-wrap">
                    <img
                      src={game.coverUrl}
                      alt={game.title}
                      className="game-card-cover"
                      loading="lazy"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          const placeholder = document.createElement('div');
                          placeholder.className = 'game-card-cover-placeholder';
                          placeholder.innerHTML =
                            '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
                          parent.appendChild(placeholder);
                        }
                      }}
                    />
                  </div>
                  <div className="game-card-body">
                    <h3 className="game-card-title">{game.title}</h3>
                    <div className="game-card-tags">
                      {game.tags.map((tag) => (
                        <span key={tag} className="tag-chip">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="game-card-rating">
                      <StarRating
                        value={game.rating.average}
                        size="md"
                        showScore
                        count={game.rating.count}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
