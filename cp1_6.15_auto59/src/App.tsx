import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  createVote,
  submitVote,
  calculateResults,
  formatCountdown,
  isPollExpired,
  getSectorColor,
  Poll,
  PollResult,
} from './VoteManager';

const API_BASE = 'http://localhost:3001/api';

type View = 'home' | 'voting' | 'results';

interface OptionInput {
  title: string;
  imageUrl: string;
}

const ANIMATION_COLORS = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38181', '#AA96DA'];

function PieChart({ result }: { result: PollResult }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const size = 280;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const radius = size / 2 - 30;
    const total = result.optionResults.reduce((s, o) => s + o.voteCount, 0);

    startTimeRef.current = 0;
    const duration = 800;

    function draw(timestamp: number) {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const totalAngle = easedProgress * Math.PI * 2;

      ctx.clearRect(0, 0, size, size);

      let currentAngle = -Math.PI / 2;

      result.optionResults.forEach((opt, idx) => {
        if (total === 0) return;
        const sliceAngle = (opt.voteCount / total) * Math.PI * 2;
        const drawAngle = Math.min(sliceAngle, Math.max(0, totalAngle - (currentAngle + Math.PI / 2)));

        if (drawAngle > 0) {
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.arc(cx, cy, radius, currentAngle, currentAngle + drawAngle);
          ctx.closePath();
          ctx.fillStyle = ANIMATION_COLORS[idx % ANIMATION_COLORS.length];
          ctx.fill();

          if (drawAngle > 0.2) {
            const midAngle = currentAngle + drawAngle / 2;
            const labelR = radius * 0.65;
            const lx = cx + Math.cos(midAngle) * labelR;
            const ly = cy + Math.sin(midAngle) * labelR;
            ctx.fillStyle = '#333';
            ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${opt.percentage.toFixed(1)}%`, lx, ly);
          }
        }
        currentAngle += sliceAngle;
      });

      if (progress < 1) {
        animRef.current = requestAnimationFrame(draw);
      }
    }

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [result]);

  return <canvas ref={canvasRef} />;
}

function BarChart({ result }: { result: PollResult }) {
  const [animProgress, setAnimProgress] = useState(0);
  const maxVotes = Math.max(...result.optionResults.map((o) => o.voteCount), 1);

  useEffect(() => {
    setAnimProgress(0);
    const start = performance.now();
    const duration = 500;
    let raf: number;
    function animate(now: number) {
      const elapsed = now - start;
      const p = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setAnimProgress(eased);
      if (p < 1) raf = requestAnimationFrame(animate);
    }
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [result]);

  return (
    <div style={{ width: '100%' }}>
      {result.optionResults.map((opt, idx) => {
        const isMax = opt.voteCount === maxVotes && opt.voteCount > 0;
        const barWidth = maxVotes > 0 ? (opt.voteCount / maxVotes) * 100 : 0;
        return (
          <div key={opt.optionId} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 13, marginBottom: 4, color: '#666' }}>
              {opt.title} ({opt.voteCount}票)
            </div>
            <div
              style={{
                height: 40,
                background: '#F0F0F0',
                borderRadius: 6,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${barWidth * animProgress}%`,
                  background: isMax ? '#6C63FF' : '#E0E0E0',
                  borderRadius: 6,
                  transition: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  paddingLeft: 10,
                  color: isMax ? '#fff' : '#666',
                  fontSize: 13,
                  fontWeight: isMax ? 'bold' : 'normal',
                }}
              >
                {animProgress > 0.5 && opt.voteCount > 0 ? `${opt.percentage.toFixed(1)}%` : ''}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ResultDashboard({ poll }: { poll: Poll }) {
  const result = calculateResults(poll);

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: 20,
        overflow: 'auto',
      }}
    >
      <h3 style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16, color: '#fff' }}>
        📊 {poll.name} - 结果看板
      </h3>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div
          style={{
            flex: 1,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: 300,
          }}
        >
          <PieChart result={result} />
        </div>
        <div style={{ height: 1, background: '#E0E0E0', margin: '12px 0' }} />
        <div style={{ flex: 1, minHeight: 200 }}>
          <BarChart result={result} />
        </div>
      </div>
      <div
        style={{
          marginTop: 16,
          padding: 12,
          background: 'rgba(255,255,255,0.1)',
          borderRadius: 8,
          color: '#ccc',
          fontSize: 13,
        }}
      >
        总投票数: {result.totalVotes}
      </div>
    </div>
  );
}

