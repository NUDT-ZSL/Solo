import React, { useState } from 'react';
import { Feedback, formatRelativeTime } from '../utils/storage';

interface FeedbackCardProps {
  feedback: Feedback;
  onReply: (id: string, reply: string) => void;
  onHandle: (id: string) => void;
  onDelete: (id: string) => void;
  animationDelay: number;
}

const FeedbackCard: React.FC<FeedbackCardProps> = ({
  feedback,
  onReply,
  onHandle,
  onDelete,
  animationDelay,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');

  const getSentimentBadge = () => {
    if (feedback.reply) {
      return (
        <span className="sentiment-badge sentiment-replied">
          ✓ 已回复
        </span>
      );
    }
    const sentimentMap = {
      positive: { class: 'sentiment-positive', text: '😊 正面' },
      neutral: { class: 'sentiment-neutral', text: '😐 中性' },
      negative: { class: 'sentiment-negative', text: '😞 负面' },
    };
    const { class: className, text } = sentimentMap[feedback.sentiment];
    return <span className={`sentiment-badge ${className}`}>{text}</span>;
  };

  const handleSendReply = () => {
    if (replyText.trim()) {
      onReply(feedback.id, replyText.trim());
      setReplyText('');
      setIsReplying(false);
    }
  };

  const shouldTruncate = feedback.description.length > 100;
  const displayDescription = shouldTruncate && !isExpanded
    ? feedback.description.slice(0, 100)
    : feedback.description;

  const avatarInitial = feedback.username.charAt(feedback.username.length - 1);

  return (
    <div
      className="feedback-card"
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      <div className="card-header">
        <div className="avatar" style={{ backgroundColor: feedback.avatarColor }}>
          {avatarInitial}
        </div>
        <div className="user-info">
          <div className="username">
            {feedback.username}
            {feedback.isUrgent && <span className="urgent-badge">紧急</span>}
          </div>
          <div className="timestamp">{formatRelativeTime(feedback.timestamp)}</div>
        </div>
      </div>

      <div className="card-title">{feedback.title}</div>

      <div className="card-description">
        <span className={shouldTruncate && !isExpanded ? 'description-truncated' : ''}>
          {displayDescription}
        </span>
        {shouldTruncate && (
          <button
            className="expand-btn"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? '收起' : '...展开'}
          </button>
        )}
      </div>

      {getSentimentBadge()}

      {feedback.screenshots.length > 0 && (
        <div className="screenshots-container">
          {feedback.screenshots.map((screenshot, index) => (
            <img
              key={index}
              src={screenshot}
              alt={`截图 ${index + 1}`}
              className="screenshot-thumbnail"
              onClick={() => window.open(screenshot, '_blank')}
            />
          ))}
        </div>
      )}

      {feedback.reply && (
        <div className="reply-content">
          <div className="reply-label">团队回复</div>
          <div className="reply-text">{feedback.reply}</div>
        </div>
      )}

      <div className="card-actions">
        <button
          className="action-btn reply"
          onClick={() => setIsReplying(!isReplying)}
          disabled={!!feedback.reply}
        >
          <span>💬</span>
          <span>{feedback.reply ? '已回复' : '回复'}</span>
        </button>
        <button
          className={`action-btn handle ${feedback.isHandled ? 'handled' : ''}`}
          onClick={() => onHandle(feedback.id)}
        >
          <span>✓</span>
          <span>{feedback.isHandled ? '已处理' : '标记处理'}</span>
        </button>
        <button
          className="action-btn delete"
          onClick={() => {
            if (confirm('确定要删除这条反馈吗？')) {
              onDelete(feedback.id);
            }
          }}
        >
          <span>🗑️</span>
          <span>删除</span>
        </button>
      </div>

      {isReplying && !feedback.reply && (
        <div className="reply-section">
          <textarea
            className="reply-input"
            placeholder="请输入回复内容..."
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            autoFocus
          />
          <div className="reply-actions">
            <button
              className="btn btn-secondary"
              onClick={() => {
                setIsReplying(false);
                setReplyText('');
              }}
            >
              取消
            </button>
            <button className="btn btn-primary" onClick={handleSendReply}>
              发送
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedbackCard;
