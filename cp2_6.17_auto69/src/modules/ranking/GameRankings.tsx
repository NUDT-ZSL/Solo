import { useState, useEffect, useMemo } from 'react';
import { gameApi, type GameRanking } from '../../services/api';

type SortKey = 'name' | 'totalSessions' | 'averageDuration' | 'averageRounds' | 'totalNotes';
type SortOrder = 'asc' | 'desc';

function createRipple(event: React.MouseEvent<HTMLButtonElement>) {
  const button = event.currentTarget;
  const circle = document.createElement('span');
  const diameter = Math.max(button.clientWidth, button.clientHeight);
  const radius = diameter / 2;

  circle.style.width = circle.style.height = `${diameter}px`;
  circle.style.left = `${event.clientX - button.offsetLeft - radius}px`;
  circle.style.top = `${event.clientY - button.offsetTop - radius}px`;
  circle.classList.add('ripple');

  const ripple = button.getElementsByClassName('ripple')[0];
  if (ripple) {
    ripple.remove();
  }

  button.appendChild(circle);
  setTimeout(() => circle.remove(), 600);
}

export default function GameRankings() {
  const [games, setGames] = useState<GameRanking[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>('totalSessions');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRankings();
  }, []);

  async function loadRankings() {
    setLoading(true);
    setError(null);
    const result = await gameApi.getRankings();
    if (result.error) {
      setError(result.error);
    } else if (result.data) {
      setGames(result.data);
    }
    setLoading(false);
  }

  async function toggleFavorite(game: GameRanking, e: React.MouseEvent<HTMLButtonElement>) {
    createRipple(e);
    const result = await gameApi.toggleFavorite(game.name);
    if (result.error) {
      setError(result.error);
      setTimeout(() => setError(null), 3000);
    } else if (result.data) {
      setGames(games.map(g => (g.name === game.name ? result.data! : g)));
    }
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  }

  const sortedGames = useMemo(() => {
    return [...games].sort((a, b) => {
      let comparison = 0;
      if (sortKey === 'name') {
        comparison = a.name.localeCompare(b.name, 'zh-CN');
      } else {
        comparison = (a[sortKey] as number) - (b[sortKey] as number);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [games, sortKey, sortOrder]);

  const maxSessions = useMemo(() => {
    return Math.max(...games.map(g => g.totalSessions), 1);
  }, [games]);

  const headers: { key: SortKey; label: string }[] = [
    { key: 'name', label: '桌游名称' },
    { key: 'totalSessions', label: '总对局数' },
    { key: 'averageDuration', label: '平均时长(分钟)' },
    { key: 'averageRounds', label: '平均回合数' },
    { key: 'totalNotes', label: '策略笔记数' }
  ];

  if (loading) {
    return (
      <div className="rankings-container">
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">⏳</div>
            <p>加载中...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rankings-container">
      <h1 className="page-title">🏆 桌游热门度排名</h1>

      {error && (
        <div
          className="card"
          style={{
            marginBottom: 16,
            padding: '12px 16px',
            background: '#ffebee',
            color: '#c62828',
            borderLeft: '4px solid #f44336',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <span>⚠️ {error}</span>
          <button
            className="btn btn-secondary"
            style={{ padding: '6px 12px', fontSize: 12 }}
            onClick={loadRankings}
          >
            重试
          </button>
        </div>
      )}

      <div className="card">
        <table className="rankings-table">
          <thead>
            <tr>
              {headers.map(header => (
                <th
                  key={header.key}
                  className={sortKey === header.key ? `sorted-${sortOrder}` : ''}
                  onClick={() => handleSort(header.key)}
                >
                  {header.label}
                </th>
              ))}
              <th style={{ width: 50, textAlign: 'center' }}>收藏</th>
            </tr>
          </thead>
          <tbody>
            {sortedGames.map(game => (
              <tr
                key={game.name}
                className="rankings-row"
                style={{
                  position: 'relative',
                  backgroundImage: `linear-gradient(90deg, rgba(187,222,251,0.3) 0%, rgba(21,101,192,0.3) ${(game.totalSessions / maxSessions) * 100}%, transparent ${(game.totalSessions / maxSessions) * 100}%)`
                }}
              >
                <td className="game-name-cell">{game.name}</td>
                <td>{game.totalSessions}</td>
                <td>{game.averageDuration}</td>
                <td>{game.averageRounds}</td>
                <td>{game.totalNotes}</td>
                <td style={{ textAlign: 'center' }}>
                  <button
                    className={`favorite-btn ${game.isFavorite ? 'active' : ''}`}
                    onClick={e => toggleFavorite(game, e)}
                    title={game.isFavorite ? '取消收藏' : '收藏'}
                  >
                    {game.isFavorite ? '⭐' : '☆'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div
        style={{
          marginTop: 24,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16
        }}
      >
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, fontWeight: 'bold', color: '#64b5f6' }}>{games.length}</div>
          <div style={{ fontSize: 14, color: '#888', marginTop: 4 }}>桌游总数</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, fontWeight: 'bold', color: '#4caf50' }}>
            {games.reduce((sum, g) => sum + g.totalSessions, 0)}
          </div>
          <div style={{ fontSize: 14, color: '#888', marginTop: 4 }}>总对局数</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, fontWeight: 'bold', color: '#ff9800' }}>
            {games.reduce((sum, g) => sum + g.totalNotes, 0)}
          </div>
          <div style={{ fontSize: 14, color: '#888', marginTop: 4 }}>策略笔记</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, fontWeight: 'bold', color: '#9c27b0' }}>
            {games.filter(g => g.isFavorite).length}
          </div>
          <div style={{ fontSize: 14, color: '#888', marginTop: 4 }}>已收藏</div>
        </div>
      </div>
    </div>
  );
}
