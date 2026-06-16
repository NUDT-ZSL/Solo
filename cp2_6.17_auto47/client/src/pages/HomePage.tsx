import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Clock, ArrowRight } from 'lucide-react';
import { BookCard } from '../components/BookCard';
import { useBooks } from '../hooks/useBooks';
import { useExchange } from '../hooks/useExchange';
import type { Book, ExchangeRecord } from '../types';
import { fromNow } from '../utils';

export function HomePage() {
  const books = useBooks();
  const exchange = useExchange();
  const [recentBooks, setRecentBooks] = useState<Book[]>([]);
  const [recentRecords, setRecentRecords] = useState<ExchangeRecord[]>([]);
  const [booksLoading, setBooksLoading] = useState(true);
  const [recordsLoading, setRecordsLoading] = useState(true);

  useEffect(() => {
    books.getRecent().then((data) => {
      setRecentBooks(data);
      setBooksLoading(false);
    });
    exchange.getRecent().then((data) => {
      setRecentRecords(data);
      setRecordsLoading(false);
    });
  }, []);

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
          <div style={{ padding: 40, textAlign: 'center' }}>
            <div className="loading-spinner" />
          </div>
        ) : recentBooks.length === 0 ? (
          <div
            style={{
              padding: 40,
              textAlign: 'center',
              color: '#78716c',
              fontSize: 14,
            }}
          >
            暂无图书
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, 180px)',
              gap: 20,
              justifyContent: 'space-between',
            }}
          >
            {recentBooks.map((book, i) => (
              <BookCard key={book.id} book={book} index={i} />
            ))}
          </div>
        )}
      </div>

      {recentRecords.length > 0 && (
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {recentRecords.map((record, i) => (
              <div
                key={record.id}
                className="card"
                style={{
                  padding: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  opacity: 0,
                  animation: `fadeInUp 0.4s ease ${i * 100}ms forwards`,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: '#fef3c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Sparkles size={18} style={{ color: '#d97706' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, color: '#292524', fontWeight: 500 }}>
                    一本图书完成交换
                  </p>
                </div>
                <span style={{ fontSize: 12, color: '#a8a29e' }}>
                  {fromNow(record.lentAt)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
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
