import { useNavigate } from 'react-router-dom';
import type { Book } from '../types';
import { useUser } from '../context/UserContext';
import { useState } from 'react';

interface BookCardProps {
  book: Book;
  onReserve?: (bookId: string) => void;
  delay?: number;
}

export function BookCard({ book, onReserve, delay = 0 }: BookCardProps) {
  const navigate = useNavigate();
  const { user } = useUser();
  const [toast, setToast] = useState<string | null>(null);

  const handleClick = () => {
    navigate(`/books/${book.id}`);
  };

  const handleReserve = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      setToast('请先登录');
      setTimeout(() => setToast(null), 2000);
      navigate('/login');
      return;
    }
    if (onReserve) {
      onReserve(book.id);
    }
  };

  const styles = `
    .book-card {
      width: 200px;
      height: 280px;
      border-radius: 10px;
      background: #ffffff;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
      transition: box-shadow 0.25s ease, transform 0.25s ease;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      position: relative;
    }
    .book-card:hover {
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      transform: translateY(-4px);
    }
    .book-card-cover {
      height: 140px;
      background: linear-gradient(135deg, #8b5cf6 0%, #f59e0b 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 20px;
      font-weight: 600;
      text-align: center;
      padding: 0 12px;
    }
    .book-card-body {
      padding: 12px;
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    .book-card-title {
      font-size: 15px;
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 4px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .book-card-author {
      font-size: 13px;
      color: #6b7280;
      margin-bottom: 8px;
    }
    .book-card-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: auto;
    }
    .book-card-rating {
      font-size: 13px;
      color: #f59e0b;
      font-weight: 600;
    }
    .book-card-stock {
      font-size: 12px;
      color: #6b7280;
    }
    .book-card-reserve-btn {
      margin-top: 10px;
      padding: 6px 14px;
      background: #8b5cf6;
      color: white;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      transition: background 0.2s ease;
    }
    .book-card-reserve-btn:hover:not(:disabled) {
      background: #7c3aed;
    }
    .book-card-reserve-btn:disabled {
      background: #d1d5db;
      cursor: not-allowed;
    }
    .book-card-toast {
      position: absolute;
      top: 12px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0,0,0,0.75);
      color: white;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      z-index: 10;
    }
  `;

  return (
    <>
      <style>{styles}</style>
      <div
        className="book-card slide-up-animate"
        style={{ animationDelay: `${delay}ms` }}
        onClick={handleClick}
      >
        {toast && <div className="book-card-toast">{toast}</div>}
        <div className="book-card-cover">{book.title}</div>
        <div className="book-card-body">
          <div className="book-card-title">{book.title}</div>
          <div className="book-card-author">{book.author}</div>
          <div className="book-card-meta">
            <span className="book-card-rating">★ {book.doubanRating}</span>
            <span className="book-card-stock">库存 {book.stock}</span>
          </div>
          <button
            className="book-card-reserve-btn"
            onClick={handleReserve}
            disabled={book.stock <= 0}
          >
            {book.stock > 0 ? '预约借阅' : '已借完'}
          </button>
        </div>
      </div>
    </>
  );
}
