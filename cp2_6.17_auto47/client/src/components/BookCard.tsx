import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Handshake, Check, AlertCircle, Loader2 } from 'lucide-react';
import type { Book } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useExchange } from '../hooks/useExchange';

interface Props {
  book: Book;
  index?: number;
}

export function BookCard({ book, index = 0 }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [status, setStatus] = useState<'idle' | 'requesting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const { user } = useAuth();
  const exchange = useExchange();
  const navigate = useNavigate();

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px' }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const isOwner = user?.id === book.ownerId;

  const handleRequestClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      navigate('/login');
      return;
    }
    if (isOwner) return;
    if (status === 'success') return;
    setShowDialog(true);
    setErrorMsg('');
  };

  const handleConfirmRequest = async () => {
    if (!user) return;
    setStatus('requesting');
    setErrorMsg('');
    try {
      await exchange.createRequest({
        bookId: book.id,
        requesterId: user.id,
        ownerId: book.ownerId,
      });
      setStatus('success');
      setShowDialog(false);
    } catch (e: any) {
      setErrorMsg(e.message || '申请失败');
      setStatus('error');
    }
  };

  const buttonContent = () => {
    if (!user) {
      return { text: '申请交换', icon: <Handshake size={14} /> };
    }
    if (isOwner) {
      return { text: '我的图书', icon: null, disabled: true };
    }
    switch (status) {
      case 'success':
        return { text: '已申请', icon: <Check size={14} /> };
      case 'requesting':
        return { text: '申请中', icon: <Loader2 size={14} className="spin" /> };
      default:
        return { text: '申请交换', icon: <Handshake size={14} /> };
    }
  };

  const btn = buttonContent();

  return (
    <>
      <div
        style={{
          width: 180,
          height: 300,
          position: 'relative',
          textDecoration: 'none',
          color: 'inherit',
          display: 'inline-block',
        }}
      >
        <Link to={`/books/${book.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
          <div
            ref={ref}
            className="card"
            style={{
              width: 180,
              height: 260,
              overflow: 'hidden',
              opacity: inView ? 1 : 0,
              transform: inView ? 'translateY(0)' : 'translateY(10px)',
              transition: `opacity 0.4s ease ${index * 50}ms, transform 0.4s ease ${index * 50}ms, box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1)`,
            }}
          >
            <div
              style={{
                height: '60%',
                background: '#f5f5f4',
                overflow: 'hidden',
              }}
            >
              {inView && (
                <img
                  src={book.coverUrl}
                  alt={book.title}
                  onLoad={() => setLoaded(true)}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    opacity: loaded ? 1 : 0,
                    transition: 'opacity 0.3s ease',
                  }}
                />
              )}
            </div>
            <div style={{ padding: 12 }}>
              <h3
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#292524',
                  marginBottom: 4,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {book.title}
              </h3>
              <p
                style={{
                  fontSize: 12,
                  color: '#78716c',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {book.author}
              </p>
            </div>
          </div>
        </Link>

        <button
          onClick={handleRequestClick}
          disabled={isOwner || status === 'requesting' || status === 'success'}
          style={{
            width: 180,
            height: 32,
            marginTop: 8,
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            cursor: isOwner || status === 'requesting' || status === 'success' ? 'default' : 'pointer',
            transition: 'all 0.2s ease',
            background:
              status === 'success'
                ? '#dcfce7'
                : isOwner
                ? '#f5f5f4'
                : '#d97706',
            color:
              status === 'success'
                ? '#16a34a'
                : isOwner
                ? '#a8a29e'
                : '#ffffff',
            border: 'none',
            boxShadow: status === 'success' || isOwner ? 'none' : '0 2px 6px rgba(217, 119, 6, 0.25)',
          }}
          onMouseEnter={(e) => {
            if (!isOwner && status !== 'success' && status !== 'requesting') {
              e.currentTarget.style.background = '#b45309';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(217, 119, 6, 0.35)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isOwner && status !== 'success' && status !== 'requesting') {
              e.currentTarget.style.background = '#d97706';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 6px rgba(217, 119, 6, 0.25)';
            }
          }}
        >
          {btn.icon && <span style={{ display: 'inline-flex' }}>{btn.icon}</span>}
          <span>{btn.text}</span>
        </button>
      </div>

      {showDialog && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(2px)',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && status !== 'requesting') {
              setShowDialog(false);
            }
          }}
        >
          <div
            className="card fade-in-up"
            style={{
              width: 360,
              maxWidth: '90vw',
              padding: 24,
              position: 'relative',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: '#fef3c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Handshake size={22} style={{ color: '#d97706' }} />
              </div>
              <div>
                <h3
                  style={{
                    fontSize: 17,
                    fontWeight: 600,
                    color: '#292524',
                  }}
                >
                  申请交换图书
                </h3>
              </div>
            </div>

            <div
              style={{
                background: '#fafaf9',
                borderRadius: 10,
                padding: 14,
                marginBottom: 20,
                display: 'flex',
                gap: 12,
                alignItems: 'center',
              }}
            >
              <img
                src={book.coverUrl}
                alt={book.title}
                style={{
                  width: 48,
                  height: 64,
                  borderRadius: 6,
                  objectFit: 'cover',
                  background: '#e7e5e4',
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#292524',
                    marginBottom: 2,
                  }}
                >
                  {book.title}
                </p>
                <p style={{ fontSize: 12, color: '#78716c' }}>{book.author}</p>
              </div>
            </div>

            <p
              style={{
                fontSize: 13,
                color: '#57534e',
                lineHeight: 1.6,
                marginBottom: 20,
              }}
            >
              确认向图书持有人发起交换申请？对方接受后将生成漂流记录，预计30天内归还。
            </p>

            {errorMsg && (
              <div
                style={{
                  padding: 10,
                  background: '#fee2e2',
                  color: '#dc2626',
                  borderRadius: 8,
                  fontSize: 13,
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className="btn-secondary"
                onClick={() => status !== 'requesting' && setShowDialog(false)}
                disabled={status === 'requesting'}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  fontSize: 14,
                  opacity: status === 'requesting' ? 0.5 : 1,
                }}
              >
                取消
              </button>
              <button
                className="btn-primary"
                onClick={handleConfirmRequest}
                disabled={status === 'requesting'}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  fontSize: 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  opacity: status === 'requesting' ? 0.6 : 1,
                }}
              >
                {status === 'requesting' && (
                  <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} />
                )}
                <span>{status === 'requesting' ? '发送中...' : '确认申请'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {status === 'success' && !showDialog && (
        <div
          style={{
            position: 'fixed',
            top: 80,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#16a34a',
            color: 'white',
            padding: '10px 20px',
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 500,
            boxShadow: '0 8px 24px rgba(22, 163, 74, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            zIndex: 2000,
            animation: 'fadeInUp 0.3s ease',
          }}
        >
          <Check size={16} />
          <span>交换申请已发送，请等待对方确认</span>
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 0.8s linear infinite;
        }
      `}</style>
    </>
  );
}
