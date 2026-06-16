import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import StarRating from '../components/StarRating';
import { fetchGames } from '../business/DataFetcher';
import { sortGamesByRating } from '../business/RatingAggregator';
import type { GameListItem } from '../business/types';

function RankingBadge({ rank }: { rank: number }) {
  let cls = 'ranking-badge';
  if (rank === 1) cls += ' gold';
  else if (rank === 2) cls += ' silver';
  else if (rank === 3) cls += ' bronze';
  return <div className={cls}>{rank}</div>;
}

export default function RankingPage() {
  const navigate = useNavigate();
  const [games, setGames] = useState<GameListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchGames()
      .then((data) => {
        setGames(sortGamesByRating(data, false));
        setError(null);
      })
      .catch((e) => {
        setError(e.message || '加载失败');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleClick = useCallback(
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
          正在加载排行榜...
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
      <h2 className="ranking-title">
        <span style={{ color: '#f39c12' }}>★</span> 热度排行榜{' '}
        <span style={{ color: '#f39c12' }}>★</span>
      </h2>

      <div className="ranking-list">
        {games.map((game, index) => {
          const rank = index + 1;
          return (
            <div
              key={game.id}
              className="ranking-item"
              onClick={() => handleClick(game.id)}
            >
              <RankingBadge rank={rank} />
              <img
                src={game.coverUrl}
                alt={game.title}
                className="ranking-cover"
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.background = '#f0f0f0';
                }}
              />
              <div className="ranking-info">
                <div className="ranking-name">{game.title}</div>
                <div className="ranking-tags">
                  {game.tags.map((tag) => (
                    <span key={tag} className="tag-chip">
                      {tag}
                    </span>
                  ))}
                </div>
                <StarRating value={game.rating.average} size="sm" />
              </div>
              <div className="ranking-stats">
                <div className="ranking-average">
                  {game.rating.average.toFixed(1)}
                </div>
                <div className="ranking-count">
                  {game.rating.count} 人评分
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
