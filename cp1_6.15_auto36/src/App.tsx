import React, { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import Canvas from './components/Canvas';
import Toolbar from './components/Toolbar';
import { Tool, Shape, User, Point, HistoryState, Toast, ToastType } from './types';
import { mockUsers, colorPalette } from './mock/data';

const App: React.FC = () => {
  const [tool, setTool] = useState<Tool>('select');
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [fillColor, setFillColor] = useState('#4fc3f7');
  const [strokeColor, setStrokeColor] = useState('#ffffff');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showClearModal, setShowClearModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [nextZIndex, setNextZIndex] = useState(10);
  const [animating, setAnimating] = useState(false);
  const [clearAnimating, setClearAnimating] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const currentUserRef = useRef<User>(mockUsers[0]);

  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const MAX_HISTORY = 50;

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = uuidv4();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, message: '', type: 'info' } : t)));
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 300);
    }, 2000);
  }, []);

  const pushHistory = useCallback((newShapes: Shape[]) => {
    setHistory((prev) => {
      const trimmed = prev.slice(0, historyIndex + 1);
      const next = [...trimmed, { shapes: JSON.parse(JSON.stringify(newShapes)) }];
      if (next.length > MAX_HISTORY) {
        next.shift();
        return next;
      }
      return next;
    });
    setHistoryIndex((prev) => Math.min(prev + 1, MAX_HISTORY - 1));
  }, [historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex <= 0) {
      showToast('没有可撤销的操作', 'info');
      return;
    }
    const newIndex = historyIndex - 1;
    const prevState = history[newIndex];
    setHistoryIndex(newIndex);
    setAnimating(true);
    setShapes(JSON.parse(JSON.stringify(prevState.shapes)));
    setTimeout(() => setAnimating(false), 200);
    showToast('撤销成功', 'success');
  }, [history, historyIndex, showToast]);

  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) {
      showToast('没有可重做的操作', 'info');
      return;
    }
    const newIndex = historyIndex + 1;
    const nextState = history[newIndex];
    setHistoryIndex(newIndex);
    setAnimating(true);
    setShapes(JSON.parse(JSON.stringify(nextState.shapes)));
    setTimeout(() => setAnimating(false), 200);
    showToast('重做成功', 'success');
  }, [history, historyIndex, showToast]);

  const handleShapesChange = useCallback(
    (newShapes: Shape[], recordHistory = true) => {
      setShapes(newShapes);
      if (recordHistory) {
        pushHistory(newShapes);
      }
    },
    [pushHistory]
  );

  const handleClearCanvas = useCallback(() => {
    setShowClearModal(false);
    setClearAnimating(true);
    setTimeout(() => {
      handleShapesChange([]);
      setClearAnimating(false);
      setSelectedIds([]);
      if (socketRef.current) {
        socketRef.current.emit('clear-canvas', { userId: currentUserRef.current.id });
      }
      showToast('画布已清空', 'success');
    }, 300);
  }, [handleShapesChange, showToast]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        redo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds.length > 0 && document.activeElement?.tagName !== 'TEXTAREA' && document.activeElement?.tagName !== 'INPUT') {
          e.preventDefault();
          const newShapes = shapes.filter((s) => !selectedIds.includes(s.id));
          handleShapesChange(newShapes);
          if (socketRef.current) {
            socketRef.current.emit('delete-shapes', { ids: selectedIds, userId: currentUserRef.current.id });
          }
          setSelectedIds([]);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, selectedIds, shapes, handleShapesChange]);

  useEffect(() => {
    fetch('/api/shapes')
      .then((r) => r.json())
      .then((data) => {
        setShapes(data.shapes);
        setNextZIndex(data.nextZIndex);
        pushHistory(data.shapes);
      })
      .catch(() => {
        import('./mock/data').then(({ initialShapes }) => {
          setShapes(initialShapes);
          setNextZIndex(initialShapes.length + 1);
          pushHistory(initialShapes);
        });
      });
  }, [pushHistory]);

  useEffect(() => {
    try {
      const socket = io('http://localhost:3001', {
        transports: ['websocket', 'polling'],
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('Connected to socket server');
      });

      socket.on('shape-drawn', (data: { shape: Shape }) => {
        setShapes((prev) => {
          const idx = prev.findIndex((s) => s.id === data.shape.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = { ...data.shape, isRemote: true };
            return next;
          }
          return [...prev, { ...data.shape, isRemote: true }];
        });
      });

      socket.on('shape-updated', (data: { id: string; updates: Partial<Shape> }) => {
        setShapes((prev) =>
          prev.map((s) => (s.id === data.id ? { ...s, ...data.updates, isRemote: true } : s))
        );
      });

      socket.on('batch-updated', (data: { updates: { id: string; updates: Partial<Shape> }[] }) => {
        setShapes((prev) => {
          const map = new Map(data.updates.map((u) => [u.id, u.updates]));
          return prev.map((s) => (map.has(s.id) ? { ...s, ...(map.get(s.id) as Partial<Shape>), isRemote: true } : s));
        });
      });

      socket.on('shapes-deleted', (data: { ids: string[] }) => {
        setShapes((prev) => prev.filter((s) => !data.ids.includes(s.id)));
      });

      socket.on('canvas-cleared', () => {
        setClearAnimating(true);
        setTimeout(() => {
          setShapes([]);
          setClearAnimating(false);
          setSelectedIds([]);
        }, 300);
      });

      socket.on('cursor-updated', (data: { userId: string; position: Point }) => {
        setUsers((prev) =>
          prev.map((u) => (u.id === data.userId ? { ...u, cursor: data.position, isOnline: true } : u))
        );
      });

      socket.on('user-list-update', (data: { users: User[] }) => {
        setUsers(data.users);
      });

      socket.on('disconnect', () => {
        console.log('Disconnected from socket server');
      });

      const interval = setInterval(() => {
        const onlineUsers = users.filter((u) => u.isOnline && u.id !== 'user-1');
        if (onlineUsers.length > 0) {
          setUsers((prev) =>
            prev.map((u) => {
              if (u.id !== 'user-1' && u.isOnline) {
                return {
                  ...u,
                  cursor: {
                    x: u.cursor.x + (Math.random() - 0.5) * 60,
                    y: u.cursor.y + (Math.random() - 0.5) * 60,
                  },
                };
              }
              return u;
            })
          );
        }
      }, 100);

      return () => {
        clearInterval(interval);
        socket.disconnect();
      };
    } catch (e) {
      console.log('Socket connection failed, running in local mode');
    }
  }, [users]);

  const emitShape = useCallback(
    (shape: Shape) => {
      if (socketRef.current) {
        socketRef.current.emit('draw', { shape, userId: currentUserRef.current.id });
      }
    },
    []
  );

  const emitUpdate = useCallback((id: string, updates: Partial<Shape>) => {
    if (socketRef.current) {
      socketRef.current.emit('update-shape', { id, updates, userId: currentUserRef.current.id });
    }
  }, []);

  const emitBatchUpdate = useCallback((updates: { id: string; updates: Partial<Shape> }[]) => {
    if (socketRef.current) {
      socketRef.current.emit('batch-update', {
        updates: updates.map((u) => ({ ...u, userId: currentUserRef.current.id })),
      });
    }
  }, []);

  const emitDelete = useCallback((ids: string[]) => {
    if (socketRef.current) {
      socketRef.current.emit('delete-shapes', { ids, userId: currentUserRef.current.id });
    }
  }, []);

  const emitCursorMove = useCallback((position: Point) => {
    if (socketRef.current) {
      socketRef.current.emit('cursor-move', { userId: currentUserRef.current.id, position });
    }
  }, []);

  const getNextZIndex = useCallback(() => {
    const z = nextZIndex;
    setNextZIndex((n) => n + 1);
    return z;
  }, [nextZIndex]);

  return (
    <div className="app">
      <Toolbar
        tool={tool}
        onToolChange={setTool}
        fillColor={fillColor}
        onFillColorChange={setFillColor}
        strokeColor={strokeColor}
        onStrokeColorChange={setStrokeColor}
        strokeWidth={strokeWidth}
        onStrokeWidthChange={setStrokeWidth}
        onUndo={undo}
        onRedo={redo}
        onExport={() => setShowExportModal(true)}
        onClear={() => setShowClearModal(true)}
        onToggleSidebar={() => setMobileSidebarOpen((s) => !s)}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
      />

      <div className="main-content">
        <div className="canvas-container" id="canvas-container">
          <Canvas
            tool={tool}
            shapes={shapes}
            onShapesChange={handleShapesChange}
            selectedIds={selectedIds}
            onSelectedIdsChange={setSelectedIds}
            fillColor={fillColor}
            strokeColor={strokeColor}
            strokeWidth={strokeWidth}
            users={users.filter((u) => u.isOnline && u.id !== 'user-1')}
            onCursorMove={emitCursorMove}
            onShapeCreated={emitShape}
            onShapeUpdated={emitUpdate}
            onBatchUpdate={emitBatchUpdate}
            onShapesDeleted={emitDelete}
            getNextZIndex={getNextZIndex}
            animating={animating}
            clearAnimating={clearAnimating}
            showToast={showToast}
            exportMode={showExportModal}
          />
        </div>

        <button
          className={`sidebar-toggle ${sidebarCollapsed ? 'hidden' : ''}`}
          onClick={() => setSidebarCollapsed((c) => !c)}
        >
          {sidebarCollapsed ? '◀' : '▶'}
        </button>

        <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${mobileSidebarOpen ? 'mobile-open' : ''}`}>
          <div className="sidebar-header">
            <span>用户与属性</span>
            <button
              className="tool-btn"
              style={{ width: 28, height: 28, fontSize: 14 }}
              onClick={() => {
                setSidebarCollapsed(true);
                setMobileSidebarOpen(false);
              }}
            >
              ×
            </button>
          </div>

          <div className="user-list">
            <div className="prop-label" style={{ marginBottom: 8 }}>
              在线用户 ({users.filter((u) => u.isOnline).length})
            </div>
            {users.map((user) => (
              <div key={user.id} className="user-item">
                <div className="user-avatar" style={{ backgroundColor: user.color }}>
                  {user.name.slice(0, 1)}
                </div>
                <div className="user-info">
                  <div className="user-name">{user.name}</div>
                  <div className="user-status">
                    <span className={`status-dot ${!user.isOnline ? 'offline' : ''}`} />
                    {user.isOnline ? '在线' : '离线'}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="properties-panel">
            <div className="prop-label" style={{ marginBottom: 8 }}>
              属性编辑
            </div>
            {selectedIds.length === 0 ? (
              <div className="empty-prop">请选择一个图形进行编辑</div>
            ) : (
              <PropertiesEditor
                shapes={shapes}
                selectedIds={selectedIds}
                onUpdate={(id, updates) => {
                  const newShapes = shapes.map((s) => (s.id === id ? { ...s, ...updates } : s));
                  handleShapesChange(newShapes);
                  emitUpdate(id, updates);
                }}
                onMoveUp={() => {
                  const sorted = [...shapes].sort((a, b) => a.zIndex - b.zIndex);
                  const newShapes = [...shapes];
                  selectedIds.forEach((id) => {
                    const idx = sorted.findIndex((s) => s.id === id);
                    if (idx < sorted.length - 1) {
                      const swap = sorted[idx + 1];
                      const si = newShapes.findIndex((s) => s.id === id);
                      const sw = newShapes.findIndex((s) => s.id === swap.id);
                      if (si >= 0 && sw >= 0) {
                        const temp = newShapes[si].zIndex;
                        newShapes[si] = { ...newShapes[si], zIndex: newShapes[sw].zIndex };
                        newShapes[sw] = { ...newShapes[sw], zIndex: temp };
                      }
                    }
                  });
                  handleShapesChange(newShapes);
                  emitBatchUpdate(
                    newShapes
                      .filter((s) => selectedIds.includes(s.id))
                      .map((s) => ({ id: s.id, updates: { zIndex: s.zIndex } }))
                  );
                }}
                onMoveDown={() => {
                  const sorted = [...shapes].sort((a, b) => a.zIndex - b.zIndex);
                  const newShapes = [...shapes];
                  [...selectedIds].reverse().forEach((id) => {
                    const idx = sorted.findIndex((s) => s.id === id);
                    if (idx > 0) {
                      const swap = sorted[idx - 1];
                      const si = newShapes.findIndex((s) => s.id === id);
                      const sw = newShapes.findIndex((s) => s.id === swap.id);
                      if (si >= 0 && sw >= 0) {
                        const temp = newShapes[si].zIndex;
                        newShapes[si] = { ...newShapes[si], zIndex: newShapes[sw].zIndex };
                        newShapes[sw] = { ...newShapes[sw], zIndex: temp };
                      }
                    }
                  });
                  handleShapesChange(newShapes);
                  emitBatchUpdate(
                    newShapes
                      .filter((s) => selectedIds.includes(s.id))
                      .map((s) => ({ id: s.id, updates: { zIndex: s.zIndex } }))
                  );
                }}
                onBringToFront={() => {
                  let z = nextZIndex;
                  const newShapes = shapes.map((s) => {
                    if (selectedIds.includes(s.id)) {
                      return { ...s, zIndex: z++ };
                    }
                    return s;
                  });
                  setNextZIndex(z);
                  handleShapesChange(newShapes);
                  emitBatchUpdate(
                    newShapes
                      .filter((s) => selectedIds.includes(s.id))
                      .map((s) => ({ id: s.id, updates: { zIndex: s.zIndex } }))
                  );
                }}
              />
            )}
          </div>
        </aside>
      </div>

      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.type} ${!toast.message ? 'leaving' : ''}`}>
            {toast.message || ' '}
          </div>
        ))}
      </div>

      {showClearModal && (
        <div className="modal-overlay" onClick={() => setShowClearModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">确认清空画布</div>
            <div className="modal-message">此操作将删除画布上所有图形，且无法撤销。确定要继续吗？</div>
            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={() => setShowClearModal(false)}>
                取消
              </button>
              <button className="modal-btn confirm" onClick={handleClearCanvas}>
                确认清空
              </button>
            </div>
          </div>
        </div>
      )}

      {showExportModal && (
        <ExportModal
          onClose={() => setShowExportModal(false)}
          onExport={(bgType) => {
            const svg = document.querySelector('.svg-canvas') as SVGSVGElement;
            if (!svg) return;

            const rect = getBoundingRect(shapes);
            const padding = 40;
            const w = Math.max(rect.maxX - rect.minX + padding * 2, 400);
            const h = Math.max(rect.maxY - rect.minY + padding * 2, 300);

            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d')!;

            if (bgType === 'white') {
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, w, h);
            }

            const svgData = new XMLSerializer().serializeToString(svg);
            const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(svgBlob);

            const img = new Image();
            img.onload = () => {
              ctx.drawImage(img, -rect.minX + padding, -rect.minY + padding);
              URL.revokeObjectURL(url);

              const link = document.createElement('a');
              link.download = `whiteboard-${Date.now()}.png`;
              link.href = canvas.toDataURL('image/png');
              link.click();

              setShowExportModal(false);
              showToast('导出成功', 'success');
            };
            img.src = url;
          }}
        />
      )}
    </div>
  );
};

