import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { booksApi, usersApi } from '../api';
import { useAuth } from '../hooks/useAuth';
import { useExchange } from '../hooks/useExchange';
import type { Book, User } from '../types';

export function BookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const exchange = useExchange();
  const [book, setBook] = useState<Book | null>(null);
  const [owner, setOwner] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    booksApi
      .getById(id)
      .then(async (b) => {
        setBook(b);
        const o = await usersApi.getById(b.ownerId);
        setOwner(o);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleRequest = async () => {
    if (!user || !book) return;
    if (book.ownerId === user.id) {
      alert('这是你自己的图书');
      return;
    }
    setRequesting(true);
    try {
      await exchange.createRequest({
        bookId: book.id,
        requesterId: user.id,
        ownerId: book.ownerId,
      });
      setSuccess(true);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setRequesting(false);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: 80, textAlign: 'center' }}>
        <div className="loading-spinner" />
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="container">
        <button
          onClick={() => navigate(-1)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 24,
            background: 'transparent',
            color: '#57534e',
            fontSize: 14,
          }}
        >
          <ArrowLeft size={18} />
          返回
        </button>
        <div
          style={{
            textAlign: 'center',
            padding: 60,
            color: '#78716c',
          }}
        >
          <AlertCircle size={48} style={{ margin: '0 auto 16px' }} />
          <p>{error || '图书不存在'}</p>
        </div>
      </div>
    );
  }

  const isOwner = user?.id === book.ownerId;

  return (
    <div className="container">
      <button
        onClick={() => navigate(-1)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginBottom: 24,
          background: 'transparent',
          color: '#57534e',
          fontSize: 14,
        }}
      >
        <ArrowLeft size={18} />
        返回
      </button>

      <div
        className="card"
        style={{
          display: 'flex',
          gap: 40,
          padding: 32,
        }}
      >
        <div style={{ flexShrink: 0 }}>
          <img
            src={book.coverUrl}
            alt={book.title}
            style={{
              width: 240,
              height: 340,
              borderRadius: 12,
              objectFit: 'cover',
              background: '#f5f5f4',
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            }}
          />
        </div>

        <div style={{ flex: 1 }}>
          <h1
            style={{
            fontSize: 28,
            fontWeight: 700,
            marginBottom: 8,
            color: '#292524',
          }}
          >
            {book.title}
          </h1>
          <p
            style={{
              fontSize: 16,
              color: '#57534e',
              marginBottom: 24,
            }}
          >
            作者：{book.author}
          </p>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              marginBottom: 32,
            }}
          >
            <div style={{ display: 'flex', fontSize: 14, color: '#57534e' }}>
            <span style={{ width: 80, color: '#a8a29e' }}>ISBN</span>
            <span>{book.isbn}</span>
          </div>
          <div style={{ display: 'flex', fontSize: 14, color: '#57534e' }}>
            <span style={{ width: 80, color: '#a8a29e' }}>书况</span>
            <span>{book.condition}</span>
          </div>
          {owner && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                fontSize: 14,
                color: '#57534e',
              }}
            >
              <span style={{ width: 80, color: '#a8a29e' }}>持有者</span>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <img
                  src={owner.avatar}
                  alt={owner.nickname}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                  }}
                />
                <span>{owner.nickname}</span>
              </div>
            </div>
          )}
        </div>

        <div style={{ marginTop: 'auto' }}>
          {success ? (
            <div
              style={{
                padding: 12,
                background: '#dcfce7',
                color: '#16a34a',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 500,
                textAlign: 'center',
              }}
            >
              请求已发送，请等待对方确认
            </div>
          ) : isOwner ? (
            <div
              style={{
                padding: 12,
                background: '#fef3c7',
                color: '#92400e',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 500,
                textAlign: 'center',
              }}
            >
              这是你的图书
            </div>
          ) : !user ? (
            <button
              className="btn-primary"
              onClick={() => navigate('/login')}
              style={{ padding: '12px 32px', fontSize: 15 }}
            >
              登录后请求交换
            </button>
          ) : (
            <button
              className="btn-primary"
              onClick={handleRequest}
              disabled={requesting}
              style={{
                padding: '12px 32px',
                fontSize: 15,
                opacity: requesting ? 0.6 : 1,
              }}
            >
              {requesting ? '发送中...' : '请求交换'}
            </button>
          )}
        </div>
      </div>
    </div>

    <style>{`
      @media (max-width: 768px) {
        .container > div:last-child {
          flex-direction: column !important;
        }
        .container > div:last-child > div:first-child {
          margin: 0 auto;
        }
      }
    `}</style>
    </div>
  );
}
