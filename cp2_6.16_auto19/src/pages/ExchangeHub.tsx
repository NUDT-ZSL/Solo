import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { matchesAPI, exchangesAPI, booksAPI } from '../services/api';
import { Book } from '../types';
import { useAuth } from '../context/AuthContext';
import './ExchangeHub.css';

interface MatchItem {
  book: Book;
  owner: { id: string; username: string };
  matchPercentage: number;
}

export default function ExchangeHub() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [myBooks, setMyBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [exchangingId, setExchangingId] = useState<string | null>(null);
  const [selectedBookId, setSelectedBookId] = useState<string>('');
  const [showBookSelector, setShowBookSelector] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (user) {
      fetchData();
    }
  }, [user, isAuthenticated]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [matchesData, booksData] = await Promise.all([
        matchesAPI.getForUser(user.id),
        booksAPI.getByUser(user.id),
      ]);
      setMatches(matchesData as unknown as MatchItem[]);
      setMyBooks(booksData);
      if (booksData.length > 0) {
        setSelectedBookId(booksData[0].id);
      }
    } catch (err) {
      console.error('获取匹配失败', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExchange = async (matchBook: Book, ownerId: string) => {
    if (!user || !selectedBookId) return;
    setExchangingId(matchBook.id);
    try {
      await exchangesAPI.create({
        from_user_id: user.id,
        to_user_id: ownerId,
        from_book_id: selectedBookId,
        to_book_id: matchBook.id,
      });
      alert('交换请求已发送！');
      setShowBookSelector(null);
    } catch (err: any) {
      console.error('发起交换失败', err);
      alert(err.message || '发起交换失败，请重试');
    } finally {
      setExchangingId(null);
    }
  };

  if (!isAuthenticated) return null;

  const getMatchColor = (score: number) => {
    if (score >= 80) return '#4caf50';
    if (score >= 60) return '#ff9800';
    return '#ff6b35';
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>
          <i className="fas fa-exchange-alt" style={{ color: '#ff6b35' }}></i>
          匹配中心
        </h1>
        <p className="page-subtitle">为你推荐最适合交换的图书</p>
      </div>

      {myBooks.length > 0 && (
        <div className="my-book-selector">
          <span className="selector-label">选择你的书：</span>
          <select
            className="input selector-select"
            value={selectedBookId}
            onChange={(e) => setSelectedBookId(e.target.value)}
          >
            {myBooks.map((book) => (
              <option key={book.id} value={book.id}>
                {book.title}
              </option>
            ))}
          </select>
        </div>
      )}

      {loading ? (
        <div className="loading-state">
          <i className="fas fa-spinner fa-spin"></i>
          <p>正在为你寻找最佳匹配...</p>
        </div>
      ) : matches.length === 0 ? (
        <div className="empty-state">
          <i className="fas fa-search"></i>
          <h3>暂无匹配</h3>
          <p>发布更多图书，增加匹配机会吧</p>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/my-books')}
          >
            <i className="fas fa-plus"></i>
            发布图书
          </button>
        </div>
      ) : (
        <div className="matches-list">
          {matches.map((match, index) => (
            <div
              key={match.book.id}
              className="match-card fade-in"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <div className="match-header">
                <span className="match-label">匹配度</span>
                <div className="match-score-wrapper">
                  <div
                    className="match-score-bar"
                    style={{
                      background: `linear-gradient(to right, #ff6b35 0%, #ff9800 50%, #4caf50 100%)`,
                      width: `${match.matchPercentage}%`,
                    }}
                  />
                  <span
                    className="match-score-text"
                    style={{ color: getMatchColor(match.matchPercentage) }}
                  >
                    {match.matchPercentage}%
                  </span>
                </div>
              </div>

              <div className="match-content">
                {selectedBookId && myBooks.find(b => b.id === selectedBookId) && (
                  <>
                    <div
                      className="match-book-mini my-book"
                      onClick={() => navigate(`/book/${selectedBookId}`)}
                    >
                      <div className="match-book-cover-small" style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}>
                        <i className="fas fa-book"></i>
                      </div>
                      <div className="match-book-info-small">
                        <div className="match-book-title-small">
                          {myBooks.find(b => b.id === selectedBookId)?.title}
                        </div>
                        <div className="match-book-owner-small">我的书</div>
                      </div>
                    </div>

                    <div className="exchange-arrow-center">
                      <svg width="50" height="30" viewBox="0 0 50 30">
                        <path
                          d="M2 15 Q25 0 48 15 Q25 30 2 15"
                          fill="none"
                          stroke="#ff6b35"
                          strokeWidth="2"
                          className="dashed-arrow"
                        />
                        <polygon points="48,15 42,10 42,20" fill="#ff6b35" />
                        <polygon points="2,15 8,10 8,20" fill="#ff6b35" />
                      </svg>
                    </div>
                  </>
                )}

                <div
                  className="match-book-mini their-book"
                  onClick={() => navigate(`/book/${match.book.id}`)}
                >
                  <div className="match-book-cover-small" style={{ background: 'linear-gradient(135deg, #f093fb, #f5576c)' }}>
                    {match.book.image ? (
                      <img src={match.book.image} alt={match.book.title} />
                    ) : (
                      <i className="fas fa-book"></i>
                    )}
                  </div>
                  <div className="match-book-info-small">
                    <div className="match-book-title-small">{match.book.title}</div>
                    <div className="match-book-author-small">{match.book.author}</div>
                    <div className="match-book-owner-small">{match.owner.username}</div>
                  </div>
                </div>
              </div>

              {myBooks.length > 0 ? (
                <div className="match-actions">
                  <button
                    className="btn btn-primary exchange-match-btn"
                    onClick={() => handleExchange(match.book, match.owner.id)}
                    disabled={exchangingId === match.book.id}
                  >
                    {exchangingId === match.book.id ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i>
                        发送中...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-paper-plane"></i>
                        发起交换
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="match-actions">
                  <button
                    className="btn btn-secondary exchange-match-btn"
                    onClick={() => navigate('/my-books')}
                  >
                    <i className="fas fa-plus"></i>
                    先发布图书
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
