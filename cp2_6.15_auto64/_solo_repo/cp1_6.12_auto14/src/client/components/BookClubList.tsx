import React, { useState, useEffect } from 'react';

interface BookClub {
  id: string;
  name: string;
  bookTitle: string;
  bookAuthor: string;
  description: string;
  hostId: string;
  hostName: string;
  memberCount: number;
  createdAt: string;
}

interface User {
  id: string;
  username: string;
  nickname: string;
}

interface BookClubListProps {
  onSelectClub: (clubId: string) => void;
  user: User | null;
  onRequireLogin: () => void;
}

function BookClubList({ onSelectClub, user, onRequireLogin }: BookClubListProps) {
  const [clubs, setClubs] = useState<BookClub[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newClub, setNewClub] = useState({
    name: '',
    bookTitle: '',
    bookAuthor: '',
    description: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClubs();
  }, []);

  const fetchClubs = async () => {
    try {
      const res = await fetch('/api/bookclubs');
      const data = await res.json();
      setClubs(data.bookClubs || []);
    } catch (error) {
      console.error('获取读书会列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onRequireLogin();
      return;
    }

    try {
      const res = await fetch('/api/bookclubs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newClub, userId: user.id })
      });
      const data = await res.json();
      if (data.bookClub) {
        setClubs([data.bookClub, ...clubs]);
        setShowCreateModal(false);
        setNewClub({ name: '', bookTitle: '', bookAuthor: '', description: '' });
      }
    } catch (error) {
      console.error('创建读书会失败:', error);
    }
  };

  const handleCreateClick = () => {
    if (!user) {
      onRequireLogin();
    } else {
      setShowCreateModal(true);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>加载中...</p>
      </div>
    );
  }

  return (
    <div className="book-club-list-page">
      <div className="page-header">
        <h2>发现读书会</h2>
        <button className="btn btn-primary" onClick={handleCreateClick}>
          + 创建读书会
        </button>
      </div>

      {clubs.length === 0 ? (
        <div className="empty-state">
          <p className="empty-icon">📖</p>
          <p>还没有读书会，快来创建第一个吧！</p>
        </div>
      ) : (
        <div className="club-grid">
          {clubs.map(club => (
            <div
              key={club.id}
              className="club-card"
              onClick={() => onSelectClub(club.id)}
            >
              <div className="club-card-header">
                <h3 className="club-name">{club.name}</h3>
              </div>
              <div className="club-book-info">
                <p className="book-title">《{club.bookTitle}》</p>
                <p className="book-author">作者：{club.bookAuthor}</p>
              </div>
              <p className="club-description">{club.description}</p>
              <div className="club-card-footer">
                <span className="member-count">👥 {club.memberCount} 位成员</span>
                <span className="host-name">主持人：{club.hostName}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>创建读书会</h2>
            <form onSubmit={handleCreateClub}>
              <div className="form-group">
                <label>读书会名称</label>
                <input
                  type="text"
                  value={newClub.name}
                  onChange={e => setNewClub({ ...newClub, name: e.target.value })}
                  placeholder="给你的读书会起个名字"
                  required
                />
              </div>
              <div className="form-group">
                <label>书名</label>
                <input
                  type="text"
                  value={newClub.bookTitle}
                  onChange={e => setNewClub({ ...newClub, bookTitle: e.target.value })}
                  placeholder="要讨论的书籍名称"
                  required
                />
              </div>
              <div className="form-group">
                <label>作者</label>
                <input
                  type="text"
                  value={newClub.bookAuthor}
                  onChange={e => setNewClub({ ...newClub, bookAuthor: e.target.value })}
                  placeholder="书籍作者"
                  required
                />
              </div>
              <div className="form-group">
                <label>简介</label>
                <textarea
                  value={newClub.description}
                  onChange={e => setNewClub({ ...newClub, description: e.target.value })}
                  placeholder="简单介绍一下这个读书会"
                  rows={3}
                  required
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                  取消
                </button>
                <button type="submit" className="btn btn-primary">
                  创建
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default BookClubList;
