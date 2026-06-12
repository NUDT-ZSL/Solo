import { useEffect, useState, useCallback, useMemo } from 'react';
import BarChart from './components/BarChart';
import WordCloud, { segmentAndCount } from './components/WordCloud';
import { getSocket } from './socket';
import type { Poll, Comment } from './types';

const DEFAULT_POLL = {
  title: '您最喜欢的前端框架是？',
  options: ['React', 'Vue', 'Angular', 'Svelte'],
  duration: 10,
};

export default function HostView() {
  const [poll, setPoll] = useState<Poll | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newTitle, setNewTitle] = useState(DEFAULT_POLL.title);
  const [newOptions, setNewOptions] = useState<string[]>([...DEFAULT_POLL.options]);
  const [duration, setDuration] = useState(DEFAULT_POLL.duration);
  const [countdown, setCountdown] = useState(0);
  const [showWordCloud, setShowWordCloud] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const socket = useMemo(() => getSocket(), []);

  useEffect(() => {
    socket.on('poll:update', (updated: Poll) => {
      setPoll(updated);
      if (updated.status === 'closed') {
        const t = setTimeout(() => setShowWordCloud(true), 1000);
        return () => clearTimeout(t);
      }
      if (updated.status === 'active') {
        setShowWordCloud(false);
      }
    });

    socket.on('countdown:start', (sec: number) => {
      setCountdown(sec);
      setShowWordCloud(false);
    });

    socket.on('countdown:tick', (sec: number) => {
      setCountdown(sec);
    });

    socket.on('poll:closed', () => {
      setCountdown(0);
    });

    socket.on('comments:update', (list: Comment[]) => {
      setComments(list);
    });

    socket.on('comment:new', (comment: Comment) => {
      setComments((prev) => [comment, ...prev].slice(0, 50));
    });

    return () => {
      socket.off('poll:update');
      socket.off('countdown:start');
      socket.off('countdown:tick');
      socket.off('poll:closed');
      socket.off('comments:update');
      socket.off('comment:new');
    };
  }, [socket]);

  useEffect(() => {
    fetch('/api/polls')
      .then((r) => r.json())
      .then((data: Poll[]) => {
        if (data && data.length > 0) {
          const activePoll = data.find((p) => p.status === 'active') || data[0];
          setPoll(activePoll);
          if (activePoll.status === 'closed') {
            setTimeout(() => setShowWordCloud(true), 1000);
          }
          fetch(`/api/polls/${activePoll._id}/comments`)
            .then((r) => r.json())
            .then((cmts: Comment[]) => setComments(cmts));
        }
      })
      .catch(() => {});
  }, []);

  const handleCreatePoll = useCallback(async () => {
    setIsCreating(true);
    try {
      const validOptions = newOptions.filter((o) => o.trim().length > 0);
      if (newTitle.trim().length === 0 || validOptions.length < 2) {
        alert('请填写投票标题和至少2个选项');
        return;
      }
      const res = await fetch('/api/polls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          options: validOptions,
          duration,
        }),
      });
      const created = await res.json();
      setPoll(created);
      setComments([]);
      setShowWordCloud(false);
    } finally {
      setIsCreating(false);
    }
  }, [newTitle, newOptions, duration]);

  const handleStartPoll = useCallback(async () => {
    if (!poll) return;
    setIsStarting(true);
    try {
      await fetch(`/api/polls/${poll._id}/start`, { method: 'POST' });
    } finally {
      setIsStarting(false);
    }
  }, [poll]);

  const handleClosePoll = useCallback(async () => {
    if (!poll) return;
    await fetch(`/api/polls/${poll._id}/close`, { method: 'POST' });
  }, [poll]);

  const handleUpdateOption = (idx: number, value: string) => {
    setNewOptions((prev) => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });
  };

  const handleAddOption = () => {
    if (newOptions.length < 4) {
      setNewOptions((prev) => [...prev, '']);
    }
  };

  const handleRemoveOption = (idx: number) => {
    if (newOptions.length > 2) {
      setNewOptions((prev) => prev.filter((_, i) => i !== idx));
    }
  };

  const wordFrequencies = useMemo(() => {
    return segmentAndCount(comments.map((c) => c.text));
  }, [comments]);

  const totalVotes = poll?.options.reduce((sum, o) => sum + o.votes, 0) || 0;

  const chartWidth = 560;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
      padding: '24px',
      color: '#fff',
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
      }}>
        <header style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
        }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '-0.5px' }}>
              StreamVote <span style={{ opacity: 0.5, fontSize: '16px', fontWeight: 400 }}>主持人控制中心</span>
            </h1>
            <p style={{ marginTop: '6px', opacity: 0.6, fontSize: '14px' }}>
              实时投票与词云分析一体化平台
            </p>
          </div>
          {poll && poll.status === 'active' && countdown > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              background: 'rgba(255,255,255,0.08)',
              backdropFilter: 'blur(10px)',
              padding: '10px 20px',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22c55e', animation: 'pulse 1s infinite' }} />
              <span style={{ fontWeight: 600 }}>投票进行中</span>
              <span style={{ fontSize: '24px', fontWeight: 700, color: countdown <= 3 ? '#f43f5e' : '#fff' }}>
                {countdown}s
              </span>
            </div>
          )}
        </header>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          marginBottom: '24px',
          padding: '24px',
          background: 'rgba(255,255,255,0.06)',
          backdropFilter: 'blur(16px)',
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.1)',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '13px', opacity: 0.7, fontWeight: 500 }}>投票标题</label>
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="输入投票问题..."
              style={{
                padding: '12px 16px',
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.15)',
                background: 'rgba(255,255,255,0.08)',
                color: '#fff',
                fontSize: '15px',
                outline: 'none',
                transition: 'all 0.2s ease-in-out',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.35)')}
              onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.15)')}
            />
          </div>

          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '240px' }}>
              <label style={{ fontSize: '13px', opacity: 0.7, fontWeight: 500, display: 'block', marginBottom: '8px' }}>
                选项（2-4个）
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {newOptions.map((opt, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{
                      width: '28px', height: '28px', borderRadius: '8px',
                      background: ['#f43f5e', '#3b82f6', '#22c55e', '#f59e0b'][idx % 4],
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: '13px', flexShrink: 0,
                    }}>
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <input
                      value={opt}
                      onChange={(e) => handleUpdateOption(idx, e.target.value)}
                      placeholder={`选项 ${String.fromCharCode(65 + idx)}`}
                      style={{
                        flex: 1, padding: '10px 14px',
                        borderRadius: '10px',
                        border: '1px solid rgba(255,255,255,0.15)',
                        background: 'rgba(255,255,255,0.08)',
                        color: '#fff', fontSize: '14px', outline: 'none',
                        transition: 'all 0.2s ease-in-out',
                      }}
                    />
                    {newOptions.length > 2 && (
                      <button
                        onClick={() => handleRemoveOption(idx)}
                        style={{
                          padding: '10px 14px', borderRadius: '10px',
                          background: 'rgba(244, 63, 94, 0.15)',
                          color: '#f43f5e', border: '1px solid rgba(244,63,94,0.3)',
                          cursor: 'pointer', fontSize: '14px',
                          transition: 'all 0.2s ease-in-out',
                        }}
                      >删除</button>
                    )}
                  </div>
                ))}
                {newOptions.length < 4 && (
                  <button
                    onClick={handleAddOption}
                    style={{
                      padding: '10px 16px', borderRadius: '10px',
                      background: 'rgba(255,255,255,0.08)',
                      color: '#fff', border: '1px dashed rgba(255,255,255,0.2)',
                      cursor: 'pointer', fontSize: '14px',
                      transition: 'all 0.2s ease-in-out',
                    }}
                  >+ 添加选项</button>
                )}
              </div>
            </div>

            <div style={{ width: '180px' }}>
              <label style={{ fontSize: '13px', opacity: 0.7, fontWeight: 500, display: 'block', marginBottom: '8px' }}>
                投票时长（秒）
              </label>
              <input
                type="number"
                min={5}
                max={60}
                value={duration}
                onChange={(e) => setDuration(Math.max(5, Math.min(60, parseInt(e.target.value) || 10)))}
                style={{
                  padding: '12px 16px', borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'rgba(255,255,255,0.08)',
                  color: '#fff', fontSize: '15px', outline: 'none', width: '100%',
                  transition: 'all 0.2s ease-in-out',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={handleCreatePoll}
              disabled={isCreating}
              style={{
                padding: '12px 24px', borderRadius: '12px',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: '#fff', border: 'none',
                cursor: isCreating ? 'not-allowed' : 'pointer',
                fontSize: '15px', fontWeight: 600,
                opacity: isCreating ? 0.6 : 1,
                transition: 'all 0.2s ease-in-out',
                boxShadow: '0 4px 14px rgba(99, 102, 241, 0.3)',
              }}
              onMouseOver={(e) => { if (!isCreating) e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseOut={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              {isCreating ? '创建中...' : '🆕 创建新投票'}
            </button>

            {poll && poll.status === 'pending' && (
              <button
                onClick={handleStartPoll}
                disabled={isStarting}
                style={{
                  padding: '12px 24px', borderRadius: '12px',
                  background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                  color: '#fff', border: 'none',
                  cursor: isStarting ? 'not-allowed' : 'pointer',
                  fontSize: '15px', fontWeight: 600,
                  opacity: isStarting ? 0.6 : 1,
                  transition: 'all 0.2s ease-in-out',
                  boxShadow: '0 4px 14px rgba(34, 197, 94, 0.3)',
                }}
                onMouseOver={(e) => { if (!isStarting) e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseOut={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
              >
                {isStarting ? '启动中...' : '▶ 开始投票'}
              </button>
            )}

            {poll && poll.status === 'active' && (
              <button
                onClick={handleClosePoll}
                style={{
                  padding: '12px 24px', borderRadius: '12px',
                  background: 'linear-gradient(135deg, #f43f5e, #e11d48)',
                  color: '#fff', border: 'none',
                  cursor: 'pointer', fontSize: '15px', fontWeight: 600,
                  transition: 'all 0.2s ease-in-out',
                  boxShadow: '0 4px 14px rgba(244, 63, 94, 0.3)',
                }}
                onMouseOver={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
                onMouseOut={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
              >
                ⏹ 提前结束
              </button>
            )}
          </div>
        </div>

        <div style={{
          display: 'flex',
          gap: '20px',
          flexWrap: 'wrap',
        }}>
          <div style={{
            flex: '0 0 40%',
            minWidth: '360px',
            padding: '28px',
            background: 'rgba(255,255,255,0.06)',
            backdropFilter: 'blur(16px)',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            <div style={{ marginBottom: '24px' }}>
              <div style={{
                fontSize: '12px',
                fontWeight: 600,
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
                opacity: 0.5,
                marginBottom: '8px',
              }}>
                CURRENT POLL
              </div>
              <h2 style={{ fontSize: '22px', fontWeight: 700, lineHeight: 1.4 }}>
                {poll ? poll.title : '尚未创建投票'}
              </h2>
              {poll && (
                <div style={{ marginTop: '12px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{
                    padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                    background: poll.status === 'active'
                      ? 'rgba(34,197,94,0.18)'
                      : poll.status === 'closed'
                        ? 'rgba(100,116,139,0.25)'
                        : 'rgba(245,158,11,0.18)',
                    color: poll.status === 'active'
                      ? '#22c55e'
                      : poll.status === 'closed'
                        ? '#94a3b8'
                        : '#f59e0b',
                    border: `1px solid ${poll.status === 'active'
                      ? 'rgba(34,197,94,0.3)'
                      : poll.status === 'closed'
                        ? 'rgba(100,116,139,0.4)'
                        : 'rgba(245,158,11,0.3)'}`,
                  }}>
                    {poll.status === 'active' ? '● 进行中' : poll.status === 'closed' ? '已结束' : '待开始'}
                  </span>
                  <span style={{ fontSize: '13px', opacity: 0.6 }}>
                    共 {totalVotes} 票
                  </span>
                </div>
              )}
            </div>

            {poll && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {poll.options.map((option, idx) => {
                  const pct = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0;
                  return (
                    <div
                      key={option.id}
                      style={{
                        height: '60px',
                        borderRadius: '12px',
                        background: '#ffffff1a',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        padding: '0 18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'default',
                        transition: 'all 0.25s ease-in-out',
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)';
                        e.currentTarget.style.boxShadow = `0 8px 24px ${option.color}33`;
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <div style={{
                        position: 'absolute',
                        left: 0, top: 0, bottom: 0,
                        width: `${pct}%`,
                        background: `${option.color}22`,
                        transition: 'width 0.3s ease-out',
                      }} />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', position: 'relative', zIndex: 1 }}>
                        <span style={{
                          width: '34px', height: '34px', borderRadius: '10px',
                          background: option.color,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, fontSize: '14px', color: '#fff',
                          boxShadow: `0 2px 8px ${option.color}55`,
                        }}>
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span style={{ fontSize: '15px', fontWeight: 500 }}>{option.text}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', position: 'relative', zIndex: 1 }}>
                        <span style={{ fontSize: '22px', fontWeight: 700, color: option.color }}>
                          {option.votes}
                        </span>
                        <span style={{ fontSize: '13px', opacity: 0.55 }}>
                          {pct.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {!poll && (
              <div style={{
                padding: '60px 20px',
                textAlign: 'center',
                borderRadius: '12px',
                border: '2px dashed rgba(255,255,255,0.15)',
                opacity: 0.5,
              }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>📊</div>
                <p>使用上方表单创建投票</p>
              </div>
            )}
          </div>

          <div style={{
            flex: '0 0 calc(60% - 20px)',
            minWidth: '500px',
            padding: '28px',
            background: 'rgba(255,255,255,0.06)',
            backdropFilter: 'blur(16px)',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: '20px',
            }}>
              <div>
                <div style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  letterSpacing: '1.5px',
                  textTransform: 'uppercase',
                  opacity: 0.5,
                  marginBottom: '8px',
                }}>
                  {showWordCloud ? 'WORD CLOUD ANALYSIS' : 'REAL-TIME VOTING'}
                </div>
                <h3 style={{ fontSize: '22px', fontWeight: 700 }}>
                  {showWordCloud ? '观众评论词云' : '实时票数统计'}
                </h3>
              </div>
              {showWordCloud && (
                <span style={{
                  padding: '6px 16px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 600,
                  background: 'rgba(168, 85, 247, 0.18)',
                  color: '#c084fc',
                  border: '1px solid rgba(168,85,247,0.3)',
                }}>
                  基于 {comments.length} 条评论 · {wordFrequencies.length} 个关键词
                </span>
              )}
            </div>

            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '450px',
            }}>
              {showWordCloud ? (
                <div style={{ animation: 'fadeInUp 0.3s ease-out' }}>
                  <WordCloud words={wordFrequencies} width={500} height={400} />
                </div>
              ) : poll ? (
                <BarChart options={poll.options} width={chartWidth} height={450} />
              ) : (
                <div style={{ opacity: 0.4, textAlign: 'center' }}>
                  <div style={{ fontSize: '64px', marginBottom: '16px' }}>📈</div>
                  <p style={{ fontSize: '16px' }}>暂无数据，创建并开始投票后显示</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {comments.length > 0 && (
          <div style={{
            marginTop: '20px',
            padding: '20px 24px',
            background: 'rgba(255,255,255,0.06)',
            backdropFilter: 'blur(16px)',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            <div style={{ fontSize: '13px', opacity: 0.6, marginBottom: '12px', fontWeight: 500 }}>
              最新评论 · 共 {comments.length} 条
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {comments.slice(0, 15).map((c) => (
                <div
                  key={c._id}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '16px',
                    background: 'rgba(255,255,255,0.08)',
                    fontSize: '13px',
                    border: '1px solid rgba(255,255,255,0.06)',
                    animation: 'fadeInUp 0.25s ease-out',
                  }}
                >
                  {c.text}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
