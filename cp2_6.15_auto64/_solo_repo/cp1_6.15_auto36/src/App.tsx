import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import Canvas from './components/Canvas';
import Toolbar from './components/Toolbar';
import { Tool, Shape, User, Point, HistoryState, Toast, ToastType, RectangleShape, CircleShape, StickyShape } from './types';
import { mockUsers, colorPalette } from './mock/data';
import { TrashIcon, UndoIcon, RedoIcon, DownloadIcon } from './components/Icons';

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
  const [exportMode, setExportMode] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const currentUserRef = useRef<User>(mockUsers[0]);
  const historyIndexRef = useRef(-1);
  const initializedRef = useRef(false);

  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const MAX_HISTORY = 50;

  useEffect(() => {
    historyIndexRef.current = historyIndex;
  }, [historyIndex]);

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
    const currentIndex = historyIndexRef.current;
    setHistory((prev) => {
      const trimmed = prev.slice(0, currentIndex + 1);
      const next = [...trimmed, { shapes: JSON.parse(JSON.stringify(newShapes)) }];
      while (next.length > MAX_HISTORY) {
        next.shift();
      }
      return next;
    });
    setHistoryIndex((prev) => {
      const newIdx = Math.min(prev + 1, MAX_HISTORY - 1);
      historyIndexRef.current = newIdx;
      return newIdx;
    });
  }, []);

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
      const newShapes: Shape[] = [];
      handleShapesChange(newShapes);
      setClearAnimating(false);
      setSelectedIds([]);
      setNextZIndex(1);
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
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' && e.shiftKey)) {
        e.preventDefault();
        redo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length > 0) {
        const tag = (document.activeElement?.tagName || '').toLowerCase();
        if (tag !== 'textarea' && tag !== 'input') {
          e.preventDefault();
          const newShapes = shapes.filter((s) => !selectedIds.includes(s.id));
          handleShapesChange(newShapes);
          if (socketRef.current) {
            socketRef.current.emit('delete-shapes', { ids: selectedIds, userId: currentUserRef.current.id });
          }
          setSelectedIds([]);
        }
      }
      const tag = (document.activeElement?.tagName || '').toLowerCase();
      if (tag === 'textarea' || tag === 'input') return;
      switch (e.key.toLowerCase()) {
        case 'v':
          setTool('select');
          break;
        case 'p':
          setTool('pen');
          break;
        case 'r':
          setTool('rectangle');
          break;
        case 'c':
          setTool('circle');
          break;
        case 't':
          setTool('sticky');
          break;
        case 'e':
          setTool('eraser');
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, selectedIds, shapes, handleShapesChange]);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

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
      const socket = io('http://localhost:3002', {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('[Socket] Connected to collaboration server');
      });

      socket.on('user-joined', (data: { user: User; allUsers: User[] }) => {
        currentUserRef.current = data.user;
        setUsers(data.allUsers);
      });

      socket.on('shape-drawn', (data: { shape: Shape }) => {
        setShapes((prev) => {
          const idx = prev.findIndex((s) => s.id === data.shape.id);
          const remoteShape = { ...data.shape, isRemote: true };
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = remoteShape;
            return next;
          }
          return [...prev, remoteShape];
        });
      });

      socket.on('shape-updated', (data: { id: string; updates: Partial<Shape> }) => {
        setShapes((prev) =>
          prev.map((s) => (s.id === data.id ? { ...s, ...data.updates, isRemote: true } : s))
        );
      });

      socket.on('batch-updated', (data: { updates: { id: string; updates: Partial<Shape> }[] }) => {
        setShapes((prev) => {
          const updateMap = new Map(data.updates.map((u) => [u.id, u.updates]));
          return prev.map((s) => (updateMap.has(s.id) ? { ...s, ...(updateMap.get(s.id) as Partial<Shape>), isRemote: true } : s));
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
          setNextZIndex(1);
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
        console.log('[Socket] Disconnected from server');
      });

      const simulateInterval = setInterval(() => {
        setUsers((prev) =>
          prev.map((u) => {
            if (u.id === 'user-1') return u;
            if (!u.isOnline) return u;
            return {
              ...u,
              cursor: {
                x: Math.max(50, Math.min(1500, u.cursor.x + (Math.random() - 0.5) * 50)),
                y: Math.max(50, Math.min(1000, u.cursor.y + (Math.random() - 0.5) * 50)),
              },
            };
          })
        );
      }, 90);

      return () => {
        clearInterval(simulateInterval);
        socket.disconnect();
      };
    } catch (e) {
      console.log('[Socket] Running in local-only mode');
    }
  }, []);

  const emitShape = useCallback((shape: Shape) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('draw', { shape, userId: currentUserRef.current.id });
    }
  }, []);

  const emitUpdate = useCallback((id: string, updates: Partial<Shape>) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('update-shape', { id, updates, userId: currentUserRef.current.id });
    }
  }, []);

  const emitBatchUpdate = useCallback((updates: { id: string; updates: Partial<Shape> }[]) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('batch-update', {
        updates: updates.map((u) => ({ ...u, userId: currentUserRef.current.id })),
      });
    }
  }, []);

  const emitDelete = useCallback((ids: string[]) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('delete-shapes', { ids, userId: currentUserRef.current.id });
    }
  }, []);

  const emitCursorMove = useCallback((position: Point) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('cursor-move', { userId: currentUserRef.current.id, position });
    }
  }, []);

  const getNextZIndex = useCallback(() => {
    const z = nextZIndex;
    setNextZIndex((n) => n + 1);
    return z;
  }, [nextZIndex]);

  const handleUpdateShape = useCallback(
    (id: string, updates: Partial<Shape>) => {
      const newShapes = shapes.map((s) => (s.id === id ? { ...s, ...updates } : s));
      handleShapesChange(newShapes);
      emitUpdate(id, updates);
    },
    [shapes, handleShapesChange, emitUpdate]
  );

  const handleLayerMoveUp = useCallback(() => {
    if (selectedIds.length === 0) return;
    const sorted = [...shapes].sort((a, b) => a.zIndex - b.zIndex);
    const newShapes = [...shapes];
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (selectedIds.includes(sorted[i].id)) {
        if (i < sorted.length - 1) {
          const swapId = sorted[i + 1].id;
          const i1 = newShapes.findIndex((s) => s.id === sorted[i].id);
          const i2 = newShapes.findIndex((s) => s.id === swapId);
          if (i1 >= 0 && i2 >= 0) {
            const tmp = newShapes[i1].zIndex;
            newShapes[i1] = { ...newShapes[i1], zIndex: newShapes[i2].zIndex };
            newShapes[i2] = { ...newShapes[i2], zIndex: tmp };
          }
        }
      }
    }
    handleShapesChange(newShapes);
    emitBatchUpdate(
      newShapes
        .filter((s) => selectedIds.includes(s.id))
        .map((s) => ({ id: s.id, updates: { zIndex: s.zIndex } }))
    );
    showToast('图层已上移', 'success');
  }, [shapes, selectedIds, handleShapesChange, emitBatchUpdate, showToast]);

  const handleLayerMoveDown = useCallback(() => {
    if (selectedIds.length === 0) return;
    const sorted = [...shapes].sort((a, b) => a.zIndex - b.zIndex);
    const newShapes = [...shapes];
    for (let i = 0; i < sorted.length; i++) {
      if (selectedIds.includes(sorted[i].id)) {
        if (i > 0) {
          const swapId = sorted[i - 1].id;
          const i1 = newShapes.findIndex((s) => s.id === sorted[i].id);
          const i2 = newShapes.findIndex((s) => s.id === swapId);
          if (i1 >= 0 && i2 >= 0) {
            const tmp = newShapes[i1].zIndex;
            newShapes[i1] = { ...newShapes[i1], zIndex: newShapes[i2].zIndex };
            newShapes[i2] = { ...newShapes[i2], zIndex: tmp };
          }
        }
      }
    }
    handleShapesChange(newShapes);
    emitBatchUpdate(
      newShapes
        .filter((s) => selectedIds.includes(s.id))
        .map((s) => ({ id: s.id, updates: { zIndex: s.zIndex } }))
    );
    showToast('图层已下移', 'success');
  }, [shapes, selectedIds, handleShapesChange, emitBatchUpdate, showToast]);

  const handleLayerBringToFront = useCallback(() => {
    if (selectedIds.length === 0) return;
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
    showToast('图层已置顶', 'success');
  }, [shapes, selectedIds, nextZIndex, handleShapesChange, emitBatchUpdate, showToast]);

  const handleLayerSendToBack = useCallback(() => {
    if (selectedIds.length === 0) return;
    let z = -selectedIds.length;
    const newShapes = shapes.map((s) => {
      if (selectedIds.includes(s.id)) {
        return { ...s, zIndex: z++ };
      }
      return s;
    });
    handleShapesChange(newShapes);
    emitBatchUpdate(
      newShapes
        .filter((s) => selectedIds.includes(s.id))
        .map((s) => ({ id: s.id, updates: { zIndex: s.zIndex } }))
    );
    showToast('图层已置底', 'success');
  }, [shapes, selectedIds, handleShapesChange, emitBatchUpdate, showToast]);

  const handleExport = useCallback(
    (bgType: 'transparent' | 'white') => {
      setExportMode(true);

      setTimeout(() => {
        try {
          const svg = document.querySelector('.svg-canvas') as SVGSVGElement | null;
          if (!svg || shapes.length === 0) {
            showToast('画布为空，无需导出', 'info');
            setExportMode(false);
            return;
          }

          const bounds = getShapesBounds(shapes);
          const padding = 40;
          const totalW = Math.max(bounds.maxX - bounds.minX + padding * 2, 400);
          const totalH = Math.max(bounds.maxY - bounds.minY + padding * 2, 300);

          const svgClone = svg.cloneNode(true) as SVGSVGElement;
          const selectionBoxes = svgClone.querySelectorAll('.selection-box, .selection-handle');
          selectionBoxes.forEach((el) => el.remove());
          svgClone.setAttribute('width', String(10000));
          svgClone.setAttribute('height', String(10000));
          svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

          const serializer = new XMLSerializer();
          const svgString = serializer.serializeToString(svgClone);
          const svgBlob = new Blob(['<?xml version="1.0" standalone="no"?>\r\n' + svgString], {
            type: 'image/svg+xml;charset=utf-8',
          });
          const url = URL.createObjectURL(svgBlob);

          const canvas = document.createElement('canvas');
          const dpr = window.devicePixelRatio || 2;
          canvas.width = Math.ceil(totalW * dpr);
          canvas.height = Math.ceil(totalH * dpr);
          const ctx = canvas.getContext('2d')!;
          ctx.scale(dpr, dpr);

          if (bgType === 'white') {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, totalW, totalH);
          }

          const img = new Image();
          img.onload = () => {
            try {
              ctx.drawImage(img, -bounds.minX + padding, -bounds.minY + padding);
              URL.revokeObjectURL(url);

              const dataUrl = canvas.toDataURL('image/png');
              const a = document.createElement('a');
              a.href = dataUrl;
              a.download = `whiteboard-${Date.now()}.png`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);

              setShowExportModal(false);
              setExportMode(false);
              showToast('导出成功！', 'success');
            } catch (err) {
              console.error('Export draw failed:', err);
              URL.revokeObjectURL(url);
              setExportMode(false);
              showToast('导出失败，请重试', 'error');
            }
          };
          img.onerror = () => {
            console.error('Image load failed');
            URL.revokeObjectURL(url);
            setExportMode(false);
            showToast('导出失败，浏览器不支持该格式', 'error');
          };
          img.src = url;
        } catch (err) {
          console.error('Export error:', err);
          setExportMode(false);
          showToast('导出过程发生错误', 'error');
        }
      }, 150);
    },
    [shapes, showToast]
  );

  const onlineUsers = useMemo(() => users.filter((u) => u.isOnline && u.id !== 'user-1'), [users]);

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
            users={onlineUsers}
            onCursorMove={emitCursorMove}
            onShapeCreated={emitShape}
            onShapeUpdated={emitUpdate}
            onBatchUpdate={emitBatchUpdate}
            onShapesDeleted={emitDelete}
            getNextZIndex={getNextZIndex}
            animating={animating}
            clearAnimating={clearAnimating}
            showToast={showToast}
            exportMode={exportMode}
          />
        </div>

        <button
          className={`sidebar-toggle ${sidebarCollapsed ? 'hidden' : ''}`}
          onClick={() => setSidebarCollapsed((c) => !c)}
          title={sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'}
        >
          {sidebarCollapsed ? '◀' : '▶'}
        </button>

        <aside
          className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${
            mobileSidebarOpen ? 'mobile-open' : ''
          }`}
        >
          <div className="sidebar-header">
            <span>协作面板</span>
            <button
              className="tool-btn"
              style={{ width: 28, height: 28, fontSize: 18 }}
              onClick={() => {
                setSidebarCollapsed(true);
                setMobileSidebarOpen(false);
              }}
              title="关闭"
            >
              ×
            </button>
          </div>

          <div className="user-list">
            <div className="prop-label" style={{ marginBottom: 8, fontWeight: 600 }}>
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
            <div className="prop-label" style={{ marginBottom: 8, fontWeight: 600 }}>
              属性编辑
            </div>
            {selectedIds.length === 0 ? (
              <div className="empty-prop">
                <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.4 }}>🎨</div>
                请选择一个图形<br />进行属性编辑
              </div>
            ) : (
              <PropertiesEditor
                shapes={shapes}
                selectedIds={selectedIds}
                onUpdate={handleUpdateShape}
                onMoveUp={handleLayerMoveUp}
                onMoveDown={handleLayerMoveDown}
                onBringToFront={handleLayerBringToFront}
                onSendToBack={handleLayerSendToBack}
              />
            )}
          </div>
        </aside>
      </div>

      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.type} ${!toast.message ? 'leaving' : ''}`}>
            {toast.message || '\u00A0'}
          </div>
        ))}
      </div>

      {showClearModal && (
        <div className="modal-overlay" onClick={() => setShowClearModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrashIcon size={20} />
              确认清空画布
            </div>
            <div className="modal-message">
              此操作将永久删除画布上所有图形（包含 {shapes.length} 个元素），且不能通过撤销恢复。确定要继续吗？
            </div>
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
        <ExportModal onClose={() => setShowExportModal(false)} onExport={handleExport} />
      )}
    </div>
  );
};

