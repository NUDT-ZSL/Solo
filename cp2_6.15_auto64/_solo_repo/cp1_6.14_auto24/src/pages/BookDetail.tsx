import React, { useEffect, useState } from 'react';
import { BookDetail, getBookDetail, updateReadingStatus } from '../client/books';
import { MemberStatus } from '../client/books';

interface BookDetailPageProps {
  bookId: string;
  userId: string;
  username: string;
  avatar: string;
  onBack: () => void;
}

const statusLabel = (s: string) => {
  switch (s) {
    case 'unread': return '未读';
    case 'reading': return '在读';
    case 'read': return '已读';
    default: return '未读';
  }
};

const BookDetailPage: React.FC<BookDetailPageProps> = ({ bookId, userId, username, avatar, onBack }) => {
  const [book, setBook] = useState<BookDetail | null>(null);
  const [myStatus, setMyStatus] = useState<'unread' | 'reading' | 'read'>('unread');
  const [myNote, setMyNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const detail = await getBookDetail(bookId);
    setBook(detail);
    const mine = detail.memberStatuses.find((m: MemberStatus) => m.userId === userId);
    if (mine) {
      setMyStatus(mine.status);
      setMyNote(mine.note);
    }
  };

  useEffect(() => {
    load();
  }, [bookId, userId]);

  const save = async () => {
    setSaving(true);
    await updateReadingStatus(userId, bookId, myStatus, myNote, username, avatar);
    setSaving(false);
    await load();
  };

  if (!book) return <div style={{ padding: '40px 0', color: '#a08a74' }}>加载中...</div>;

  return (
    <div>
      <button className="back-btn" onClick={onBack}>← 返回书库</button>

      <div className="book-detail-header">
        <img src={book.cover} alt={book.title} className="book-detail-cover" />
        <div className="book-detail-info">
          <h1 className="book-detail-title">{book.title}</h1>
          <div className="book-detail-author">作者：{book.author}</div>
          <div className="book-detail-stats">
            <div className="book-stat">
              <div className="book-stat-label">页数</div>
              <div className="book-stat-value">{book.pages}</div>
            </div>
            <div className="book-stat">
              <div className="book-stat-label">豆瓣评分</div>
              <div className="book-stat-value">⭐ {book.rating}</div>
            </div>
            <div className="book-stat">
              <div className="book-stat-label">参与成员</div>
              <div className="book-stat-value">{book.memberStatuses.length}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card dashboard-full">
        <h2 className="section-title">📝 图书简介</h2>
        <p className="book-description">{book.description || '暂无简介'}</p>
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <h2 className="section-title">✍️ 我的阅读状态</h2>
          <div className="status-tabs">
            {(['unread', 'reading', 'read'] as const).map((s) => (
              <button
                key={s}
                className={`status-tab ${myStatus === s ? `active-${s}` : ''}`}
                onClick={() => setMyStatus(s)}
              >
                {statusLabel(s)}
              </button>
            ))}
          </div>
          <textarea
            className="note-textarea"
            placeholder="写下你的阅读笔记或感悟..."
            value={myNote}
            onChange={(e) => setMyNote(e.target.value)}
          />
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? '保存中...' : '保存状态'}
          </button>
        </div>

        <div className="card">
          <h2 className="section-title">👥 俱乐部成员阅读情况</h2>
          <div className="members-status">
            {book.memberStatuses.map((m: MemberStatus) => (
              <div key={m.userId} className="member-status-item">
                <img src={m.avatar} alt={m.username} className="member-status-avatar" />
                <div className="member-status-info">
                  <div className="member-status-name">
                    {m.username}
                    <span className={`status-tag status-tag-${m.status}`}>
                      {statusLabel(m.status)}
                    </span>
                  </div>
                  {m.note ? (
                    <div className="member-status-note">💭 {m.note}</div>
                  ) : m.status !== 'unread' ? (
                    <div className="member-status-note" style={{ color: '#b89980', fontStyle: 'italic' }}>暂无笔记</div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookDetailPage;
