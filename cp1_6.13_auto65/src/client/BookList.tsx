import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import type { Book, User } from './App';

const CARD_WIDTH = 280;
const CARD_HEIGHT = 400;
const CARD_GAP = 24;
const COLS_DESKTOP = 4;
const COLS_MOBILE = 2;
const MOBILE_BREAKPOINT = 768;

interface BookListProps {
  books: Book[];
  loading: boolean;
  user: User | null;
  onBorrow: (bookId: string) => void;
  onReturn: (bookId: string) => void;
}

export default function BookList({ books, loading, user, onBorrow, onReturn }: BookListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(0);
  const [cols, setCols] = useState(COLS_DESKTOP);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  const updateLayout = useCallback(() => {
    if (!containerRef.current) return;
    const width = containerRef.current.clientWidth;
    const newCols = width < MOBILE_BREAKPOINT ? COLS_MOBILE : COLS_DESKTOP;
    setCols(newCols);
    setContainerHeight(containerRef.current.clientHeight);
    setScrollTop(containerRef.current.scrollTop);
  }, []);

  useEffect(() => {
    updateLayout();
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(updateLayout);
    observer.observe(el);
    return () => observer.disconnect();
  }, [updateLayout]);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    setScrollTop(containerRef.current.scrollTop);
  }, []);

  useEffect(() => {
    if (containerHeight === 0) return;
    const rowHeight = CARD_HEIGHT + CARD_GAP;
    const totalRows = Math.ceil(books.length / cols);
    const firstVisibleRow = Math.floor(scrollTop / rowHeight);
    const visibleRows = Math.ceil(containerHeight / rowHeight) + 2;
    const startRow = Math.max(0, firstVisibleRow - 1);
    const endRow = Math.min(totalRows, startRow + visibleRows + 1);
    const startIndex = startRow * cols;
    const endIndex = Math.min(books.length, endRow * cols);
    setVisibleCount(endIndex - startIndex);
  }, [scrollTop, containerHeight, cols, books.length]);

  useEffect(() => {
    if (books.length > 0 && visibleCount === 0) {
      setVisibleCount(Math.min(cols * 3, books.length));
    }
  }, [books.length, cols, visibleCount]);

  const displayBooks = books.slice(0, Math.max(visibleCount, cols * 2));
  const totalHeight = Math.ceil(books.length / cols) * (CARD_HEIGHT + CARD_GAP);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
        <div style={{ width: 40, height: 40, border: '3px solid #e5e7eb', borderTopColor: '#f97316', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  if (books.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <p style={{ fontSize: 48, marginBottom: 16 }}>📖</p>
        <p style={{ color: '#6b7280', fontSize: 16 }}>书架空空如也，快去添加第一本书吧！</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      style={{
        position: 'relative',
        height: Math.min(totalHeight, 800),
        overflowY: 'auto',
        overflowX: 'hidden',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, ${CARD_WIDTH}px)`,
          gap: `${CARD_GAP}px`,
          justifyContent: 'center',
          padding: `${CARD_GAP}px 0`,
        }}
      >
        {displayBooks.map((book) => (
          <BookCard
            key={book._id}
            book={book}
            user={user}
            onBorrow={onBorrow}
            onReturn={onReturn}
          />
        ))}
      </div>
    </div>
  );
}

function BookCard({ book, user, onBorrow, onReturn }: { book: Book; user: User | null; onBorrow: (id: string) => void; onReturn: (id: string) => void }) {
  const [hovered, setHovered] = useState(false);

  const isOverdue = book.status === 'borrowed' && book.dueDate && new Date(book.dueDate) < new Date();
  const isNearDue = book.status === 'borrowed' && book.dueDate && !isOverdue &&
    (new Date(book.dueDate).getTime() - Date.now()) < 3 * 24 * 60 * 60 * 1000;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        borderRadius: 16,
        background: '#fff',
        boxShadow: hovered
          ? '0 12px 32px rgba(0,0,0,0.12)'
          : '0 2px 2px rgba(0,0,0,0.06)',
        transform: hovered ? 'translateY(-8px)' : 'translateY(0)',
        transition: 'all 0.3s ease',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
      }}
    >
      <div style={{
        height: 180,
        background: book.coverUrl
          ? `url(${book.coverUrl}) center/cover`
          : 'linear-gradient(135deg, #fef3c7, #fed7aa)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}>
        {!book.coverUrl && <span style={{ fontSize: 48 }}>📚</span>}
        <div style={{
          position: 'absolute',
          top: 10,
          right: 10,
          padding: '4px 10px',
          borderRadius: 20,
          fontSize: 12,
          fontWeight: 600,
          background: book.status === 'available' ? '#dcfce7' : (isOverdue ? '#fee2e2' : '#fef3c7'),
          color: book.status === 'available' ? '#166534' : (isOverdue ? '#991b1b' : '#92400e'),
        }}>
          {book.status === 'available' ? '可借阅' : (isOverdue ? '已逾期' : '借出中')}
        </div>
        {isNearDue && (
          <div style={{
            position: 'absolute', top: 10, left: 10,
            width: 8, height: 8, borderRadius: '50%',
            background: '#f59e0b',
            animation: 'pulseDot 1.5s ease infinite',
          }} />
        )}
      </div>
      <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1f2937', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {book.title}
        </h3>
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>{book.author}</p>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <span style={{ fontSize: 12, color: '#9ca3af' }}>持有人:</span>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>
            {book.currentHolderName || '—'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link
            to={`/trail/${book._id}`}
            style={{
              flex: 1,
              padding: '8px 0',
              textAlign: 'center',
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              fontSize: 13,
              color: '#374151',
              textDecoration: 'none',
              fontWeight: 500,
              transition: 'all 0.3s ease',
            }}
          >
            漂流轨迹
          </Link>
          {book.status === 'available' && user && book.currentHolder !== user._id && (
            <button
              onClick={() => onBorrow(book._id)}
              style={{
                flex: 1,
                padding: '8px 0',
                background: 'linear-gradient(135deg, #f97316, #ea580c)',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
            >
              借阅
            </button>
          )}
          {book.status === 'borrowed' && user && book.currentHolder === user._id && (
            <button
              onClick={() => onReturn(book._id)}
              style={{
                flex: 1,
                padding: '8px 0',
                background: '#dcfce7',
                color: '#166534',
                border: 'none',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
            >
              归还
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
