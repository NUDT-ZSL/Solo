import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Star, MessageCircle } from 'lucide-react';
import type { Comment } from '../types';
import { getComments, createComment } from '../api';

interface CommentPanelProps {
  selectedFrameId: string | null;
  frameName: string;
  onFrameCommentCountChange?: (frameId: string, delta: number) => void;
}

const PAGE_SIZE = 20;

function hashUserName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `linear-gradient(135deg, hsl(${hue}, 70%, 60%), hsl(${(hue + 40) % 360}, 70%, 50%))`;
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

export default function CommentPanel({
  selectedFrameId,
  frameName,
  onFrameCommentCountChange,
}: CommentPanelProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [content, setContent] = useState('');

  const listRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const loadComments = useCallback(
    async (frameId: string, pageNum: number, reset = false) => {
      if (loading) return;
      setLoading(true);
      try {
        const result = await getComments(frameId, pageNum, PAGE_SIZE);
        setTotal(result.total);
        setComments((prev) => (reset ? result.list : [...prev, ...result.list]));
      } catch (err) {
        console.error('加载点评失败:', err);
        alert('加载点评失败，请稍后重试');
      } finally {
        setLoading(false);
      }
    },
    [loading]
  );

  useEffect(() => {
    if (!selectedFrameId) {
      setComments([]);
      setPage(1);
      setTotal(0);
      return;
    }
    setComments([]);
    setPage(1);
    setTotal(0);
    loadComments(selectedFrameId, 1, true);
  }, [selectedFrameId, loadComments]);

  useEffect(() => {
    if (!sentinelRef.current) return;
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && selectedFrameId && !loading) {
          const loadedCount = comments.length;
          if (loadedCount < total) {
            const nextPage = page + 1;
            setPage(nextPage);
            loadComments(selectedFrameId, nextPage, false);
          }
        }
      },
      { root: listRef.current, threshold: 0.1 }
    );
    observerRef.current.observe(sentinelRef.current);
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [selectedFrameId, loading, comments.length, total, page, loadComments]);

  const handleSubmit = useCallback(async () => {
    if (!selectedFrameId || sending) return;
    if (!content.trim()) {
      alert('请输入点评内容');
      return;
    }
    if (rating === 0) {
      alert('请选择评分');
      return;
    }
    setSending(true);
    try {
      const newComment = await createComment({
        frameId: selectedFrameId,
        userId: 'user-local',
        userName: '我',
        avatar: '',
        rating,
        content: content.trim(),
      });
      setComments((prev) => [newComment, ...prev]);
      setTotal((prev) => prev + 1);
      setContent('');
      setRating(0);
      setHoverRating(0);
      if (onFrameCommentCountChange) {
        onFrameCommentCountChange(selectedFrameId, 1);
      }
    } catch (err) {
      console.error('发送点评失败:', err);
      alert('发送点评失败，请稍后重试');
    } finally {
      setSending(false);
    }
  }, [selectedFrameId, sending, content, rating, onFrameCommentCountChange]);

  const skeletonStyle: React.CSSProperties = {
    width: '100%',
    height: 30,
    borderRadius: 6,
    background:
      'linear-gradient(90deg, #eee 0%, #f5f5f5 50%, #eee 100%)',
    backgroundSize: '200% 100%',
    animation: 'skeletonPulse 1.5s ease infinite',
  };

  return (
    <div
      style={{
        width: 340,
        background: '#ffffff',
        boxShadow: '-4px 0 20px rgba(0,0,0,0.08)',
        borderRadius: 16,
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      <style>{`
        @keyframes skeletonPulse {
          0% { background-position: 200% 0 }
          100% { background-position: -200% 0 }
        }
      `}</style>

      <div
        style={{
          padding: 20,
          borderBottom: '1px solid #eee',
        }}
      >
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: '#1a1a2e',
          }}
        >
          点评面板
        </div>
        {selectedFrameId ? (
          <div
            style={{
              fontSize: 13,
              color: '#888',
              marginTop: 4,
            }}
          >
            {frameName} · 共 {total} 条点评
          </div>
        ) : (
          <div
            style={{
              fontSize: 13,
              color: '#bbb',
              marginTop: 4,
            }}
          >
            请选中一个画格查看点评
          </div>
        )}
      </div>

      <div
        ref={listRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 12px',
        }}
      >
        {!selectedFrameId ? null : comments.length === 0 && !loading ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              minHeight: 200,
            }}
          >
            <MessageCircle
              size={48}
              style={{ color: '#ddd', marginBottom: 12 }}
            />
            <div
              style={{
                fontSize: 13,
                color: '#999',
              }}
            >
              暂无点评，成为第一个点评者吧！
            </div>
          </div>
        ) : (
          <>
            {comments.map((comment, index) => (
              <div
                key={comment.id}
                style={{
                  borderRadius: 10,
                  padding: 12,
                  marginBottom: 10,
                  background: index % 2 === 1 ? '#f9f9f9' : '#ffffff',
                  border: '1px solid #f0f0f0',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    marginBottom: 8,
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: hashUserName(comment.userName),
                      color: 'white',
                      fontSize: 14,
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {comment.userName.charAt(0).toUpperCase()}
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: '#222',
                      flex: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {comment.userName}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: '#999',
                      flexShrink: 0,
                    }}
                  >
                    {formatTime(comment.createdAt)}
                  </div>
                </div>

                <div style={{ marginBottom: 6 }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={16}
                      style={{
                        fill: star <= comment.rating ? '#ffa500' : 'none',
                        color: star <= comment.rating ? '#ffa500' : '#ddd',
                        marginRight: star < 5 ? 2 : 0,
                      }}
                    />
                  ))}
                </div>

                <div
                  style={{
                    fontSize: 13,
                    color: '#444',
                    lineHeight: 1.6,
                    wordBreak: 'break-word',
                  }}
                >
                  {comment.content}
                </div>
              </div>
            ))}

            <div ref={sentinelRef} style={{ height: 1 }} />

            {loading && <div style={skeletonStyle} />}
          </>
        )}
      </div>

      <div
        style={{
          padding: 16,
          borderTop: '1px solid #eee',
          background: '#fafafa',
        }}
      >
        {selectedFrameId ? (
          <>
            <div style={{ display: 'flex', gap: 4 }}>
              {[1, 2, 3, 4, 5].map((star) => {
                const active = (hoverRating || rating) >= star;
                return (
                  <Star
                    key={star}
                    size={22}
                    style={{
                      fill: active ? '#ffa500' : 'none',
                      color: active ? '#ffa500' : '#ccc',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                  />
                );
              })}
            </div>

            <input
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="写下你的点评..."
              style={{
                width: '100%',
                borderRadius: 20,
                border: '1px solid #ddd',
                padding: '10px 16px',
                fontSize: 13,
                outline: 'none',
                background: 'white',
                marginTop: 10,
                boxSizing: 'border-box',
                transition: 'all 0.2s',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#ff6b6b';
                e.currentTarget.style.boxShadow =
                  '0 0 0 3px rgba(255,107,107,0.1)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#ddd';
                e.currentTarget.style.boxShadow = 'none';
              }}
              disabled={sending}
            />

            <button
              onClick={handleSubmit}
              disabled={sending || !content.trim() || rating === 0}
              style={{
                width: '100%',
                marginTop: 12,
                borderRadius: 10,
                background:
                  sending || !content.trim() || rating === 0
                    ? '#ccc'
                    : '#ff6b6b',
                color: 'white',
                border: 'none',
                padding: 10,
                fontSize: 14,
                fontWeight: 600,
                cursor:
                  sending || !content.trim() || rating === 0
                    ? 'not-allowed'
                    : 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => {
                if (!sending && content.trim() && rating > 0) {
                  e.currentTarget.style.background = '#e65555';
                }
              }}
              onMouseLeave={(e) => {
                if (!sending && content.trim() && rating > 0) {
                  e.currentTarget.style.background = '#ff6b6b';
                }
              }}
            >
              {sending ? '发送中...' : '发送点评'}
            </button>
          </>
        ) : (
          <div
            style={{
              textAlign: 'center',
              fontSize: 13,
              color: '#bbb',
              padding: '20px 0',
            }}
          >
            请先选中一个画格
          </div>
        )}
      </div>
    </div>
  );
}
