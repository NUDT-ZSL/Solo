import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { fetchCards, createCard, toggleLike, fetchComments, createComment } from './api';
import type { Card, Comment } from './api';

const GROUPS = ['全部', '产品', '技术', '设计'];
const CARD_HEIGHT = 220;
const CARD_GAP = 20;
const BREAKPOINT_TABLET = 768;
const BREAKPOINT_MOBILE = 480;
const RESIZE_DEBOUNCE_MS = 150;
const COMMENT_ANIM_DURATION = 350;

const css = `
@keyframes heartbeat {
  0% { transform: scale(1); }
  30% { transform: scale(1.3); }
  60% { transform: scale(1); }
  80% { transform: scale(1.15); }
  100% { transform: scale(1); }
}
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes diffuseIn {
  0% {
    opacity: 0;
    transform: scale(0.5);
    box-shadow: 0 0 0 0 var(--diffuse-glow-start, rgba(124, 58, 237, 0.7)), var(--card-shadow, 0 4px 12px rgba(0,0,0,0.3));
  }
  30% {
    opacity: 0.5;
    box-shadow: 0 0 25px 8px var(--diffuse-glow-mid, rgba(124, 58, 237, 0.4)), var(--card-shadow, 0 4px 12px rgba(0,0,0,0.3));
  }
  60% {
    opacity: 0.8;
    box-shadow: 0 0 40px 15px var(--diffuse-glow-end, rgba(124, 58, 237, 0.15)), var(--card-shadow, 0 4px 12px rgba(0,0,0,0.3));
  }
  100% {
    opacity: 1;
    transform: scale(1);
    box-shadow: 0 0 0 0 transparent, var(--card-shadow, 0 4px 12px rgba(0,0,0,0.3));
  }
}
@keyframes slideInFromBottom {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes fadeInStagger {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes modalIn {
  from { opacity: 0; transform: scale(0.9) translateY(20px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
@keyframes detailIn {
  from { opacity: 0; transform: translateY(40px); }
  to { opacity: 1; transform: translateY(0); }
}
.heartbeat-anim {
  animation: heartbeat 0.5s ease-in-out;
}
.diffuse-enter {
  --diffuse-glow-start: rgba(124, 58, 237, 0.7);
  --diffuse-glow-mid: rgba(124, 58, 237, 0.4);
  --diffuse-glow-end: rgba(124, 58, 237, 0.15);
  animation: diffuseIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}
.comment-enter {
  animation: slideInFromBottom 0.35s ease-out forwards;
}
.filter-fade-in {
  opacity: 0;
  animation: fadeInStagger 0.3s ease-out forwards;
}
.modal-enter {
  animation: modalIn 0.3s ease-out forwards;
}
.detail-enter {
  animation: detailIn 0.35s ease-out forwards;
}
.virtual-scroll-container::-webkit-scrollbar {
  width: 8px;
}
.virtual-scroll-container::-webkit-scrollbar-track {
  background: rgba(255,255,255,0.03);
  border-radius: 4px;
}
.virtual-scroll-container::-webkit-scrollbar-thumb {
  background: rgba(124, 58, 237, 0.4);
  border-radius: 4px;
}
.virtual-scroll-container::-webkit-scrollbar-thumb:hover {
  background: rgba(124, 58, 237, 0.6);
}
`;

function getColumnsForWidth(w: number): number {
  if (w <= BREAKPOINT_MOBILE) return 1;
  if (w <= BREAKPOINT_TABLET) return 2;
  return 3;
}

