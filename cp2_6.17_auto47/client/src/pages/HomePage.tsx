import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Clock, ArrowRight, BookOpen, Wind, Loader2 } from 'lucide-react';
import { BookCard } from '../components/BookCard';
import { useBooks } from '../hooks/useBooks';
import { useExchange } from '../hooks/useExchange';
import type { Book, ExchangeRecord } from '../types';
import { fromNow } from '../utils';
import { booksApi } from '../api';

export function HomePage() {
  const books = useBooks();
  const exchange = useExchange();
  const [recentBooks, setRecentBooks] = useState<Book[]>([]);
  const [recentRecords, setRecentRecords] = useState<ExchangeRecord[]>([]);
  const [booksLoading, setBooksLoading] = useState(true);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [allBooks, setAllBooks] = useState<Book[]>([]);

  useEffect(() => {
    Promise.allSettled([
      books.getRecent().then((data) => {
        setRecentBooks(data);
        setBooksLoading(false);
      }),
      booksApi.list().then((all) => {
        setAllBooks(all);
      }).catch(() => {}),
      exchange.getRecent().then((data) => {
        setRecentRecords(data);
        setRecordsLoading(false);
      }).catch(() => setRecordsLoading(false)),
    ]);
  }, []);

  const bookMap = useMemo(() => {
    const map = new Map<string, Book>();
    allBooks.forEach((b) => map.set(b.id, b));
    recentBooks.forEach((b) => map.set(b.id, b));
    return map;
  }, [allBooks, recentBooks]);

  const renderBooksEmpty = () => (
    <div
      style={{
        padding: '60px 20px',
        textAlign: 'center',
        background: '#fafaf9',
        borderRadius: 12,
        border: '1px dashed #d6d3d1',
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: '#fef3c7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
        }}
      >
        <BookOpen size={24} style={{ color: '#d97706' }} />
      </div>
      <p style={{ fontSize: 15, fontWeight: 600, color: '#44403c', marginBottom: 6 }}>
        暂无最近上架图书
      </p>
      <p style={{ fontSize: 13, color: '#a8a29e', marginBottom: 20 }}>
        快来成为第一位分享图书的人吧
      </p>
      <Link to="/register">
        <button
          className="btn-primary"
          style={{ padding: '10px 20px', fontSize: 14 }}
        >
          加入社区
        </button>
      </Link>
    </div>
  );

  const renderRecordsEmpty = () => (
    <div
      style={{
        padding: '48px 20px',
        textAlign: 'center',
        background: '#fafaf9',
        borderRadius: 12,
        border: '1px dashed #d6d3d1',
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: '#f0fdf4',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
        }}
      >
        <Wind size={22} style={{ color: '#16a34a' }} />
      </div>
      <p style={{ fontSize: 15, fontWeight: 600, color: '#44403c', marginBottom: 6 }}>
        暂无漂流动态
      </p>
      <p style={{ fontSize: 13, color: '#a8a29e' }}>
        当有图书完成交换时，动态将展示在这里
      </p>
    </div>
  );

  return (
    <div className="container">
      <div
        style={{
          background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 50%, #fbbf24 100%)',
          borderRadius: 16,
          padding: '48px 40px',
          marginBottom: 48,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ maxWidth: 520, position: 'relative', zIndex: 1 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 16,
            }}
          >
            <Sparkles size={20} style={{ color: '#d97706' }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: '#92400e' }}>
              让每一本书都有新旅程
            </span>
          </div>
          <h1
            style={{
              fontSize: 36,
              fontWeight: 700,
              color: '#78350f',
              marginBottom: 16,
              lineHeight: 1.2,
            }}
          >
            社区图书漂流
          </h1>
          <p
            style={{
              fontSize: 16,
              color: '#92400e',
              marginBottom: 28,
              lineHeight: 1.6,
            }}
          >
            与邻居交换好书，记录每一本漂流的故事。加入我们，开启你的图书之旅。
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            <Link to="/books">
              <button
                className="btn-primary"
                style={{ padding: '12px 24px', fontSize: 15 }}
              >
                浏览图书
              </button>
            </Link>
            <Link to="/register">
              <button
                className="btn-secondary"
                style={{
                  padding: '12px 24px',
                  fontSize: 15,
                  background: 'rgba(255,255,255,0.8)',
                }}
              >
                加入社区
              </button>
            </Link>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 48 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 24,
          }}
        >
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#292524' }}>
            最近上架
          </h2>
          <Link
            to="/books"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            查看全部 <ArrowRight size={16} />
          </Link>
        </div>

        {booksLoading ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                color: '#a8a29e',
              }}
            >
              <Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} />
              <span style={{ fontSize: 14 }}>加载中...</span>
            </div>
          </div>
        ) : recentBooks.length === 0 ? (
          renderBooksEmpty()
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, 180px)',
              gap: '24px 20px',
              justifyContent: 'space-between',
            }}
          >
            {recentBooks.map((book, i) => (
              <BookCard key={book.id} book={book} index={i} />
            ))}
          </div>
        )}
      </div>

      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 24,
          }}
        >
          <Clock size={20} style={{ color: '#d97706' }} />
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#292524' }}>
            漂流动态
          </h2>
        </div>

        {recordsLoading ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                color: '#a8a29e',
              }}
            >
              <Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} />
              <span style={{ fontSize: 14 }}>加载中...</span>
            </div>
          </div>
        ) : recentRecords.length === 0 ? (
          renderRecordsEmpty()
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {recentRecords.map((record, i) => {
              const book = bookMap.get(record.bookId);
              return (
                <div
                  key={record.id}
                  className="card"
                  style={{
                    padding: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    opacity: 0,
                    animation: `fadeInUp 0.4s ease ${i * 100}ms forwards`,
                    cursor: 'pointer',
                    transition: 'box-shadow 0.2s ease',
                  }}
                  onClick={() => {
                    if (book) {
                      window.location.href = `/books/${book.id}`;
                    }
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '';
                  }}
                >
                  {book ? (
                    <img
                      src={book.coverUrl}
                      alt={book.title}
                      style={{
                        width: 44,
                        height: 60,
                        borderRadius: 8,
                        objectFit: 'cover',
                        background: '#e7e5e4',
                        flexShrink: 0,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 44,
                        height: 60,
                        borderRadius: 8,
                        background: '#f5f5f4',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <BookOpen size={18} style={{ color: '#a8a29e' }} />
                    </div>
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: 14,
                        color: '#292524',
                        fontWeight: 500,
                        marginBottom: 4,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {book
                        ? `《${book.title}》完成第 ${record.chain.length + 1} 次漂流`
                        : '一本图书完成交换'}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Sparkles size={12} style={{ color: '#d97706' }} />
                      <span style={{ fontSize: 12, color: '#78716c' }}>
                        已流转 {record.chain.length + 1} 次
                      </span>
                      <span style={{ fontSize: 11, color: '#d6d3d1' }}>·</span>
                      <span
                        style={{
                          fontSize: 12,
                          color:
                            record.status === 'completed'
                              ? '#16a34a'
                              : record.status === 'active'
                              ? '#d97706'
                              : '#78716c',
                          fontWeight: 500,
                        }}
                      >
                        {record.status === 'completed'
                          ? '已归还'
                          : record.status === 'active'
                          ? '漂流中'
                          : '已关闭'}
                      </span>
                    </div>
                  </div>

                  <div style={{ flexShrink: 0, textAlign: 'right' }}>
                    <span
                      style={{
                        fontSize: 12,
                        color: '#a8a29e',
                        display: 'block',
                        marginBottom: 2,
                      }}
                    >
                      {fromNow(record.lentAt)}
                    </span>
                    <span style={{ fontSize: 11, color: '#d6d3d1' }}>
                      {record.status === 'active'
                        ? `预计 ${fromNow(record.expectedReturnAt)}`
                        : record.returnedAt
                        ? `${fromNow(record.returnedAt)}归还`
                        : ''}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @media (max-width: 768px) {
          .container > div:first-child {
            padding: 32px 20px !important;
          }
          .container > div:first-child h1 {
            font-size: 26px !important;
          }
        }
      `}</style>
    </div>
  );
}
