import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { MoodWheel, MoodType } from './MoodWheel';

type ThemeName = '都市夜晚' | '森林午后' | '太空漫游';

interface Theme {
  name: ThemeName;
  colors: string[];
}

const THEMES: Theme[] = [
  { name: '都市夜晚', colors: ['#6366f1', '#8b5cf6', '#a855f7', '#4f46e5', '#7c3aed'] },
  { name: '森林午后', colors: ['#22c55e', '#34d399', '#a7f3d0', '#10b981', '#6ee7b7'] },
  { name: '太空漫游', colors: ['#3b82f6', '#60a5fa', '#818cf8', '#1d4ed8', '#06b6d4'] },
];

const MOOD_COLORS: Record<MoodType, string> = {
  happy: '#f59e0b',
  calm: '#6366f1',
  sad: '#8b5cf6',
  angry: '#ef4444',
  anxious: '#f97316',
};

const MOOD_NAMES: Record<MoodType, string> = {
  happy: '开心',
  calm: '平静',
  sad: '悲伤',
  angry: '愤怒',
  anxious: '焦虑',
};

const ATMOSPHERE_TEXTS = [
  (n: number) => `这里有${n}颗心正在共鸣`,
  (n: number) => `${n}种情绪正在交融`,
  (n: number) => `空气中弥漫着${n}份心情`,
  (n: number) => `${n}个灵魂在此相遇`,
  (n: number) => `此刻有${n}种声音被听见`,
];

interface PlaylistTrack {
  id: string;
  title: string;
  artist: string;
  mood: MoodType;
  cover: string;
}

interface ChatMessageData {
  _id?: string;
  roomId: string;
  userId: string;
  mood: MoodType;
  content: string;
  timestamp: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
}

const ParticleBackground: React.FC<{ theme: ThemeName }> = ({ theme }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener('resize', resize);

    const themeObj = THEMES.find((t) => t.name === theme) || THEMES[0];
    const particles: Particle[] = [];
    for (let i = 0; i < 200; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.3,
        vy: 1 + Math.random() * 0.5,
        size: 2 + Math.random() * 4,
        color: themeObj.colors[Math.floor(Math.random() * themeObj.colors.length)],
        alpha: 0.2 + Math.random() * 0.5,
      });
    }
    particlesRef.current = particles;

    const animate = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (const p of particlesRef.current) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.y > window.innerHeight + 10) {
          p.y = -10;
          p.x = Math.random() * window.innerWidth;
        }
        if (p.x < -10) p.x = window.innerWidth + 10;
        if (p.x > window.innerWidth + 10) p.x = -10;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      animRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
};

const AnimatedNumber: React.FC<{ value: number; duration?: number }> = ({ value, duration = 300 }) => {
  const [displayValue, setDisplayValue] = useState(value);
  const prevRef = useRef(value);
  const startTimeRef = useRef<number>(0);
  const animRef = useRef(0);

  useEffect(() => {
    if (value === prevRef.current) return;
    const startValue = prevRef.current;
    const delta = value - startValue;
    startTimeRef.current = performance.now();
    prevRef.current = value;

    const step = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const t = Math.min(elapsed / duration, 1);
      const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      setDisplayValue(Math.round(startValue + delta * eased));
      if (t < 1) animRef.current = requestAnimationFrame(step);
    };
    animRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animRef.current);
  }, [value, duration]);

  return <span>{displayValue}</span>;
};

