import React, { useEffect, useState } from 'react';
import { Book, searchBooks } from '../client/books';
import { getActiveVote, createVote } from '../client/votes';
import { postAnnouncement } from '../client/activity';

interface AdminProps {
  userId: string;
  username: string;
  avatar: string;
  onVotesCreated?: () => void;
}

const Admin: React.FC<AdminProps> = ({ userId, username, avatar, onVotesCreated }) => {
  const [announcement, setAnnouncement] = useState('');
  const [voteTitle, setVoteTitle] = useState('下个月共读哪本书？');
  const [books, setBooks] = useState<Book[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [active, setActive] = useState<any>(null);

  useEffect(() => {
    searchBooks('').then(setBooks);
    getActiveVote().then(setActive);
  }, []);

  const toggle = (id: string) => {
    setPicked((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) :
      prev.length >= 5 ? prev : [...prev, id]
    );
  };

  const sendAnnouncement = async () => {
    if (!announcement.trim()) return;
    await postAnnouncement({ userId, username, avatar, content: announcement.trim() });
    setAnnouncement('');
    alert('公告已发布到动态');
  };

  const submitVote = async () => {
    if (picked.length < 3 || !voteTitle.trim()) return;
    if (active && !active.closed && active.endsAt > Date.now()) {
      if (!confirm('当前已有进行中的投票，确定要创建新的投票吗？')) return;
    }
    await createVote(voteTitle.trim(), picked, userId, username, avatar);
    setVoteTitle('下个月共读哪本书？');
    setPicked([]);
    alert('投票发起成功！');
    onVotesCreated?.();
    getActiveVote().then(setActive);
  };

  return (
    <div>
      <h1 className="page-title">⚙️ 管理员控制台</h1>

      <div className="dashboard-grid">
        <div className="card">
          <h2 className="section-title">📢 发布公告</h2>
          <textarea
            className="form-input"
            style={{ minHeight: '100px', marginBottom: '10px' }}
            placeholder="输入要发布给俱乐部成员的公告内容..."
            value={announcement}
            onChange={(e) => setAnnouncement(e.target.value)}
          />
          <button className="btn-primary" onClick={sendAnnouncement} disabled={!announcement.trim()}>
            发布公告
          </button>
        </div>

        <div className="card">
          <h2 className="section-title">🗳️ 发起新投票</h2>
          <div className="form-group">
            <label>投票主题</label>
            <input
              className="form-input"
              value={voteTitle}
              onChange={(e) => setVoteTitle(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ marginTop: '12px' }}>
            <label>候选图书（3-5本），已选 {picked.length}/5</label>
            <div className="book-picker">
              {books.map((b) => (
                <div
                  key={b._id}
                  className={`book-picker-item ${picked.includes(b._id) ? 'selected' : ''}`}
                  onClick={() => toggle(b._id)}
                >
                  <div className="book-picker-checkbox">
                    {picked.includes(b._id) && '✓'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '13px' }}>{b.title}</div>
                    <div style={{ fontSize: '11px', color: '#a08a74' }}>{b.author} · ⭐{b.rating}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ marginTop: '14px' }}>
            <button
              className="btn-primary"
              onClick={submitVote}
              disabled={picked.length < 3 || !voteTitle.trim()}
            >
              发起投票（72小时截止）
            </button>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '20px' }}>
        <h2 className="section-title">📚 书库管理（共{books.length}本）</h2>
        <div className="book-grid">
          {books.map((b) => (
            <div key={b._id} className="card card-hover" style={{ padding: '10px' }}>
              <img src={b.cover} alt={b.title} className="book-cover" />
              <div className="book-info">
                <div className="book-title">{b.title}</div>
                <div className="book-author">{b.author}</div>
                <div className="book-meta">
                  <span className="book-pages">{b.pages}页</span>
                  <span className="book-rating">⭐ {b.rating}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Admin;
