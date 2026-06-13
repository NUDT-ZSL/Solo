import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import type { Book, User } from './App';

const CARD_WIDTH = 280;
const CARD_HEIGHT = 400;
const CARD_GAP = 24;
const COLS_DESKTOP = 4;
const COLS_MOBILE = 2;
const MOBILE_BREAKPOINT = 640;
const BUFFER_ROWS = 2;

interface BookListProps {
  books: Book[];
  loading: boolean;
  user: User | null;
  onBorrow: (bookId: string) => void;
  onReturn: (bookId: string) => void;
}

export default function BookList({ books, loading, user, onBorrow, onReturn }: BookListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportH, setViewportH] = useState(800);
  const [cols, setCols] = useState(COLS_DESKTOP);
  const [qrBook, setQrBook] = useState<Book | null>(null);

  const updateLayout = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setViewportH(el.clientHeight);
    setCols(el.clientWidth < MOBILE_BREAKPOINT ? COLS_MOBILE : COLS_DESKTOP);
  }, []);

  useEffect(() => {
    updateLayout();
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(updateLayout);
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateLayout]);

  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
      setScrollTop(scrollRef.current.scrollTop);
    }
  }, []);

  const rowH = CARD_HEIGHT + CARD_GAP;
  const totalRows = Math.ceil(books.length / cols);
  const totalH = totalRows * rowH;

  const firstVisibleRow = Math.max(0, Math.floor(scrollTop / rowH) - BUFFER_ROWS);
  const visibleRowCount = Math.ceil(viewportH / rowH) + 2 * BUFFER_ROWS + 1;
  const lastVisibleRow = Math.min(totalRows - 1, firstVisibleRow + visibleRowCount);

  const startIdx = firstVisibleRow * cols;
  const endIdx = Math.min(books.length, (lastVisibleRow + 1) * cols);

  const visibleBooks = useMemo(() => books.slice(startIdx, endIdx), [books, startIdx, endIdx]);

  const offsetY = firstVisibleRow * rowH;

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
    <>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{
          height: Math.min(totalH, 800),
          overflowY: 'auto',
          overflowX: 'hidden',
          position: 'relative',
        }}
      >
        <div style={{ height: totalH, position: 'relative' }}>
          <div
            style={{
              position: 'absolute',
              top: offsetY,
              left: 0,
              right: 0,
              display: 'grid',
              gridTemplateColumns: `repeat(${cols}, ${CARD_WIDTH}px)`,
              gap: `${CARD_GAP}px`,
              justifyContent: 'center',
              padding: `0 ${CARD_GAP / 2}px`,
            }}
          >
            {visibleBooks.map((book) => (
              <BookCard
                key={book._id}
                book={book}
                user={user}
                onBorrow={onBorrow}
                onReturn={onReturn}
                onShowQr={setQrBook}
              />
            ))}
          </div>
        </div>
      </div>

      {qrBook && (
        <QrModal book={qrBook} onClose={() => setQrBook(null)} />
      )}
    </>
  );
}

function QrModal({ book, onClose }: { book: Book; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 16, padding: 32,
          width: 360, maxWidth: '90vw',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          textAlign: 'center',
        }}
      >
        <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1f2937', marginBottom: 4 }}>{book.title}</h3>
        <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 20 }}>{book.author}</p>
        <div style={{
          display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 10,
          background: '#f9fafb', padding: 20, borderRadius: 12,
        }}>
          <QRCodeSVG
            value={`${window.location.origin}/trail/${book._id}`}
            size={160}
            level="M"
            bgColor="#ffffff"
            fgColor="#1f2937"
          />
          <span style={{ fontSize: 12, color: '#6b7280' }}>扫描二维码借阅此书</span>
        </div>
        <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 12 }}>
          QR码ID: {book.qrCode}
        </p>
        <button
          onClick={onClose}
          style={{
            marginTop: 20, padding: '8px 32px',
            background: 'linear-gradient(135deg, #f97316, #ea580c)',
            color: '#fff', border: 'none', borderRadius: 8,
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}
        >
          关闭
        </button>
      </div>
    </div>
  );
}

function BookCard({ book, user, onBorrow, onReturn, onShowQr }: {
  book: Book; user: User | null;
  onBorrow: (id: string) => void; onReturn: (id: string) => void;
  onShowQr: (book: Book) => void;
}) {
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
          position: 'absolute', top: 10, right: 10,
          padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
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
        <button
          onClick={() => onShowQr(book)}
          title="查看借阅二维码"
          style={{
            position: 'absolute', bottom: 8, right: 8,
            width: 32, height: 32, borderRadius: 8,
            background: 'rgba(255,255,255,0.9)', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', fontSize: 16,
            boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
            transition: 'all 0.3s ease',
          }}
        >
          ⬛
        </button>
      </div>
      <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <h3 style={{
          fontSize: 16, fontWeight: 600, color: '#1f2937', marginBottom: 4,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
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
              flex: 1, padding: '8px 0', textAlign: 'center',
              background: '#f9fafb', border: '1px solid #e5e7eb',
              borderRadius: 8, fontSize: 13, color: '#374151',
              textDecoration: 'none', fontWeight: 500,
              transition: 'all 0.3s ease',
            }}
          >
            漂流轨迹
          </Link>
          {book.status === 'available' && user && book.currentHolder !== user._id && (
            <button
              onClick={() => onBorrow(book._id)}
              style={{
                flex: 1, padding: '8px 0',
                background: 'linear-gradient(135deg, #f97316, #ea580c)',
                color: '#fff', border: 'none', borderRadius: 8,
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
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
                flex: 1, padding: '8px 0',
                background: '#dcfce7', color: '#166534',
                border: 'none', borderRadius: 8,
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
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
