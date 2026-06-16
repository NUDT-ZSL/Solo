import React, { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { AnnotationData, Comment } from '../logic/DataModel';
import { ANNOTATION_COLOR } from '../logic/DataModel';
import { formatShortDateTime } from '../logic/CoordinateUtils';

interface AnnotationProps {
  annotation: AnnotationData;
  scale: number;
  isOpen: boolean;
  onToggle: () => void;
  onUpdate: (annotation: AnnotationData) => void;
  onDelete: () => void;
  currentUser: string;
}

const AnnotationComponent: React.FC<AnnotationProps> = ({
  annotation,
  scale,
  isOpen,
  onToggle,
  onUpdate,
  onDelete,
  currentUser
}) => {
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const bubbleRef = useRef<HTMLDivElement>(null);

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const comment: Comment = {
      id: uuidv4(),
      text: newComment.trim(),
      author: currentUser,
      timestamp: Date.now(),
      parentId: null
    };

    onUpdate({
      ...annotation,
      comments: [...annotation.comments, comment],
      updatedAt: Date.now()
    });
    setNewComment('');
  };

  const handleSubmitReply = (e: React.FormEvent, parentId: string) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    const comment: Comment = {
      id: uuidv4(),
      text: replyText.trim(),
      author: currentUser,
      timestamp: Date.now(),
      parentId
    };

    onUpdate({
      ...annotation,
      comments: [...annotation.comments, comment],
      updatedAt: Date.now()
    });
    setReplyText('');
    setReplyTo(null);
  };

  const handleMarkerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle();
  };

  const handleBubbleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const formatTime = (timestamp: number) => {
    return formatShortDateTime(timestamp);
  };

  const getReplies = (parentId: string) => {
    return annotation.comments.filter(c => c.parentId === parentId);
  };

  const topLevelComments = annotation.comments.filter(c => c.parentId === null);

  return (
    <>
      <div
        className="annotation-marker"
        style={{
          left: annotation.x,
          top: annotation.y
        }}
        onClick={handleMarkerClick}
      >
        <div className="marker-pulse" />
        <div className="marker-dot" />
        <div className="marker-count" style={{ transform: `scale(${1 / scale})` }}>
          {annotation.comments.length}
        </div>
      </div>

      {isOpen && (
        <div
          className="annotation-bubble"
          style={{
            left: annotation.x + 20,
            top: annotation.y - 10,
            transform: `scale(${scale})`
          }}
          onClick={handleBubbleClick}
          ref={bubbleRef}
        >
          <div className="bubble-header">
            <span className="bubble-title">批注评论</span>
            <button
              className="bubble-close"
              onClick={onToggle}
            >
              ×
            </button>
          </div>

          <div className="bubble-comments">
            {topLevelComments.length === 0 ? (
              <div className="empty-comments">暂无评论，添加第一条评论吧</div>
            ) : (
              topLevelComments.map(comment => (
                <div key={comment.id} className="comment-thread">
                  <div className="comment-item">
                    <div className="comment-avatar">
                      {comment.author.charAt(0).toUpperCase()}
                    </div>
                    <div className="comment-content">
                      <div className="comment-meta">
                        <span className="comment-author">{comment.author}</span>
                        <span className="comment-time">{formatTime(comment.timestamp)}</span>
                      </div>
                      <div className="comment-text">{comment.text}</div>
                      <button
                        className="reply-btn"
                        onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                      >
                        回复
                      </button>
                    </div>
                  </div>

                  {getReplies(comment.id).length > 0 && (
                    <div className="reply-list">
                      {getReplies(comment.id).map(reply => (
                        <div key={reply.id} className="comment-item reply-item">
                          <div className="comment-avatar reply-avatar">
                            {reply.author.charAt(0).toUpperCase()}
                          </div>
                          <div className="comment-content">
                            <div className="comment-meta">
                              <span className="comment-author">{reply.author}</span>
                              <span className="comment-time">{formatTime(reply.timestamp)}</span>
                            </div>
                            <div className="comment-text">{reply.text}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {replyTo === comment.id && (
                    <form
                      className="reply-form"
                      onSubmit={(e) => handleSubmitReply(e, comment.id)}
                    >
                      <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="写下你的回复..."
                        autoFocus
                      />
                      <button type="submit" disabled={!replyText.trim()}>
                        发送
                      </button>
                    </form>
                  )}
                </div>
              ))
            )}
          </div>

          <form className="bubble-input" onSubmit={handleSubmitComment}>
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="添加评论..."
            />
            <button type="submit" disabled={!newComment.trim()}>
              发送
            </button>
          </form>

          <button className="delete-annotation-btn" onClick={onDelete}>
            删除批注
          </button>
        </div>
      )}

      <style>{`
        .annotation-marker {
          position: absolute;
          width: 20px;
          height: 20px;
          transform: translate(-50%, -50%);
          cursor: pointer;
          z-index: 30;
        }

        .marker-dot {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 12px;
          height: 12px;
          background-color: ${ANNOTATION_COLOR};
          border-radius: 50%;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
          z-index: 2;
          transition: all 0.3s ease;
        }

        .annotation-marker:hover .marker-dot {
          animation: markerBreathe 1.5s ease-in-out infinite;
        }

        @keyframes markerBreathe {
          0%, 100% {
            transform: translate(-50%, -50%) scale(1);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3), 0 0 0 0 rgba(231, 76, 60, 0.5);
          }
          50% {
            transform: translate(-50%, -50%) scale(1.3);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.4), 0 0 0 8px rgba(231, 76, 60, 0);
          }
        }

        .annotation-marker:hover .marker-count {
          animation: markerBreathe 1.5s ease-in-out infinite;
        }

        .marker-pulse {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 20px;
          height: 20px;
          background-color: ${ANNOTATION_COLOR};
          border-radius: 50%;
          opacity: 0.4;
          animation: pulse 1.5s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.4;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.8);
            opacity: 0;
          }
        }

        .marker-count {
          position: absolute;
          top: -8px;
          right: -8px;
          min-width: 18px;
          height: 18px;
          background-color: ${ANNOTATION_COLOR};
          color: white;
          font-size: 11px;
          font-weight: bold;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 4px;
          border: 2px solid #ffffff;
          transform-origin: top right;
        }

        .annotation-bubble {
          position: absolute;
          width: 280px;
          background: #ffffff;
          border-radius: 12px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
          z-index: 100;
          animation: fadeIn 0.3s ease-out;
          transform-origin: top left;
        }

        .annotation-bubble:hover {
          animation: breathe 2s ease-in-out infinite;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes breathe {
          0%, 100% {
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
          }
          50% {
            box-shadow: 0 8px 32px rgba(79, 195, 247, 0.4);
          }
        }

        .bubble-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          border-bottom: 1px solid #f0f0f0;
        }

        .bubble-title {
          font-size: 14px;
          font-weight: 600;
          color: #212121;
        }

        .bubble-close {
          width: 24px;
          height: 24px;
          border: none;
          background: transparent;
          font-size: 20px;
          cursor: pointer;
          color: #999;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: all 0.2s;
        }

        .bubble-close:hover {
          background: #f5f5f5;
          color: #666;
        }

        .bubble-comments {
          max-height: 240px;
          overflow-y: auto;
          padding: 12px;
        }

        .empty-comments {
          text-align: center;
          color: #999;
          font-size: 13px;
          padding: 20px 0;
        }

        .comment-thread {
          margin-bottom: 12px;
        }

        .comment-thread:last-child {
          margin-bottom: 0;
        }

        .comment-item {
          display: flex;
          gap: 10px;
        }

        .comment-avatar {
          width: 28px;
          height: 28px;
          background: #4FC3F7;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 600;
          flex-shrink: 0;
        }

        .reply-avatar {
          background: #BDC3C7;
          width: 24px;
          height: 24px;
          font-size: 11px;
        }

        .comment-content {
          flex: 1;
          min-width: 0;
        }

        .comment-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;
        }

        .comment-author {
          font-size: 12px;
          font-weight: 600;
          color: #212121;
        }

        .comment-time {
          font-size: 11px;
          color: #999;
        }

        .comment-text {
          font-size: 13px;
          color: #424242;
          line-height: 1.4;
          word-break: break-word;
        }

        .reply-btn {
          margin-top: 4px;
          padding: 2px 8px;
          font-size: 11px;
          color: #4FC3F7;
          background: transparent;
          border: none;
          cursor: pointer;
          padding-left: 0;
        }

        .reply-btn:hover {
          text-decoration: underline;
        }

        .reply-list {
          margin-top: 8px;
          margin-left: 18px;
          padding-left: 12px;
          border-left: 2px solid #BDC3C7;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .reply-item {
          margin-bottom: 0;
        }

        .reply-form {
          display: flex;
          gap: 6px;
          margin-top: 8px;
          margin-left: 38px;
        }

        .reply-form input {
          flex: 1;
          padding: 6px 10px;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          font-size: 12px;
          outline: none;
          transition: border-color 0.2s;
        }

        .reply-form input:focus {
          border-color: #4FC3F7;
        }

        .reply-form button {
          padding: 6px 12px;
          background: #4FC3F7;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 12px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .reply-form button:disabled {
          background: #e0e0e0;
          cursor: not-allowed;
        }

        .bubble-input {
          display: flex;
          gap: 8px;
          padding: 12px;
          border-top: 1px solid #f0f0f0;
        }

        .bubble-input input {
          flex: 1;
          padding: 8px 12px;
          border: 1px solid #e0e0e0;
          border-radius: 20px;
          font-size: 13px;
          outline: none;
          transition: border-color 0.2s;
        }

        .bubble-input input:focus {
          border-color: #4FC3F7;
        }

        .bubble-input button {
          padding: 8px 16px;
          background: #4FC3F7;
          color: white;
          border: none;
          border-radius: 20px;
          font-size: 13px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .bubble-input button:disabled {
          background: #e0e0e0;
          cursor: not-allowed;
        }

        .delete-annotation-btn {
          width: 100%;
          padding: 8px;
          background: transparent;
          border: none;
          border-top: 1px solid #f0f0f0;
          color: #e74c3c;
          font-size: 12px;
          cursor: pointer;
          border-radius: 0 0 12px 12px;
          transition: background 0.2s;
        }

        .delete-annotation-btn:hover {
          background: #ffebee;
        }
      `}</style>
    </>
  );
};

export default AnnotationComponent;
