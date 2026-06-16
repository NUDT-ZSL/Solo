import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Clock, MapPin, User } from 'lucide-react';
import dayjs from 'dayjs';
import type { Book, Application } from '../types';
import { getPublisherBooks, getUserApplications } from '../api';

const MOCK_USER_ID = 'user-001';
const MOCK_USER_NAME = '书虫小林';

function ProfilePage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'published' | 'applications'>('published');
  const [publishedBooks, setPublishedBooks] = useState<Book[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'published') {
      fetchPublishedBooks();
    } else {
      fetchApplications();
    }
  }, [activeTab]);

  const fetchPublishedBooks = async () => {
    setLoading(true);
    try {
      const books = await getPublisherBooks(MOCK_USER_ID);
      setPublishedBooks(books);
    } catch (err) {
      console.error('获取发布的图书失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const apps = await getUserApplications(MOCK_USER_ID);
      setApplications(apps);
    } catch (err) {
      console.error('获取申请记录失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'available':
        return '可申请';
      case 'drifting':
        return '漂流中';
      case 'offline':
        return '已下架';
      default:
        return status;
    }
  };

  const getApplicationStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return '已申请';
      case 'drifting':
        return '漂流中';
      case 'completed':
        return '已完成';
      default:
        return status;
    }
  };

  const handleBookClick = (bookId: string) => {
    navigate(`/book/${bookId}`);
  };

  return (
    <div className="profile-page page-transition">
      <div className="profile-header" style={{ marginBottom: '32px' }}>
        <h1 className="section-title" style={{ marginBottom: '8px' }}>
          <User size={24} />
          个人中心
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          欢迎回来，{MOCK_USER_NAME}
        </p>
      </div>

      <div className="profile-tabs">
        <button
          className={`profile-tab ${activeTab === 'published' ? 'active' : ''}`}
          onClick={() => setActiveTab('published')}
        >
          <BookOpen size={18} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          我发布的图书
        </button>
        <button
          className={`profile-tab ${activeTab === 'applications' ? 'active' : ''}`}
          onClick={() => setActiveTab('applications')}
        >
          <Clock size={18} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          我的申请记录
        </button>
      </div>

      {loading && (
        <div className="loading-spinner">
          <div>加载中...</div>
        </div>
      )}

      {!loading && activeTab === 'published' && (
        <div className="profile-section">
          {publishedBooks.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📚</div>
              <div>暂无发布的图书</div>
            </div>
          ) : (
            <div className="book-grid">
              {publishedBooks.map((book) => (
                <div
                  key={book.id}
                  className="book-card"
                  onClick={() => handleBookClick(book.id)}
                >
                  <div className="book-card-cover-wrapper">
                    <img
                      src={book.coverUrl}
                      alt={book.title}
                      className="book-card-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="book-card-content">
                    <h3 className="book-card-title">{book.title}</h3>
                    <p className="book-card-author">{book.author}</p>
                    <div className="book-card-footer">
                      <span className={`status-tag status-${book.status}`}>
                        {getStatusLabel(book.status)}
                      </span>
                      <span className="drift-count">
                        <BookOpen size={14} />
                        {book.driftCount} 次漂流
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!loading && activeTab === 'applications' && (
        <div className="profile-section">
          {applications.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📝</div>
              <div>暂无申请记录</div>
            </div>
          ) : (
            <div className="application-list">
              {applications.map((app) => (
                <div key={app.id} className="application-card">
                  <div className="application-info">
                    <h3 className="application-book-title">{app.bookTitle}</h3>
                    <div className="application-details">
                      <MapPin size={12} style={{ marginRight: 4 }} />
                      地点：{app.location}
                      <span style={{ margin: '0 8px', color: 'var(--border-color)' }}>|</span>
                      <Clock size={12} style={{ marginRight: 4 }} />
                      {dayjs(app.applyTime).format('YYYY年MM月DD日 HH:mm')}
                    </div>
                  </div>
                  <span className={`application-status status-${app.status}`}>
                    {getApplicationStatusLabel(app.status)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ProfilePage;
