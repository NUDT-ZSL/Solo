import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import type { User, Book } from './App';

interface ProfileProps {
  user: User;
  onReturn: (bookId: string) => void;
}

export default function Profile({ user, onReturn }: ProfileProps) {
  const [borrowedBooks, setBorrowedBooks] = useState<Book[]>([]);
  const [overdueBooks, setOverdueBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOverdue, setSelectedOverdue] = useState<Book | null>(null);

  useEffect(() => {
    Promise.all([
      axios.get(`/api/users/${user._id}/borrowed`),
      axios.get('/api/books/overdue', { params: { userId: user._id } }),
    ])
      .then(([borrowedRes, overdueRes]) => {
        setBorrowedBooks(borrowedRes.data);
        setOverdueBooks(overdueRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user._id]);

  const handleReturn = async (bookId: string) => {
    await onReturn(bookId);
    setBorrowedBooks((prev) => prev.filter((b) => b._id !== bookId));
    setOverdueBooks((prev) => prev.filter((b) => b._id !== bookId));
    setSelectedOverdue(null);
  };

  const isOverdue = (book: Book) => {
    return book.status === 'borrowed' && book.dueDate && new Date(book.dueDate) < new Date();
  };

  const isNearDue = (book: Book) => {
    if (!book.dueDate || book.status !== 'borrowed') return false;
    const due = new Date(book.dueDate);
    const now = new Date();
    const diff = due.getTime() - now.getTime();
    return diff > 0 && diff < 3 * 24 * 60 * 60 * 1000;
  };

  const formatDate = (ts: string) => {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <div style={{ width: 40, height: 40, border: '3px solid #e5e7eb', borderTopColor: '#f97316', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ padding: '32px 24px', maxWidth: 800, margin: '0 auto' }}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: 28, marginBottom: 28,
        boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 28,
            background: 'linear-gradient(135deg, #f97316, #fbbf24)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 22, fontWeight: 700,
          }}>
            {user.name.charAt(0)}
          </div>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1f2937' }}>{user.name}</h2>
            <p style={{ fontSize: 13, color: '#6b7280' }}>{user.phone} · {user.address}</p>
          </div>
        </div>
        <Link to="/add" className="btn-primary" style={{ fontSize: 14, padding: '8px 20px' }}>
          + 添加图书
        </Link>
      </div>

      {overdueBooks.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <div style={{
              width: 10, height: 10, borderRadius: 5,
              background: '#ef4444',
              animation: 'pulseDot 1.5s ease infinite',
            }} />
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#991b1b' }}>逾期提醒</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {overdueBooks.map((book) => (
              <div
                key={book._id}
                onClick={() => setSelectedOverdue(selectedOverdue?._id === book._id ? null : book)}
                style={{
                  background: '#fee2e2',
                  borderRadius: 12,
                  padding: '14px 18px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: 4,
                      background: '#991b1b',
                      animation: 'pulseDot 1.5s ease infinite',
                    }} />
                    <span style={{ fontWeight: 600, color: '#991b1b', fontSize: 15 }}>{book.title}</span>
                  </div>
                  <span style={{ fontSize: 12, color: '#991b1b', opacity: 0.7 }}>
                    应还于 {book.dueDate ? formatDate(book.dueDate) : '—'}
                  </span>
                </div>
                {selectedOverdue?._id === book._id && (
                  <div style={{ marginTop: 12, padding: '12px 14px', background: 'rgba(255,255,255,0.6)', borderRadius: 8 }}>
                    <p style={{ fontSize: 13, color: '#991b1b', marginBottom: 6 }}>
                      <strong>作者：</strong>{book.author}
                    </p>
                    <p style={{ fontSize: 13, color: '#991b1b', marginBottom: 6 }}>
                      <strong>当前借入者：</strong>{book.currentHolderName}
                    </p>
                    <p style={{ fontSize: 13, color: '#991b1b', marginBottom: 12 }}>
                      <strong>借阅日期：</strong>{book.borrowedAt ? formatDate(book.borrowedAt) : '—'}
                    </p>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleReturn(book._id); }}
                      style={{
                        padding: '6px 16px', background: '#dcfce7', color: '#166534',
                        border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      归还此书
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {borrowedBooks.filter((b) => !isOverdue(b) && isNearDue(b)).length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#92400e', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>⏰</span> 即将到期
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {borrowedBooks.filter((b) => isNearDue(b)).map((book) => (
              <div key={book._id} style={{
                background: '#fef3c7', borderRadius: 12, padding: '14px 18px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div>
                  <span style={{ fontWeight: 600, color: '#92400e', fontSize: 15 }}>{book.title}</span>
                  <span style={{ fontSize: 12, color: '#92400e', marginLeft: 8 }}>
                    {book.dueDate ? formatDate(book.dueDate) : ''} 到期
                  </span>
                </div>
                <button
                  onClick={() => handleReturn(book._id)}
                  style={{
                    padding: '6px 16px', background: '#dcfce7', color: '#166534',
                    border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  归还
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1f2937', marginBottom: 16 }}>我借阅的图书</h3>
        {borrowedBooks.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: 40, background: '#fff', borderRadius: 12,
            color: '#9ca3af',
          }}>
            暂无借阅中的图书
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {borrowedBooks.map((book) => (
              <div key={book._id} style={{
                background: '#fff', borderRadius: 12, padding: '14px 18px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              }}>
                <div>
                  <span style={{ fontWeight: 600, color: '#1f2937', fontSize: 15 }}>{book.title}</span>
                  <span style={{ fontSize: 13, color: '#6b7280', marginLeft: 8 }}>{book.author}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {book.dueDate && (
                    <span style={{ fontSize: 12, color: '#6b7280' }}>
                      还书日 {formatDate(book.dueDate)}
                    </span>
                  )}
                  <Link
                    to={`/trail/${book._id}`}
                    style={{ fontSize: 13, color: '#f97316', textDecoration: 'none', fontWeight: 500 }}
                  >
                    轨迹
                  </Link>
                  <button
                    onClick={() => handleReturn(book._id)}
                    style={{
                      padding: '6px 16px', background: '#dcfce7', color: '#166534',
                      border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    归还
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
