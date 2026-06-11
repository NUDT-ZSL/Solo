import React, { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import Toolbar from './Toolbar';
import StickyNote from './StickyNote';
import {
  Point,
  Stroke,
  User,
  StickyNoteData,
  RoomState,
  ToolMode,
  ToastMessage,
  DEFAULT_COLOR,
  DEFAULT_LINE_WIDTH,
  DEFAULT_STICKY_COLOR,
  DEFAULT_STICKY_WIDTH,
  DEFAULT_STICKY_HEIGHT,
  lerp,
  getInitials,
  COLOR_PALETTE,
} from './types';

const LERP_FACTOR = 0.15;
const DRAW_THROTTLE_MS = 33;
const CURSOR_THROTTLE_MS = 16;

const App: React.FC = () => {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [inputRoomId, setInputRoomId] = useState('');
  const [userName, setUserName] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [stickyNotes, setStickyNotes] = useState<StickyNoteData[]>([]);
  const [cursors, setCursors] = useState<Map<string, { position: Point; color: string; name: string }>>(new Map());
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [lineWidth, setLineWidth] = useState(DEFAULT_LINE_WIDTH);
  const [toolMode, setToolMode] = useState<ToolMode>('draw');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef<Point[]>([]);
  const animCursorsRef = useRef<Map<string, { current: Point; target: Point; color: string; name: string }>>(new Map());
  const animFrameRef = useRef<number>(0);
  const lastDrawEmitRef = useRef(0);
  const lastCursorEmitRef = useRef(0);
  const pendingPointsRef = useRef<Point[]>([]);

  const addToast = useCallback((type: 'join' | 'leave', userName: string) => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, userName }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const socket = io({ transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('room_state', (state: RoomState) => {
      setCurrentUser(state.currentUser);
      setUsers(state.users);
      setStrokes(state.strokes);
      setStickyNotes(state.stickyNotes);
    });

    socket.on('user_joined', ({ user }: { user: User }) => {
      setUsers((prev) => {
        if (prev.find((u) => u.id === user.id)) return prev;
        return [...prev, user];
      });
      addToast('join', user.name);
    });

    socket.on('user_left', ({ userId }: { userId: string }) => {
      setUsers((prev) => {
        const leftUser = prev.find((u) => u.id === userId);
        if (leftUser) addToast('leave', leftUser.name);
        return prev.filter((u) => u.id !== userId);
      });
      setCursors((prev) => {
        const next = new Map(prev);
        next.delete(userId);
        return next;
      });
      animCursorsRef.current.delete(userId);
    });

    socket.on('stroke_drawn', ({ stroke }: { stroke: Stroke }) => {
      setStrokes((prev) => [...prev, stroke]);
      drawStrokeOnCanvas(stroke);
    });

    socket.on('stroke_undone', ({ strokeId }: { strokeId: string }) => {
      setStrokes((prev) => prev.filter((s) => s.id !== strokeId));
      redrawCanvas(strokes.filter((s) => s.id !== strokeId));
    });

    socket.on('canvas_cleared', () => {
      setStrokes([]);
      clearCanvas();
    });

    socket.on('cursor_moved', ({ userId, position }: { userId: string; position: Point }) => {
      setCursors((prev) => {
        const next = new Map(prev);
        const existing = next.get(userId);
        const user = users.find((u) => u.id === userId);
        if (existing) {
          next.set(userId, { ...existing, position });
        } else if (user) {
          next.set(userId, { position, color: user.color, name: user.name });
        }
        return next;
      });

      const animMap = animCursorsRef.current;
      const user = users.find((u) => u.id === userId);
      if (animMap.has(userId)) {
        const entry = animMap.get(userId)!;
        entry.target = position;
        if (user) {
          entry.color = user.color;
          entry.name = user.name;
        }
      } else if (user) {
        animMap.set(userId, { current: position, target: position, color: user.color, name: user.name });
      }
    });

    socket.on('sticky_note_added', ({ note }: { note: StickyNoteData }) => {
      setStickyNotes((prev) => {
        if (prev.find((n) => n.id === note.id)) return prev;
        return [...prev, note];
      });
    });

    socket.on('sticky_note_updated', ({ noteId, updates }: { noteId: string; updates: Partial<StickyNoteData> }) => {
      setStickyNotes((prev) =>
        prev.map((n) => (n.id === noteId ? { ...n, ...updates } : n))
      );
    });

    socket.on('sticky_note_deleted', ({ noteId }: { noteId: string }) => {
      setStickyNotes((prev) => prev.filter((n) => n.id !== noteId));
    });

    return () => {
      socket.disconnect();
    };
  }, [addToast, users]);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const drawStrokeOnCanvas = useCallback((stroke: Stroke) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx || stroke.points.length < 2) return;

    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

    for (let i = 1; i < stroke.points.length; i++) {
      const prev = stroke.points[i - 1];
      const curr = stroke.points[i];
      const midX = (prev.x + curr.x) / 2;
      const midY = (prev.y + curr.y) / 2;
      ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
    }

    const last = stroke.points[stroke.points.length - 1];
    ctx.lineTo(last.x, last.y);
    ctx.stroke();
  }, []);

  const redrawCanvas = useCallback(
    (allStrokes: Stroke[]) => {
      clearCanvas();
      allStrokes.forEach((s) => drawStrokeOnCanvas(s));
    },
    [clearCanvas, drawStrokeOnCanvas]
  );

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;
    const canvas = canvasRef.current;
    const container = containerRef.current;

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.scale(dpr, dpr);
      redrawCanvas(strokes);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [strokes, redrawCanvas]);

  useEffect(() => {
    const animate = () => {
      const animMap = animCursorsRef.current;
      animMap.forEach((entry, userId) => {
        entry.current.x = lerp(entry.current.x, entry.target.x, LERP_FACTOR);
        entry.current.y = lerp(entry.current.y, entry.target.y, LERP_FACTOR);

        setCursors((prev) => {
          const next = new Map(prev);
          next.set(userId, { position: { x: entry.current.x, y: entry.current.y }, color: entry.color, name: entry.name });
          return next;
        });
      });
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, []);

  const getCanvasPoint = useCallback((e: React.MouseEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (toolMode === 'sticky') return;
      isDrawingRef.current = true;
      const point = getCanvasPoint(e);
      currentStrokeRef.current = [point];
      pendingPointsRef.current = [point];
    },
    [toolMode, getCanvasPoint]
  );

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const point = getCanvasPoint(e);

      if (isDrawingRef.current && toolMode === 'draw') {
        currentStrokeRef.current.push(point);
        pendingPointsRef.current.push(point);

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const pts = currentStrokeRef.current;
        if (pts.length >= 2) {
          const prev = pts[pts.length - 2];
          ctx.strokeStyle = color;
          ctx.lineWidth = lineWidth;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(prev.x, prev.y);
          ctx.lineTo(point.x, point.y);
          ctx.stroke();
        }

        const now = Date.now();
        if (now - lastDrawEmitRef.current >= DRAW_THROTTLE_MS) {
          const socket = socketRef.current;
          if (socket && roomId) {
            const stroke: Stroke = {
              id: `stroke_${Date.now()}_${Math.random()}`,
              points: [...pendingPointsRef.current],
              color,
              lineWidth,
              userId: socket.id,
            };
            socket.emit('draw_stroke', { roomId, stroke });
            pendingPointsRef.current = [point];
          }
          lastDrawEmitRef.current = now;
        }
      }

      const socket = socketRef.current;
      if (socket && roomId) {
        const now = Date.now();
        if (now - lastCursorEmitRef.current >= CURSOR_THROTTLE_MS) {
          socket.emit('cursor_move', { roomId, position: point });
          lastCursorEmitRef.current = now;
        }
      }
    },
    [toolMode, color, lineWidth, roomId, getCanvasPoint]
  );

  const handleCanvasMouseUp = useCallback(() => {
    if (isDrawingRef.current && toolMode === 'draw') {
      isDrawingRef.current = false;

      const socket = socketRef.current;
      if (socket && roomId && currentStrokeRef.current.length > 1) {
        const stroke: Stroke = {
          id: `stroke_${Date.now()}_${Math.random()}`,
          points: currentStrokeRef.current,
          color,
          lineWidth,
          userId: socket.id,
        };
        socket.emit('draw_stroke', { roomId, stroke });
        setStrokes((prev) => [...prev, stroke]);
      }

      currentStrokeRef.current = [];
      pendingPointsRef.current = [];
    }
  }, [toolMode, color, lineWidth, roomId]);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (toolMode !== 'sticky') return;

      const point = getCanvasPoint(e);
      const socket = socketRef.current;
      if (!socket || !roomId) return;

      const note: StickyNoteData = {
        id: `note_${Date.now()}_${Math.random()}`,
        x: point.x - DEFAULT_STICKY_WIDTH / 2,
        y: point.y - DEFAULT_STICKY_HEIGHT / 2,
        width: DEFAULT_STICKY_WIDTH,
        height: DEFAULT_STICKY_HEIGHT,
        text: '',
        color: DEFAULT_STICKY_COLOR,
        userId: socket.id,
      };

      setStickyNotes((prev) => [...prev, note]);
      socket.emit('add_sticky_note', { roomId, note });
    },
    [toolMode, roomId, getCanvasPoint]
  );

  const handleUndo = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || !roomId) return;
    socket.emit('undo_stroke', { roomId });
  }, [roomId]);

  const handleClear = useCallback(() => {
    setShowClearConfirm(true);
  }, []);

  const confirmClear = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || !roomId) return;
    socket.emit('clear_canvas', { roomId });
    setStrokes([]);
    clearCanvas();
    setShowClearConfirm(false);
  }, [roomId, clearCanvas]);

  const handleStickyNoteUpdate = useCallback(
    (noteId: string, updates: Partial<StickyNoteData>) => {
      setStickyNotes((prev) =>
        prev.map((n) => (n.id === noteId ? { ...n, ...updates } : n))
      );
      const socket = socketRef.current;
      if (socket && roomId) {
        socket.emit('update_sticky_note', { roomId, noteId, updates });
      }
    },
    [roomId]
  );

  const handleStickyNoteDelete = useCallback(
    (noteId: string) => {
      setStickyNotes((prev) => prev.filter((n) => n.id !== noteId));
      const socket = socketRef.current;
      if (socket && roomId) {
        socket.emit('delete_sticky_note', { roomId, noteId });
      }
    },
    [roomId]
  );

  const handleJoinRoom = useCallback(() => {
    if (!inputRoomId.trim() || !userName.trim()) return;
    const socket = socketRef.current;
    if (!socket) return;

    const rid = inputRoomId.trim().padStart(4, '0').slice(0, 4);
    setRoomId(rid);
    socket.emit('join_room', { roomId: rid, userName: userName.trim() });
  }, [inputRoomId, userName]);

  const handleCreateRoom = useCallback(() => {
    if (!userName.trim()) return;
    const socket = socketRef.current;
    if (!socket) return;

    const rid = Math.floor(1000 + Math.random() * 9000).toString();
    setRoomId(rid);
    setInputRoomId(rid);
    socket.emit('join_room', { roomId: rid, userName: userName.trim() });
  }, [userName]);

  if (!roomId) {
    return (
      <div className="app-container">
        <div className="welcome-screen">
          <div className="welcome-card">
            <h1 className="welcome-title">实时协作白板</h1>
            <p className="welcome-subtitle">与团队成员在同一画布上自由创作</p>
            <input
              className="welcome-input"
              type="text"
              placeholder="输入你的昵称"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              maxLength={20}
            />
            <input
              className="welcome-input"
              type="text"
              placeholder="房间ID（4位数字）"
              value={inputRoomId}
              onChange={(e) => setInputRoomId(e.target.value.replace(/\D/g, '').slice(0, 4))}
              maxLength={4}
            />
            <div className="welcome-buttons">
              <button
                className="welcome-btn welcome-btn-primary"
                onClick={handleJoinRoom}
                disabled={inputRoomId.length !== 4 || !userName.trim()}
              >
                加入房间
              </button>
              <button
                className="welcome-btn welcome-btn-secondary"
                onClick={handleCreateRoom}
                disabled={!userName.trim()}
              >
                创建房间
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Toolbar
        color={color}
        onColorChange={setColor}
        lineWidth={lineWidth}
        onLineWidthChange={setLineWidth}
        toolMode={toolMode}
        onToolModeChange={setToolMode}
        onUndo={handleUndo}
        onClear={handleClear}
        onToggleMenu={() => setShowMobileMenu(!showMobileMenu)}
        showMenuButton={isMobile}
      />

      <div className="main-content">
        <div className="canvas-container" ref={containerRef}>
          <div className="canvas-wrapper">
            <canvas
              ref={canvasRef}
              className={`whiteboard-canvas ${toolMode === 'sticky' ? 'sticky-mode' : ''}`}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
              onClick={handleCanvasClick}
            />

            <div className="sticky-notes-layer">
              {stickyNotes.map((note) => (
                <StickyNote
                  key={note.id}
                  note={note}
                  onUpdate={handleStickyNoteUpdate}
                  onDelete={handleStickyNoteDelete}
                  containerRef={containerRef}
                />
              ))}
            </div>

            <div className="cursors-layer">
              {Array.from(cursors.entries())
                .filter(([userId]) => currentUser && userId !== currentUser.id)
                .map(([userId, data]) => (
                  <div
                    key={userId}
                    className="remote-cursor"
                    style={{
                      transform: `translate(${data.position.x}px, ${data.position.y}px)`,
                    }}
                  >
                    <div className="remote-cursor-dot" style={{ backgroundColor: data.color }} />
                    <div className="remote-cursor-name" style={{ backgroundColor: data.color }}>
                      {getInitials(data.name)}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {!isMobile && (
          <div className="user-panel">
            <div className="user-panel-header">
              <div className="room-id-label">房间号</div>
              <div className="room-id">{roomId}</div>
            </div>
            <div className="online-users-title">在线用户 ({users.length})</div>
            <div className="user-list">
              {users.map((user) => (
                <div key={user.id} className="user-item">
                  <div className="user-avatar" style={{ backgroundColor: user.color }}>
                    {getInitials(user.name)}
                  </div>
                  <span className="user-name">
                    {user.name}
                    {currentUser && user.id === currentUser.id && ' (你)'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {isMobile && showMobileMenu && (
          <div className="mobile-menu">
            <div className="user-panel-header">
              <div className="room-id-label">房间号</div>
              <div className="room-id">{roomId}</div>
            </div>
            <div className="online-users-title">在线用户 ({users.length})</div>
            <div className="user-list">
              {users.map((user) => (
                <div key={user.id} className="user-item">
                  <div className="user-avatar" style={{ backgroundColor: user.color }}>
                    {getInitials(user.name)}
                  </div>
                  <span className="user-name">
                    {user.name}
                    {currentUser && user.id === currentUser.id && ' (你)'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.type === 'join' ? 'join' : 'leave'}`}>
            {toast.type === 'join' ? '🟢' : '🔴'} {toast.userName} {toast.type === 'join' ? '加入了房间' : '离开了房间'}
          </div>
        ))}
      </div>

      {showClearConfirm && (
        <div className="confirm-modal-overlay" onClick={() => setShowClearConfirm(false)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="confirm-modal-title">确认清空画布</h3>
            <p className="confirm-modal-message">此操作将清除画布上的所有绘制内容，且无法恢复。确定要继续吗？</p>
            <div className="confirm-modal-buttons">
              <button className="confirm-btn confirm-btn-cancel" onClick={() => setShowClearConfirm(false)}>
                取消
              </button>
              <button className="confirm-btn confirm-btn-danger" onClick={confirmClear}>
                确认清空
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