function VoteCard({
  option,
  index,
  onVote,
  voted,
  voteCount,
}: {
  option: Poll['options'][0];
  index: number;
  onVote: () => void;
  voted: boolean;
  voteCount: number;
}) {
  const [flipped, setFlipped] = useState(false);

  const handleClick = () => {
    if (voted) return;
    setFlipped(true);
    setTimeout(() => {
      onVote();
    }, 300);
  };

  return (
    <div
      onClick={handleClick}
      style={{
        width: 300,
        height: 200,
        perspective: 600,
        cursor: voted ? 'default' : 'pointer',
        margin: 8,
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          transformStyle: 'preserve-3d',
          transition: 'transform 0.3s ease',
          transform: flipped ? 'rotateY(180deg) scale(0.95)' : 'rotateY(0deg) scale(1)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            backfaceVisibility: 'hidden',
            borderRadius: 12,
            overflow: 'hidden',
            background: option.imageUrl ? `url(${option.imageUrl}) center/cover` : `linear-gradient(135deg, ${getSectorColor(index)}, ${getSectorColor((index + 1) % 6)})`,
          }}
        >
          {option.imageUrl && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backdropFilter: 'blur(4px)',
                background: 'rgba(0,0,0,0.3)',
              }}
            />
          )}
          <div
            style={{
              position: 'relative',
              zIndex: 1,
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 20,
              fontWeight: 'bold',
              textShadow: '0 2px 4px rgba(0,0,0,0.5)',
              padding: 16,
              textAlign: 'center',
            }}
          >
            {option.title}
          </div>
        </div>
        <div
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            borderRadius: 12,
            background: 'linear-gradient(135deg, #6C63FF, #7B73FF)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
          }}
        >
          <div style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 8 }}>✓ 已投票</div>
          <div style={{ fontSize: 16 }}>
            {option.title}: {voteCount}票
          </div>
        </div>
      </div>
    </div>
  );
}

