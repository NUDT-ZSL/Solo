import { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Palette, ColorStop, GradientType, LinearDirection, RadialShape } from './types';
import { Sidebar } from './components/Sidebar';
import { Canvas } from './components/Canvas';
import { ExportPanel } from './components/ExportPanel';
import { Toast } from './components/Toast';

const STORAGE_KEY = 'paletteforge_palettes_v1';

function createDefaultPalette(name?: string): Palette {
  const now = Date.now();
  return {
    id: uuidv4(),
    name: name || `色板 ${new Date().toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
    type: 'linear',
    direction: 'to right',
    shape: 'circle',
    colorStops: [
      { id: uuidv4(), color: '#ffffff', position: 0 },
      { id: uuidv4(), color: '#000000', position: 1 }
    ],
    createdAt: now,
    updatedAt: now
  };
}

function loadPalettesFromStorage(): Palette[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed as Palette[];
    }
  } catch {
    // ignore
  }
  const initial = createDefaultPalette('日落渐变色板');
  initial.colorStops = [
    { id: uuidv4(), color: '#ff6b6b', position: 0 },
    { id: uuidv4(), color: '#feca57', position: 0.5 },
    { id: uuidv4(), color: '#48dbfb', position: 1 }
  ];
  const initial2 = createDefaultPalette('深海主题色板');
  initial2.type = 'radial';
  initial2.shape = 'circle';
  initial2.colorStops = [
    { id: uuidv4(), color: '#0abde3', position: 0 },
    { id: uuidv4(), color: '#5f27cd', position: 1 }
  ];
  return [initial, initial2];
}

function App() {
  const [palettes, setPalettes] = useState<Palette[]>(() => loadPalettesFromStorage());
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const loaded = loadPalettesFromStorage();
    return loaded.length > 0 ? loaded[0].id : null;
  });
  const [toast, setToast] = useState({ visible: false, message: '' });
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [exportWidth, setExportWidth] = useState(260);
  const saveTimerRef = useRef<number | null>(null);

  const showToast = useCallback((message: string) => {
    setToast({ visible: true, message });
  }, []);

  const hideToast = useCallback(() => {
    setToast(t => ({ ...t, visible: false }));
  }, []);

  // 响应式检测
  useEffect(() => {
    const check = () => setIsSmallScreen(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // localStorage 自动保存（防抖）
  useEffect(() => {
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(palettes));
      } catch {
        // ignore
      }
    }, 150);
    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, [palettes]);

  // 确保至少有一个选中
  useEffect(() => {
    if (!selectedId && palettes.length > 0) {
      setSelectedId(palettes[0].id);
    }
    if (palettes.length === 0) {
      const np = createDefaultPalette();
      setPalettes([np]);
      setSelectedId(np.id);
    }
  }, [palettes, selectedId]);

  const selectedPalette = palettes.find(p => p.id === selectedId) || null;

  const updatePalette = useCallback((id: string, updater: (p: Palette) => Palette) => {
    setPalettes(prev =>
      prev.map(p =>
        p.id === id ? { ...updater(p), updatedAt: Date.now() } : p
      )
    );
  }, []);

  const handleAddPalette = useCallback(() => {
    const np = createDefaultPalette();
    setPalettes(prev => [...prev, np]);
    setSelectedId(np.id);
    showToast('已创建新色板');
  }, [showToast]);

  const handleDeletePalette = useCallback((id: string) => {
    setPalettes(prev => {
      if (prev.length <= 1) {
        showToast('至少保留一个色板');
        return prev;
      }
      const next = prev.filter(p => p.id !== id);
      if (selectedId === id && next.length > 0) {
        setSelectedId(next[0].id);
      }
      showToast('色板已删除');
      return next;
    });
  }, [selectedId, showToast]);

  const handleSelectPalette = useCallback((id: string) => {
    setSelectedId(id);
    if (isSmallScreen) setSidebarOpen(false);
  }, [isSmallScreen]);

  const handleRenamePalette = useCallback((id: string, name: string) => {
    updatePalette(id, p => ({ ...p, name: name.trim() || p.name }));
  }, [updatePalette]);

  const handleUpdateColorStops = useCallback((stops: ColorStop[]) => {
    if (!selectedId) return;
    updatePalette(selectedId, p => ({ ...p, colorStops: stops }));
  }, [selectedId, updatePalette]);

  const handleUpdateType = useCallback((type: GradientType) => {
    if (!selectedId) return;
    updatePalette(selectedId, p => ({
      ...p,
      type,
      direction: type === 'linear' ? (p.direction || 'to right') : undefined,
      shape: type === 'radial' ? (p.shape || 'circle') : undefined
    }));
  }, [selectedId, updatePalette]);

  const handleUpdateDirection = useCallback((direction: LinearDirection) => {
    if (!selectedId) return;
    updatePalette(selectedId, p => ({ ...p, direction }));
  }, [selectedId, updatePalette]);

  const handleUpdateShape = useCallback((shape: RadialShape) => {
    if (!selectedId) return;
    updatePalette(selectedId, p => ({ ...p, shape }));
  }, [selectedId, updatePalette]);

  // 分隔线拖拽调整
  const startSidebarResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = sidebarWidth;
    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startX;
      const newW = Math.max(200, Math.min(400, startW + delta));
      setSidebarWidth(newW);
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const startExportResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = exportWidth;
    const onMove = (ev: MouseEvent) => {
      const delta = startX - ev.clientX;
      const newW = Math.max(220, Math.min(360, startW + delta));
      setExportWidth(newW);
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  return (
    <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', background: '#1e1e2e', minWidth: isSmallScreen ? '100%' : '1024px' }}>
      {isSmallScreen && (
        <div
          style={{
            height: 56,
            background: '#2a2a3e',
            borderBottom: '2px solid #3a3a4e',
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            gap: 12,
            flexShrink: 0,
            position: 'relative'
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 700, color: '#818cf8', whiteSpace: 'nowrap' }}>
            PaletteForge
          </div>
          <div style={{ flex: 1, display: 'flex', overflowX: 'auto', gap: 8, alignItems: 'center', paddingRight: 8 }}>
            {palettes.map(p => (
              <div
                key={p.id}
                onClick={() => handleSelectPalette(p.id)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  flexShrink: 0,
                  background: `linear-gradient(135deg, ${p.colorStops[0]?.color || '#fff'}, ${p.colorStops[p.colorStops.length - 1]?.color || '#000'})`,
                  border: p.id === selectedId ? '2px solid #6366f1' : '2px solid transparent',
                  cursor: 'pointer',
                  opacity: p.id === selectedId ? 1 : 0.6,
                  transition: 'all 0.2s'
                }}
                title={p.name}
              />
            ))}
          </div>
          <button
            onClick={handleAddPalette}
            style={{
              width: 36, height: 36, borderRadius: 8, background: '#3a3a4e',
              color: '#e0e0f0', fontSize: 18, fontWeight: 600, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
            title="添加色板"
          >
            +
          </button>
          <button
            onClick={() => setSidebarOpen(true)}
            style={{
              padding: '8px 12px', borderRadius: 8, background: '#3a3a4e',
              color: '#e0e0f0', fontSize: 13, flexShrink: 0
            }}
          >
            管理
          </button>
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', minHeight: 0, position: 'relative' }}>
        {/* 左侧 Sidebar - 大屏 */}
        {!isSmallScreen && (
          <>
            <div
              style={{
                width: sidebarWidth,
                flexShrink: 0,
                background: '#2a2a3e',
                overflowY: 'auto',
                height: '100%'
              }}
            >
              <Sidebar
                palettes={palettes}
                selectedId={selectedId}
                onAdd={handleAddPalette}
                onDelete={handleDeletePalette}
                onSelect={handleSelectPalette}
                onRename={handleRenamePalette}
                compact={false}
              />
            </div>
            <div
              onMouseDown={startSidebarResize}
              style={{
                width: 2, flexShrink: 0, background: '#3a3a4e', cursor: 'col-resize',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#6366f1')}
              onMouseLeave={e => (e.currentTarget.style.background = '#3a3a4e')}
            />
          </>
        )}

        {/* 小屏弹窗 */}
        {isSmallScreen && sidebarOpen && (
          <div
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)',
              zIndex: 100, display: 'flex'
            }}
            onClick={() => setSidebarOpen(false)}
          >
            <div
              style={{
                width: 280, height: '100%', background: '#2a2a3e',
                overflowY: 'auto'
              }}
              onClick={e => e.stopPropagation()}
            >
              <Sidebar
                palettes={palettes}
                selectedId={selectedId}
                onAdd={handleAddPalette}
                onDelete={handleDeletePalette}
                onSelect={handleSelectPalette}
                onRename={handleRenamePalette}
                compact={false}
              />
            </div>
          </div>
        )}

        {/* 中央 Canvas */}
        <div style={{ flex: 1, minWidth: 0, height: '100%', overflowY: 'auto', background: '#1e1e2e' }}>
          {selectedPalette ? (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ flex: 1, minHeight: 0 }}>
                <Canvas
                  palette={selectedPalette}
                  onUpdateColorStops={handleUpdateColorStops}
                  onUpdateType={handleUpdateType}
                  onUpdateDirection={handleUpdateDirection}
                  onUpdateShape={handleUpdateShape}
                  onRename={handleRenamePalette}
                  onShowToast={showToast}
                />
              </div>
            </div>
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
              请选择或创建一个色板
            </div>
          )}
        </div>

        {/* 分隔线 */}
        {!isSmallScreen && (
          <div
            onMouseDown={startExportResize}
            style={{
              width: 2, flexShrink: 0, background: '#3a3a4e', cursor: 'col-resize'
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#6366f1')}
            onMouseLeave={e => (e.currentTarget.style.background = '#3a3a4e')}
          />
        )}

        {/* 右侧 ExportPanel - 大屏显示，小屏时依然显示但限制宽度 */}
        {(!isSmallScreen || selectedPalette) && (
          <div
            style={{
              width: isSmallScreen ? '100%' : exportWidth,
              flexShrink: 0,
              background: '#2a2a3e',
              overflowY: 'auto',
              height: '100%',
              maxHeight: '100%'
            }}
          >
            {selectedPalette && (
              <ExportPanel
                palette={selectedPalette}
                onShowToast={showToast}
              />
            )}
          </div>
        )}
      </div>

      <Toast
        message={toast.message}
        visible={toast.visible}
        onClose={hideToast}
      />
    </div>
  );
}

export default App;
