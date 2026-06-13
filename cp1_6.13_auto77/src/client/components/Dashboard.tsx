import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { decksApi, statsApi, Deck, UserStats } from '../api';
import { formatDistanceToNow, zhCN } from 'date-fns';

function AnimatedCounter({ value, duration = 500 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (value === 0) {
      setCount(0);
      return;
    }

    let startTime: number | null = null;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(easeOut * value));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [value, duration]);

  return <>{count}</>;
}

export default function Dashboard() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [localStats, setLocalStats] = useState<UserStats | null>(null);
  const navigate = useNavigate();
  const { stats: contextStats, refreshStats } = useAuth();

  const stats = localStats || contextStats;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [decksData, statsData] = await Promise.all([
          decksApi.getAll(),
          statsApi.getStats(),
        ]);
        setDecks(decksData);
        setLocalStats(statsData);
      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleDeckClick = (deckId: string) => {
    navigate(`/review/${deckId}`);
  };

  const formatLastPractice = (dateStr?: string) => {
    if (!dateStr) return '尚未练习';
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: zhCN });
    } catch {
      return '未知';
    }
  };

  const todayLearned = stats?.todayLearned ?? 0;
  const totalCards = stats?.totalCards ?? 0;
  const streakDays = stats?.streakDays ?? 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">欢迎回来 👋</h1>
          <p className="page-subtitle">选择一个卡片组开始今天的学习吧</p>
        </div>
      </div>

      <div className="stats-section">
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: '#dbeafe', color: '#3b82f6' }}>
            📚
          </div>
          <div className="stat-card-label">总卡片数</div>
          <div className="stat-card-value">
            <AnimatedCounter value={totalCards} />
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: '#dcfce7', color: '#22c55e' }}>
            🎯
          </div>
          <div className="stat-card-label">今日已学习</div>
          <div className="stat-card-value">
            <AnimatedCounter value={todayLearned} />
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: '#fef3c7', color: '#f59e0b' }}>
            🔥
          </div>
          <div className="stat-card-label">连续学习</div>
          <div className="stat-card-value">
            <AnimatedCounter value={streakDays} />
            <span style={{ fontSize: 18, color: '#94a3b8', marginLeft: 4 }}>天</span>
          </div>
        </div>
      </div>

      <h2 className="section-title">我的卡片组</h2>

      {loading ? (
        <div className="empty-state">
          <div className="empty-state-icon">⏳</div>
          <p className="empty-state-text">加载中...</p>
        </div>
      ) : decks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📭</div>
          <p className="empty-state-text">还没有卡片组，去创建一些吧！</p>
        </div>
      ) : (
        <div className="decks-grid">
          {decks.map((deck) => (
            <div
              key={deck.id}
              className="deck-card"
              style={{ backgroundColor: deck.themeColor }}
              onClick={() => handleDeckClick(deck.id)}
            >
              <div className="deck-name">{deck.name}</div>
              <div className="deck-footer">
                <span className="deck-count">{deck.cardCount} 个单词</span>
                <span className="deck-last-practice">
                  {formatLastPractice(deck.lastPracticedAt)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
