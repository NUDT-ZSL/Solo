import { useState } from 'react';
import { Book, InteractionType, TAG_HUES } from '../types';

interface Props {
  books: Book[];
  onInteract: (bookId: string, action: InteractionType) => void;
}

interface ActionHintState {
  bookId: string;
  text: string;
}

export default function RecommendationPanel({ books, onInteract }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [bouncingLike, setBouncingLike] = useState<string | null>(null);
  const [activeFavorite, setActiveFavorite] = useState<Set<string>>(new Set());
  const [hint, setHint] = useState<ActionHintState | null>(null);
  const hintTimer = useState<number | null>(null)[1] as unknown as { current: number | null };

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.action-btn, .action-group, .action-hint')) {
      return;
    }
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const showHint = (bookId: string, text: string) => {
    setHint({ bookId, text });
    if (hintTimer.current) window.clearTimeout(hintTimer.current);
    hintTimer.current = window.setTimeout(() => setHint(null), 2000);
  };

  const handleLike = (bookId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setBouncingLike(bookId);
    window.setTimeout(() => setBouncingLike(null), 200);
    onInteract(bookId, 'like');
    showHint(bookId, '你更喜欢这类书！');
  };

  const handleFavorite = (bookId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveFavorite((prev) => {
      const next = new Set(prev);
      if (next.has(bookId)) {
        next.delete(bookId);
      } else {
        next.add(bookId);
      }
      return next;
    });
    onInteract(bookId, 'favorite');
    showHint(bookId, '已添加到收藏夹 ⭐');
  };

  const handleIgnore = (bookId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onInteract(bookId, 'ignore');
    showHint(bookId, '减少此类推荐');
  };

  return (
    <div className="recommendations-grid">
      {books.map((book) => {
        const isExpanded = expandedId === book.id;
        const hue = TAG_HUES[book.primaryTag] ?? 210;
        const coverGradient = `linear-gradient(135deg, hsl(${hue}, 85%, 60%), hsl(${(hue + 40) % 360}, 80%, 45%))`;
        const initial = book.title.charAt(0);
        const score = book.matchScore ?? 0;
        const hintShow = hint?.bookId === book.id;

        return (
          <div
            key={book.id}
            className={`book-card ${isExpanded ? 'expanded' : ''}`}
            onClick={(e) => toggleExpand(book.id, e)}
          >
            <div className="book-meta">
              <div
                className="book-cover"
                style={{ background: coverGradient }}
              >
                {initial}
              </div>
              <div className="book-info">
                <h3 className="book-title" title={book.title}>
                  {book.title}
                </h3>
                <p className="book-author">{book.author}</p>
                <div className="book-tags">
                  {book.tags.map((tag) => (
                    <span
                      key={tag}
                      className={`book-tag ${tag === book.primaryTag ? 'primary' : ''}`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="card-actions">
              <span className="match-score-pill">
                匹配 {(score * 100).toFixed(0)}%
              </span>
              <div className="action-group">
                <button
                  className={`action-btn like ${bouncingLike === book.id ? 'bounce' : ''}`}
                  onClick={(e) => handleLike(book.id, e)}
                  aria-label="点赞"
                  title="点赞 · 权重+10%"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                </button>
                <button
                  className={`action-btn favorite ${activeFavorite.has(book.id) ? 'active' : ''}`}
                  onClick={(e) => handleFavorite(book.id, e)}
                  aria-label="收藏"
                  title="收藏 · 权重+20%"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill={activeFavorite.has(book.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </button>
                <button
                  className="action-btn ignore"
                  onClick={(e) => handleIgnore(book.id, e)}
                  aria-label="忽略"
                  title="忽略 · 权重-15%"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              {hintShow && (
                <div className={`action-hint ${hintShow ? 'show' : ''}`}>
                  {hint!.text}
                </div>
              )}
            </div>

            <div className="book-details">
              <div className="score-display">
                <span>算法匹配分</span>
                <span className="score-value">{(score * 100).toFixed(1)}%</span>
              </div>
              <p className="book-description">{book.description}</p>
              <div className="recommend-reason">
                💡 {book.recommendReason ?? '系统为您精选'}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
