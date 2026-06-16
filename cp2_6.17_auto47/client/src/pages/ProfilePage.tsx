import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Plus, Star, Bell } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useBooks } from '../hooks/useBooks';
import { useExchange } from '../hooks/useExchange';
import { booksApi } from '../api';
import { formatDateTime } from '../utils';
import type { ExchangeRequest, Book } from '../types';

export function ProfilePage() {
  const { user, updateUser } = useAuth();
  const books = useBooks();
  const exchange = useExchange();
  const navigate = useNavigate();

  const [nickname, setNickname] = useState('');
  const [editing, setEditing] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<(ExchangeRequest & { book?: Book; requester?: any })[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);

  const [showAddBook, setShowAddBook] = useState(false);
  const [newBook, setNewBook] = useState({
    title: '',
    author: '',
    isbn: '',
    coverUrl: '',
    condition: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setNickname(user.nickname);
      loadPendingRequests();
    }
  }, [user]);

  const loadPendingRequests = async () => {
    if (!user) return;
    setRequestsLoading(true);
    try {
      const reqs = await exchange.getPendingRequests(user.id);
      const allBooks = await booksApi.list();
      const withDetails = await Promise.all(
        reqs.map(async (r) => {
          const requester = await fetch(`/api/users/${r.requesterId}`).then((res) => res.json());
          return {
            ...r,
            book: allBooks.find((b) => b.id === r.bookId),
            requester,
          };
        })
      );
      setPendingRequests(withDetails);
    } finally {
      setRequestsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="container">
        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
          <p style={{ color: '#78716c', marginBottom: 20, fontSize: 15 }}>
            请先登录
          </p>
          <button className="btn-primary" onClick={() => navigate('/login')}>
            去登录
          </button>
        </div>
      </div>
    );
  }

  const handleSaveNickname = async () => {
    if (!nickname.trim()) return;
    await updateUser({ nickname: nickname.trim() });
    setEditing(false);
  };

  const handleAvatarClick = () => {
    const url = prompt('请输入头像图片URL：', user.avatar);
    if (url) {
      updateUser({ avatar: url });
    }
  };

  const handleRespond = async (id: string, accept: boolean) => {
    try {
      await exchange.respondRequest(id, accept);
      loadPendingRequests();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBook.title || !newBook.author) {
      alert('请填写书名和作者');
      return;
    }
    setSubmitting(true);
    try {
      await books.addBook({ ...newBook, ownerId: user.id });
      setShowAddBook(false);
      setNewBook({ title: '', author: '', isbn: '', coverUrl: '', condition: '' });
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container">
      <div
        className="card"
        style={{
          padding: 32,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 24,
            marginBottom: 24,
            flexWrap: 'wrap',
          }}
        >
          <div
            onClick={handleAvatarClick}
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              overflow: 'hidden',
              cursor: 'pointer',
              position: 'relative',
              background: '#f5f5f4',
              border: '3px solid #fef3c7',
              flexShrink: 0,
            }}
          >
            <img
              src={user.avatar}
              alt={user.nickname}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(0,0,0,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 0,
                transition: 'opacity 0.2s',
              }}
              className="avatar-hover"
            >
              <Camera size={20} style={{ color: 'white' }} />
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 200 }}>
            {editing ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  style={{ fontSize: 18, padding: '6px 10px' }}
                />
                <button className="btn-primary" onClick={handleSaveNickname} style={{ padding: '6px 14px', fontSize: 13 }}>
                  保存
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => {
                    setEditing(false);
                    setNickname(user.nickname);
                  }}
                  style={{ padding: '6px 14px', fontSize: 13 }}
                >
                  取消
                </button>
              </div>
            ) : (
              <h2
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: '#292524',
                marginBottom: 4,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              {user.nickname}
              <span
                onClick={() => setEditing(true)}
                style={{
                  fontSize: 12,
                  color: '#d97706',
                  cursor: 'pointer',
                  fontWeight: 400,
                }}
              >
                编辑
              </span>
            </h2>
            )}
            <p style={{ color: '#78716c', fontSize: 14 }}>{user.email}</p>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 20,
              padding: '12px 20px',
              background: '#fef3c7',
              borderRadius: 12,
              position: 'relative',
            }}
          >
            <Star size={20} style={{ color: '#d97706', fill: '#d97706' }} />
            <div>
              <p style={{ fontSize: 11, color: '#92400e' }}>积分</p>
              <p style={{ fontSize: 20, fontWeight: 700, color: '#78350f' }}>
                {user.points}
              </p>
            </div>
            {pendingRequests.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: -6,
                  right: -6,
                  background: '#ef4444',
                  color: 'white',
                  fontSize: 11,
                  fontWeight: 600,
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {pendingRequests.length}
              </div>
            )}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 12,
            borderTop: '1px solid #e7e5e4',
            paddingTop: 20,
          }}
        >
          <button
            className="btn-primary"
            onClick={() => setShowAddBook(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Plus size={16} />
            上架图书
          </button>
        </div>
      </div>

      {showAddBook && (
        <div
          className="card"
          style={{
            padding: 24,
            marginBottom: 24,
          }}
        >
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>上架新图书</h3>
          <form onSubmit={handleAddBook}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 16,
                marginBottom: 16,
              }}
            >
              <div>
                <label style={{ fontSize: 13, color: '#57534e', marginBottom: 6, display: 'block' }}>
                  书名 *
                </label>
                <input
                  value={newBook.title}
                  onChange={(e) => setNewBook({ ...newBook, title: e.target.value })}
                  style={{ width: '100%' }}
                  placeholder="请输入书名"
                />
              </div>
              <div>
                <label style={{ fontSize: 13, color: '#57534e', marginBottom: 6, display: 'block' }}>
                  作者 *
                </label>
                <input
                  value={newBook.author}
                  onChange={(e) => setNewBook({ ...newBook, author: e.target.value })}
                  style={{ width: '100%' }}
                  placeholder="请输入作者"
                />
              </div>
              <div>
                <label style={{ fontSize: 13, color: '#57534e', marginBottom: 6, display: 'block' }}>
                  ISBN
                </label>
                <input
                  value={newBook.isbn}
                  onChange={(e) => setNewBook({ ...newBook, isbn: e.target.value })}
                  style={{ width: '100%' }}
                  placeholder="请输入ISBN"
                />
              </div>
              <div>
                <label style={{ fontSize: 13, color: '#57534e', marginBottom: 6, display: 'block' }}>
                  封面图片URL
                </label>
                <input
                  value={newBook.coverUrl}
                  onChange={(e) => setNewBook({ ...newBook, coverUrl: e.target.value })}
                  style={{ width: '100%' }}
                  placeholder="https://..."
                />
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, color: '#57534e', marginBottom: 6, display: 'block' }}>
                书况描述
              </label>
              <textarea
                value={newBook.condition}
                onChange={(e) => setNewBook({ ...newBook, condition: e.target.value })}
                style={{ width: '100%', minHeight: 80, resize: 'vertical' }}
                placeholder="描述一下书的新旧程度、有无划痕笔记等"
              />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? '提交中...' : '发布图书'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowAddBook(false)}
              >
                取消
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card" style={{ padding: 24 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 20,
          }}
        >
          <Bell size={18} style={{ color: '#d97706' }} />
          <h3 style={{ fontSize: 18, fontWeight: 600 }}>待处理请求</h3>
        </div>

        {requestsLoading ? (
          <div style={{ padding: 20, textAlign: 'center' }}>
            <div className="loading-spinner" />
          </div>
        ) : pendingRequests.length === 0 ? (
          <p style={{ color: '#a8a29e', fontSize: 14, textAlign: 'center', padding: 20 }}>
            暂无待处理请求
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {pendingRequests.map((req) => (
              <div
                key={req.id}
                className="fade-in-up"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  padding: 16,
                  background: '#fafaf9',
                  borderRadius: 10,
                }}
              >
                <img
                  src={req.requester?.avatar}
                  alt=""
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#292524' }}>
                    {req.requester?.nickname} 请求交换
                  </p>
                  <p style={{ fontSize: 13, color: '#78716c', marginTop: 2 }}>
                    《{req.book?.title}》
                  </p>
                  <p style={{ fontSize: 12, color: '#a8a29e', marginTop: 2 }}>
                    {formatDateTime(req.createdAt)}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn-primary"
                    onClick={() => handleRespond(req.id, true)}
                    style={{ padding: '6px 14px', fontSize: 13 }}
                  >
                    接受
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => handleRespond(req.id, false)}
                    style={{ padding: '6px 14px', fontSize: 13 }}
                  >
                    拒绝
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .avatar-hover:hover { opacity: 1 !important; }
        @media (max-width: 768px) {
          form > div:first-child {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
