import { useNavigate } from 'react-router-dom';
import type { Book } from '../types';
import { useUser } from '../context/UserContext';
import { useState, useCallback } from 'react';
import { addToBookshelf } from '../api';
import styles from './BookCard.module.css';

interface BookCardProps {
  book: Book;
  onReserve?: (bookId: string) => void;
  delay?: number;
}

type ShelfBtnState = 'idle' | 'success';

export function BookCard({ book, onReserve, delay = 0 }: BookCardProps) {
  const navigate = useNavigate();
  const { user, refresh } = useUser();
  const [toast, setToast] = useState<string | null>(null);
  const [shelfBtnState, setShelfBtnState] = useState<ShelfBtnState>('idle');

  const showToast = useCallback((msg: string, duration = 2000) => {
    setToast(msg);
    setTimeout(() => setToast(null), duration);
  }, []);

  const handleClick = () => {
    navigate(`/books/${book.id}`);
  };

  const handleReserve = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      showToast('请先登录');
      setTimeout(() => navigate('/login'), 800);
      return;
    }
    if (onReserve) {
      onReserve(book.id);
    }
  };

  const handleAddToShelf = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      showToast('请先登录');
      setTimeout(() => navigate('/login'), 800);
      return;
    }
    try {
      const result = await addToBookshelf(user.id, book.id);
      setShelfBtnState('success');
      showToast(result.message);
      setTimeout(() => {
        setShelfBtnState('idle');
      }, 1500);
      if (result.user) {
        localStorage.setItem(
          'bookstore_user',
          JSON.stringify(result.user)
        );
        refresh();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '操作失败';
      if (msg === '图书已在书架中') {
        setShelfBtnState('success');
        showToast(msg);
        setTimeout(() => setShelfBtnState('idle'), 1500);
      } else {
        showToast(msg);
      }
    }
  };

  const isInShelf =
    user?.bookshelf?.some((item) => item.bookId === book.id) ?? false;

  const getShelfBtnContent = () => {
    if (shelfBtnState === 'success' || isInShelf) {
      return (
        <>
          <span>✓</span>
          <span>{isInShelf ? '已加入' : '加入成功'}</span>
        </>
      );
    }
    return (
      <>
        <span>📚</span>
        <span>加入书架</span>
      </>
    );
  };

  const shelfBtnClass = `${styles.shelfBtn} ${
    shelfBtnState === 'success' || isInShelf ? styles.shelfBtnSuccess : ''
  }`;

  return (
    <div
      className={`${styles.bookCard} slide-up-animate`}
      style={{ animationDelay: `${delay}ms` }}
      onClick={handleClick}
    >
      {toast && <div className={styles.toast}>{toast}</div>}
      <div className={styles.cover}>
        {book.title}
        <button className={shelfBtnClass} onClick={handleAddToShelf}>
          {getShelfBtnContent()}
        </button>
      </div>
      <div className={styles.body}>
        <div className={styles.title} title={book.title}>
          {book.title}
        </div>
        <div className={styles.author}>{book.author}</div>
        <div className={styles.meta}>
          <span className={styles.rating}>★ {book.doubanRating}</span>
          <span className={styles.shelf}>{book.shelf}</span>
        </div>
        <button
          className={styles.reserveBtn}
          onClick={handleReserve}
          disabled={book.stock <= 0}
        >
          <span>{book.stock > 0 ? '📖' : '🔒'}</span>
          <span>{book.stock > 0 ? '预约借阅' : '已借完'}</span>
        </button>
      </div>
    </div>
  );
}
