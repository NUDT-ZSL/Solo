import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Comment, User } from '../types';
import { commentApi } from '../api';

interface CommentStreamProps {
  proposalId: string;
  currentUser: User;
  comments: Comment[];
  onCommentAdded: (comment: Comment) => void;
}

const CommentStream: React.FC<CommentStreamProps> = ({ proposalId, currentUser, comments, onCommentAdded }) => {
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newCommentIds, setNewCommentIds] = useState<Set<string>>(new Set());
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const displayComments = comments.slice(0, 50);

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins} 分钟前`;
    if (diffHours < 24) return `${diffHours} 小时前`;
    if (diffDays < 7) return `${diffDays} 天前`;
    return date.toLocaleDateString('zh-CN');
  };

  const scrollToBottom = useCallback(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, []);

  const handleSubmitComment = async () => {
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const comment = await commentApi.addComment(
        proposalId,
        currentUser.id,
        currentUser.name,
        currentUser.avatar,
        newComment.trim()
      );
      setNewCommentIds((prev) => new Set(prev).add(comment.id));
      onCommentAdded(comment);
      setNewComment('');
      setTimeout(scrollToBottom, 50);
      setTimeout(() => {
        setNewCommentIds((prev) => {
          const next = new Set(prev);
          next.delete(comment.id);
          return next;
        });
      }, 300);
    } catch (error) {
      console.error('发表评论失败:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitReply = async (parentId: string) => {
    if (!replyContent.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const comment = await commentApi.addComment(
        proposalId,
        currentUser.id,
        currentUser.name,
        currentUser.avatar,
        replyContent.trim(),
        parentId
      );
      setNewCommentIds((prev) => new Set(prev).add(comment.id));
      onCommentAdded(comment);
      setReplyTo(null);
      setReplyContent('');
      setTimeout(scrollToBottom, 50);
      setTimeout(() => {
        setNewCommentIds((prev) => {
          const next = new Set(prev);
          next.delete(comment.id);
          return next;
        });
      }, 300);
    } catch (error) {
      console.error('回复评论失败:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReplyClick = (commentId: string) => {
    setReplyTo(commentId === replyTo ? null : commentId);
    setReplyContent('');
  };

  const getParentComment = (parentId: string | null) => {
    if (!parentId) return null;
    return comments.find((c) => c.id === parentId);
  };

  useEffect(() => {
    scrollToBottom();
  }, [comments.length, scrollToBottom]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>评论区</h3>
        <span style={styles.count}>{comments.length} 条评论</span>
      </div>

      <div ref={listRef} style={styles.commentList}>
        {displayComments.map((comment, index) => {
          const parent = getParentComment(comment.parentId);
          const isNew = newCommentIds.has(comment.id);
          return (
            <div
              key={comment.id}
              style={{
                ...styles.commentItem,
                opacity: isNew ? 0 : 1,
                animation: isNew ? 'fadeIn 0.3s ease-out forwards' : 'none',
              }}
            >
              <div
                style={{
                  ...styles.avatar,
                  backgroundColor: comment.userAvatar,
                }}
              >
                {comment.userName.charAt(0)}
              </div>
              <div style={styles.commentContent}>
                <div style={styles.commentHeader}>
                  <span style={styles.userName}>{comment.userName}</span>
                  <span style={styles.time}>{formatTime(comment.createdAt)}</span>
                </div>
                {parent && (
                  <div style={styles.replyTo}>
                    回复 <span style={styles.replyToName}>@{parent.userName}</span>
                  </div>
                )}
                <p style={styles.commentText}>{comment.content}</p>
                <button
                  style={styles.replyButton}
                  onClick={() => handleReplyClick(comment.id)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#6366f1';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#94a3b8';
                  }}
                >
                  回复
                </button>
                {replyTo === comment.id && (
                  <div style={styles.replyInputContainer}>
                    <textarea
                      style={styles.replyInput}
                      placeholder="写下你的回复..."
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      rows={2}
                      autoFocus
                    />
                    <div style={styles.replyActions}>
                      <button
                        style={styles.cancelButton}
                        onClick={() => setReplyTo(null)}
                      >
                        取消
                      </button>
                      <button
                        style={styles.submitReplyButton}
                        onClick={() => handleSubmitReply(comment.id)}
                        disabled={!replyContent.trim() || isSubmitting}
                      >
                        发送
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={styles.inputContainer}>
        <div
          style={{
            ...styles.avatar,
            backgroundColor: currentUser.avatar,
          }}
        >
          {currentUser.name.charAt(0)}
        </div>
        <div style={styles.inputWrapper}>
          <textarea
            ref={inputRef}
            style={styles.input}
            placeholder="发表你的看法..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={3}
          />
          <div style={styles.inputActions}>
            <button
              style={{
                ...styles.submitButton,
                opacity: newComment.trim() ? 1 : 0.5,
                cursor: newComment.trim() ? 'pointer' : 'not-allowed',
              }}
              onClick={handleSubmitComment}
              disabled={!newComment.trim() || isSubmitting}
              onMouseEnter={(e) => {
                if (newComment.trim()) {
                  e.currentTarget.style.backgroundColor = '#4f46e5';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#6366f1';
              }}
            >
              {isSubmitting ? '发送中...' : '发表评论'}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid #e2e8f0',
  },
  title: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1e293b',
  },
  count: {
    fontSize: '13px',
    color: '#64748b',
  },
  commentList: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column-reverse',
    scrollBehavior: 'smooth',
  },
  commentItem: {
    display: 'flex',
    gap: '12px',
    marginBottom: '20px',
  },
  avatar: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    fontWeight: 600,
    color: '#1e293b',
    flexShrink: 0,
  },
  commentContent: {
    flex: 1,
    minWidth: 0,
  },
  commentHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '4px',
  },
  userName: {
    fontSize: '0.9rem',
    fontWeight: 600,
    color: '#1e293b',
  },
  time: {
    fontSize: '0.75rem',
    color: '#64748b',
  },
  replyTo: {
    fontSize: '13px',
    color: '#64748b',
    marginBottom: '4px',
  },
  replyToName: {
    color: '#6366f1',
    fontWeight: 500,
  },
  commentText: {
    fontSize: '14px',
    lineHeight: 1.6,
    color: '#334155',
    wordBreak: 'break-word',
  },
  replyButton: {
    marginTop: '6px',
    padding: '4px 0',
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '13px',
    color: '#94a3b8',
    cursor: 'pointer',
    transition: 'color 0.2s ease',
  },
  replyInputContainer: {
    marginTop: '10px',
    padding: '12px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
  },
  replyInput: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '13px',
    resize: 'none',
    fontFamily: 'inherit',
    outline: 'none',
    backgroundColor: '#ffffff',
  },
  replyActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
    marginTop: '8px',
  },
  cancelButton: {
    padding: '6px 14px',
    backgroundColor: 'transparent',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#64748b',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
  },
  submitReplyButton: {
    padding: '6px 14px',
    backgroundColor: '#6366f1',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#ffffff',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
  },
  inputContainer: {
    display: 'flex',
    gap: '12px',
    padding: '16px 20px',
    borderTop: '1px solid #e2e8f0',
    backgroundColor: '#f8fafc',
  },
  inputWrapper: {
    flex: 1,
  },
  input: {
    width: '100%',
    padding: '12px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    resize: 'none',
    fontFamily: 'inherit',
    outline: 'none',
    backgroundColor: '#ffffff',
    transition: 'border-color 0.2s ease',
  },
  inputActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: '8px',
  },
  submitButton: {
    padding: '8px 20px',
    backgroundColor: '#6366f1',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background-color 0.2s ease, opacity 0.2s ease',
  },
};

export default CommentStream;