export const App: React.FC = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [userId] = useState(() => uuidv4());
  const [view, setView] = useState<'lobby' | 'room'>('lobby');
  const [roomId, setRoomId] = useState('');
  const [joinRoomInput, setJoinRoomInput] = useState('');
  const [selectedTheme, setSelectedTheme] = useState<ThemeName>('都市夜晚');
  const [theme, setTheme] = useState<ThemeName>('都市夜晚');

  const [myMood, setMyMood] = useState<MoodType>('calm');
  const [onlineCount, setOnlineCount] = useState(1);
  const [users, setUsers] = useState<Record<string, MoodType>>({});
  const [playlist, setPlaylist] = useState<PlaylistTrack[]>([]);
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const [copyTipVisible, setCopyTipVisible] = useState(false);
  const [navHovered, setNavHovered] = useState(false);
  const [atmosphereIdx, setAtmosphereIdx] = useState(0);
  const [error, setError] = useState('');

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const s = io({ transports: ['websocket', 'polling'] });
    setSocket(s);
    return () => {
      s.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on('room-state', (data) => {
      setUsers(data.users || {});
      setOnlineCount(data.onlineCount || 1);
      setPlaylist(data.playlist || []);
      setMessages(data.messages || []);
      setAtmosphereIdx(Math.floor(Math.random() * ATMOSPHERE_TEXTS.length));
      setError('');
      setView('room');
    });

    socket.on('user-joined', (data) => {
      setUsers(data.users);
      setOnlineCount(data.onlineCount);
    });

    socket.on('user-left', (data) => {
      setUsers(data.users);
      setOnlineCount(data.onlineCount);
    });

    socket.on('mood-updated', (data) => {
      setUsers(data.users);
      setOnlineCount(data.onlineCount);
      setAtmosphereIdx(Math.floor(Math.random() * ATMOSPHERE_TEXTS.length));
    });

    socket.on('new-message', (msg: ChatMessageData) => {
      setMessages((prev) => [...prev.slice(-49), msg]);
    });

    socket.on('error-message', (msg: string) => {
      setError(msg);
    });

    return () => {
      socket.off('room-state');
      socket.off('user-joined');
      socket.off('user-left');
      socket.off('mood-updated');
      socket.off('new-message');
      socket.off('error-message');
    };
  }, [socket]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight;
    }
  }, [messages]);

  const handleCreateRoom = async () => {
    try {
      setError('');
      const res = await axios.post('/api/rooms', { theme: selectedTheme });
      const newRoomId = res.data.roomId;
      setRoomId(newRoomId);
      setTheme(res.data.theme || selectedTheme);
      socket?.emit('join-room', { roomId: newRoomId, userId });
    } catch (e: any) {
      setError(e.response?.data?.error || '创建房间失败');
    }
  };

  const handleJoinRoom = async () => {
    if (!joinRoomInput.trim() || joinRoomInput.length !== 6) {
      setError('请输入6位房间号');
      return;
    }
    try {
      setError('');
      const res = await axios.post(`/api/rooms/${joinRoomInput.toUpperCase()}/join`);
      setRoomId(joinRoomInput.toUpperCase());
      setTheme(res.data.theme || '都市夜晚');
      socket?.emit('join-room', { roomId: joinRoomInput.toUpperCase(), userId });
    } catch (e: any) {
      setError(e.response?.data?.error || '加入房间失败');
    }
  };

  const handleMoodSelect = (mood: MoodType) => {
    setMyMood(mood);
    socket?.emit('set-mood', { roomId, userId, mood });
  };

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    socket?.emit('send-message', { roomId, userId, mood: myMood, content: chatInput.trim() });
    setChatInput('');
  };

  const handleCopyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopyTipVisible(true);
    setTimeout(() => setCopyTipVisible(false), 2000);
  };

  const handleDragStart = (index: number, e: React.DragEvent) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (index: number, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDrop = (index: number, e: React.DragEvent) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    setPlaylist((prev) => {
      const next = [...prev];
      const [removed] = next.splice(dragIndex, 1);
      next.splice(index, 0, removed);
      return next;
    });
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const atmosphereText = ATMOSPHERE_TEXTS[atmosphereIdx % ATMOSPHERE_TEXTS.length](onlineCount);

  if (view === 'lobby') {
    return (
      <div style={{
        width: '100%', height: '100%',
        background: '#0f172a',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        <ParticleBackground theme={selectedTheme} />
        <div style={{
          position: 'relative', zIndex: 1,
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(20px)',
          borderRadius: 24,
          padding: 48,
          width: 440,
          boxShadow: '0 0 80px rgba(99, 102, 241, 0.15)',
          border: '1px solid rgba(99, 102, 241, 0.15)',
        }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>🎵</div>
            <h1 style={{ color: '#e2e8f0', fontSize: 32, fontWeight: 'bold', marginBottom: 8 }}>MoodMix</h1>
            <p style={{ color: '#94a3b8', fontSize: 14 }}>让心情共鸣，让音乐相遇</p>
          </div>

          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#fca5a5',
              padding: '10px 14px',
              borderRadius: 8,
              marginBottom: 16,
              fontSize: 13,
              border: '1px solid rgba(239, 68, 68, 0.3)',
            }}>{error}</div>
          )}

          <div style={{ marginBottom: 24 }}>
            <div style={{ color: '#cbd5e1', fontSize: 14, marginBottom: 10 }}>选择房间主题</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {THEMES.map((t) => (
                <button
                  key={t.name}
                  onClick={() => setSelectedTheme(t.name)}
                  style={{
                    flex: 1,
                    padding: '10px 4px',
                    borderRadius: 10,
                    border: selectedTheme === t.name
                      ? `2px solid ${t.colors[0]}`
                      : '1px solid rgba(148, 163, 184, 0.2)',
                    background: selectedTheme === t.name
                      ? `${t.colors[0]}20`
                      : 'rgba(30, 41, 59, 0.6)',
                    color: '#e2e8f0',
                    fontSize: 12,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ fontSize: 18, marginBottom: 2 }}>
                    {t.name === '都市夜晚' ? '🌃' : t.name === '森林午后' ? '🌲' : '🚀'}
                  </div>
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleCreateRoom}
            style={{
              width: '100%',
              padding: '14px 24px',
              borderRadius: 12,
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              color: 'white',
              border: 'none',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
              marginBottom: 24,
              boxShadow: '0 4px 20px rgba(99, 102, 241, 0.4)',
              transition: 'transform 0.2s ease',
            }}
          >
            创建新房间
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(148, 163, 184, 0.15)' }} />
            <span style={{ color: '#64748b', fontSize: 12 }}>或加入已有房间</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(148, 163, 184, 0.15)' }} />
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={joinRoomInput}
              onChange={(e) => setJoinRoomInput(e.target.value.toUpperCase().slice(0, 6))}
              onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
              placeholder="输入6位房间号"
              maxLength={6}
              style={{
                flex: 1,
                padding: '14px 16px',
                borderRadius: 12,
                background: 'rgba(30, 41, 59, 0.8)',
                border: '1px solid rgba(148, 163, 184, 0.2)',
                color: '#e2e8f0',
                fontSize: 16,
                letterSpacing: 4,
                textAlign: 'center',
                outline: 'none',
              }}
            />
            <button
              onClick={handleJoinRoom}
              style={{
                padding: '14px 24px',
                borderRadius: 12,
                background: '#1e293b',
                color: '#e2e8f0',
                border: '1px solid rgba(148, 163, 184, 0.2)',
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 0.2s ease',
              }}
            >
              加入
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      width: '100%', height: '100%',
      background: '#0f172a',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <ParticleBackground theme={theme} />

      <div
        onMouseEnter={() => setNavHovered(true)}
        onMouseLeave={() => setNavHovered(false)}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 56,
          background: `rgba(15, 23, 42, ${navHovered ? 0.9 : 0.4})`,
          backdropFilter: navHovered ? 'blur(20px)' : 'blur(8px)',
          transition: 'all 0.3s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          zIndex: 100,
          borderBottom: navHovered ? '1px solid rgba(99, 102, 241, 0.15)' : '1px solid transparent',
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'rgba(30, 41, 59, 0.8)',
          padding: '6px 14px',
          borderRadius: 20,
          border: '1px solid rgba(99, 102, 241, 0.2)',
        }}>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>房间号</span>
          <span style={{
            fontSize: 16,
            fontWeight: 'bold',
            color: '#e2e8f0',
            letterSpacing: 3,
            fontFamily: 'monospace',
          }}>{roomId}</span>
          <button
            onClick={handleCopyRoomId}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#a5b4fc',
              cursor: 'pointer',
              fontSize: 13,
              marginLeft: 4,
              position: 'relative',
            }}
          >
            📋
            {copyTipVisible && (
              <span style={{
                position: 'absolute',
                top: 30,
                left: '50%',
                transform: 'translateX(-50%)',
                background: '#22c55e',
                color: 'white',
                padding: '4px 10px',
                borderRadius: 6,
                fontSize: 12,
                whiteSpace: 'nowrap',
              }}>已复制</span>
            )}
          </button>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: 'rgba(30, 41, 59, 0.8)',
          padding: '6px 14px',
          borderRadius: 20,
          border: '1px solid rgba(34, 197, 94, 0.2)',
        }}>
          <span style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#22c55e',
            boxShadow: '0 0 8px #22c55e',
          }} />
          <span style={{
            fontSize: 14,
            color: '#e2e8f0',
            fontWeight: 600,
            minWidth: 12,
            display: 'inline-block',
            transition: 'none',
          }}>
            <AnimatedNumber value={onlineCount} />
          </span>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>人在线</span>
        </div>
      </div>

      <div style={{
        position: 'relative',
        zIndex: 1,
        width: '100%',
        height: '100%',
        paddingTop: 80,
        paddingBottom: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 60,
        overflow: 'auto',
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 24,
        }}>
          <MoodWheel
            onMoodSelect={handleMoodSelect}
            selectedMood={myMood}
            onlineCount={onlineCount}
            atmosphereText={atmosphereText}
          />
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 16px',
            borderRadius: 20,
            background: `${MOOD_COLORS[myMood]}20`,
            border: `1px solid ${MOOD_COLORS[myMood]}40`,
          }}>
            <span style={{ color: MOOD_COLORS[myMood], fontSize: 14 }}>
              你的心情：{MOOD_NAMES[myMood]}
            </span>
          </div>
        </div>

        <div style={{
          width: 320,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          maxHeight: 'calc(100vh - 160px)',
          overflowY: 'auto',
          padding: 8,
        }}>
          <div style={{
            color: '#e2e8f0',
            fontSize: 16,
            fontWeight: 600,
            marginBottom: 4,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <span>🎶</span>
            <span>MoodMix 播放列表</span>
          </div>
          {playlist.map((track, index) => (
            <div
              key={track.id}
              draggable
              onDragStart={(e) => handleDragStart(index, e)}
              onDragOver={(e) => handleDragOver(index, e)}
              onDrop={(e) => handleDrop(index, e)}
              onDragEnd={handleDragEnd}
              style={{
                width: 280,
                height: 120,
                background: '#1e293b',
                borderRadius: 12,
                position: 'relative',
                overflow: 'hidden',
                cursor: dragIndex === index ? 'grabbing' : 'grab',
                opacity: dragIndex === index ? 0.5 : 1,
                transform: dragOverIndex === index && dragIndex !== index ? 'scale(1.02)' : 'scale(1)',
                transition: 'transform 0.2s ease, opacity 0.2s ease',
                boxShadow: dragOverIndex === index && dragIndex !== index
                  ? `0 0 20px ${MOOD_COLORS[track.mood]}60`
                  : '0 4px 12px rgba(0,0,0,0.3)',
                border: dragOverIndex === index && dragIndex !== index
                  ? `2px solid ${MOOD_COLORS[track.mood]}`
                  : '1px solid rgba(148, 163, 184, 0.1)',
                userSelect: 'none',
              }}
            >
              <img
                src={track.cover}
                alt={track.title}
                draggable={false}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  position: 'absolute',
                  top: 0, left: 0,
                }}
              />
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(15, 23, 42, 0.4) 100%)',
              }} />
              <div style={{
                position: 'absolute',
                left: 12,
                bottom: 10,
                right: 12,
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  marginBottom: 4,
                }}>
                  <span style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: MOOD_COLORS[track.mood],
                  }} />
                  <span style={{
                    fontSize: 10,
                    color: MOOD_COLORS[track.mood],
                  }}>{MOOD_NAMES[track.mood]}</span>
                </div>
                <div style={{
                  color: '#f1f5f9',
                  fontSize: 15,
                  fontWeight: 600,
                  marginBottom: 2,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>{track.title}</div>
                <div style={{
                  color: '#94a3b8',
                  fontSize: 12,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>{track.artist}</div>
              </div>
              <div style={{
                position: 'absolute',
                top: 10,
                left: 12,
                color: 'rgba(226, 232, 240, 0.5)',
                fontSize: 11,
                fontFamily: 'monospace',
              }}>{String(index + 1).padStart(2, '0')}</div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={() => setChatOpen(!chatOpen)}
        style={{
          position: 'fixed',
          right: 24,
          bottom: 24,
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          color: 'white',
          border: 'none',
          fontSize: 24,
          cursor: 'pointer',
          zIndex: 101,
          boxShadow: '0 4px 20px rgba(99, 102, 241, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        {chatOpen ? '✕' : '💬'}
      </button>

      <div style={{
        position: 'fixed',
        right: chatOpen ? 0 : -340,
        top: 0,
        bottom: 0,
        width: 320,
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        transition: 'right 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        zIndex: 102,
        borderLeft: '1px solid rgba(99, 102, 241, 0.15)',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: chatOpen ? '-10px 0 40px rgba(0,0,0,0.5)' : 'none',
      }}>
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span style={{ fontSize: 18 }}>💬</span>
          <span style={{ color: '#e2e8f0', fontSize: 16, fontWeight: 600 }}>心情聊天室</span>
        </div>
        <div
          ref={messagesEndRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {messages.length === 0 && (
            <div style={{
              color: '#64748b',
              fontSize: 13,
              textAlign: 'center',
              marginTop: 40,
            }}>
              还没有消息，说点什么吧~
            </div>
          )}
          {messages.map((msg, i) => {
            const isMine = msg.userId === userId;
            const color = MOOD_COLORS[msg.mood] || MOOD_COLORS.calm;
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: isMine ? 'flex-end' : 'flex-start',
                  marginBottom: 0,
                }}
              >
                <div style={{
                  maxWidth: '80%',
                  padding: '8px 14px',
                  borderRadius: 16,
                  background: isMine
                    ? `linear-gradient(135deg, ${color}e6 0%, ${color}cc 100%)`
                    : 'rgba(30, 41, 59, 0.9)',
                  color: isMine ? 'white' : '#e2e8f0',
                  fontSize: 14,
                  lineHeight: 1.4,
                  wordBreak: 'break-word',
                  border: isMine ? 'none' : `1px solid ${color}40`,
                  boxShadow: isMine ? `0 2px 8px ${color}40` : 'none',
                  position: 'relative',
                }}>
                  {!isMine && (
                    <div style={{
                      fontSize: 10,
                      color,
                      marginBottom: 2,
                    }}>{MOOD_NAMES[msg.mood]}</div>
                  )}
                  <div>{msg.content}</div>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{
          padding: 12,
          borderTop: '1px solid rgba(148, 163, 184, 0.1)',
          display: 'flex',
          gap: 8,
        }}>
          <input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="说点什么..."
            maxLength={200}
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: 20,
              background: 'rgba(30, 41, 59, 0.8)',
              border: `1px solid ${MOOD_COLORS[myMood]}40`,
              color: '#e2e8f0',
              fontSize: 14,
              outline: 'none',
            }}
          />
          <button
            onClick={handleSendMessage}
            style={{
              padding: '10px 16px',
              borderRadius: 20,
              background: `linear-gradient(135deg, ${MOOD_COLORS[myMood]} 0%, ${MOOD_COLORS[myMood]}cc 100%)`,
              color: 'white',
              border: 'none',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            发送
          </button>
        </div>
      </div>
    </div>
  );
};
