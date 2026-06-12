import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { getSocket } from './socket';
import type { Poll, Comment } from './types';

const RING_DIAMETER = 80;
const RING_STROKE = 6;

export default function Viewer() {
  const [poll, setPoll] = useState<Poll | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [totalDuration, setTotalDuration] = useState(10);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [hasSubmittedComment, setHasSubmittedComment] = useState(false);
  const [pollEnded, setPollEnded] = useState(false);
  const countdownCanvasRef = useRef<HTMLCanvasElement>(null);
  const commentsContainerRef = useRef<HTMLDivElement>(null);
  const votedPollRef = useRef<Set<string>>(new Set());

  const socket = useMemo(() => getSocket(), []);

  useEffect(() => {
    socket.on('poll:update', (updated: Poll) => {
      setPoll(updated);
      if (updated.status === 'active') {
        setPollEnded(false);
        setTotalDuration(updated.duration);
        setSelectedOption(null);
        setHasVoted(false);
        setShowCommentInput(false);
        setHasSubmittedComment(false);
      }
      if (updated.status === 'closed') {
        setPollEnded(true);
        setCountdown(0);
        setTimeout(() => {
          if (!hasSubmittedComment && votedPollRef.current.has(updated._id!)) {
            setShowCommentInput(true);
          }
        }, 400);
      }
    });

    socket.on('countdown:start', (sec: number) => {
      setCountdown(sec);
      setTotalDuration(sec);
      setPollEnded(false);
    });

    socket.on('countdown:tick', (sec: number) => {
      setCountdown(sec);
    });

    socket.on('comments:update', (list: Comment[]) => {
      setComments(list.sort((a, b) => b.createdAt - a.createdAt));
    });

    socket.on('comment:new', (comment: Comment) => {
      setComments((prev) => [comment, ...prev].slice(0, 50));
    });

    return () => {
      socket.off('poll:update');
      socket.off('countdown:start');
      socket.off('countdown:tick');
      socket.off('comments:update');
      socket.off('comment:new');
    };
  }, [socket, hasSubmittedComment]);

  useEffect(() => {
    const canvas = countdownCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = RING_DIAMETER * dpr;
    canvas.height = RING_DIAMETER * dpr;
    canvas.style.width = `${RING_DIAMETER}px`;
    canvas.style.height = `${RING_DIAMETER}px`;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, RING_DIAMETER, RING_DIAMETER);

    const centerX = RING_DIAMETER / 2;
    const centerY = RING_DIAMETER / 2;
    const radius = (RING_DIAMETER - RING_STROKE) / 2;

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = RING_STROKE;
    ctx.stroke();

    if (totalDuration > 0) {
      const progress = Math.max(0, Math.min(1, countdown / totalDuration));
      const t = 1 - progress;
      const startAngle = -Math.PI / 2;
      const endAngle = startAngle + Math.PI * 2 * progress;

      const r1 = 34, g1 = 197, b1 = 94;
      const r2 = 244, g2 = 63, b2 = 94;
      const r = Math.round(r1 + (r2 - r1) * t);
      const g = Math.round(g1 + (g2 - g1) * t);
      const b = Math.round(b1 + (b2 - b1) * t);
      const strokeColor = `rgb(${r}, ${g}, ${b})`;

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = RING_STROKE;
      ctx.lineCap = 'round';
      ctx.stroke();

      ctx.fillStyle = countdown <= 3 && countdown > 0 ? '#f43f5e' : '#fff';
      ctx.font = `bold ${countdown < 100 ? 26 : 22}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(countdown), centerX, centerY + 1);
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('--', centerX, centerY);
    }
  }, [countdown, totalDuration]);

  const handleSelectOption = useCallback(async (optionId: string) => {
    if (!poll || poll.status !== 'active' || hasVoted) return;

    setSelectedOption(optionId);
    setHasVoted(true);
    votedPollRef.current.add(poll._id!);

    try {
      socket.emit('vote:submit', { pollId: poll._id, optionId });
      await fetch('/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pollId: poll._id, optionId }),
      });
    } catch (_err) {
      // ignore
    }

    setTimeout(() => {
      if (!hasSubmittedComment) {
        setShowCommentInput(true);
      }
    }, 600);
  }, [poll, hasVoted, hasSubmittedComment, socket]);

  const handleSubmitComment = useCallback(async () => {
    if (!poll || !commentText.trim() || commentText.length > 40 || isSubmitting) return;

    setIsSubmitting(true);
    try {
      socket.emit('comment:submit', { pollId: poll._id, text: commentText.trim() });
      await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pollId: poll._id, text: commentText.trim() }),
      });
      setHasSubmittedComment(true);
      setShowCommentInput(false);
      setCommentText('');
    } catch (_err) {
      // ignore
    } finally {
      setIsSubmitting(false);
    }
  }, [poll, commentText, isSubmitting, socket]);

  const handleSkipComment = () => {
    setShowCommentInput(false);
    setHasSubmittedComment(true);
  };

  const CheckIcon = ({ color = '#fff', size = 20 }: { color?: string; size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M5 13l4 4L19 7" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  if (!poll) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        color: '#fff',
      }}>
        <div style={{
          width: '80px', height: '80px', borderRadius: '24px',
          background: 'rgba(255,255,255,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '40px', marginBottom: '24px',
          border: '1px solid rgba(255,255,255,0.15)',
        }}>⏳</div>
        <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>等待投票开始</h2>
        <p style={{ opacity: 0.6, fontSize: '15px' }}>请稍候，主持人即将发起投票...</p>
      </div>
    );
  }

  const isPollActive = poll.status === 'active';
  const isPollClosed = poll.status === 'closed';

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
      padding: '24px',
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '680px',
        margin: '0 auto',
      }}>
        <header style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '28px',
        }}>
          <div>
            <div style={{ fontSize: '13px', opacity: 0.5, fontWeight: 600, letterSpacing: '1px' }}>STREAMVOTE</div>
            <div style={{
              marginTop: '6px',
              fontSize: '14px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '4px 12px',
              borderRadius: '20px',
              background: isPollActive
                ? 'rgba(34,197,94,0.15)'
                : isPollClosed
                  ? 'rgba(100,116,139,0.2)'
                  : 'rgba(245,158,11,0.15)',
              border: `1px solid ${isPollActive
                ? 'rgba(34,197,94,0.25)'
                : isPollClosed
                  ? 'rgba(100,116,139,0.3)'
                  : 'rgba(245,158,11,0.25)'}`,
            }}>
              <span style={{
                width: '6px', height: '6px', borderRadius: '50%',
                background: isPollActive ? '#22c55e' : isPollClosed ? '#64748b' : '#f59e0b',
                animation: isPollActive ? 'pulse 1s infinite' : undefined,
              }} />
              <span style={{ fontWeight: 500 }}>
                {isPollActive ? '投票进行中' : isPollClosed ? '投票已结束' : '待开始'}
              </span>
            </div>
          </div>

          <div
            style={{
              animation: countdown === 0 && isPollClosed ? 'zoomOut 0.4s ease-in forwards' : undefined,
            }}
          >
            <canvas ref={countdownCanvasRef} />
          </div>
        </header>

        <div style={{
          textAlign: 'center',
          marginBottom: '28px',
          padding: '20px',
          background: 'rgba(255,255,255,0.06)',
          backdropFilter: 'blur(16px)',
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.1)',
          animation: 'fadeInUp 0.3s ease-out',
        }}>
          <div style={{ fontSize: '12px', opacity: 0.5, letterSpacing: '1px', marginBottom: '10px', fontWeight: 600 }}>
            当前问题
          </div>
          <h1 style={{
            fontSize: '22px',
            fontWeight: 700,
            lineHeight: 1.5,
          }}>
            {poll.title}
          </h1>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '14px',
          marginBottom: '28px',
        }}>
          {poll.options.map((option, idx) => {
            const isSelected = selectedOption === option.id;
            const disabled = !isPollActive || hasVoted;
            return (
              <button
                key={option.id}
                onClick={() => handleSelectOption(option.id)}
                disabled={disabled}
                style={{
                  width: '100%',
                  minHeight: '84px',
                  padding: '16px 20px',
                  borderRadius: '16px',
                  background: isSelected ? option.color : '#ffffff1a',
                  backdropFilter: 'blur(10px)',
                  border: isSelected
                    ? `2px solid ${option.color}`
                    : '1px solid rgba(255,255,255,0.08)',
                  color: '#fff',
                  fontSize: '16px',
                  fontWeight: 500,
                  cursor: disabled ? (isSelected ? 'default' : 'not-allowed') : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  textAlign: 'left',
                  opacity: disabled && !isSelected ? 0.5 : 1,
                  transition: 'all 0.25s ease-in-out',
                  animation: 'fadeInUp 0.3s ease-out',
                  boxShadow: isSelected ? `0 8px 24px ${option.color}55` : 'none',
                  transform: isSelected ? 'scale(1.02)' : undefined,
                }}
                onMouseOver={(e) => {
                  if (!disabled) {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }
                }}
                onMouseOut={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <span style={{
                    width: '36px', height: '36px', borderRadius: '10px',
                    background: isSelected ? 'rgba(255,255,255,0.22)' : option.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: '15px',
                    flexShrink: 0,
                  }}>
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span style={{ lineHeight: 1.4, fontSize: '16px' }}>{option.text}</span>
                </div>
                <div style={{
                  width: '28px', height: '28px',
                  borderRadius: '50%',
                  background: isSelected ? 'rgba(255,255,255,0.22)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'all 0.25s ease-in-out',
                }}>
                  {isSelected && (
                    <div style={{ animation: 'fadeInUp 0.2s ease-out' }}>
                      <CheckIcon />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {hasVoted && !isPollClosed && (
          <div style={{
            textAlign: 'center',
            padding: '14px 20px',
            borderRadius: '12px',
            background: 'rgba(34,197,94,0.12)',
            border: '1px solid rgba(34,197,94,0.25)',
            color: '#4ade80',
            fontSize: '14px',
            fontWeight: 500,
            marginBottom: '20px',
            animation: 'fadeInUp 0.25s ease-out',
          }}>
            ✓ 投票已提交，等待其他观众投票...
          </div>
        )}

        {showCommentInput && (
          <div style={{
            padding: '24px',
            background: 'rgba(255,255,255,0.08)',
            backdropFilter: 'blur(16px)',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.12)',
            marginBottom: '24px',
            animation: 'fadeInUp 0.3s ease-out',
          }}>
            <div style={{ fontSize: '12px', opacity: 0.55, marginBottom: '6px', fontWeight: 600, letterSpacing: '0.5px' }}>
              分享您的想法（可选）
            </div>
            <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '14px' }}>
              对本次投票有什么看法？
            </div>
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value.slice(0, 40))}
              placeholder="输入简短评论（最多40字）..."
              maxLength={40}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSubmitComment();
              }}
              style={{
                width: '100%',
                maxWidth: '320px',
                padding: '13px 16px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.18)',
                background: 'rgba(255,255,255,0.1)',
                color: '#fff',
                fontSize: '14px',
                outline: 'none',
                marginBottom: '12px',
                transition: 'all 0.2s ease-in-out',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.4)')}
              onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.18)')}
            />
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap',
            }}>
              <span style={{
                fontSize: '12px',
                opacity: commentText.length >= 40 ? 1 : 0.45,
                color: commentText.length >= 40 ? '#f43f5e' : undefined,
                fontWeight: 500,
              }}>
                {commentText.length}/40
              </span>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={handleSkipComment}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '10px',
                    background: 'rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.7)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease-in-out',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.14)')}
                  onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                >
                  跳过
                </button>
                <button
                  onClick={handleSubmitComment}
                  disabled={!commentText.trim() || isSubmitting}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    color: '#fff',
                    border: 'none',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: (!commentText.trim() || isSubmitting) ? 'not-allowed' : 'pointer',
                    opacity: (!commentText.trim() || isSubmitting) ? 0.5 : 1,
                    transition: 'all 0.2s ease-in-out',
                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                  }}
                  onMouseOver={(e) => {
                    if (commentText.trim() && !isSubmitting) e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseOut={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
                >
                  {isSubmitting ? '提交中...' : '发送评论'}
                </button>
              </div>
            </div>
          </div>
        )}

        {comments.length > 0 && (
          <div style={{
            padding: '20px',
            background: 'rgba(255,255,255,0.06)',
            backdropFilter: 'blur(16px)',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '14px',
            }}>
              <div style={{ fontSize: '14px', fontWeight: 600 }}>
                💬 实时评论
              </div>
              <span style={{
                fontSize: '12px', opacity: 0.45, fontWeight: 500,
                padding: '3px 10px',
                borderRadius: '12px',
                background: 'rgba(255,255,255,0.06)',
              }}>
                {comments.length} 条
              </span>
            </div>
            <div
              ref={commentsContainerRef}
              style={{
                height: '200px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {comments.map((comment) => (
                <div
                  key={comment._id}
                  style={{
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 12px',
                    borderRadius: '8px',
                    marginBottom: '4px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.04)',
                    fontSize: '13.5px',
                    lineHeight: '36px',
                    animation: 'fadeInUp 0.25s ease-out',
                    position: 'relative',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                  }}
                >
                  <span style={{
                    width: '6px', height: '6px', borderRadius: '50%',
                    background: '#6366f1',
                    marginRight: '10px',
                    flexShrink: 0,
                  }} />
                  <span style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {comment.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <footer style={{
          marginTop: '28px',
          textAlign: 'center',
          fontSize: '12px',
          opacity: 0.35,
          fontWeight: 500,
        }}>
          StreamVote · 实时互动投票平台
        </footer>
      </div>
    </div>
  );
}
