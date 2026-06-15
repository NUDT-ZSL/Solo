import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { booksAPI } from '../services/api';
import { Book } from '../types';
import { calculateDistance } from '../utils/distance';
import { useAuth } from '../context/AuthContext';
import './BookDetail.css';

export default function BookDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [exchanging, setExchanging] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchBook();
  }, [id]);

  const fetchBook = async () => {
    setLoading(true);
    try {
      const data = await booksAPI.getById(id!);
      setBook(data);
    } catch (err) {
      console.error('获取图书详情失败', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExchange = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setExchanging(true);
    setTimeout(() => {
      setExchanging(false);
      alert('交换请求已发送！');
    }, 1000);
  };

  const distance = user && book
    ? calculateDistance(user.latitude, user.longitude, book.latitude, book.longitude)
    : null;

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-state">
          <i className="fas fa-spinner fa-spin"></i>
          <p>加载中...</p>
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <i className="fas fa-book"></i>
          <h3>图书不存在</h3>
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            返回首页
          </button>
        </div>
      </div>
    );
  }

  const isOwner = user?.id === book.ownerId;

  return (
    <div className="page-container">
      <button className="back-btn" onClick={() => navigate(-1)}>
        <i className="fas fa-arrow-left"></i>
        返回
      </button>

      <div className="book-detail">
        <div className="book-detail-cover">
          <div
            className="cover-image"
            style={{
              background: 'linear-gradient(135deg, #ff6b35 0%, #ff8c5a 100%)',
            }}
          >
            {book.image ? (
              <img src={book.image} alt={book.title} />
            ) : (
              <i className="fas fa-book"></i>
            )}
          </div>
          <div className="condition-badge-large">{book.condition}</div>
        </div>

        <div className="book-detail-info">
          <h1 className="book-detail-title">{book.title}</h1>
          <p className="book-detail-author">作者：{book.author}</p>

          <div className="book-detail-tags">
            {book.tags.map((tag) => (
              <span key={tag} className="tag">
                {tag}
              </span>
            ))}
          </div>

          {distance !== null && (
            <div className="book-detail-distance">
              <i className="fas fa-map-marker-alt"></i>
              距离你 {distance} 公里
            </div>
          )}

          {book.description && (
            <div className="book-detail-description">
              <h3>简介</h3>
              <p>{book.description}</p>
            </div>
          )}

          <div className="owner-section">
            <h3>发布者</h3>
            <div className="owner-info">
              <div className="owner-avatar">
                {book.ownerAvatar ? (
                  <img src={book.ownerAvatar} alt={book.ownerName} />
                ) : (
                  <div className="avatar-placeholder">
                    {book.ownerName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="owner-details">
                <div className="owner-name">{book.ownerName}</div>
                <div className="owner-label">图书主人</div>
              </div>
            </div>
          </div>

          {!isOwner && (
            <button
              className="btn btn-primary exchange-large-btn"
              onClick={handleExchange}
              disabled={exchanging}
            >
              {exchanging ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  发送中...
                </>
              ) : (
                <>
                  <i className="fas fa-exchange-alt"></i>
                  发起交换
                </>
              )}
            </button>
          )}

          {isOwner && (
            <div className="owner-actions">
              <button className="btn btn-secondary">
                <i className="fas fa-edit"></i>
                编辑
              </button>
              <button className="btn btn-ghost" style={{ color: '#f44336' }}>
                <i className="fas fa-trash"></i>
                删除
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
