import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import type { Book, Comment } from '../types';
import { getBook } from '../api';
import { useUser } from '../context/UserContext';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

function hashColor(str: string): string {
  const colors = [
    '#8b5cf6', '#f59e0b', '#10b981', '#3b82f6',
    '#ef4444', '#ec4899', '#14b8a6', '#f97316'
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function BookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, refresh } = useUser();
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reserving, setReserving] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchBook = async () => {
      setLoading(true);
      try {
        const data = await getBook(id);
        setBook(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchBook();
  }, [id]);

  const handleReserve = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!book) return;
    setReserving(true);
    try {
      const res = await fetch(`/api/books/${book.id}/reserve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || '预约失败');
      } else {
        const updated = await getBook(book.id);
        setBook(updated);
        refresh();
        alert('预约成功！请在3天内到店取书');
      }
    } finally {
      setReserving(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }
    if (!comment.trim() || comment.length > 200) return;
    if (!book) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/books/${book.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          nickname: user.nickname,
          content: comment.trim()
        })
      });
      if (res.ok) {
        const updated = await getBook(book.id);
        setBook(updated);
        setComment('');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const styles = `
    .detail-page {
      padding: 92px 32px 48px;
      max-width: 960px;
      margin: 0 auto;
    }
    .detail-back {
      color: #8b5cf6;
      font-size: 14px;
      cursor: pointer;
      margin-bottom: 20px;
      display: inline-block;
    }
    .detail-back:hover {
      color: #7c3aed;
    }
    .detail-card {
      background: white;
      border-radius: 12px;
      padding: 32px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
      display: flex;
      gap: 32px;
      flex-wrap: wrap;
    }
    .detail-cover {
      width: 200px;
      height: 280px;
      border-radius: 10px;
      background: linear-gradient(135deg, #8b5cf6 0%, #f59e0b 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 24px;
      font-weight: 700;
      text-align: center;
      padding: 16px;
      flex-shrink: 0;
    }
    .detail-info {
      flex: 1;
      min-width: 280px;
    }
    .detail-title {
      font-size: 28px;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 8px;
    }
    .detail-author {
      font-size: 16px;
      color: #6b7280;
      margin-bottom: 16px;
    }
    .detail-meta {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-bottom: 24px;
    }
    .detail-meta-item {
      font-size: 14px;
      color: #4b5563;
    }
    .detail-meta-item span {
      color: #9ca3af;
      margin-right: 6px;
    }
    .detail-rating {
      color: #f59e0b;
      font-weight: 600;
      font-size: 18px;
      margin-bottom: 24px;
    }
    .detail-desc {
      font-size: 14px;
      color: #4b5563;
      line-height: 1.8;
      margin-bottom: 24px;
    }
    .detail-reserve-btn {
      padding: 12px 28px;
      background: #8b5cf6;
      color: white;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 600;
      transition: background 0.2s ease;
    }
    .detail-reserve-btn:hover:not(:disabled) {
      background: #7c3aed;
    }
    .detail-reserve-btn:disabled {
      background: #d1d5db;
      cursor: not-allowed;
    }
    .detail-section {
      margin-top: 40px;
    }
    .detail-section-title {
      font-size: 20px;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 20px;
    }
    .comment-form {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
      margin-bottom: 24px;
    }
    .comment-form textarea {
      width: 100%;
      min-height: 90px;
      padding: 12px;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      font-size: 14px;
      resize: vertical;
      outline: none;
      transition: border-color 0.2s ease;
    }
    .comment-form textarea:focus {
      border-color: #8b5cf6;
    }
    .comment-form-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 12px;
    }
    .comment-form-count {
      font-size: 12px;
      color: #9ca3af;
    }
    .comment-form-btn {
      padding: 8px 20px;
      background: #8b5cf6;
      color: white;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      transition: background 0.2s ease;
    }
    .comment-form-btn:hover:not(:disabled) {
      background: #7c3aed;
    }
    .comment-form-btn:disabled {
      background: #d1d5db;
      cursor: not-allowed;
    }
    .comment-timeline {
      position: relative;
      padding-left: 24px;
    }
    .comment-timeline::before {
      content: '';
      position: absolute;
      left: 8px;
      top: 8px;
      bottom: 8px;
      width: 2px;
      background: #e5e7eb;
    }
    .comment-item {
      position: relative;
      background: white;
      border-radius: 12px;
      padding: 16px 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      margin-bottom: 16px;
    }
    .comment-item::before {
      content: '';
      position: absolute;
      left: -20px;
      top: 24px;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #8b5cf6;
    }
    .comment-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;
    }
    .comment-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 600;
      font-size: 14px;
      flex-shrink: 0;
    }
    .comment-nickname {
      font-size: 14px;
      font-weight: 600;
      color: #1f2937;
    }
    .comment-time {
      font-size: 12px;
      color: #9ca3af;
      margin-left: auto;
    }
    .comment-content {
      font-size: 14px;
      color: #4b5563;
      line-height: 1.7;
    }
    .comments-empty {
      text-align: center;
      padding: 32px;
      color: #9ca3af;
      font-size: 14px;
    }
    @media (max-width: 768px) {
      .detail-page {
        padding: 92px 16px 32px;
      }
      .detail-card {
        padding: 20px;
        justify-content: center;
      }
      .detail-title {
        font-size: 22px;
      }
      .detail-meta {
        grid-template-columns: 1fr;
      }
    }
  `;

  if (loading) {
    return (
      <>
        <style>{styles}</style>
        <div className="detail-page">
          <div style={{ textAlign: 'center', padding: 48, color: '#6b7280' }}>
            加载中...
          </div>
        </div>
      </>
    );
  }

  if (!book) {
    return (
      <>
        <style>{styles}</style>
        <div className="detail-page">
          <div style={{ textAlign: 'center', padding: 48, color: '#6b7280' }}>
            图书不存在
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{styles}</style>
      <div className="detail-page page-fade-in">
        <div className="detail-back" onClick={() => navigate(-1)}>
          ← 返回
        </div>

        <div className="detail-card">
          <div className="detail-cover">{book.title}</div>
          <div className="detail-info">
            <h1 className="detail-title">{book.title}</h1>
            <div className="detail-author">作者：{book.author}</div>
            <div className="detail-rating">★ {book.doubanRating} 豆瓣评分</div>
            <div className="detail-meta">
              <div className="detail-meta-item">
                <span>出版社：</span>
                {book.publisher}
              </div>
              <div className="detail-meta-item">
                <span>ISBN：</span>
                {book.isbn}
              </div>
              <div className="detail-meta-item">
                <span>书架位置：</span>
                {book.shelf}
              </div>
              <div className="detail-meta-item">
                <span>库存：</span>
                {book.stock} 本
              </div>
            </div>
            <div className="detail-desc">{book.description}</div>
            <button
              className="detail-reserve-btn"
              onClick={handleReserve}
              disabled={book.stock <= 0 || reserving}
            >
              {reserving ? '预约中...' : book.stock > 0 ? '预约借阅' : '已借完'}
            </button>
          </div>
        </div>

        <div className="detail-section">
          <h2 className="detail-section-title">读者评论（{book.comments.length}）</h2>
          <form className="comment-form" onSubmit={handleSubmitComment}>
            <textarea
              placeholder={user ? '分享你的阅读感受...（限200字）' : '请先登录后发表评论'}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={200}
              disabled={!user}
            />
            <div className="comment-form-footer">
              <span className="comment-form-count">{comment.length}/200</span>
              <button
                className="comment-form-btn"
                type="submit"
                disabled={!user || !comment.trim() || submitting}
              >
                {submitting ? '发布中...' : '发表评论'}
              </button>
            </div>
          </form>

          {book.comments.length === 0 ? (
            <div className="comments-empty">暂无评论，来抢沙发吧～</div>
          ) : (
            <div className="comment-timeline">
              {book.comments.map((c: Comment) => (
                <div className="comment-item" key={c.id}>
                  <div className="comment-header">
                    <div
                      className="comment-avatar"
                      style={{ background: hashColor(c.nickname) }}
                    >
                      {c.nickname.charAt(0)}
                    </div>
                    <span className="comment-nickname">{c.nickname}</span>
                    <span className="comment-time">
                      {dayjs(c.createdAt).fromNow()}
                    </span>
                  </div>
                  <div className="comment-content">{c.content}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