function VotingPage({
  poll,
  onVoteComplete,
  userId,
}: {
  poll: Poll;
  onVoteComplete: (updatedPoll: Poll) => void;
  userId: string;
}) {
  const [countdown, setCountdown] = useState('');
  const [voted, setVoted] = useState(false);
  const [currentPoll, setCurrentPoll] = useState(poll);

  useEffect(() => {
    const update = () => setCountdown(formatCountdown(currentPoll.deadline));
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [currentPoll.deadline]);

  const handleVote = useCallback(
    (optionId: string) => {
      if (voted) return;
      const result = submitVote(currentPoll, optionId, userId);
      if ('error' in result) {
        alert(result.error);
        return;
      }
      setVoted(true);
      setCurrentPoll(result);
      fetch(`${API_BASE}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submit', pollId: currentPoll.id, optionId, userId }),
      }).catch(() => {});
      setTimeout(() => {
        onVoteComplete(result);
      }, 1500);
    },
    [currentPoll, userId, voted, onVoteComplete]
  );

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#1A1A2E',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: 40,
      }}
    >
      <h2 style={{ fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 16 }}>
        {currentPoll.name}
      </h2>
      <div
        style={{
          fontSize: 18,
          color: '#FFE66D',
          marginBottom: 32,
          fontFamily: 'monospace',
          letterSpacing: 1,
        }}
      >
        ⏰ {countdown}
      </div>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: 0,
        }}
      >
        {currentPoll.options.map((opt, idx) => (
          <VoteCard
            key={opt.id}
            option={opt}
            index={idx}
            voted={voted || currentPoll.votedUsers.includes(userId)}
            voteCount={(currentPoll.votes[opt.id] || []).length}
            onVote={() => handleVote(opt.id)}
          />
        ))}
      </div>
      <button
        onClick={() => onVoteComplete(currentPoll)}
        style={{
          marginTop: 32,
          padding: '10px 28px',
          background: '#6C63FF',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          fontSize: 15,
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
        onMouseOver={(e) => (e.currentTarget.style.background = '#7B73FF')}
        onMouseOut={(e) => (e.currentTarget.style.background = '#6C63FF')}
      >
        查看结果看板
      </button>
    </div>
  );
}

function OptionCard({
  option,
  index,
  onRemove,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  option: OptionInput;
  index: number;
  onRemove: () => void;
  onDragStart: (e: React.DragEvent, idx: number) => void;
  onDragOver: (e: React.DragEvent, idx: number) => void;
  onDrop: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDrop={onDrop}
      style={{
        width: 280,
        height: 150,
        background: '#fff',
        borderRadius: 12,
        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        cursor: 'grab',
        transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s',
        position: 'relative',
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)';
      }}
    >
      <div style={{ fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 4 }}>
        {option.title || '未命名选项'}
      </div>
      {option.imageUrl && (
        <div style={{ fontSize: 12, color: '#999', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          🖼 {option.imageUrl}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12, color: '#aaa' }}>#{index + 1}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          style={{
            marginLeft: 'auto',
            background: 'none',
            border: 'none',
            color: '#FF6B6B',
            cursor: 'pointer',
            fontSize: 18,
            padding: 4,
            transition: 'transform 0.1s',
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'scale(0.9)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}

function HistoryTable({
  polls,
  onViewResult,
}: {
  polls: Poll[];
  onViewResult: (poll: Poll) => void;
}) {
  const [sortDesc, setSortDesc] = useState(true);
  const expired = polls.filter((p) => isPollExpired(p));
  const sorted = [...expired].sort((a, b) => {
    const da = new Date(a.deadline).getTime();
    const db = new Date(b.deadline).getTime();
    return sortDesc ? db - da : da - db;
  });

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 style={{ fontSize: 20, fontWeight: 'bold', color: '#fff' }}>📋 历史投票</h3>
        <button
          onClick={() => setSortDesc(!sortDesc)}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: '#ccc',
            padding: '6px 12px',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 13,
            transition: 'all 0.2s',
          }}
        >
          按截止时间{sortDesc ? '↓' : '↑'}
        </button>
      </div>
      {sorted.length === 0 ? (
        <div style={{ color: '#888', textAlign: 'center', padding: 24 }}>暂无已结束的投票</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead>
            <tr style={{ color: '#aaa', fontSize: 13 }}>
              <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>活动名称</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>截止时间</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>总投票数</th>
              <th style={{ textAlign: 'right', padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((poll) => (
              <tr
                key={poll.id}
                style={{
                  transition: 'all 0.2s',
                  cursor: 'pointer',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = '#F5F5F5';
                  e.currentTarget.style.height = `${e.currentTarget.offsetHeight + 5}px`;
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <td style={{ padding: '10px 12px', color: '#ddd', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{poll.name}</td>
                <td style={{ padding: '10px 12px', color: '#999', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  {new Date(poll.deadline).toLocaleString('zh-CN')}
                </td>
                <td style={{ padding: '10px 12px', color: '#999', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{poll.votedUsers.length}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <button
                    onClick={() => onViewResult(poll)}
                    style={{
                      background: '#6C63FF',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      padding: '6px 16px',
                      cursor: 'pointer',
                      fontSize: 13,
                      transition: 'all 0.2s',
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = '#7B73FF';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = '#6C63FF';
                    }}
                    onMouseDown={(e) => {
                      e.currentTarget.style.transform = 'scale(0.95)';
                    }}
                    onMouseUp={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    查看结果
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<View>('home');
  const [polls, setPolls] = useState<Poll[]>([]);
  const [selectedPoll, setSelectedPoll] = useState<Poll | null>(null);
  const [userId] = useState(() => 'user-' + Math.random().toString(36).substring(2, 9));

  const [pollName, setPollName] = useState('');
  const [deadline, setDeadline] = useState('');
  const [options, setOptions] = useState<OptionInput[]>([
    { title: '', imageUrl: '' },
    { title: '', imageUrl: '' },
  ]);
  const [newOptionTitle, setNewOptionTitle] = useState('');
  const [newOptionImage, setNewOptionImage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/polls`)
      .then((r) => r.json())
      .then((data) => setPolls(data))
      .catch(() => {});
  }, []);

  const handleDragStart = (_e: React.DragEvent, idx: number) => {
    dragItem.current = idx;
  };

  const handleDragOver = (_e: React.DragEvent, idx: number) => {
    dragOverItem.current = idx;
  };

  const handleDrop = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    const updated = [...options];
    const [dragged] = updated.splice(dragItem.current, 1);
    updated.splice(dragOverItem.current, 0, dragged);
    setOptions(updated);
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const addOption = () => {
    if (options.length >= 6) {
      alert('最多6个选项');
      return;
    }
    if (!newOptionTitle.trim()) {
      alert('请输入选项标题');
      return;
    }
    setOptions([...options, { title: newOptionTitle.trim(), imageUrl: newOptionImage.trim() }]);
    setNewOptionTitle('');
    setNewOptionImage('');
  };

  const removeOption = (idx: number) => {
    if (options.length <= 2) {
      alert('至少需要2个选项');
      return;
    }
    setOptions(options.filter((_, i) => i !== idx));
  };

  const handleCreatePoll = async () => {
    if (!pollName.trim()) {
      alert('请输入活动名称');
      return;
    }
    if (!deadline) {
      alert('请选择截止时间');
      return;
    }
    const validOptions = options.filter((o) => o.title.trim());
    if (validOptions.length < 2) {
      alert('至少需要2个有效选项');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          name: pollName.trim(),
          deadline,
          options: validOptions,
        }),
      });
      const data = await res.json();
      if (data.success && data.poll) {
        const newPoll = data.poll as Poll;
        setPolls((prev) => [...prev, newPoll]);
        setSelectedPoll(newPoll);
        setView('voting');
        setPollName('');
        setDeadline('');
        setOptions([{ title: '', imageUrl: '' }, { title: '', imageUrl: '' }]);
      } else {
        alert(data.error || '创建失败');
      }
    } catch {
      const result = createVote(
        pollName.trim(),
        deadline,
        validOptions
      );
      if ('error' in result) {
        alert(result.error);
      } else {
        setPolls((prev) => [...prev, result]);
        setSelectedPoll(result);
        setView('voting');
        setPollName('');
        setDeadline('');
        setOptions([{ title: '', imageUrl: '' }, { title: '', imageUrl: '' }]);
      }
    }
    setSubmitting(false);
  };

  const handleVoteComplete = (updatedPoll: Poll) => {
    setPolls((prev) => prev.map((p) => (p.id === updatedPoll.id ? updatedPoll : p)));
    setSelectedPoll(updatedPoll);
    setView('results');
  };

  const handleViewResult = (poll: Poll) => {
    setSelectedPoll(poll);
    setView('results');
  };

  const handleGoHome = () => {
    setView('home');
    setSelectedPoll(null);
  };

  if (view === 'voting' && selectedPoll) {
    return (
      <div>
        <VotingPage poll={selectedPoll} onVoteComplete={handleVoteComplete} userId={userId} />
        <button
          onClick={handleGoHome}
          style={{
            position: 'fixed',
            top: 20,
            left: 20,
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: '#fff',
            padding: '8px 16px',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 14,
            zIndex: 1000,
            transition: 'all 0.2s',
          }}
          onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
          onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
        >
          ← 返回首页
        </button>
      </div>
    );
  }

  if (view === 'results' && selectedPoll) {
    return (
      <div style={{ minHeight: '100vh', background: '#1A1A2E' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <button
              onClick={handleGoHome}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff',
                padding: '8px 16px',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 14,
                transition: 'all 0.2s',
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
              onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
            >
              ← 返回首页
            </button>
            <h2 style={{ fontSize: 20, fontWeight: 'bold', color: '#fff' }}>
              📊 {selectedPoll.name}
            </h2>
          </div>
          <div
            style={{
              display: 'flex',
              gap: 20,
              minHeight: 'calc(100vh - 120px)',
              background: 'rgba(255,255,255,0.05)',
              borderRadius: 12,
              padding: 20,
            }}
          >
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <PieChart result={calculateResults(selectedPoll)} />
            </div>
            <div style={{ width: 1, background: '#E0E0E0', alignSelf: 'stretch' }} />
            <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
              <BarChart result={calculateResults(selectedPoll)} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#1A1A2E' }}>
      <div
        className="app-layout"
        style={{
          maxWidth: 1400,
          margin: '0 auto',
          padding: 20,
          display: 'flex',
          gap: 20,
          minHeight: '100vh',
        }}
      >
        <div className="app-left"
        style={{ flex: '0 0 60%', minWidth: 0 }}>
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
              padding: 24,
              marginBottom: 20,
            }}
          >
            <h2 style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 20, color: '#333' }}>
              🗳 创建新投票
            </h2>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: '1 1 200px' }}>
                <label style={{ display: 'block', fontSize: 13, color: '#666', marginBottom: 4 }}>
                  活动名称
                </label>
                <input
                  type="text"
                  value={pollName}
                  onChange={(e) => setPollName(e.target.value)}
                  placeholder="输入活动名称..."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #ddd',
                    borderRadius: 8,
                    fontSize: 14,
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#6C63FF')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = '#ddd')}
                />
              </div>
              <div style={{ flex: '1 1 180px' }}>
                <label style={{ display: 'block', fontSize: 13, color: '#666', marginBottom: 4 }}>
                  截止时间
                </label>
                <input
                  type="datetime-local"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #ddd',
                    borderRadius: 8,
                    fontSize: 14,
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#6C63FF')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = '#ddd')}
                />
              </div>
            </div>

            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
              <h3 style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 12, color: '#555' }}>
                添加选项 ({options.length}/6)
              </h3>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <input
                  type="text"
                  value={newOptionTitle}
                  onChange={(e) => setNewOptionTitle(e.target.value)}
                  placeholder="选项标题"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addOption();
                  }}
                  style={{
                    flex: '1 1 150px',
                    padding: '10px 12px',
                    border: '1px solid #ddd',
                    borderRadius: 8,
                    fontSize: 14,
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#6C63FF')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = '#ddd')}
                />
                <input
                  type="text"
                  value={newOptionImage}
                  onChange={(e) => setNewOptionImage(e.target.value)}
                  placeholder="图片URL（可选）"
                  style={{
                    flex: '1 1 200px',
                    padding: '10px 12px',
                    border: '1px solid #ddd',
                    borderRadius: 8,
                    fontSize: 14,
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#6C63FF')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = '#ddd')}
                />
                <button
                  onClick={addOption}
                  disabled={options.length >= 6}
                  style={{
                    padding: '10px 20px',
                    background: options.length >= 6 ? '#ccc' : '#6C63FF',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 14,
                    cursor: options.length >= 6 ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseOver={(e) => {
                    if (options.length < 6) e.currentTarget.style.background = '#7B73FF';
                  }}
                  onMouseOut={(e) => {
                    if (options.length < 6) e.currentTarget.style.background = '#6C63FF';
                  }}
                  onMouseDown={(e) => {
                    if (options.length < 6) e.currentTarget.style.transform = 'scale(0.95)';
                  }}
                  onMouseUp={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  + 添加
                </button>
              </div>
            </div>

            {options.length > 0 && (
              <div
                style={{
                  marginTop: 20,
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                {options.map((opt, idx) => (
                  <OptionCard
                    key={idx}
                    option={opt}
                    index={idx}
                    onRemove={() => removeOption(idx)}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  />
                ))}
              </div>
            )}

            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={handleCreatePoll}
                disabled={submitting}
                style={{
                  padding: '12px 32px',
                  background: submitting ? '#ccc' : '#6C63FF',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 16,
                  fontWeight: 'bold',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseOver={(e) => {
                  if (!submitting) e.currentTarget.style.background = '#7B73FF';
                }}
                onMouseOut={(e) => {
                  if (!submitting) e.currentTarget.style.background = '#6C63FF';
                }}
                onMouseDown={(e) => {
                  if (!submitting) e.currentTarget.style.transform = 'scale(0.95)';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                {submitting ? '提交中...' : '🚀 创建投票'}
              </button>
            </div>
          </div>

          <div
            style={{
              background: 'rgba(255,255,255,0.05)',
              borderRadius: 12,
              padding: 24,
            }}
          >
            <HistoryTable polls={polls} onViewResult={handleViewResult} />
          </div>
        </div>

        <div
          className="app-right"
        style={{
            flex: '0 0 calc(40% - 20px)',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: 12,
            height: '100vh',
            position: 'sticky',
            top: 20,
            overflow: 'auto',
          }}
        >
          {selectedPoll ? (
            <ResultDashboard poll={selectedPoll} />
          ) : polls.length > 0 ? (
            <div style={{ padding: 20, color: '#888', textAlign: 'center', paddingTop: 60 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
              <div style={{ fontSize: 16, marginBottom: 8 }}>结果看板</div>
              <div style={{ fontSize: 13, color: '#666' }}>投票后将在此显示实时结果</div>
              <div style={{ marginTop: 20 }}>
                <button
                  onClick={() => {
                    const latestActive = [...polls]
                      .filter((p) => !isPollExpired(p))
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
                    if (latestActive) {
                      setSelectedPoll(latestActive);
                    } else if (polls.length > 0) {
                      setSelectedPoll(polls[polls.length - 1]);
                    }
                  }}
                  style={{
                    padding: '8px 20px',
                    background: '#6C63FF',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontSize: 14,
                    transition: 'all 0.2s',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.background = '#7B73FF')}
                  onMouseOut={(e) => (e.currentTarget.style.background = '#6C63FF')}
                >
                  查看最新投票结果
                </button>
              </div>
            </div>
          ) : (
            <div style={{ padding: 20, color: '#666', textAlign: 'center', paddingTop: 60 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🗳</div>
              <div style={{ fontSize: 16 }}>暂无投票数据</div>
              <div style={{ fontSize: 13, color: '#555', marginTop: 8 }}>创建投票后将在此显示结果</div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .app-layout {
            flex-direction: column !important;
          }
          .app-left, .app-right {
            flex: 1 1 100% !important;
          }
          .app-right {
            height: auto !important;
            position: static !important;
          }
        }
      `}</style>
    </div>
  );
}
