import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useStore } from '../store';
import RoomManager from '../components/RoomManager';
import StoryTimeline from '../components/StoryTimeline';
import AIAssistant from '../components/AIAssistant';
import StoryCanvas from '../components/StoryCanvas';
import {
  Menu, X, Download, BarChart3, Users, Send, Pen
} from 'lucide-react';

function RingChart({ contributions }: { contributions: { author: string; count: number }[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const total = contributions.reduce((s, c) => s + c.count, 0);
  if (total === 0) return null;

  let currentAngle = 0;
  const slices = contributions.map((c, i) => {
    const angle = (c.count / total) * 360;
    const startAngle = currentAngle;
    currentAngle += angle;
    const hue = (i * 360) / contributions.length;
    return { ...c, startAngle, angle, hue, index: i };
  });

  const size = 160;
  const cx = size / 2;
  const cy = size / 2;
  const r = 60;

  function polarToCart(angle: number, radius: number) {
    const rad = ((angle - 90) * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  }

  return (
    <div className="ring-chart-container">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {slices.map((s) => {
          const start = polarToCart(s.startAngle, r);
          const end = polarToCart(s.startAngle + s.angle, r);
          const largeArc = s.angle > 180 ? 1 : 0;
          const isHovered = hovered === s.index;
          const scale = isHovered ? 1.05 : 1;
          const midAngle = s.startAngle + s.angle / 2;
          const mid = polarToCart(midAngle, r);
          const offsetX = isHovered ? (mid.x - cx) * 0.03 : 0;
          const offsetY = isHovered ? (mid.y - cy) * 0.03 : 0;

          return (
            <g
              key={s.index}
              transform={`translate(${offsetX},${offsetY}) scale(${scale})`}
              transform-origin={`${cx} ${cy}`}
              onMouseEnter={() => setHovered(s.index)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
            >
              <path
                d={`M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y} Z`}
                fill={`hsl(${s.hue}, 70%, 55%)`}
                stroke="#1a1a2e"
                strokeWidth="2"
              />
            </g>
          );
        })}
      </svg>
      {hovered !== null && slices[hovered] && (
        <div className="ring-tooltip">
          {slices[hovered].author}: {slices[hovered].count} 段
        </div>
      )}
    </div>
  );
}

export default function RoomPage() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const {
    currentRoom, setCurrentRoom,
    userName, setUserName,
    paragraphs, fetchParagraphs,
    submitParagraph, fetchStats, fetchMembers,
    stats, members,
  } = useStore();

  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [joined, setJoined] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!roomCode) return;
    const loadRoom = async () => {
      try {
        const res = await fetch(`/api/rooms/${roomCode}`);
        if (res.ok) {
          const room = await res.json();
          setCurrentRoom(room);
          fetchParagraphs(room.id);
          fetchStats(roomCode);
          fetchMembers(roomCode);
        }
      } catch (err) {
        console.error('Failed to load room', err);
      }
    };
    loadRoom();
  }, [roomCode, setCurrentRoom, fetchParagraphs, fetchStats, fetchMembers]);

  const handleJoin = useCallback(async () => {
    if (!nameInput.trim() || !roomCode) return;
    setUserName(nameInput.trim());
    try {
      await fetch(`/api/rooms/${roomCode}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName: nameInput.trim() }),
      });
      setJoined(true);
      fetchMembers(roomCode);
      fetchStats(roomCode);
    } catch (err) {
      console.error('Failed to join', err);
    }
  }, [nameInput, roomCode, setUserName, fetchMembers, fetchStats]);

  const handleSubmit = useCallback(async () => {
    if (!content.trim() || !currentRoom || !userName) return;
    if (content.length < 100 || content.length > 500) return;
    setSubmitting(true);
    try {
      await submitParagraph(currentRoom.id, content.trim(), userName);
      setContent('');
      if (roomCode) {
        fetchStats(roomCode);
      }
    } finally {
      setSubmitting(false);
    }
  }, [content, currentRoom, userName, submitParagraph, fetchStats, roomCode]);

  const handleInsert = useCallback((text: string) => {
    setContent((prev) => {
      const combined = prev + text;
      return combined.length > 500 ? combined.slice(0, 500) : combined;
    });
    editorRef.current?.focus();
  }, []);

  const handleExport = useCallback(() => {
    if (!currentRoom || paragraphs.length === 0) return;
    const lines = paragraphs.map(
      (p, i) => `[段落${i + 1}] 作者: ${p.author}\n${p.content}`
    );
    const text = `故事: ${currentRoom.theme}\n${'='.repeat(40)}\n\n${lines.join('\n\n---\n\n')}`;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentRoom.theme}_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [currentRoom, paragraphs]);

  if (!joined && !userName) {
    return (
      <div className="join-screen">
        <div className="join-card">
          <h2>加入故事</h2>
          {currentRoom && (
            <>
              <p className="join-room-code">房间号: {currentRoom.roomCode}</p>
              <p className="join-theme">主题: {currentRoom.theme}</p>
            </>
          )}
          <input
            className="input-field"
            placeholder="输入你的昵称"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
          />
          <button className="btn-primary" onClick={handleJoin} disabled={!nameInput.trim()}>
            进入房间
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="room-page">
      <div className="room-top-bar">
        <button className="btn-icon hamburger" onClick={() => setSidebarOpen(!sidebarOpen)}>
          <Menu size={20} />
        </button>
        <div className="room-info">
          <span className="room-code-display">房间号: {currentRoom?.roomCode}</span>
          <span className="room-theme-display">{currentRoom?.theme}</span>
        </div>
        <div className="room-top-actions">
          <button className="btn-icon" onClick={() => setShowStats(!showStats)} title="统计">
            <BarChart3 size={18} />
          </button>
          <button className="btn-icon" onClick={handleExport} title="导出">
            <Download size={18} />
          </button>
        </div>
      </div>

      <div className="room-content">
        {sidebarOpen && (
          <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
        )}
        <aside className={`room-sidebar-left ${sidebarOpen ? 'sidebar-open' : ''}`}>
          <button className="btn-icon sidebar-close" onClick={() => setSidebarOpen(false)}>
            <X size={18} />
          </button>
          <RoomManager />
        </aside>

        <main className="room-main">
          <StoryTimeline />
          <div className="editor-area">
            <AIAssistant onInsert={handleInsert} />
            <div className="editor-wrapper">
              <textarea
                ref={editorRef}
                className="editor-textarea"
                placeholder="写下你的段落...（100-500字）"
                value={content}
                onChange={(e) => setContent(e.target.value.slice(0, 500))}
                minLength={100}
                maxLength={500}
              />
              <div className="editor-footer">
                <span className={`char-count ${content.length < 100 || content.length > 500 ? 'char-invalid' : ''}`}>
                  {content.length} / 500
                </span>
                <button
                  className="btn-primary btn-submit"
                  onClick={handleSubmit}
                  disabled={submitting || content.length < 100 || content.length > 500}
                >
                  <Send size={14} /> 提交段落
                </button>
              </div>
            </div>
          </div>
        </main>

        <aside className="room-sidebar-right">
          <StoryCanvas />
          <div className="member-section">
            <h3><Users size={16} /> 成员列表</h3>
            <ul className="member-list">
              {members.map((m) => (
                <li key={m.id} className={`member-item ${m.userName === userName ? 'member-self' : ''}`}>
                  <Pen size={12} /> {m.userName}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      {showStats && stats && (
        <div className="stats-modal" onClick={() => setShowStats(false)}>
          <div className="stats-content" onClick={(e) => e.stopPropagation()}>
            <h2>故事统计</h2>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-value">{stats.totalParagraphs}</span>
                <span className="stat-label">总段落数</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{stats.totalWords}</span>
                <span className="stat-label">总字数</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{stats.memberCount}</span>
                <span className="stat-label">参与人数</span>
              </div>
            </div>
            {stats.contributions.length > 0 && (
              <div className="stats-chart">
                <h3>贡献比例</h3>
                <RingChart contributions={stats.contributions} />
              </div>
            )}
            <button className="btn-secondary" onClick={() => setShowStats(false)}>关闭</button>
          </div>
        </div>
      )}
    </div>
  );
}
