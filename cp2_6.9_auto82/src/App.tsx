import React, { useState, useRef, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { toPng } from 'html-to-image';
import StickyNote from './components/StickyNote';
import ConnectionLine from './components/ConnectionLine';
import ForceGraph from './components/ForceGraph';
import type { StickyNote as StickyNoteType, Connection } from './types';
import { COLOR_PALETTE } from './types';

const App: React.FC = () => {
  const [stickies, setStickies] = useState<StickyNoteType[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isGraphMode, setIsGraphMode] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [savedLink, setSavedLink] = useState<string | null>(null);
  const [loadId, setLoadId] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{
    type: 'note' | 'connection' | null;
    noteId?: string;
    startX?: number;
    startY?: number;
    offsetX?: number;
    offsetY?: number;
    currentX?: number;
    currentY?: number;
  }>({ type: null });

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  const createNote = useCallback((x: number, y: number) => {
    const colorIndex = Math.floor(Math.random() * COLOR_PALETTE.length);
    const noteWidth = isMobile ? 100 : 120;
    const noteHeight = isMobile ? 80 : 100;
    const newNote: StickyNoteType = {
      id: uuidv4(),
      x: x - noteWidth / 2,
      y: y - noteHeight / 2,
      text: '',
      color: COLOR_PALETTE[colorIndex],
      colorIndex,
      isEditing: true,
      createdAt: Date.now()
    };
    setStickies((prev) => [...prev, newNote]);
  }, [isMobile]);

  const updateNote = useCallback((id: string, updates: Partial<StickyNoteType>) => {
    setStickies((prev) => prev.map((n) => (n.id === id ? { ...n, ...updates } : n)));
  }, []);

  const deleteNote = useCallback((id: string) => {
    setStickies((prev) => prev.filter((n) => n.id !== id));
    setConnections((prev) => prev.filter((c) => c.fromId !== id && c.toId !== id));
  }, []);

  const handleNoteDoubleClick = useCallback((id: string) => {
    const note = stickies.find((n) => n.id === id);
    if (note && note.text && note.text.length > 30) {
      updateNote(id, { isFullscreen: true });
    } else {
      updateNote(id, { isEditing: true });
    }
  }, [stickies, updateNote]);

  const handleStartDrag = useCallback((id: string, e: React.MouseEvent) => {
    const note = stickies.find((n) => n.id === id);
    if (!note) return;
    dragStateRef.current = {
      type: 'note',
      noteId: id,
      startX: e.clientX,
      startY: e.clientY,
      offsetX: e.clientX - note.x,
      offsetY: e.clientY - note.y
    };
  }, [stickies]);

  const handleStartConnection = useCallback((id: string, e: React.MouseEvent) => {
    dragStateRef.current = {
      type: 'connection',
      noteId: id,
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY
    };
    setStickies((prev) => [...prev]);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const state = dragStateRef.current;
    if (!state.type) return;

    if (state.type === 'note' && state.noteId) {
      const newX = e.clientX - (state.offsetX || 0);
      const newY = e.clientY - (state.offsetY || 0);
      setStickies((prev) =>
        prev.map((n) => (n.id === state.noteId ? { ...n, x: newX, y: newY } : n))
      );
    } else if (state.type === 'connection') {
      state.currentX = e.clientX;
      state.currentY = e.clientY;
      setStickies((prev) => [...prev]);
    }
  }, []);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    const state = dragStateRef.current;
    if (!state.type) return;

    if (state.type === 'connection' && state.noteId) {
      const noteWidth = isMobile ? 100 : 120;
      const noteHeight = isMobile ? 80 : 100;

      const targetNote = stickies.find((n) => {
        if (n.id === state.noteId) return false;
        return (
          e.clientX >= n.x &&
          e.clientX <= n.x + noteWidth &&
          e.clientY >= n.y &&
          e.clientY <= n.y + noteHeight
        );
      });

      if (targetNote) {
        const exists = connections.some(
          (c) =>
            (c.fromId === state.noteId && c.toId === targetNote.id) ||
            (c.fromId === targetNote.id && c.toId === state.noteId)
        );

        if (!exists) {
          const newConnection: Connection = {
            id: uuidv4(),
            fromId: state.noteId,
            toId: targetNote.id,
            label: '关联',
            strength: 1
          };
          setConnections((prev) => [...prev, newConnection]);
        }
      }
    }

    dragStateRef.current = { type: null };
  }, [stickies, connections, isMobile]);

  const handleCanvasDoubleClick = useCallback((e: React.MouseEvent) => {
    if (e.target !== e.currentTarget && !(e.target as HTMLElement).classList.contains('canvas-bg')) return;
    createNote(e.clientX, e.clientY);
  }, [createNote]);

  const handleUpdateLabel = useCallback((id: string, label: string) => {
    setConnections((prev) => prev.map((c) => (c.id === id ? { ...c, label } : c)));
  }, []);

  const handleSave = async () => {
    try {
      const res = await fetch('/api/stickies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stickies, connections })
      });
      const data = await res.json();
      if (data.success) {
        const link = `${window.location.origin}/#${data.id}`;
        setSavedLink(link);
        showToast('已保存！点击链接可复制');
      }
    } catch {
      showToast('保存失败，请检查服务器');
    }
  };

  const handleLoad = async () => {
    if (!loadId.trim()) {
      showToast('请输入项目ID');
      return;
    }
    try {
      const res = await fetch(`/api/stickies/${loadId.trim()}`);
      if (res.ok) {
        const data = await res.json();
        setStickies(data.stickies || []);
        setConnections(data.connections || []);
        setShowLoadModal(false);
        setLoadId('');
        showToast('加载成功');
      } else {
        showToast('未找到该项目');
      }
    } catch {
      showToast('加载失败');
    }
  };

  const handleClear = () => {
    setStickies([]);
    setConnections([]);
    setShowClearConfirm(false);
    setSavedLink(null);
    showToast('画布已清空');
  };

  const handleExportJSON = () => {
    const data = { stickies, connections, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `brainstorm-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('JSON已导出');
  };

  const handleExportPNG = async () => {
    if (!canvasRef.current) return;
    try {
      const dataUrl = await toPng(canvasRef.current, {
        pixelRatio: 2,
        backgroundColor: '#faf9f0'
      });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `brainstorm-${Date.now()}.png`;
      a.click();
      showToast('PNG已导出');
    } catch {
      showToast('导出失败');
    }
  };

  const copyLink = () => {
    if (savedLink) {
      navigator.clipboard.writeText(savedLink);
      showToast('链接已复制');
    }
  };

  const noteWidth = isMobile ? 100 : 120;
  const noteHeight = isMobile ? 80 : 100;

  const ToolbarContent = (
    <>
      <ToolbarButton onClick={handleSave} label="保存" />
      <ToolbarButton onClick={() => setShowLoadModal(true)} label="载入" />
      <ToolbarButton onClick={() => setShowClearConfirm(true)} label="清空" />
      <ToolbarButton onClick={handleExportJSON} label="导出JSON" />
      <ToolbarButton onClick={handleExportPNG} label="导出PNG" />
      <ToolbarButton
        onClick={() => setIsGraphMode(!isGraphMode)}
        label={isGraphMode ? '退出图谱' : '图谱模式'}
        active={isGraphMode}
      />
    </>
  );

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        position: 'relative',
        background: '#faf9f0'
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <style>{`
        @keyframes noteEnter {
          from { transform: scale(0.5); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes lineFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.8); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes slideDown {
          from { transform: translateY(-100%); }
          to { transform: translateY(0); }
        }
      `}</style>

      <svg
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none'
        }}
      >
        <defs>
          <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
            <path
              d="M 30 0 L 0 0 0 30"
              fill="none"
              stroke="#e5e0d5"
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
      </svg>

      <div
        ref={canvasRef}
        className="canvas-bg"
        onDoubleClick={handleCanvasDoubleClick}
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'radial-gradient(circle, #e5e0d5 1px, transparent 1px)',
          backgroundSize: '30px 30px',
          cursor: 'crosshair'
        }}
      >
        <svg
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: isGraphMode ? 'auto' : 'none',
            zIndex: isGraphMode ? 10 : 5
          }}
        >
          {connections.map((conn) => {
            const fromNote = stickies.find((s) => s.id === conn.fromId);
            const toNote = stickies.find((s) => s.id === conn.toId);
            if (!fromNote || !toNote) return null;
            return (
              <ConnectionLine
                key={conn.id}
                connection={conn}
                fromNote={fromNote}
                toNote={toNote}
                isGraphMode={isGraphMode}
                onUpdateLabel={handleUpdateLabel}
                isMobile={isMobile}
              />
            );
          })}

          {dragStateRef.current.type === 'connection' &&
            dragStateRef.current.noteId &&
            dragStateRef.current.currentX !== undefined && (
              <line
                x1={
                  (stickies.find((s) => s.id === dragStateRef.current!.noteId)?.x || 0) +
                  noteWidth / 2
                }
                y1={
                  (stickies.find((s) => s.id === dragStateRef.current!.noteId)?.y || 0) +
                  noteHeight / 2
                }
                x2={dragStateRef.current.currentX}
                y2={dragStateRef.current.currentY}
                stroke="#b8a9c9"
                strokeWidth={2}
                strokeDasharray="4,4"
                opacity={0.8}
              />
            )}

          <ForceGraph
            stickies={stickies}
            connections={connections}
            enabled={isGraphMode}
            onUpdateNotePosition={updateNote}
            isMobile={isMobile}
          />
        </svg>

        {!isGraphMode &&
          stickies.map((note) => (
            <StickyNote
              key={note.id}
              note={note}
              isGraphMode={isGraphMode}
              onUpdate={updateNote}
              onDelete={deleteNote}
              onStartDrag={handleStartDrag}
              onStartConnection={handleStartConnection}
              onDoubleClick={handleNoteDoubleClick}
              isMobile={isMobile}
            />
          ))}

        {stickies.length === 0 && !isGraphMode && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              color: '#999',
              pointerEvents: 'none'
            }}
          >
            <div
              style={{
                fontFamily: "'M PLUS Rounded 1c', sans-serif",
                fontSize: 28,
                fontWeight: 700,
                marginBottom: 12,
                color: '#6c5b7b'
              }}
            >
              灵感画布
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.8 }}>
              双击空白处创建便签
              <br />
              拖拽右下角锚点连接想法
            </div>
          </div>
        )}
      </div>

      {savedLink && (
        <div
          style={{
            position: 'fixed',
            top: isMobile || menuOpen ? 140 : 80,
            left: 20,
            right: isMobile ? 20 : 'auto',
            background: '#fff',
            padding: '10px 14px',
            borderRadius: 8,
            boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            zIndex: 100,
            animation: 'slideDown 0.3s ease-out',
            flexWrap: isMobile ? 'wrap' : 'nowrap'
          }}
        >
          <span style={{ fontSize: 12, color: '#666', whiteSpace: 'nowrap' }}>
            项目ID:
          </span>
          <code
            onClick={copyLink}
            style={{
              background: '#f0f0f0',
              padding: '2px 8px',
              borderRadius: 4,
              fontSize: 12,
              cursor: 'pointer',
              fontFamily: 'monospace',
              maxWidth: 200,
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
            title="点击复制"
          >
            {savedLink.split('#')[1]}
          </code>
          <button
            onClick={() => setSavedLink(null)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 16,
              color: '#999'
            }}
          >
            ×
          </button>
        </div>
      )}

      {!isMobile ? (
        <div
          style={{
            position: 'fixed',
            top: 16,
            left: 16,
            display: 'flex',
            gap: 8,
            zIndex: 50,
            padding: 8,
            background: '#2c3e50',
            borderRadius: 12,
            boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.05 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"
          }}
        >
          {ToolbarContent}
        </div>
      ) : (
        <>
          {menuOpen && (
            <div
              style={{
                position: 'fixed',
                top: 60,
                left: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                zIndex: 50,
                padding: 8,
                background: '#2c3e50',
                borderRadius: 12,
                boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                animation: 'fadeIn 0.2s ease-out'
              }}
            >
              {ToolbarContent}
            </div>
          )}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              position: 'fixed',
              bottom: 20,
              right: 20,
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: '#2c3e50',
              color: '#fff',
              border: 'none',
              fontSize: 24,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              zIndex: 60
            }}
          >
            ☰
          </button>
        </>
      )}

      {showLoadModal && (
        <Modal onClose={() => setShowLoadModal(false)}>
          <div style={{ textAlign: 'center' }}>
            <h3
              style={{
                fontFamily: "'M PLUS Rounded 1c', sans-serif",
                marginBottom: 16,
                color: '#2c3e50'
              }}
            >
              载入项目
            </h3>
            <input
              type="text"
              value={loadId}
              onChange={(e) => setLoadId(e.target.value)}
              placeholder="输入项目ID"
              style={{
                width: '100%',
                padding: 12,
                borderRadius: 8,
                border: '1px solid #ddd',
                fontSize: 14,
                marginBottom: 16,
                outline: 'none',
                fontFamily: 'monospace'
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleLoad()}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <ModalButton onClick={() => setShowLoadModal(false)} secondary>
                取消
              </ModalButton>
              <ModalButton onClick={handleLoad}>载入</ModalButton>
            </div>
          </div>
        </Modal>
      )}

      {showClearConfirm && (
        <Modal onClose={() => setShowClearConfirm(false)}>
          <div style={{ textAlign: 'center' }}>
            <h3
              style={{
                fontFamily: "'M PLUS Rounded 1c', sans-serif",
                marginBottom: 12,
                color: '#2c3e50'
              }}
            >
              确认清空？
            </h3>
            <p style={{ color: '#666', marginBottom: 20, fontSize: 14 }}>
              所有便签和连线将被删除，此操作不可撤销。
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <ModalButton onClick={() => setShowClearConfirm(false)} secondary>
                取消
              </ModalButton>
              <ModalButton
                onClick={handleClear}
                style={{ background: '#e74c3c' }}
              >
                清空
              </ModalButton>
            </div>
          </div>
        </Modal>
      )}

      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: isMobile ? 80 : 40,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(44, 62, 80, 0.95)',
            color: '#fff',
            padding: '10px 20px',
            borderRadius: 8,
            fontSize: 14,
            zIndex: 200,
            animation: 'fadeIn 0.2s ease-out',
            whiteSpace: 'nowrap'
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
};

const ToolbarButton: React.FC<{
  onClick: () => void;
  label: string;
  active?: boolean;
}> = ({ onClick, label, active }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '8px 16px',
        background: active ? '#5d6d7e' : '#2c3e50',
        color: '#fff',
        border: 'none',
        borderRadius: 8,
        fontSize: 13,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        filter: hovered ? 'brightness(1.15)' : 'brightness(1)',
        boxShadow: hovered ? '0 2px 8px rgba(0,0,0,0.2)' : 'none',
        transform: hovered ? 'translateY(-1px)' : 'translateY(0)',
        fontFamily: "'M PLUS Rounded 1c', sans-serif",
        fontWeight: 500,
        whiteSpace: 'nowrap'
      }}
    >
      {label}
    </button>
  );
};

const Modal: React.FC<{
  children: React.ReactNode;
  onClose: () => void;
}> = ({ children, onClose }) => (
  <div
    onClick={onClose}
    style={{
      position: 'fixed',
      inset: 0,
      background: '#00000080',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 150,
      animation: 'fadeIn 0.2s ease-out'
    }}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        background: '#fff',
        padding: 28,
        borderRadius: 16,
        minWidth: 320,
        maxWidth: '90vw',
        boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
        animation: 'scaleIn 0.25s ease-out'
      }}
    >
      {children}
    </div>
  </div>
);

const ModalButton: React.FC<{
  children: React.ReactNode;
  onClick: () => void;
  secondary?: boolean;
  style?: React.CSSProperties;
}> = ({ children, onClick, secondary, style }) => (
  <button
    onClick={onClick}
    style={{
      padding: '8px 20px',
      background: secondary ? '#ecf0f1' : '#2c3e50',
      color: secondary ? '#666' : '#fff',
      border: 'none',
      borderRadius: 8,
      fontSize: 13,
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      fontFamily: "'M PLUS Rounded 1c', sans-serif",
      fontWeight: 500,
      ...style
    }}
  >
    {children}
  </button>
);

export default App;
