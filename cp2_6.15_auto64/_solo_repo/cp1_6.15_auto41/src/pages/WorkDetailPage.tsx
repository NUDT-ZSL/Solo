import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

interface Comment {
  id: string;
  username: string;
  content: string;
  timestamp: string;
}

interface WorkDetail {
  id: string;
  title: string;
  description: string;
  author: string;
  imageUrl: string;
  tags: string[];
  votes: number;
  comments: Comment[];
}

const TAG_COLORS = [
  '#e94560', '#0f3460', '#533483', '#e94560', '#1a8f6e',
  '#c7956d', '#4a90d9', '#d4553a',
];

const formatTimeAgo = (timestamp: string): string => {
  const now = new Date();
  const time = new Date(timestamp);
  const diffMs = now.getTime() - time.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return '刚刚';
  if (diffMinutes < 60) return `${diffMinutes}分钟前`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}小时前`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}天前`;
};

const WorkDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [work, setWork] = useState<WorkDetail | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [voted, setVoted] = useState(false);
  const [pulse, setPulse] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentError, setCommentError] = useState('');
  const [newCommentId, setNewCommentId] = useState<string | null>(null);

  const fetchWork = useCallback(() => {
    if (!id) return;
    fetch(`http://localhost:3001/api/works/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setWork(data);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [id]);

  useEffect(() => {
    fetchWork();
  }, [fetchWork]);

  const handleVote = async () => {
    if (voted || !id) return;
    try {
      const res = await fetch(`http://localhost:3001/api/works/${id}/vote`, { method: 'POST' });
      const data = await res.json();
      setWork((prev) => prev ? { ...prev, votes: data.votes } : prev);
      setVoted(true);
      setPulse(true);
      setTimeout(() => setPulse(false), 300);
    } catch {}
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim()) {
      setCommentError('评论内容不能为空');
      return;
    }
    setCommentError('');
    if (!id) return;
    try {
      const res = await fetch(`http://localhost:3001/api/works/${id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: '访客用户', content: commentText.trim() }),
      });
      const newComment = await res.json();
      setWork((prev) =>
        prev
          ? { ...prev, comments: [newComment, ...prev.comments] }
          : prev
      );
      setNewCommentId(newComment.id);
      setTimeout(() => setNewCommentId(null), 300);
      setCommentText('');
    } catch {}
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.target as HTMLImageElement;
    target.src = 'data:image/svg+xml,' + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">' +
      '<rect width="800" height="450" fill="#16213e"/>' +
      '<text x="400" y="225" text-anchor="middle" fill="#555" font-size="28" font-family="sans-serif">暂无图片</text>' +
      '</svg>'
    );
  };

  if (!work) {
    return <div style={{ color: '#e0e0e0', textAlign: 'center', padding: '80px 0' }}>加载中...</div>;
  }

  return (
    <div className={loaded ? 'page-fade-in' : ''} style={{ minHeight: '100vh' }}>
      <style>{`
        .detail-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 40px 15%;
        }
        .back-btn {
          background: none;
          border: none;
          color: #e94560;
          font-size: 1rem;
          cursor: pointer;
          padding: 0;
          margin-bottom: 24px;
          transition: opacity 0.3s;
        }
        .back-btn:hover { opacity: 0.7; }
        .detail-layout {
          display: flex;
          gap: 32px;
        }
        .detail-left {
          flex: 1.2;
        }
        .detail-right {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .detail-image-wrapper {
          width: 100%;
          border-radius: 12px;
          overflow: hidden;
          background: #0f3460;
          margin-bottom: 20px;
        }
        .detail-image-wrapper img {
          width: 100%;
          display: block;
          object-fit: cover;
        }
        .detail-title {
          font-size: 1.8rem;
          font-weight: 700;
          color: #e0e0e0;
          margin-bottom: 12px;
        }
        .detail-author {
          font-size: 1rem;
          color: #a0a0a0;
          margin-bottom: 16px;
        }
        .detail-description {
          font-size: 1rem;
          line-height: 1.7;
          color: #c0c0c0;
          margin-bottom: 20px;
        }
        .detail-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 20px;
        }
        .tag {
          padding: 4px 12px;
          border-radius: 16px;
          font-size: 0.85rem;
          font-weight: 500;
          color: #fff;
        }
        .vote-section {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 8px;
        }
        .vote-count {
          font-size: 1.4rem;
          font-weight: 700;
          color: #e94560;
          transition: transform 0.3s ease;
        }
        .vote-count.pulse {
          animation: votePulse 0.3s ease;
        }
        @keyframes votePulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.3); }
          100% { transform: scale(1); }
        }
        .vote-btn {
          padding: 10px 28px;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          background: #e94560;
          color: #fff;
          transition: background 0.3s, cursor 0.3s;
        }
        .vote-btn:disabled {
          background: #555;
          cursor: not-allowed;
          color: #aaa;
        }
        .comments-section {
          background: #16213e;
          border-radius: 12px;
          padding: 20px;
          box-shadow: inset 0 1px 4px rgba(0,0,0,0.3);
        }
        .comments-title {
          font-size: 1.1rem;
          font-weight: 600;
          color: #e0e0e0;
          margin-bottom: 16px;
        }
        .comment-input-area {
          margin-bottom: 20px;
          position: relative;
        }
        .comment-input {
          width: 100%;
          padding: 12px 0;
          background: transparent;
          border: none;
          border-bottom: 2px solid #333;
          color: #e0e0e0;
          font-size: 0.95rem;
          outline: none;
          transition: border-color 0.3s;
        }
        .comment-input:focus {
          border-image: linear-gradient(to right, #e94560, #0f3460) 1;
        }
        .comment-error {
          color: #e94560;
          font-size: 0.8rem;
          margin-top: 4px;
        }
        .submit-btn {
          margin-top: 10px;
          padding: 8px 20px;
          border: none;
          border-radius: 6px;
          background: #e94560;
          color: #fff;
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          transition: opacity 0.3s;
        }
        .submit-btn:hover { opacity: 0.85; }
        .comment-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .comment-item {
          display: flex;
          gap: 12px;
        }
        .comment-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #0f3460;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.8rem;
          color: #e94560;
          flex-shrink: 0;
          font-weight: 600;
        }
        .comment-body {
          flex: 1;
        }
        .comment-username {
          font-size: 0.9rem;
          font-weight: 600;
          color: #e0e0e0;
          margin-bottom: 2px;
        }
        .comment-content {
          font-size: 0.9rem;
          color: #c0c0c0;
          line-height: 1.5;
        }
        .comment-time {
          font-size: 0.75rem;
          color: #777;
          margin-top: 4px;
        }
        @keyframes commentFadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .comment-new {
          animation: commentFadeIn 0.3s ease forwards;
        }
        @media (max-width: 768px) {
          .detail-container {
            padding: 20px 5%;
          }
          .detail-layout {
            flex-direction: column;
          }
          .detail-title {
            font-size: 1.4rem;
          }
          .detail-description {
            font-size: 1.05rem;
          }
        }
      `}</style>
      <div className="detail-container">
        <button className="back-btn" onClick={() => navigate('/')}>
          ← 返回列表
        </button>
        <div className="detail-layout">
          <div className="detail-left">
            <div className="detail-image-wrapper">
              <img
                src={work.imageUrl}
                alt={work.title}
                onError={handleImageError}
              />
            </div>
            <h1 className="detail-title">{work.title}</h1>
            <div className="detail-author">作者：{work.author}</div>
            <p className="detail-description">{work.description}</p>
            <div className="detail-tags">
              {work.tags.map((tag, i) => (
                <span
                  key={tag}
                  className="tag"
                  style={{ background: TAG_COLORS[i % TAG_COLORS.length] }}
                >
                  {tag}
                </span>
              ))}
            </div>
            <div className="vote-section">
              <span className={`vote-count ${pulse ? 'pulse' : ''}`}>
                👍 {work.votes} 票
              </span>
              <button
                className="vote-btn"
                onClick={handleVote}
                disabled={voted}
              >
                {voted ? '已投票' : '投票'}
              </button>
            </div>
          </div>
          <div className="detail-right">
            <div className="comments-section">
              <div className="comments-title">评论区</div>
              <div className="comment-input-area">
                <input
                  className="comment-input"
                  type="text"
                  placeholder="写下你的评论..."
                  value={commentText}
                  onChange={(e) => {
                    setCommentText(e.target.value);
                    if (commentError) setCommentError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSubmitComment();
                  }}
                />
                {commentError && <div className="comment-error">{commentError}</div>}
                <button className="submit-btn" onClick={handleSubmitComment}>
                  提交
                </button>
              </div>
              <div className="comment-list">
                {work.comments.map((comment) => (
                  <div
                    key={comment.id}
                    className={`comment-item ${comment.id === newCommentId ? 'comment-new' : ''}`}
                  >
                    <div className="comment-avatar">
                      {comment.username.charAt(0)}
                    </div>
                    <div className="comment-body">
                      <div className="comment-username">{comment.username}</div>
                      <div className="comment-content">{comment.content}</div>
                      <div className="comment-time">{formatTimeAgo(comment.timestamp)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkDetailPage;
