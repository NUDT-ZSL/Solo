import { useState, useEffect } from 'react';
import type { Book } from '../types';
import './BookCard.css';

interface BookCardProps {
  book: Book;
  index: number;
  onBorrow: (id: string) => Promise<boolean>;
  onCancel: (id: string) => Promise<boolean>;
}

const categoryGradients: Record<string, string> = {
  '文学': 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
  '科幻': 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)',
  '历史': 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)',
  '童话': 'linear-gradient(135deg, #f472b6 0%, #ec4899 100%)',
  '小说': 'linear-gradient(135deg, #34d399 0%, #10b981 100%)',
  '科普': 'linear-gradient(135deg, #22d3ee 0%, #06b6d4 100%)',
  '古典': 'linear-gradient(135deg, #fb923c 0%, #f97316 100%)'
};

export function BookCard({ book, index, onBorrow, onCancel }: BookCardProps) {
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(false);
  const isBorrowed = book.status === 'borrowed';

  const gradient = categoryGradients[book.category] || 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)';

  useEffect(() => {
    if (!isBorrowed && highlight) {
      const timer = setTimeout(() => setHighlight(false), 1200);
      return () => clearTimeout(timer);
    }
  }, [isBorrowed, highlight]);

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    try {
      let ok = false;
      if (isBorrowed) {
        ok = await onCancel(book.id);
      } else {
        ok = await onBorrow(book.id);
      }
      if (ok) {
        setHighlight(true);
      }
    } catch (err) {
      console.error('操作失败', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`book-card ${isBorrowed ? 'borrowed' : ''} ${highlight ? 'highlight' : ''}`}
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      {isBorrowed && <div className="card-overlay" />}
      <div className="card-cover" style={{ background: gradient }}>
        <span className="card-category">{book.category}</span>
      </div>
      <div className="card-body">
        <h3 className="card-title" title={book.title}>{book.title}</h3>
        <p className="card-author">{book.author}</p>
        <div className="card-footer">
          <span className={`status-tag ${isBorrowed ? 'status-borrowed' : 'status-available'}`}>
            {isBorrowed ? '已借出' : '在架'}
          </span>
          <button
            className={`borrow-btn ${isBorrowed ? 'cancel-btn' : ''}`}
            disabled={loading}
            onClick={handleClick}
          >
            {loading ? (
              <>
                <span className="spinner" />
                预约中
              </>
            ) : isBorrowed ? (
              '取消预约'
            ) : (
              '预约借书'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
