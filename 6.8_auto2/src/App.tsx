import React, { useRef, useEffect, useState, useCallback } from 'react';
import { CanvasModule, ToolType } from './CanvasModule';
import { SyncModule, StickyData } from './SyncModule';
import './App.css';

const COLORS = [
  '#333333', '#e74c3c', '#e67e22', '#f1c40f',
  '#2ecc71', '#3498db', '#9b59b6', '#1abc9c',
  '#ffffff', '#95a5a6',
];

const LINE_WIDTHS = [2, 4, 6, 10];

const STICKY_COLORS = ['#fff9c4', '#c8e6c9', '#bbdefb', '#f8bbd0', '#e1bee7'];

type StickyNote = {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  editing: boolean;
  dragging: boolean;
};

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasModuleRef = useRef<CanvasModule | null>(null);
  const syncRef = useRef<SyncModule>(new SyncModule());

  const [tool, setTool] = useState<ToolType>('pen');
  const [color, setColor] = useState('#333333');
  const [lineWidth, setLineWidth] = useState(3);
  const [stickies, setStickies] = useState<StickyNote[]>([]);
  const [roomId, setRoomId] = useState('');
  const [joined, setJoined] = useState(false);
  const [roomInput, setRoomInput] = useState('');
  const [onlineCount, setOnlineCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const stickiesRef = useRef(stickies);
  stickiesRef.current = stickies;

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleResize = useCallback(() => {
    if (!containerRef.current || !canvasModuleRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    canvasModuleRef.current.resize(clientWidth, clientHeight);
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    const cm = new CanvasModule(canvasRef.current);
    canvasModuleRef.current = cm;

    cm.setCallbacks({
      onDrawEvent: (data) => syncRef.current.emitDrawEvent(data),
      onStickyAdd: (sticky) => syncRef.current.emitStickyAdd(sticky),
      onStickyMove: (id, x, y) => syncRef.current.emitStickyMove(id, x, y),
      onStickyUpdate: (id, text) => syncRef.current.emitStickyUpdate(id, text),
      onStickyDelete: (id) => syncRef.current.emitStickyDelete(id),
    });

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      cm.destroy();
    };
  }, [handleResize]);

  useEffect(() => {
    canvasModuleRef.current?.setTool(tool);
  }, [tool]);

  useEffect(() => {
    canvasModuleRef.current?.setColor(color);
  }, [color]);

  useEffect(() => {
    canvasModuleRef.current?.setLineWidth(lineWidth);
  }, [lineWidth]);

  const joinRoom = useCallback(() => {
    const id = roomInput.trim() || 'default';
    setRoomId(id);
    setJoined(true);
    const sync = syncRef.current;
    sync.connect(id);
    sync.on({
      onDrawEvent: (data) => canvasModuleRef.current?.applyRemoteDraw(data),
      onStickyAdd: (data) => {
        setStickies((prev) => [...prev, { ...data, editing: false, dragging: false }]);
      },
      onStickyMove: (data) => {
        setStickies((prev) =>
          prev.map((s) => (s.id === data.id ? { ...s, x: data.x, y: data.y } : s))
        );
      },
      onStickyUpdate: (data) => {
        setStickies((prev) =>
          prev.map((s) => (s.id === data.id ? { ...s, text: data.text } : s))
        );
      },
      onStickyDelete: (data) => {
        setStickies((prev) => prev.filter((s) => s.id !== data.id));
      },
      onClearCanvas: () => {
        canvasModuleRef.current?.clear();
        setStickies([]);
      },
      onRoomUsers: (count) => setOnlineCount(count),
    });
  }, [roomInput]);

  const addSticky = useCallback(() => {
    const container = containerRef.current;
    if (!container || !canvasModuleRef.current) return;
    const x = container.clientWidth / 2 - 80 + Math.random() * 40;
    const y = container.clientHeight / 2 - 50 + Math.random() * 40;
    const stickyColor = STICKY_COLORS[Math.floor(Math.random() * STICKY_COLORS.length)];
    const sticky = canvasModuleRef.current.addStickyAt(x, y);
    const note: StickyNote = { ...sticky, color: stickyColor, editing: true, dragging: false };
    setStickies((prev) => [...prev, note]);
    syncRef.current.emitStickyAdd({ ...sticky, color: stickyColor });
  }, []);

  const handleStickyDoubleClick = useCallback((id: string) => {
    setStickies((prev) =>
      prev.map((s) => (s.id === id ? { ...s, editing: true } : s))
    );
  }, []);

  const handleStickyBlur = useCallback((id: string, newText: string) => {
    setStickies((prev) =>
      prev.map((s) => (s.id === id ? { ...s, text: newText, editing: false } : s))
    );
    syncRef.current.emitStickyUpdate(id, newText);
  }, []);

  const deleteSticky = useCallback((id: string) => {
    setStickies((prev) => prev.filter((s) => s.id !== id));
    syncRef.current.emitStickyDelete(id);
  }, []);

  const handleStickyDragStart = useCallback((id: string, e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const sticky = stickiesRef.current.find((s) => s.id === id);
    if (!sticky) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const offsetX = clientX - sticky.x;
    const offsetY = clientY - sticky.y;

    setStickies((prev) =>
      prev.map((s) => (s.id === id ? { ...s, dragging: true } : s))
    );

    const onMove = (ev: MouseEvent | TouchEvent) => {
      const cx = 'touches' in ev ? ev.touches[0].clientX : ev.clientX;
      const cy = 'touches' in ev ? ev.touches[0].clientY : ev.clientY;
      const nx = cx - offsetX;
      const ny = cy - offsetY;
      setStickies((prev) =>
        prev.map((s) => (s.id === id ? { ...s, x: nx, y: ny } : s))
      );
    };

    const onUp = () => {
      setStickies((prev) =>
        prev.map((s) => (s.id === id ? { ...s, dragging: false } : s))
      );
      const current = stickiesRef.current.find((s) => s.id === id);
      if (current) {
        syncRef.current.emitStickyMove(id, current.x, current.y);
      }
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
  }, []);

  const handleClear = useCallback(() => {
    canvasModuleRef.current?.clear();
    setStickies([]);
    syncRef.current.emitClearCanvas();
  }, []);

  const handleExport = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `whiteboard-${Date.now()}.png`;
    link.href = canvasModuleRef.current!.exportAsPng();
    link.click();
  }, []);

  if (!joined) {
    return (
      <div className="join-screen">
        <div className="join-card">
          <h1>🎨 白板协作</h1>
          <p>输入房间号加入协作，相同房间号可实时同步</p>
          <input
            value={roomInput}
            onChange={(e) => setRoomInput(e.target.value)}
            placeholder="输入房间号（默认 default）"
            onKeyDown={(e) => e.key === 'Enter' && joinRoom()}
          />
          <button className="btn-primary" onClick={joinRoom}>加入房间</button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      {isMobile && (
        <div className="mobile-header">
          <button className="menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
            ☰
          </button>
          <span className="room-badge">房间: {roomId}</span>
          <span className="online-badge">👤 {onlineCount}</span>
        </div>
      )}

      <aside className={`toolbar ${isMobile ? 'mobile' : ''} ${sidebarOpen ? 'open' : ''}`}>
        {!isMobile && (
          <div className="toolbar-header">
            <span className="room-badge">房间: {roomId}</span>
            <span className="online-badge">👤 {onlineCount}</span>
          </div>
        )}

        <div className="tool-section">
          <label>工具</label>
          <div className="tool-grid">
            {(['pen', 'rect', 'circle', 'sticky'] as ToolType[]).map((t) => (
              <button
                key={t}
                className={`tool-btn ${tool === t ? 'active' : ''}`}
                onClick={() => setTool(t)}
                title={t === 'pen' ? '画笔' : t === 'rect' ? '矩形' : t === 'circle' ? '圆形' : '便签'}
              >
                {t === 'pen' ? '✏️' : t === 'rect' ? '⬜' : t === 'circle' ? '⭕' : '📝'}
              </button>
            ))}
          </div>
        </div>

        <div className="tool-section">
          <label>颜色</label>
          <div className="color-grid">
            {COLORS.map((c) => (
              <button
                key={c}
                className={`color-btn ${color === c ? 'active' : ''}`}
                style={{ background: c, border: c === '#ffffff' ? '2px solid #ddd' : undefined }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
        </div>

        <div className="tool-section">
          <label>笔触</label>
          <div className="width-grid">
            {LINE_WIDTHS.map((w) => (
              <button
                key={w}
                className={`width-btn ${lineWidth === w ? 'active' : ''}`}
                onClick={() => setLineWidth(w)}
              >
                <span style={{ width: w + 4, height: w + 4 }} />
              </button>
            ))}
          </div>
        </div>

        <div className="tool-section">
          <button className="btn-action" onClick={addSticky}>📌 添加便签</button>
          <button className="btn-action btn-danger" onClick={handleClear}>🗑️ 清空白板</button>
          <button className="btn-action btn-export" onClick={handleExport}>💾 导出 PNG</button>
        </div>

        {isMobile && sidebarOpen && (
          <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
        )}
      </aside>

      <div className="canvas-area" ref={containerRef}>
        <canvas ref={canvasRef} />

        {stickies.map((s) => (
          <div
            key={s.id}
            className={`sticky-note ${s.dragging ? 'dragging' : ''}`}
            style={{
              left: s.x,
              top: s.y,
              backgroundColor: s.color,
            }}
            onMouseDown={(e) => handleStickyDragStart(s.id, e)}
            onTouchStart={(e) => handleStickyDragStart(s.id, e)}
            onDoubleClick={() => handleStickyDoubleClick(s.id)}
          >
            <button
              className="sticky-delete"
              onClick={(e) => {
                e.stopPropagation();
                deleteSticky(s.id);
              }}
            >
              ×
            </button>
            {s.editing ? (
              <textarea
                autoFocus
                defaultValue={s.text}
                onBlur={(e) => handleStickyBlur(s.id, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    (e.target as HTMLTextAreaElement).blur();
                  }
                }}
              />
            ) : (
              <div className="sticky-text">{s.text || '双击编辑...'}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
