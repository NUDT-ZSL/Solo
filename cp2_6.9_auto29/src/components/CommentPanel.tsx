import React, { useState } from 'react';
import type { Comment } from '../types';
import { formatTimestamp } from '../utils';

interface Props {
  comments: Comment[];
  onSend: (content: string) => void;
  userName: string;
}

const CommentPanel: React.FC<Props> = ({ comments, onSend, userName }) => {
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!content.trim() || sending) return;
    setSending(true);
    try {
      await onSend(content.trim());
      setContent('');
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="comment-panel">
      <h3>评论 ({comments.length})</h3>
      <div className="comment-list">
        {comments.length === 0 ? (
          <div className="empty-state">暂无评论，来说点什么吧～</div>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="comment-item">
              <div className="comment-header">
                <span className="comment-author">{c.userName}</span>
                <span className="comment-time">{formatTimestamp(c.timestamp)}</span>
              </div>
              <p className="comment-content">{c.content}</p>
            </div>
          ))
        )}
      </div>
      <div className="comment-input-wrapper">
        <input
          type="text"
          className="comment-input"
          placeholder={`${userName}，发表评论...`}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={200}
        />
        <button
          className="comment-send"
          onClick={handleSend}
          disabled={!content.trim() || sending}
        >
          发送
        </button>
      </div>
    </div>
  );
};

export default CommentPanel;
