import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Card } from '../types';
import { fetchCards, voteCard } from '../api';
import VoteChart from './VoteChart';

interface CardWallProps {
  searchQuery: string;
  refreshKey: number;
}

function ThumbUpIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 10v12" />
      <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H7V10l5.34-7.12a1.93 1.93 0 0 1 2.66.09Z" />
    </svg>
  );
}

function ThumbDownIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 14V2" />
      <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H17v12l-5.34 7.12a1.93 1.93 0 0 1-2.66-.09Z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function IdeaCard({
  card,
  index,
  onVote,
}: {
  card: Card;
  index: number;
  onVote: (cardId: string, type: 'up' | 'down') => void;
}) {
  const [showChart, setShowChart] = useState(false);
  const [springUp, setSpringUp] = useState(false);
  const [springDown, setSpringDown] = useState(false);
  const [activeVote, setActiveVote] = useState<'up' | 'down' | null>(null);

  const handleVote = (type: 'up' | 'down') => {
    setActiveVote(type);
    if (type === 'up') {
      setSpringUp(true);
      setTimeout(() => setSpringUp(false), 200);
    } else {
      setSpringDown(true);
      setTimeout(() => setSpringDown(false), 200);
    }
    onVote(card.id, type);
  };

  return (
    <div
      className="card-wrapper"
      style={{ animationDelay: `${Math.min(index * 0.05, 0.5)}s` }}
    >
      <div
        className="idea-card"
        style={{ ['--card-color' as any]: card.color }}
      >
        <h3 className="card-title">{card.title}</h3>
        {card.description && (
          <p className="card-desc">{card.description}</p>
        )}
        <div className="card-footer">
          <div className="vote-counts">
            <span className="up-count">▲ {card.upvotes}</span>
            <span className="down-count">▼ {card.downvotes}</span>
          </div>
          <div className="vote-actions">
            <button
              className={`vote-btn up ${activeVote === 'up' ? 'active' : ''} ${
                springUp ? 'spring' : ''
              }`}
              onClick={() => handleVote('up')}
              aria-label="点赞"
              title="点赞"
            >
              <ThumbUpIcon filled={activeVote === 'up'} />
            </button>
            <button
              className={`vote-btn down ${
                activeVote === 'down' ? 'active' : ''
              } ${springDown ? 'spring' : ''}`}
              onClick={() => handleVote('down')}
              aria-label="踩"
              title="踩"
            >
              <ThumbDownIcon filled={activeVote === 'down'} />
            </button>
            <button
              className={`history-btn ${showChart ? 'active' : ''}`}
              onClick={() => setShowChart((s) => !s)}
              aria-label={showChart ? '收起历史' : '查看历史'}
              title="查看投票历史"
            >
              <ClockIcon />
            </button>
          </div>
        </div>
        <div className={`chart-container ${showChart ? 'open' : ''}`}>
          <div className="chart-inner">
            <VoteChart history={card.voteHistory} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CardWall({ searchQuery, refreshKey }: CardWallProps) {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCards = useCallback(async () => {
    try {
      const data = await fetchCards();
      setCards(data);
    } catch (err) {
      console.error('加载卡片失败', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCards();
  }, [loadCards, refreshKey]);

  const filteredCards = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return cards;
    return cards.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q)
    );
  }, [cards, searchQuery]);

  const sortedCards = useMemo(() => {
    return [...filteredCards].sort(
      (a, b) => b.upvotes - b.downvotes - (a.upvotes - a.downvotes)
    );
  }, [filteredCards]);

  const handleVote = useCallback(
    async (cardId: string, type: 'up' | 'down') => {
      const originalCards = [...cards];
      setCards((prev) =>
        prev.map((c) => {
          if (c.id !== cardId) return c;
          const newUp = type === 'up' ? c.upvotes + 1 : c.upvotes;
          const newDown = type === 'down' ? c.downvotes + 1 : c.downvotes;
          const newScore = newUp - newDown;
          const newHistory = [
            ...c.voteHistory,
            {
              type,
              timestamp: new Date().toISOString(),
              score: newScore,
            },
          ].slice(-10);
          return {
            ...c,
            upvotes: newUp,
            downvotes: newDown,
            voteHistory: newHistory,
          };
        })
      );
      try {
        await voteCard(cardId, type);
      } catch (err) {
        console.error('投票失败，回滚', err);
        setCards(originalCards);
      }
    },
    [cards]
  );

  if (loading) {
    return (
      <div className="empty-state">
        <div className="empty-text">加载中...</div>
      </div>
    );
  }

  if (sortedCards.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-cloud">☁️</div>
        <div className="empty-text">
          {searchQuery ? '没有找到匹配的点子，换个关键词试试？' : '还没有点子哦，快来创建第一个！'}
        </div>
      </div>
    );
  }

  return (
    <div className="card-wall">
      {sortedCards.map((card, idx) => (
        <IdeaCard
          key={card.id}
          card={card}
          index={idx}
          onVote={handleVote}
        />
      ))}
    </div>
  );
}