function getBoundingRect(shapes: Shape[]) {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  shapes.forEach((s) => {
    if (s.type === 'rectangle' || s.type === 'sticky') {
      minX = Math.min(minX, s.x);
      minY = Math.min(minY, s.y);
      maxX = Math.max(maxX, s.x + s.width);
      maxY = Math.max(maxY, s.y + s.height);
    } else if (s.type === 'circle') {
      minX = Math.min(minX, s.x - s.radiusX);
      minY = Math.min(minY, s.y - s.radiusY);
      maxX = Math.max(maxX, s.x + s.radiusX);
      maxY = Math.max(maxY, s.y + s.radiusY);
    } else if (s.type === 'pen') {
      s.points.forEach((p) => {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      });
    }
  });
  if (!isFinite(minX)) {
    return { minX: 0, minY: 0, maxX: 500, maxY: 400 };
  }
  return { minX, minY, maxX, maxY };
}

interface ExportModalProps {
  onClose: () => void;
  onExport: (bgType: 'transparent' | 'white') => void;
}

const ExportModal: React.FC<ExportModalProps> = ({ onClose, onExport }) => {
  const [bgType, setBgType] = useState<'transparent' | 'white'>('transparent');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">导出画布为PNG</div>
        <div className="prop-label">背景选项</div>
        <div className="export-options">
          <button
            className={`export-option ${bgType === 'transparent' ? 'selected' : ''}`}
            onClick={() => setBgType('transparent')}
          >
            透明背景
          </button>
          <button
            className={`export-option ${bgType === 'white' ? 'selected' : ''}`}
            onClick={() => setBgType('white')}
          >
            白色背景
          </button>
        </div>
        <div className="modal-actions">
          <button className="modal-btn cancel" onClick={onClose}>
            取消
          </button>
          <button className="modal-btn confirm" style={{ backgroundColor: 'var(--primary-color)', color: '#121212' }} onClick={() => onExport(bgType)}>
            开始导出
          </button>
        </div>
      </div>
    </div>
  );
};