function VirtualCardGrid({ cards, onCardClick, onLike, likedSet, newCardId, filterKey }: {
  cards: Card[];
  onCardClick: (id: string) => void;
  onLike: (id: string, e: React.MouseEvent) => void;
  likedSet: Set<string>;
  newCardId: string | null;
  filterKey: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const resizeTimerRef = useRef<number | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(800);
  const [columns, setColumns] = useState(3);

  const updateSize = useCallback(() => {
    if (!containerRef.current) return;
    setContainerHeight(Math.max(400, window.innerHeight - 180));
    const w = containerRef.current.clientWidth;
    setColumns((prev) => {
      const next = getColumnsForWidth(w);
      if (next !== prev && containerRef.current) {
        const firstCardTop = containerRef.current.scrollTop;
        requestAnimationFrame(() => {
          if (containerRef.current) {
            const prevRowHeight = CARD_HEIGHT + CARD_GAP;
            const currentRow = firstCardTop / prevRowHeight;
            const newRowHeight = CARD_HEIGHT + CARD_GAP;
            containerRef.current.scrollTop = currentRow * newRowHeight;
          }
        });
      }
      return next;
    });
  }, []);

  useEffect(() => {
    updateSize();
    const handleResize = () => {
      if (resizeTimerRef.current !== null) {
        window.clearTimeout(resizeTimerRef.current);
      }
      resizeTimerRef.current = window.setTimeout(() => {
        updateSize();
        if (containerRef.current) {
          setScrollTop(containerRef.current.scrollTop);
        }
      }, RESIZE_DEBOUNCE_MS);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimerRef.current !== null) {
        window.clearTimeout(resizeTimerRef.current);
      }
    };
  }, [updateSize]);

  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop);
    }
  }, []);

  const rows = useMemo(() => {
    const result: Card[][] = [];
    for (let i = 0; i < cards.length; i += columns) {
      result.push(cards.slice(i, i + columns));
    }
    return result;
  }, [cards, columns]);

  const rowHeight = CARD_HEIGHT + CARD_GAP;
  const totalHeight = rows.length * rowHeight;
  const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - 2);
  const visibleRows = Math.ceil(containerHeight / rowHeight) + 4;
  const endRow = Math.min(rows.length, startRow + visibleRows);

  const visibleRowsSlice = rows.slice(startRow, endRow);
  const visibleStartGlobalIdx = startRow * columns;

  const handleDiffuseEnd = useCallback((e: React.AnimationEvent<HTMLDivElement>, cardId: string) => {
    if (e.animationName === 'diffuseIn') {
      const target = e.currentTarget;
      target.classList.remove('diffuse-enter');
      target.style.removeProperty('--diffuse-glow-start');
      target.style.removeProperty('--diffuse-glow-mid');
      target.style.removeProperty('--diffuse-glow-end');
    }
  }, []);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="virtual-scroll-container"
      style={{
        height: containerHeight,
        overflowY: 'auto',
        overflowX: 'hidden',
        position: 'relative',
      }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleRowsSlice.map((row, visibleRowIdx) => {
          const actualRowIdx = startRow + visibleRowIdx;
          return (
            <div
              key={`row-${actualRowIdx}`}
              style={{
                position: 'absolute',
                top: actualRowIdx * rowHeight,
                left: 0,
                right: 0,
                display: 'grid',
                gridTemplateColumns: `repeat(${columns}, 1fr)`,
                gap: `${CARD_GAP}px`,
                padding: `0 ${CARD_GAP}px`,
              }}
            >
              {row.map((card, ci) => {
                const visibleIdx = visibleRowIdx * columns + ci;
                const globalIdx = visibleStartGlobalIdx + visibleIdx;
                const isNew = card.id === newCardId;
                const shouldAnimate = isNew || (visibleIdx < 20);

                return (
                  <div
                    key={`card-${card.id}`}
                    className={
                      isNew
                        ? 'diffuse-enter'
                        : shouldAnimate
                        ? 'filter-fade-in'
                        : ''
                    }
                    onAnimationEnd={isNew ? (e) => handleDiffuseEnd(e, card.id) : undefined}
                    style={{
                      animationDelay: isNew
                        ? '0ms'
                        : shouldAnimate
                        ? `${visibleIdx * 100}ms`
                        : '0ms',
                      animationFillMode: 'both',
                    }}
                  >
                    <CardItem
                      card={card}
                      onClick={() => onCardClick(card.id)}
                      onLike={(e) => onLike(card.id, e)}
                      isLiked={likedSet.has(card.id)}
                    />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CardItem({ card, onClick, onLike, isLiked }: {
  card: Card;
  onClick: () => void;
  onLike: (e: React.MouseEvent) => void;
  isLiked: boolean;
}) {
  const [heartAnim, setHeartAnim] = useState(false);
  const heartRef = useRef<SVGSVGElement>(null);
  const timeoutRef = useRef<number | null>(null);

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!heartAnim) {
      setHeartAnim(true);
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => setHeartAnim(false), 500);
    }
    onLike(e);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div
      onClick={onClick}
      style={{
        background: '#2a2a3e',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '12px',
        padding: '20px',
        height: CARD_HEIGHT,
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        transition: 'transform 300ms ease-out, box-shadow 300ms ease-out',
        overflow: 'hidden',
        width: '100%',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.05)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.5)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
        <h3 style={{
          fontSize: '16px',
          fontWeight: 600,
          color: '#f0f0f0',
          margin: 0,
          lineHeight: 1.4,
          flex: 1,
          marginRight: '8px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>{card.title}</h3>
        <span style={{
          fontSize: '11px',
          padding: '3px 8px',
          borderRadius: '10px',
          background: card.group === '技术' ? 'rgba(59,130,246,0.2)' : card.group === '设计' ? 'rgba(236,72,153,0.2)' : 'rgba(124,58,237,0.2)',
          color: card.group === '技术' ? '#60a5fa' : card.group === '设计' ? '#f472b6' : '#a78bfa',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}>{card.group}</span>
      </div>
      <p style={{
        fontSize: '13px',
        color: '#a0a0b8',
        lineHeight: 1.6,
        margin: 0,
        flex: 1,
        overflow: 'hidden',
        display: '-webkit-box',
        WebkitLineClamp: 3,
        WebkitBoxOrient: 'vertical',
      }}>{card.content}</p>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <button
          onClick={handleLikeClick}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: isLiked ? '#ef4444' : '#888',
            fontSize: '14px',
            padding: '4px 8px',
            borderRadius: '6px',
            transition: 'background-color 200ms linear, color 200ms linear',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.05)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; }}
        >
          <svg
            ref={heartRef}
            className={heartAnim ? 'heartbeat-anim' : ''}
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill={isLiked ? '#ef4444' : 'none'}
            stroke={isLiked ? '#ef4444' : 'currentColor'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ display: 'block' }}
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          <span>{card.likes}</span>
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#888', fontSize: '13px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span>评论</span>
        </div>
      </div>
    </div>
  );
}

function CardDetail({ card, onBack }: { card: Card; onBack: () => void }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [animatingCommentIds, setAnimatingCommentIds] = useState<Map<string, number>>(new Map());
  const [hasLoaded, setHasLoaded] = useState(false);
  const submissionQueueRef = useRef<Array<{ username: string; content: string }>>([]);
  const isProcessingQueueRef = useRef(false);

  useEffect(() => {
    setHasLoaded(false);
    setAnimatingCommentIds(new Map());
    submissionQueueRef.current = [];
    isProcessingQueueRef.current = false;
    fetchComments(card.id).then((data) => {
      setComments(data);
      setLoading(false);
      setHasLoaded(true);
    }).catch(() => {
      setLoading(false);
      setHasLoaded(true);
    });
  }, [card.id]);

  useEffect(() => {
    return () => {
      animatingCommentIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, [animatingCommentIds]);

  const processQueue = useCallback(async () => {
    if (isProcessingQueueRef.current) return;
    while (submissionQueueRef.current.length > 0) {
      isProcessingQueueRef.current = true;
      const item = submissionQueueRef.current.shift();
      if (!item) break;
      try {
        const comment = await createComment(card.id, item);
        setComments((prev) => [comment, ...prev]);
        setAnimatingCommentIds((prev) => {
          const next = new Map(prev);
          if (next.has(comment.id)) {
            window.clearTimeout(next.get(comment.id));
          }
          const timeoutId = window.setTimeout(() => {
            setAnimatingCommentIds((p) => {
              const n = new Map(p);
              n.delete(comment.id);
              return n;
            });
          }, COMMENT_ANIM_DURATION + 50);
          next.set(comment.id, timeoutId);
          return next;
        });
      } catch (err) {
        console.error(err);
      }
    }
    isProcessingQueueRef.current = false;
    setSubmitting(false);
  }, [card.id]);

  const handleSubmit = useCallback(async () => {
    const trimmedUser = username.trim();
    const trimmedContent = newComment.trim();
    if (!trimmedContent || !trimmedUser) return;

    submissionQueueRef.current.push({ username: trimmedUser, content: trimmedContent });
    setNewComment('');
    setSubmitting(true);

    if (!isProcessingQueueRef.current) {
      await processQueue();
    }
  }, [username, newComment, processQueue]);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const avatarColors = ['#7c3aed', '#3b82f6', '#ec4899', '#10b981', '#f59e0b', '#ef4444'];
  const getAvatarColor = (name: string) => avatarColors[name.charCodeAt(0) % avatarColors.length];

  return (
    <div className="detail-enter" style={{ maxWidth: '680px', margin: '0 auto', padding: '0 20px' }}>
      <button
        onClick={onBack}
        style={{
          background: 'rgba(255,255,255,0.06)',
          border: 'none',
          color: '#ccc',
          cursor: 'pointer',
          padding: '8px 16px',
          borderRadius: '8px',
          fontSize: '14px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          transition: 'background-color 200ms linear',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.12)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.06)'; }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        返回看板
      </button>

      <div style={{
        background: '#2a2a3e',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '12px',
        padding: '28px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        marginBottom: '28px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#f0f0f0', margin: 0, flex: 1, marginRight: '12px' }}>{card.title}</h2>
          <span style={{
            fontSize: '12px',
            padding: '4px 10px',
            borderRadius: '12px',
            background: card.group === '技术' ? 'rgba(59,130,246,0.2)' : card.group === '设计' ? 'rgba(236,72,153,0.2)' : 'rgba(124,58,237,0.2)',
            color: card.group === '技术' ? '#60a5fa' : card.group === '设计' ? '#f472b6' : '#a78bfa',
          }}>{card.group}</span>
        </div>
        <p style={{ fontSize: '15px', color: '#c0c0d0', lineHeight: 1.8, margin: '0 0 16px 0' }}>{card.content}</p>
        <div style={{ fontSize: '12px', color: '#777', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
          </svg>
          {formatTime(card.createdAt)}
        </div>
      </div>

      <h3 style={{ fontSize: '16px', color: '#ccc', marginBottom: '16px', fontWeight: 600 }}>
        评论 ({comments.length})
      </h3>

      <div style={{ marginBottom: '24px' }}>
        {loading || !hasLoaded ? (
          <div style={{ color: '#777', textAlign: 'center', padding: '20px' }}>加载评论中...</div>
        ) : comments.length === 0 ? (
          <div style={{ color: '#777', textAlign: 'center', padding: '20px' }}>暂无评论，来发表第一条评论吧</div>
        ) : (
          comments.map((comment, idx) => (
            <div
              key={comment.id}
              className={animatingCommentIds.has(comment.id) ? 'comment-enter' : ''}
              style={{
                display: 'flex',
                gap: '12px',
                padding: '16px 0',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                position: 'relative',
              }}
            >
              {idx > 0 && (
                <div style={{
                  position: 'absolute',
                  left: '18px',
                  top: '-16px',
                  width: '2px',
                  height: '16px',
                  background: 'rgba(124,58,237,0.3)',
                }} />
              )}
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: getAvatarColor(comment.username),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 600,
                flexShrink: 0,
              }}>
                {comment.username.charAt(0)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#e0e0f0' }}>{comment.username}</span>
                  <span style={{ fontSize: '11px', color: '#666' }}>{formatTime(comment.createdAt)}</span>
                </div>
                <p style={{ fontSize: '14px', color: '#b0b0c8', lineHeight: 1.6, margin: 0 }}>{comment.content}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <div style={{
        background: '#2a2a3e',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '12px',
        padding: '20px',
      }}>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="你的昵称"
            style={{
              flex: '0 0 120px',
              background: '#1e1e2e',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              padding: '10px 14px',
              color: '#e0e0e0',
              fontSize: '14px',
              outline: 'none',
              transition: 'border-color 200ms linear',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="写下你的想法..."
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
            style={{
              flex: 1,
              background: '#1e1e2e',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              padding: '10px 14px',
              color: '#e0e0e0',
              fontSize: '14px',
              outline: 'none',
              transition: 'border-color 200ms linear',
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={submitting || !newComment.trim() || !username.trim()}
            style={{
              background: '#7c3aed',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 20px',
              fontSize: '14px',
              cursor: submitting || !newComment.trim() || !username.trim() ? 'not-allowed' : 'pointer',
              opacity: submitting || !newComment.trim() || !username.trim() ? 0.5 : 1,
              transition: 'background-color 200ms linear, opacity 200ms linear',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => { if (!submitting && newComment.trim() && username.trim()) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#6d28d9'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#7c3aed'; }}
          >
            {submitting ? '提交中...' : '发送'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddCardModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (data: { title: string; content: string; group: string }) => void }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [group, setGroup] = useState('产品');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) return;
    setSubmitting(true);
    await onSubmit({ title: title.trim(), content: content.trim(), group });
    setSubmitting(false);
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: '20px',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        className="modal-enter"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#2a2a3e',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '16px',
          padding: '32px',
          width: '100%',
          maxWidth: '500px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#f0f0f0', marginBottom: '24px' }}>✨ 新增灵感</h2>

        <label style={{ display: 'block', marginBottom: '16px' }}>
          <span style={{ fontSize: '13px', color: '#aaa', marginBottom: '6px', display: 'block' }}>标题</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="给你的灵感起个名字"
            style={{
              width: '100%',
              background: '#1e1e2e',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              padding: '12px 16px',
              color: '#e0e0e0',
              fontSize: '15px',
              outline: 'none',
              transition: 'border-color 200ms linear',
            }}
          />
        </label>

        <label style={{ display: 'block', marginBottom: '16px' }}>
          <span style={{ fontSize: '13px', color: '#aaa', marginBottom: '6px', display: 'block' }}>内容</span>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="详细描述你的灵感..."
            rows={4}
            style={{
              width: '100%',
              background: '#1e1e2e',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              padding: '12px 16px',
              color: '#e0e0e0',
              fontSize: '15px',
              outline: 'none',
              resize: 'vertical',
              fontFamily: 'inherit',
              lineHeight: 1.6,
              transition: 'border-color 200ms linear',
            }}
          />
        </label>

        <label style={{ display: 'block', marginBottom: '24px' }}>
          <span style={{ fontSize: '13px', color: '#aaa', marginBottom: '6px', display: 'block' }}>分组</span>
          <select
            value={group}
            onChange={(e) => setGroup(e.target.value)}
            style={{
              width: '100%',
              background: '#1e1e2e',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              padding: '12px 16px',
              color: '#e0e0e0',
              fontSize: '15px',
              outline: 'none',
              appearance: 'none',
              cursor: 'pointer',
              transition: 'border-color 200ms linear',
            }}
          >
            <option value="产品">产品</option>
            <option value="技术">技术</option>
            <option value="设计">设计</option>
          </select>
        </label>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: 'none',
              color: '#ccc',
              borderRadius: '8px',
              padding: '10px 20px',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'background-color 200ms linear',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.12)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.06)'; }}
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !title.trim() || !content.trim()}
            style={{
              background: '#7c3aed',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 24px',
              fontSize: '14px',
              cursor: submitting || !title.trim() || !content.trim() ? 'not-allowed' : 'pointer',
              opacity: submitting || !title.trim() || !content.trim() ? 0.5 : 1,
              transition: 'background-color 200ms linear, opacity 200ms linear',
            }}
            onMouseEnter={(e) => { if (!submitting && title.trim() && content.trim()) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#6d28d9'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#7c3aed'; }}
          >
            {submitting ? '发布中...' : '发布灵感'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterGroup, setFilterGroup] = useState('全部');
  const [sortBy, setSortBy] = useState<'time' | 'likes'>('time');
  const [showModal, setShowModal] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [likedSet, setLikedSet] = useState<Set<string>>(new Set());
  const [newCardId, setNewCardId] = useState<string | null>(null);
  const [filterKey, setFilterKey] = useState(0);

  const loadCards = useCallback(async () => {
    try {
      const data = await fetchCards();
      setCards(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  useEffect(() => {
    setFilterKey((k) => k + 1);
  }, [filterGroup, sortBy]);

  const filteredCards = useMemo(() => {
    let result = filterGroup === '全部' ? [...cards] : cards.filter((c) => c.group === filterGroup);
    if (sortBy === 'likes') {
      result.sort((a, b) => b.likes - a.likes);
    } else {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return result;
  }, [cards, filterGroup, sortBy]);

  const selectedCard = useMemo(() => cards.find((c) => c.id === selectedCardId) || null, [cards, selectedCardId]);

  const handleLike = useCallback(async (cardId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const userId = 'current_user';
    try {
      const updated = await toggleLike(cardId, userId);
      setCards((prev) => prev.map((c) => (c.id === cardId ? updated : c)));
      setLikedSet((prev) => {
        const next = new Set(prev);
        if (next.has(cardId)) next.delete(cardId);
        else next.add(cardId);
        return next;
      });
    } catch (err) {
      console.error(err);
    }
  }, []);

  const handleCreateCard = useCallback(async (data: { title: string; content: string; group: string }) => {
    try {
      const card = await createCard(data);
      setCards((prev) => [card, ...prev]);
      setNewCardId(card.id);
      setShowModal(false);
      setTimeout(() => setNewCardId(null), 600);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const handleFilterGroupChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterGroup(e.target.value);
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortBy(e.target.value as 'time' | 'likes');
  };

  if (selectedCard) {
    return (
      <>
        <style>{css}</style>
        <div style={{ minHeight: '100vh', background: '#1e1e2e', paddingTop: '32px', paddingBottom: '40px' }}>
          <CardDetail card={selectedCard} onBack={() => setSelectedCardId(null)} />
        </div>
      </>
    );
  }

  return (
    <>
      <style>{css}</style>
      <div style={{ minHeight: '100vh', background: '#1e1e2e' }}>
        <header style={{
          padding: '24px 32px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#f0f0f0', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
            <span style={{ fontSize: '28px' }}>💡</span> 灵感看板
          </h1>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              value={filterGroup}
              onChange={handleFilterGroupChange}
              style={{
                background: '#2a2a3e',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                padding: '8px 14px',
                color: '#e0e0e0',
                fontSize: '14px',
                outline: 'none',
                cursor: 'pointer',
                appearance: 'none',
                transition: 'border-color 200ms linear',
              }}
            >
              {GROUPS.map((g) => (
                <option key={g} value={g}>{g === '全部' ? '全部分组' : g}</option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={handleSortChange}
              style={{
                background: '#2a2a3e',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                padding: '8px 14px',
                color: '#e0e0e0',
                fontSize: '14px',
                outline: 'none',
                cursor: 'pointer',
                appearance: 'none',
                transition: 'border-color 200ms linear',
              }}
            >
              <option value="time">按时间排序</option>
              <option value="likes">按点赞排序</option>
            </select>
            <button
              onClick={() => setShowModal(true)}
              style={{
                background: '#7c3aed',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 18px',
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'background-color 200ms linear',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#6d28d9'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#7c3aed'; }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              新增灵感
            </button>
          </div>
        </header>

        <main style={{ padding: '24px 32px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#777' }}>加载中...</div>
          ) : filteredCards.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#777' }}>
              暂无灵感卡片，点击"新增灵感"来创建第一个吧！
            </div>
          ) : (
            <VirtualCardGrid
              cards={filteredCards}
              onCardClick={(id) => setSelectedCardId(id)}
              onLike={handleLike}
              likedSet={likedSet}
              newCardId={newCardId}
              filterKey={filterKey}
            />
          )}
        </main>

        {showModal && (
          <AddCardModal
            onClose={() => setShowModal(false)}
            onSubmit={handleCreateCard}
          />
        )}
      </div>
    </>
  );
}
