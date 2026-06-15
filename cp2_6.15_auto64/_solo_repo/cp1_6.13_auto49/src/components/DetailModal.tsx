
import { useState, useEffect, useRef } from 'react';
import type { Gradient, Comment } from '../data/demoGradients';

interface DetailModalProps {
  gradient: Gradient;
  onClose: () => void;
  onAddComment: (gradientId: string, text: string) => void;
  onLike: (id: string) => void;
}

function formatTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  return `${days}天前`;
}

export default function DetailModal({ gradient, onClose, onAddComment, onLike }: DetailModalProps) {
  const [commentText, setCommentText] = useState('');
  const commentsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [gradient.comments.length]);

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (commentText.trim()) {
      onAddComment(gradient.id, commentText.trim());
      setCommentText('');
    }
  };

  const gradientValue = `linear-gradient(${gradient.angle}deg, ${gradient.color1} 0%, ${gradient.color2} 100%)`;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.27)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 300,
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '720px',
          height: '540px',
          backgroundColor: '#ffffff',
          borderRadius: '24px',
          display: 'flex',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)',
        }}
      >
        <div
          style={{
            width: '60%',
            height: '100%',
            background: gradientValue,
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '24px',
          }}
        >
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '16px',
              left: '16px',
              width: '36px',
              height: '36px',
              border: 'none',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              color: '#4b5563',
              fontSize: '18px',
              lineHeight: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ×
          </button>

          <div />

          <div>
            <div
              style={{
                fontSize: '24px',
                fontWeight: 700,
                color: '#ffffff',
                textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                marginBottom: '12px',
              }}
            >
              {gradient.name}
            </div>
            <div
              style={{
                fontSize: '13px',
                color: 'rgba(255, 255, 255, 0.9)',
                backgroundColor: 'rgba(0, 0, 0, 0.2)',
                backdropFilter: 'blur(8px)',
                padding: '10px 14px',
                borderRadius: '8px',
                fontFamily: 'monospace',
                wordBreak: 'break-all',
                lineHeight: 1.6,
                textShadow: 'none',
              }}
            >
              linear-gradient({gradient.angle}deg, {gradient.color1} 0%, {gradient.color2} 100%)
            </div>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '6px',
                marginTop: '12px',
              }}
            >
              {gradient.tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    fontSize: '12px',
                    color: '#ffffff',
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    backdropFilter: 'blur(4px)',
                    padding: '4px 10px',
                    borderRadius: '6px',
                  }}
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div
          style={{
            width: '40%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#fafafa',
          }}
        >
          <div
            style={{
              padding: '20px 20px 12px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                fontSize: '16px',
                fontWeight: 600,
                color: '#1f2937',
              }}
            >
              评论 ({gradient.comments.length})
            </div>
            <button
              onClick={() => onLike(gradient.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                border: 'none',
                background: 'none',
                fontSize: '14px',
                color: gradient.liked ? '#ef4444' : '#9ca3af',
                fontWeight: 500,
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill={gradient.liked ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
              </svg>
              {gradient.likes}
            </button>
          </div>

          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '12px 20px',
            }}
          >
            {gradient.comments.length === 0 ? (
              <div
                style={{
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#9ca3af',
                  fontSize: '14px',
                }}
              >
                还没有评论，来抢沙发吧~
              </div>
            ) : (
              gradient.comments.map((comment: Comment) => (
                <div
                  key={comment.id}
                  style={{
                    padding: '12px 0',
                    borderBottom: '1px solid #f3f4f6',
                  }}
                >
                  <div
                    style={{
                      fontSize: '14px',
                      color: '#374151',
                      lineHeight: 1.5,
                      marginBottom: '6px',
                    }}
                  >
                    {comment.text}
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#9ca3af',
                    }}
                  >
                    {formatTime(comment.createdAt)}
                  </div>
                </div>
              ))
            )}
            <div ref={commentsEndRef} />
          </div>

          <form
            onSubmit={handleSubmitComment}
            style={{
              padding: '16px 20px',
              borderTop: '1px solid #e5e7eb',
              backgroundColor: '#ffffff',
            }}
          >
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="写下你的评论..."
                style={{
                  flex: 1,
                  height: '36px',
                  padding: '0 12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px',
                  color: '#4b5563',
                  backgroundColor: '#f9fafb',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                disabled={!commentText.trim()}
                style={{
                  height: '36px',
                  padding: '0 16px',
                  border: 'none',
                  borderRadius: '8px',
                  background: commentText.trim()
                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                    : '#e5e7eb',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: commentText.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                发送
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