interface PropertiesEditorProps {
  shapes: Shape[];
  selectedIds: string[];
  onUpdate: (id: string, updates: Partial<Shape>) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onBringToFront: () => void;
}

const PropertiesEditor: React.FC<PropertiesEditorProps> = ({
  shapes,
  selectedIds,
  onUpdate,
  onMoveUp,
  onMoveDown,
  onBringToFront,
}) => {
  const selectedShapes = shapes.filter((s) => selectedIds.includes(s.id));
  if (selectedShapes.length === 0) return null;

  const first = selectedShapes[0];
  const allSameFill = selectedShapes.every((s) => s.fillColor === first.fillColor);
  const allSameStroke = selectedShapes.every((s) => s.strokeColor === first.strokeColor);
  const allSameStrokeW = selectedShapes.every((s) => s.strokeWidth === first.strokeWidth);
  const allSameOpacity = selectedShapes.every((s) => s.opacity === first.opacity);

  const applyAll = (updates: Partial<Shape>) => {
    selectedIds.forEach((id) => onUpdate(id, updates));
  };

  return (
    <div>
      <div className="prop-section">
        <div className="prop-label">填充颜色</div>
        <div className="color-palette">
          {colorPalette.map((color: string) => (
            <div
              key={color}
              className="color-swatch"
              style={{ backgroundColor: color, borderColor: allSameFill && first.fillColor === color ? 'var(--primary-color)' : undefined }}
              onClick={() => applyAll({ fillColor: color })}
            />
          ))}
          <label className="color-swatch custom" style={{ background: 'linear-gradient(45deg, #f44336, #2196f3, #4caf50)' }}>
            <input
              type="color"
              style={{ width: 0, height: 0, opacity: 0, position: 'absolute' }}
              value={allSameFill && first.fillColor !== 'transparent' ? first.fillColor : '#ffffff'}
              onChange={(e) => applyAll({ fillColor: e.target.value })}
            />
          </label>
          <div
            className="color-swatch"
            style={{
              backgroundColor: 'transparent',
              backgroundImage: 'linear-gradient(45deg, #555 25%, transparent 25%), linear-gradient(-45deg, #555 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #555 75%), linear-gradient(-45deg, transparent 75%, #555 75%)',
              backgroundSize: '8px 8px',
              backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px',
              borderColor: first.fillColor === 'transparent' ? 'var(--primary-color)' : undefined,
            }}
            onClick={() => applyAll({ fillColor: 'transparent' })}
            title="无填充"
          />
        </div>
      </div>

      <div className="prop-section">
        <div className="prop-label">边框颜色</div>
        <div className="color-palette">
          {colorPalette.map((color: string) => (
            <div
              key={color}
              className="color-swatch"
              style={{ backgroundColor: color, borderColor: allSameStroke && first.strokeColor === color ? 'var(--primary-color)' : undefined }}
              onClick={() => applyAll({ strokeColor: color })}
            />
          ))}
          <label className="color-swatch custom" style={{ background: 'linear-gradient(45deg, #f44336, #2196f3, #4caf50)' }}>
            <input
              type="color"
              style={{ width: 0, height: 0, opacity: 0, position: 'absolute' }}
              value={allSameStroke ? first.strokeColor : '#ffffff'}
              onChange={(e) => applyAll({ strokeColor: e.target.value })}
            />
          </label>
        </div>
      </div>

      <div className="prop-section">
        <div className="prop-label">
          边框粗细 <span className="slider-value">{allSameStrokeW ? first.strokeWidth : '-'}</span>
        </div>
        <div className="slider-wrapper" style={{ padding: 0 }}>
          <input
            type="range"
            min="1"
            max="10"
            step="1"
            value={allSameStrokeW ? first.strokeWidth : 3}
            onChange={(e) => applyAll({ strokeWidth: Number(e.target.value) })}
            style={{ width: '100%' }}
          />
        </div>
      </div>

      <div className="prop-section">
        <div className="prop-label">
          透明度 <span className="slider-value">{allSameOpacity ? Math.round(first.opacity * 100) : '-'}%</span>
        </div>
        <div className="slider-wrapper" style={{ padding: 0 }}>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.05"
            value={allSameOpacity ? first.opacity : 1}
            onChange={(e) => applyAll({ opacity: Number(e.target.value) })}
            style={{ width: '100%' }}
          />
        </div>
      </div>

      <div className="prop-section">
        <div className="prop-label">图层顺序</div>
        <div className="layer-buttons">
          <button className="layer-btn" onClick={onMoveDown}>下移</button>
          <button className="layer-btn" onClick={onMoveUp}>上移</button>
          <button className="layer-btn" onClick={onBringToFront}>置顶</button>
        </div>
      </div>
    </div>
  );
};

export default App;
