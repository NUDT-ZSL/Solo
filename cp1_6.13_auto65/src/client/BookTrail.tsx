import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import type { Book } from './App';

interface TrailRecord {
  _id: string;
  bookId: string;
  fromUser: string;
  toUser: string;
  action: 'borrow' | 'return' | 'register';
  timestamp: string;
}

interface TrailData {
  book: Book;
  trails: TrailRecord[];
}

export default function BookTrail() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<TrailData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    axios.get(`/api/books/trail/${id}`)
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <div style={{ width: 40, height: 40, border: '3px solid #e5e7eb', borderTopColor: '#f97316', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="fade-in" style={{ textAlign: 'center', padding: 80 }}>
        <p style={{ color: '#6b7280' }}>未找到该图书的漂流轨迹</p>
        <Link to="/" className="btn-primary" style={{ marginTop: 16, display: 'inline-block' }}>返回首页</Link>
      </div>
    );
  }

  const { book, trails } = data;

  const getActionText = (trail: TrailRecord, index: number) => {
    if (trail.action === 'register') {
      return `📖 ${trail.toUser === book.ownerId ? book.ownerName : '某人'} 登记了此书`;
    }
    if (trail.action === 'borrow') {
      const from = trail.fromUser === book.ownerId ? book.ownerName : '上一位持有者';
      return `${from} → ${trail.toUser === book.currentHolder ? book.currentHolderName : '借阅者'} 借出`;
    }
    if (trail.action === 'return') {
      return `${trail.fromUser === book.currentHolder ? book.currentHolderName : '借阅者'} 归还 → ${trail.toUser === book.ownerId ? book.ownerName : '持有者'}`;
    }
    return '';
  };

  const formatDate = (ts: string) => {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  return (
    <div className="fade-in" style={{ padding: '32px 24px', maxWidth: 640, margin: '0 auto' }}>
      <Link to="/" style={{ color: '#f97316', textDecoration: 'none', fontSize: 14, fontWeight: 500, marginBottom: 16, display: 'inline-block' }}>
        ← 返回书架
      </Link>

      <div style={{
        background: '#fff', borderRadius: 16, padding: 24, marginBottom: 32,
        boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
        display: 'flex', gap: 20, alignItems: 'center',
      }}>
        <div style={{
          width: 80, height: 110, borderRadius: 8, overflow: 'hidden',
          background: book.coverUrl ? `url(${book.coverUrl}) center/cover` : 'linear-gradient(135deg, #fef3c7, #fed7aa)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {!book.coverUrl && <span style={{ fontSize: 32 }}>📚</span>}
        </div>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1f2937', marginBottom: 4 }}>{book.title}</h2>
          <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 6 }}>{book.author}</p>
          <div style={{
            display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
            background: book.status === 'available' ? '#dcfce7' : '#fef3c7',
            color: book.status === 'available' ? '#166534' : '#92400e',
          }}>
            {book.status === 'available' ? '可借阅' : '借出中'}
          </div>
        </div>
      </div>

      <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1f2937', marginBottom: 20 }}>漂流轨迹</h3>

      <div style={{ position: 'relative' }}>
        {trails.length === 0 ? (
          <p style={{ color: '#9ca3af', textAlign: 'center', padding: 40 }}>暂无漂流记录</p>
        ) : (
          trails.map((trail, index) => (
            <div key={trail._id} style={{ position: 'relative', paddingLeft: 36, paddingBottom: index < trails.length - 1 ? 24 : 0 }}>
              <div style={{
                position: 'absolute', left: 12, top: 14, bottom: 0, width: 2,
                background: index < trails.length - 1 ? '#e5e7eb' : 'transparent',
              }} />
              <div style={{
                position: 'absolute', left: 6, top: 8,
                width: 14, height: 14, borderRadius: '50%',
                background: trail.action === 'register' ? '#f97316' : trail.action === 'borrow' ? '#3b82f6' : '#10b981',
                border: '2px solid #fff',
                boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
              }} />
              <div style={{
                background: '#e0f2fe',
                borderRadius: 12,
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <span style={{ fontSize: 14, color: '#1e40af', fontWeight: 500 }}>
                  {getActionText(trail, index)}
                </span>
                <span style={{ fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap', marginLeft: 12 }}>
                  {formatDate(trail.timestamp)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
