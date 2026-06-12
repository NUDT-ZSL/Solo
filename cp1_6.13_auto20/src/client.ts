import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { v4 as uuidv4 } from 'uuid';
import { CanvasRenderer } from './canvas';
import type {
  DrawStroke,
  StickyNote,
  VotePayload,
  WsMessage,
  SortMode,
  ToolType,
  User,
  Point
} from './types';
import {
  COLORS,
  ANIMALS,
  COLOR_NAMES,
  STICKY_COLORS
} from './types';

const DEFAULT_ROOM = 'default-room';

function generateRandomUser(): User {
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  const colorName = COLOR_NAMES[color] || '神秘';
  const storedId = localStorage.getItem('cc_user_id');
  const id = storedId || uuidv4();
  if (!storedId) localStorage.setItem('cc_user_id', id);
  return { id, name: `${colorName}${animal}`, color };
}

function getNoteScore(note: StickyNote): number {
  return Object.values(note.votes || {}).reduce((sum, v) => sum + v, 0);
}

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasRendererRef = useRef<CanvasRenderer | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const [user, setUser] = useState<User>(() => generateRandomUser());
  const [tool, setTool] = useState<ToolType>('brush');
  const [brushColor, setBrushColor] = useState('#3b82f6');
  const [brushWidth, setBrushWidth] = useState(3);
  const [notes, setNotes] = useState<StickyNote[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [widthPickerOpen, setWidthPickerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const forceRerender = useRef(0);

  const [, setTick] = useState(0);
  const forceUpdate = useCallback(() => setTick(t => t + 1), []);

  useEffect(() => {
    const onResize = () => {
      setIsMobile(window.innerWidth < 1024);
      canvasRendererRef.current?.forceRender();
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const sortedNotes = useMemo(() => {
    const arr = [...notes];
    switch (sortMode) {
      case 'votes':
        arr.sort((a, b) => getNoteScore(b) - getNoteScore(a));
        break;
      case 'newest':
        arr.sort((a, b) => b.timestamp - a.timestamp);
        break;
      case 'oldest':
        arr.sort((a, b) => a.timestamp - b.timestamp);
        break;
    }
    return arr;
  }, [notes, sortMode]);

  useEffect(() => {
    if (!canvasRef.current) return;

    const renderer = new CanvasRenderer(canvasRef.current, {
      onStrokeComplete: (stroke) => {
        const msg: WsMessage = {
          type: 'draw',
          payload: {
            ...stroke,
            id: uuidv4(),
            userId: user.id,
            roomId: DEFAULT_ROOM,
            timestamp: Date.now()
          } as DrawStroke
        };
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify(msg));
        }
      },
      onCanvasClick: (worldPoint, screenPoint) => {
        if (tool === 'sticky') {
          const newNote: StickyNote = {
            id: uuidv4(),
            type: 'sticky',
            x: worldPoint.x - 120,
            y: worldPoint.y - 40,
            content: '',
            bgColor: STICKY_COLORS[Math.floor(Math.random() * STICKY_COLORS.length)],
            userId: user.id,
            userName: user.name,
            roomId: DEFAULT_ROOM,
            timestamp: Date.now(),
            votes: {}
          };
          const msg: WsMessage = { type: 'sticky-add', payload: newNote };
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(msg));
          }
          setNotes(prev => [...prev, newNote]);
        }
      }
    });

    canvasRendererRef.current = renderer;
    renderer.setBrushColor(brushColor);
    renderer.setBrushWidth(brushWidth);

    return () => {
      renderer.destroy();
      canvasRendererRef.current = null;
    };
  }, [user.id, tool, brushColor, brushWidth]);

  useEffect(() => {
    if (canvasRendererRef.current) {
      if (tool === 'eraser') {
        canvasRendererRef.current.setEraser();
      } else {
        canvasRendererRef.current.setBrushColor(brushColor);
      }
      canvasRendererRef.current.setBrushWidth(brushWidth);
    }
  }, [tool, brushColor, brushWidth]);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.hostname === 'localhost'
      ? `${window.location.hostname}:4000`
      : window.location.host;
    const ws = new WebSocket(`${protocol}//${wsHost}`);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'join',
        payload: { userId: user.id, roomId: DEFAULT_ROOM }
      } as WsMessage));
    };

    ws.onmessage = (event) => {
      try {
        const msg: WsMessage = JSON.parse(event.data);
        handleWsMessage(msg);
      } catch (err) {
        console.error('WS message parse error:', err);
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [user.id]);

  const handleWsMessage = (msg: WsMessage) => {
    switch (msg.type) {
      case 'sync': {
        const { strokes, notes: syncNotes, onlineCount: count } = msg.payload;
        if (canvasRendererRef.current) {
          canvasRendererRef.current.setStrokes(strokes || []);
        }
        setNotes(syncNotes || []);
        setOnlineCount(count || 0);
        break;
      }
      case 'draw': {
        canvasRendererRef.current?.addStroke(msg.payload as DrawStroke);
        break;
      }
      case 'clear': {
        canvasRendererRef.current?.clearAll();
        setNotes([]);
        setSelectedNoteId(null);
        break;
      }
      case 'sticky-add': {
        setNotes(prev => {
          if (prev.find(n => n.id === msg.payload.id)) return prev;
          return [...prev, msg.payload as StickyNote];
        });
        break;
      }
      case 'sticky-update': {
        setNotes(prev => prev.map(n =>
          n.id === msg.payload.id ? { ...n, ...msg.payload } : n
        ));
        break;
      }
      case 'vote': {
        setNotes(prev => prev.map(n =>
          n.id === msg.payload.id ? { ...n, votes: msg.payload.votes } : n
        ));
        break;
      }
      case 'online-count': {
        setOnlineCount(msg.payload.count);
        break;
      }
    }
  };

  const handleVote = (noteId: string, vote: 1 | -1) => {
    const payload: VotePayload = { noteId, userId: user.id, vote };
    const msg: WsMessage = { type: 'vote', payload };
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  };

  const handleClearCanvas = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'clear', payload: { roomId: DEFAULT_ROOM } } as WsMessage));
    }
    canvasRendererRef.current?.clearAll();
    setNotes([]);
    setSelectedNoteId(null);
    setShowClearConfirm(false);
  };

  const handleNoteContentChange = (noteId: string, content: string) => {
    if (content.length > 100) return;
    setNotes(prev => prev.map(n =>
      n.id === noteId ? { ...n, content } : n
    ));
  };

  const handleNoteContentBlur = (note: StickyNote) => {
    const msg: WsMessage = { type: 'sticky-update', payload: note };
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  };

  const canvasState = canvasRendererRef.current?.getState() || { scale: 1, offsetX: 0, offsetY: 0 };

  return (
    <div style={styles.app}>
      <div style={styles.onlineBadge}>
        <span style={styles.onlineDot} />
        <span style={styles.onlineText}>{onlineCount} 在线</span>
      </div>

      <div style={{
        ...styles.sortContainer,
        top: isMobile ? 'auto' : '16px',
        bottom: isMobile ? '88px' : 'auto'
      }}>
        <button
          style={styles.sortButton}
          onClick={() => setShowSortDropdown(v => !v)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M6 12h12M10 18h4" />
          </svg>
          <span style={{ marginLeft: 6, fontSize: 13 }}>
            {sortMode === 'votes' ? '按投票' : sortMode === 'newest' ? '按最新' : '按最旧'}
          </span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: 4 }}>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
        {showSortDropdown && (
          <div style={styles.sortDropdown}>
            {[
              { key: 'votes', label: '按投票最多' },
              { key: 'newest', label: '按最新添加' },
              { key: 'oldest', label: '按最旧' }
            ].map(opt => (
              <div
                key={opt.key}
                style={{
                  ...styles.sortOption,
                  background: sortMode === opt.key ? '#f1f5f9' : 'transparent',
                  color: sortMode === opt.key ? '#0f172a' : '#475569',
                  fontWeight: sortMode === opt.key ? 600 : 400
                }}
                onClick={() => {
                  setSortMode(opt.key as SortMode);
                  setShowSortDropdown(false);
                }}
              >
                {opt.label}
              </div>
            ))}
          </div>
        )}
      </div>

      <canvas ref={canvasRef} style={styles.canvas} />

      <div style={{
        ...styles.toolbar,
        ...(isMobile ? styles.toolbarMobile : styles.toolbarDesktop)
      }}>
        <div style={styles.toolbarInner}>
          <ToolButton
            active={tool === 'brush'}
            onClick={() => { setTool('brush'); setColorPickerOpen(false); setWidthPickerOpen(false); }}
            title="画笔"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 19l7-7 3 3-7 7-3-3z" />
              <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
              <path d="M2 2l7.586 7.586" />
              <circle cx="11" cy="11" r="2" />
            </svg>
          </ToolButton>

          {tool === 'brush' && (
            <>
              <div style={styles.colorWrapper}>
                <div
                  style={{ ...styles.colorSwatch, background: brushColor }}
                  onClick={() => { setColorPickerOpen(v => !v); setWidthPickerOpen(false); }}
                />
                {colorPickerOpen && (
                  <div style={{
                    ...styles.popover,
                    left: isMobile ? 'auto' : '70px',
                    bottom: isMobile ? '70px' : 'auto',
                    top: isMobile ? 'auto' : '8px'
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6 }}>
                      {COLORS.map(c => (
                        <div
                          key={c}
                          style={{
                            ...styles.colorOption,
                            background: c,
                            border: c === brushColor ? '2px solid #fff' : '2px solid transparent',
                            boxShadow: c === brushColor ? `0 0 0 2px ${c}` : 'none'
                          }}
                          onClick={() => { setBrushColor(c); setColorPickerOpen(false); }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div style={styles.widthWrapper}>
                <div
                  style={styles.widthTrigger}
                  onClick={() => { setWidthPickerOpen(v => !v); setColorPickerOpen(false); }}
                >
                  <div style={{
                    width: Math.max(4, brushWidth * 2),
                    height: Math.max(4, brushWidth * 2),
                    borderRadius: '50%',
                    background: '#e2e8f0'
                  }} />
                </div>
                {widthPickerOpen && (
                  <div style={{
                    ...styles.popover,
                    left: isMobile ? 'auto' : '70px',
                    bottom: isMobile ? '70px' : 'auto',
                    top: isMobile ? 'auto' : '8px',
                    padding: '12px 16px'
                  }}>
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>画笔粗细: {brushWidth}px</div>
                    <input
                      type="range"
                      min={1}
                      max={8}
                      value={brushWidth}
                      onChange={(e) => setBrushWidth(Number(e.target.value))}
                      style={{ width: 160, accentColor: brushColor }}
                    />
                  </div>
                )}
              </div>
            </>
          )}

          <ToolButton
            active={tool === 'sticky'}
            onClick={() => { setTool('sticky'); setColorPickerOpen(false); setWidthPickerOpen(false); }}
            title="便签"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8z" />
              <polyline points="16 3 16 8 21 8" />
            </svg>
          </ToolButton>

          <ToolButton
            active={tool === 'eraser'}
            onClick={() => { setTool('eraser'); setColorPickerOpen(false); setWidthPickerOpen(false); }}
            title="橡皮擦"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 20H7L3 16l12-12 8 8-6 8z" />
              <path d="M15 15L9 9" />
            </svg>
          </ToolButton>

          <div style={styles.divider} />

          <ToolButton
            onClick={() => { setShowClearConfirm(true); setColorPickerOpen(false); setWidthPickerOpen(false); }}
            title="清空画布"
            danger
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </ToolButton>
        </div>
      </div>

      {sortedNotes.map((note, idx) => {
        const pos = canvasRendererRef.current?.worldToScreen(note.x, note.y) || { x: note.x, y: note.y };
        const isSelected = selectedNoteId === note.id;
        const score = getNoteScore(note);
        const hasVoted = note.votes?.[user.id];
        const noteWidth = 240 * canvasState.scale;

        return (
          <div
            key={note.id}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedNoteId(isSelected ? null : note.id);
            }}
            style={{
              ...styles.note,
              position: 'absolute',
              left: pos.x,
              top: pos.y,
              width: noteWidth,
              background: note.bgColor,
              transform: isSelected ? 'scale(1.2)' : 'scale(1)',
              zIndex: isSelected ? 100 : 10 + idx,
              transition: 'transform 0.2s ease-out, left 0.5s ease, top 0.5s ease'
            }}
          >
            <div style={styles.noteHeader}>
              <span style={styles.noteAuthor} title={note.userName}>{note.userName}</span>
              <div style={styles.voteBadge}>
                <span style={{ color: score > 0 ? '#22c55e' : score < 0 ? '#ef4444' : '#64748b', fontWeight: 700 }}>
                  {score >= 0 ? '+' : ''}{score}
                </span>
              </div>
            </div>

            <textarea
              style={{
                ...styles.noteTextarea,
                fontSize: 13 * canvasState.scale
              }}
              value={note.content}
              placeholder="输入内容（最多100字）..."
              maxLength={100}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => handleNoteContentChange(note.id, e.target.value)}
              onBlur={() => handleNoteContentBlur(note)}
            />

            {isSelected && (
              <div style={styles.voteArea}>
                <button
                  style={{
                    ...styles.voteButton,
                    background: '#22c55e',
                    border: hasVoted === 1 ? '3px solid #fff' : 'none'
                  }}
                  onClick={(e) => { e.stopPropagation(); handleVote(note.id, 1); }}
                  onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.9)')}
                  onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                >
                  <span style={{ color: '#fff', fontSize: 20, fontWeight: 700, lineHeight: 1 }}>+1</span>
                </button>
                <button
                  style={{
                    ...styles.voteButton,
                    background: '#ef4444',
                    border: hasVoted === -1 ? '3px solid #fff' : 'none'
                  }}
                  onClick={(e) => { e.stopPropagation(); handleVote(note.id, -1); }}
                  onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.9)')}
                  onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                >
                  <span style={{ color: '#fff', fontSize: 20, fontWeight: 700, lineHeight: 1 }}>-1</span>
                </button>
              </div>
            )}
          </div>
        );
      })}

      {showClearConfirm && (
        <div
          style={styles.modalOverlay}
          onClick={() => setShowClearConfirm(false)}
        >
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalTitle}>确认清空画布？</div>
            <div style={styles.modalDesc}>此操作将删除所有绘制内容和便签，且无法恢复。</div>
            <div style={styles.modalActions}>
              <button style={styles.cancelBtn} onClick={() => setShowClearConfirm(false)}>
                取消
              </button>
              <button style={styles.dangerBtn} onClick={handleClearCanvas}>
                确认清空
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface ToolButtonProps {
  active?: boolean;
  danger?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}

function ToolButton({ active, danger, onClick, title, children }: ToolButtonProps) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        ...styles.toolButton,
        color: danger ? '#ef4444' : active ? '#fff' : '#94a3b8',
        background: active ? (danger ? '#7f1d1d' : '#334155') : 'transparent'
      }}
    >
      {children}
    </button>
  );
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    width: '100%',
    height: '100%',
    background: '#0f172a',
    position: 'relative',
    overflow: 'hidden'
  },
  canvas: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    display: 'block'
  },
  toolbar: {
    position: 'fixed',
    zIndex: 200,
    background: '#1e293b',
    borderRadius: 12,
    boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
    border: '1px solid #334155'
  },
  toolbarDesktop: {
    left: 16,
    top: '50%',
    transform: 'translateY(-50%)',
    width: 60,
    padding: '12px 8px'
  },
  toolbarMobile: {
    left: '50%',
    bottom: 16,
    transform: 'translateX(-50%)',
    height: 60,
    padding: '8px 16px',
    display: 'flex',
    alignItems: 'center'
  },
  toolbarInner: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    alignItems: 'center'
  },
  toolButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    background: 'transparent'
  },
  divider: {
    width: 32,
    height: 1,
    background: '#334155',
    margin: '4px 0'
  },
  colorWrapper: {
    position: 'relative',
    width: 44,
    height: 44,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  colorSwatch: {
    width: 28,
    height: 28,
    borderRadius: 8,
    cursor: 'pointer',
    border: '2px solid #475569',
    transition: 'transform 0.2s ease'
  },
  widthWrapper: {
    position: 'relative',
    width: 44,
    height: 44,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  widthTrigger: {
    width: 28,
    height: 28,
    borderRadius: 8,
    cursor: 'pointer',
    background: '#334155',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.2s ease'
  },
  popover: {
    position: 'absolute',
    background: '#1e293b',
    borderRadius: 12,
    padding: 12,
    boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
    border: '1px solid #334155',
    zIndex: 300,
    minWidth: 180
  },
  colorOption: {
    width: 24,
    height: 24,
    borderRadius: 6,
    cursor: 'pointer',
    transition: 'transform 0.15s ease'
  },
  onlineBadge: {
    position: 'fixed',
    top: 16,
    left: 16,
    zIndex: 200,
    background: '#f8fafc',
    height: 36,
    paddingLeft: 10,
    paddingRight: 16,
    borderRadius: 9999,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    marginLeft: 76
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: '#22c55e',
    boxShadow: '0 0 0 3px rgba(34,197,94,0.2)',
    animation: 'pulse 2s infinite'
  },
  onlineText: {
    fontSize: 13,
    fontWeight: 600,
    color: '#334155'
  },
  sortContainer: {
    position: 'fixed',
    right: 16,
    zIndex: 200
  },
  sortButton: {
    background: '#1e293b',
    color: '#e2e8f0',
    border: '1px solid #334155',
    height: 40,
    padding: '0 14px',
    borderRadius: 10,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    fontSize: 13,
    fontWeight: 500,
    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
    transition: 'all 0.2s ease'
  },
  sortDropdown: {
    position: 'absolute',
    top: 48,
    right: 0,
    width: 180,
    background: '#fff',
    borderRadius: 12,
    boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
    overflow: 'hidden',
    border: '1px solid #e2e8f0',
    zIndex: 201
  },
  sortOption: {
    padding: '12px 16px',
    fontSize: 14,
    cursor: 'pointer',
    transition: 'background 0.15s ease'
  },
  note: {
    borderRadius: 12,
    padding: 12,
    boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
    cursor: 'pointer',
    transformOrigin: 'top left',
    userSelect: 'none'
  },
  noteHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  noteAuthor: {
    fontSize: 11,
    color: '#475569',
    fontWeight: 600,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '70%'
  },
  voteBadge: {
    background: '#fff',
    borderRadius: 9999,
    padding: '2px 10px',
    fontSize: 14,
    fontWeight: 700,
    boxShadow: '0 1px 4px rgba(0,0,0,0.1)'
  },
  noteTextarea: {
    width: '100%',
    minHeight: 60,
    border: 'none',
    background: 'transparent',
    resize: 'none',
    outline: 'none',
    color: '#1e293b',
    fontFamily: 'inherit',
    lineHeight: 1.4
  },
  voteArea: {
    display: 'flex',
    gap: 10,
    marginTop: 10,
    justifyContent: 'center',
    paddingTop: 8,
    borderTop: '1px solid rgba(0,0,0,0.08)'
  },
  voteButton: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    transition: 'transform 0.15s ease',
    padding: 0
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    animation: 'fadeIn 0.2s ease'
  },
  modal: {
    background: '#fff',
    borderRadius: 16,
    padding: 24,
    maxWidth: 380,
    width: '90%',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    animation: 'slideUp 0.2s ease'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: '#0f172a',
    marginBottom: 8
  },
  modalDesc: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 20,
    lineHeight: 1.5
  },
  modalActions: {
    display: 'flex',
    gap: 10,
    justifyContent: 'flex-end'
  },
  cancelBtn: {
    padding: '10px 20px',
    borderRadius: 8,
    border: '1px solid #e2e8f0',
    background: '#f8fafc',
    color: '#475569',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  dangerBtn: {
    padding: '10px 20px',
    borderRadius: 8,
    border: 'none',
    background: '#ef4444',
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(239,68,68,0.3)',
    transition: 'all 0.2s ease'
  }
};

const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }
  button:hover {
    transform: translateY(-2px);
  }
  button:active {
    transform: translateY(0);
  }
  .toolButton:hover {
    background: rgba(51, 65, 85, 0.6) !important;
  }
  .colorSwatch:hover {
    transform: scale(1.1);
  }
  .colorOption:hover {
    transform: scale(1.15);
  }
  .widthTrigger:hover {
    background: #475569 !important;
  }
  .sortOption:hover {
    background: #f1f5f9 !important;
  }
  textarea::-webkit-scrollbar {
    width: 4px;
  }
  textarea::-webkit-scrollbar-thumb {
    background: rgba(0,0,0,0.2);
    border-radius: 2px;
  }
  @media (max-width: 1023px) {
    .toolbarInner {
      flex-direction: row !important;
      gap: 8px !important;
    }
  }
`;
document.head.appendChild(styleSheet);

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(<App />);
}