function getShapesBounds(shapes: Shape[]) {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  shapes.forEach((s) => {
    if (s.type === 'rectangle' || s.type === 'sticky') {
      const b = { x: s.x, y: s.y, w: s.width, h: s.height };
      minX = Math.min(minX, b.x);
      minY = Math.min(minY, b.y);
      maxX = Math.max(maxX, b.x + b.w);
      maxY = Math.max(maxY, b.y + b.h);
    } else if (s.type === 'circle') {
      const b = { x: s.x - s.radiusX, y: s.y - s.radiusY, w: s.radiusX * 2, h: s.radiusY * 2 };
      minX = Math.min(minX, b.x);
      minY = Math.min(minY, b.y);
      maxX = Math.max(maxX, b.x + b.w);
      maxY = Math.max(maxY, b.y + b.h);
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
  const [exporting, setExporting] = useState(false);

  const doExport = () => {
    setExporting(true);
    setTimeout(() => {
      onExport(bgType);
    }, 50);
  };

  return (
    <div className="modal-overlay" onClick={!exporting ? onClose : undefined}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <DownloadIcon size={20} />
          导出画布为 PNG 图片
        </div>
        <div className="prop-label" style={{ marginTop: 4 }}>
          选择背景选项
        </div>
        <div className="export-options">
          <button
            className={`export-option ${bgType === 'transparent' ? 'selected' : ''}`}
            onClick={() => setBgType('transparent')}
            disabled={exporting}
          >
            <div style={{ fontSize: 24, marginBottom: 6 }}>🪟</div>
            透明背景
          </button>
          <button
            className={`export-option ${bgType === 'white' ? 'selected' : ''}`}
            onClick={() => setBgType('white')}
            disabled={exporting}
          >
            <div style={{ fontSize: 24, marginBottom: 6 }}>⬜</div>
            白色背景
          </button>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16 }}>
          导出的图片将包含画布上所有可见图形，并自动裁剪到内容区域。
        </div>
        <div className="modal-actions">
          <button className="modal-btn cancel" onClick={onClose} disabled={exporting}>
            取消
          </button>
          <button
            className="modal-btn confirm"
            style={{ backgroundColor: 'var(--primary-color)', color: '#121212' }}
            onClick={doExport}
            disabled={exporting}
          >
            {exporting ? '导出中...' : '开始导出'}
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
  onSendToBack: () => void;
}

const PropertiesEditor: React.FC<PropertiesEditorProps> = ({
  shapes,
  selectedIds,
  onUpdate,
  onMoveUp,
  onMoveDown,
  onBringToFront,
  onSendToBack,
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
              style={{
                backgroundColor: color,
                borderColor: allSameFill && first.fillColor === color ? 'var(--primary-color)' : undefined,
              }}
              onClick={() => applyAll({ fillColor: color })}
            />
          ))}
          <label
            className="color-swatch custom"
            style={{
              background: 'linear-gradient(135deg, #ff6b6b 0%, #4ecdc4 50%, #45b7d1 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="自定义颜色"
          >
            <span style={{ fontSize: 14, color: '#fff', fontWeight: 600, textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>+</span>
            <input
              type="color"
              style={{
                width: 0,
                height: 0,
                opacity: 0,
                position: 'absolute',
                padding: 0,
                border: 0,
              }}
              value={allSameFill && first.fillColor !== 'transparent' ? first.fillColor : '#ffffff'}
              onChange={(e) => applyAll({ fillColor: e.target.value })}
            />
          </label>
          <div
            className="color-swatch"
            style={{
              backgroundColor: '#fff',
              backgroundImage:
                'linear-gradient(45deg, #888 25%, transparent 25%), linear-gradient(-45deg, #888 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #888 75%), linear-gradient(-45deg, transparent 75%, #888 75%)',
              backgroundSize: '8px 8px',
              backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px',
              borderColor: first.fillColor === 'transparent' ? 'var(--primary-color)' : undefined,
            }}
            onClick={() => applyAll({ fillColor: 'transparent' })}
            title="无填充 (透明)"
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
              style={{
                backgroundColor: color,
                borderColor: allSameStroke && first.strokeColor === color ? 'var(--primary-color)' : undefined,
              }}
              onClick={() => applyAll({ strokeColor: color })}
            />
          ))}
          <label
            className="color-swatch custom"
            style={{
              background: 'linear-gradient(135deg, #ff6b6b 0%, #4ecdc4 50%, #45b7d1 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="自定义边框颜色"
          >
            <span style={{ fontSize: 14, color: '#fff', fontWeight: 600, textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>+</span>
            <input
              type="color"
              style={{ width: 0, height: 0, opacity: 0, position: 'absolute', padding: 0, border: 0 }}
              value={allSameStroke ? first.strokeColor : '#ffffff'}
              onChange={(e) => applyAll({ strokeColor: e.target.value })}
            />
          </label>
        </div>
      </div>

      <div className="prop-section">
        <div className="prop-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>边框粗细</span>
          <span className="slider-value">{allSameStrokeW ? first.strokeWidth : '-'}px</span>
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
        <div className="prop-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>透明度</span>
          <span className="slider-value">{allSameOpacity ? Math.round(first.opacity * 100) : '-'}%</span>
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
        <div className="layer-buttons" style={{ marginBottom: 6 }}>
          <button className="layer-btn" onClick={onSendToBack} title="置底">
            ⇊ 置底
          </button>
          <button className="layer-btn" onClick={onMoveDown} title="下移一层">
            ↓ 下移
          </button>
        </div>
        <div className="layer-buttons">
          <button className="layer-btn" onClick={onMoveUp} title="上移一层">
            ↑ 上移
          </button>
          <button className="layer-btn" onClick={onBringToFront} title="置顶">
            ⇈ 置顶
          </button>
        </div>
      </div>

      <div className="prop-section" style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border-color)' }}>
        <div className="prop-label">快捷操作</div>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          <div>• 拖拽移动图形位置</div>
          <div>• 控制点调整图形大小</div>
          <div>• Delete 键删除图形</div>
          <div>• Ctrl+Z 撤销操作</div>
          <div>• 双击便签编辑文字</div>
        </div>
      </div>
    </div>
  );
};

export default App;
