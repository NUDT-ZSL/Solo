import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TimelineItem } from '../components/TimelineItem';
import { useAuth } from '../hooks/useAuth';
import { useExchange } from '../hooks/useExchange';
import { booksApi, usersApi } from '../api';
import type { ExchangeRecord, Book, User } from '../types';

interface RecordWithDetails extends ExchangeRecord {
  book?: Book;
  otherUser?: User;
}

export function ExchangeTracker() {
  const { user } = useAuth();
  const exchange = useExchange();
  const navigate = useNavigate();
  const [records, setRecords] = useState<RecordWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    loadRecords();
  }, [user]);

  const loadRecords = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const userRecords = await exchange.getUserRequests(user.id);
      const allBooks = await booksApi.list();
      const allUsers = await usersApi.list();

      const withDetails = userRecords.map((r) => {
        const otherId = r.currentHolderId === user.id ? r.previousHolderId : r.currentHolderId;
        return {
          ...r,
          book: allBooks.find((b) => b.id === r.bookId),
          otherUser: allUsers.find((u) => u.id === otherId),
        };
      });
      setRecords(withDetails);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="container">
        <h1
          style={{
          fontSize: 28,
          fontWeight: 700,
          marginBottom: 24,
          color: '#292524',
        }}
        >
          漂流追踪
        </h1>
        <div
          className="card"
          style={{ padding: 48, textAlign: 'center' }}
        >
          <p style={{ color: '#78716c', marginBottom: 20, fontSize: 15 }}>
            请先登录查看你的漂流记录
          </p>
          <button className="btn-primary" onClick={() => navigate('/login')}>
            去登录
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <h1
        style={{
        fontSize: 28,
        fontWeight: 700,
        marginBottom: 32,
        color: '#292524',
      }}
      >
        漂流追踪
      </h1>

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center' }}>
          <div className="loading-spinner" />
        </div>
      ) : records.length === 0 ? (
        <div
          className="card"
          style={{
            padding: 48,
            textAlign: 'center',
          }}
        >
          <p style={{ color: '#78716c', fontSize: 15 }}>
            暂无漂流记录，快去交换图书开启你的漂流之旅吧
          </p>
        </div>
      ) : (
        <div style={{ position: 'relative', padding: '8px 0' }}>
          {records.map((record, i) => (
            <TimelineItem
              key={record.id}
              record={record}
              book={record.book}
              otherUser={record.otherUser}
              index={i}
            />
          ))}
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .container > div:last-child > div {
            padding-left: 0 !important;
            padding-right: 0 !important;
          }
          .container > div:last-child > div > div:first-child {
            left: 10px !important;
          }
          .container > div:last-child > div > div:nth-child(2) {
            left: 10px !important;
          }
          .container > div:last-child > div > div:last-child {
            width: 100% !important;
            margin-left: 40px !important;
            margin-right: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
