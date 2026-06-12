import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Layout,
  Undo2,
  Redo2,
  Plus,
  Grid3X3,
  Palette,
  Save,
  Menu,
  Download,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import Canvas from './Canvas';
import PropertyPanel from './PropertyPanel';
import SchemeManager from './SchemeManager';
import {
  LayoutBlock,
  Scheme,
  BlockType,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  BLOCK_PRESETS,
  GRID_SIZE,
} from './types';
import './App.css';

const snapToGrid = (value: number): number => Math.round(value / GRID_SIZE) * GRID_SIZE;

const generateId = (): string =>
  `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

function App() {
  const [blocks, setBlocks] = useState<LayoutBlock[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [history, setHistory] = useState<LayoutBlock[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const [schemes, setSchemes] = useState<Scheme[]>(() => {
    try {
      const saved = localStorage.getItem('blog-layout-schemes');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [draggingPreset, setDraggingPreset] = useState<BlockType | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const maxZRef = useRef<number>(1);

  useEffect(() => {
    localStorage.setItem('blog-layout-schemes', JSON.stringify(schemes));
  }, [schemes]);

  useEffect(() => {
    const handleResize = () => {
      setSidebarCollapsed(window.innerWidth < 1024);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const pushHistory = useCallback(
    (newBlocks: LayoutBlock[]) => {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newBlocks);
      if (newHistory.length > 50) {
        newHistory.shift();
      } else {
        setHistoryIndex(historyIndex + 1);
      }
      setHistory(newHistory);
      if (newHistory.length <= 50) {
        setHistoryIndex(newHistory.length - 1);
      }
    },
    [history, historyIndex]
  );

  const updateBlocks = useCallback(
    (updater: (prev: LayoutBlock[]) => LayoutBlock[]) => {
      setBlocks((prev) => {
        const result = updater(prev);
        pushHistory(result);
        return result;
      });
    },
    [pushHistory]
  );

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setBlocks(history[historyIndex - 1]);
    }
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setBlocks(history[historyIndex + 1]);
    }
  }, [history, historyIndex]);

  const handlePresetDragStart = useCallback(
    (e: React.DragEvent, type: BlockType) => {
      setDraggingPreset(type);
      e.dataTransfer.effectAllowed = 'copy';
      e.dataTransfer.setData('blockType', type);
    },
    []
  );

  const handlePresetDragEnd = useCallback(() => {
    setDraggingPreset(null);
  }, []);

  const handleCanvasDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const blockType = e.dataTransfer.getData('blockType') as BlockType;
      if (!blockType || !canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const preset = BLOCK_PRESETS[blockType];
      const offsetX = preset.size.width / 2;
      const offsetY = preset.size.height / 2;

      const rawX = e.clientX - rect.left - offsetX;
      const rawY = e.clientY - rect.top - offsetY;

      const maxX = Math.max(0, CANVAS_WIDTH - preset.size.width);
      const maxY = Math.max(0, CANVAS_HEIGHT - preset.size.height);

      const x = Math.max(0, Math.min(maxX, snapToGrid(rawX)));
      const y = Math.max(0, Math.min(maxY, snapToGrid(rawY)));

      maxZRef.current += 1;

      const newBlock: LayoutBlock = {
        id: generateId(),
        type: blockType,
        position: { x, y },
        size: { ...preset.size },
        fillColor: preset.fillColor,
        borderColor: preset.borderColor,
        zIndex: maxZRef.current,
      };

      updateBlocks((prev) => [...prev, newBlock]);
      setDraggingPreset(null);
    },
    [updateBlocks]
  );

  const handleCanvasDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleBlockUpdate = useCallback(
    (id: string, updates: Partial<LayoutBlock>) => {
      setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...updates } : b)));
    },
    []
  );

  const handleBlockUpdateEnd = useCallback(
    (id: string, updates: Partial<LayoutBlock>) => {
      updateBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...updates } : b)));
    },
    [updateBlocks]
  );

  const handleBlockSelect = useCallback(
    (id: string | null) => {
      if (id) {
        maxZRef.current += 1;
        setBlocks((prev) =>
          prev.map((b) => (b.id === id ? { ...b, zIndex: maxZRef.current } : b))
        );
      }
      setSelectedBlockId((prev) => (prev === id ? null : id));
    },
    []
  );

  const handleBlockDelete = useCallback(
    (id: string) => {
      updateBlocks((prev) => prev.filter((b) => b.id !== id));
      if (selectedBlockId === id) setSelectedBlockId(null);
    },
    [updateBlocks, selectedBlockId]
  );

  const handleAddComponent = useCallback((type: BlockType) => {
    const preset = BLOCK_PRESETS[type];
    const centerX = snapToGrid((CANVAS_WIDTH - preset.size.width) / 2);
    const centerY = snapToGrid((CANVAS_HEIGHT - preset.size.height) / 2);

    maxZRef.current += 1;

    const newBlock: LayoutBlock = {
      id: generateId(),
      type,
      position: { x: centerX, y: centerY },
      size: { ...preset.size },
      fillColor: preset.fillColor,
      borderColor: preset.borderColor,
      zIndex: maxZRef.current,
    };

    updateBlocks((prev) => [...prev, newBlock]);
  }, [updateBlocks]);

  const selectedBlock = blocks.find((b) => b.id === selectedBlockId) || null;

  const handleSaveScheme = useCallback(
    async (name: string, thumbnail: string) => {
      const scheme: Scheme = {
        id: generateId(),
        name,
        blocks: JSON.parse(JSON.stringify(blocks)),
        thumbnail,
        createdAt: Date.now(),
      };
      setSchemes((prev) => [scheme, ...prev]);
    },
    [blocks]
  );

  const handleLoadScheme = useCallback((scheme: Scheme) => {
    const clonedBlocks = JSON.parse(JSON.stringify(scheme.blocks)) as LayoutBlock[];
    setBlocks(clonedBlocks);
    setSelectedBlockId(null);
    setHistory((prev) => [...prev, clonedBlocks]);
    setHistoryIndex((prev) => prev + 1);
  }, []);

  const handleDeleteScheme = useCallback((id: string) => {
    setSchemes((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const handleExportJSON = useCallback(() => {
    const data = JSON.stringify(blocks, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `blog-layout-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [blocks]);

  return (
    <div className="app-container">
      {sidebarCollapsed && (
        <button
          className="hamburger-btn"
          onClick={() => setSidebarCollapsed(false)}
          aria-label="打开侧边栏"
        >
          <Menu size={20} />
        </button>
      )}

      <aside className={`left-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        {!sidebarCollapsed && (
          <>
            <div className="sidebar-header">
              <span className="project-name">B</span>
            </div>
            <nav className="sidebar-nav">
              <button className="sidebar-btn active" title="布局设计">
                <Layout size={22} />
              </button>
              <button className="sidebar-btn" title="网格设置">
                <Grid3X3 size={22} />
              </button>
              <button className="sidebar-btn" title="主题配色">
                <Palette size={22} />
              </button>
              <button className="sidebar-btn" title="导出JSON" onClick={handleExportJSON}>
                <Download size={22} />
              </button>
            </nav>
          </>
        )}
      </aside>

      <main className="main-content">
        <div className="toolbar">
          <div className="toolbar-left">
            <button
              className="toolbar-btn"
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              title="撤销 (Ctrl+Z)"
            >
              <Undo2 size={16} />
              <span>撤销</span>
            </button>
            <button
              className="toolbar-btn"
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              title="重做 (Ctrl+Y)"
            >
              <Redo2 size={16} />
              <span>重做</span>
            </button>
          </div>
          <div className="toolbar-right">
            <div className="add-dropdown">
              <button className="toolbar-btn">
                <Plus size={16} />
                <span>添加组件</span>
              </button>
              <div className="add-menu">
                {(Object.keys(BLOCK_PRESETS) as BlockType[]).map((type) => (
                  <button
                    key={type}
                    className="add-menu-item"
                    onClick={() => handleAddComponent(type)}
                  >
                    {BLOCK_PRESETS[type].label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="workspace">
          <div className="canvas-section">
            <div className="canvas-toolbar">
              <span className="canvas-title">画布预览</span>
              <span className="canvas-size">{CANVAS_WIDTH} × {CANVAS_HEIGHT}</span>
            </div>

            <div className="canvas-area">
              <div className="component-panel">
                <h3 className="component-panel-title">预设组件</h3>
                <div className="component-list">
                  {(Object.keys(BLOCK_PRESETS) as BlockType[]).map((type) => {
                    const preset = BLOCK_PRESETS[type];
                    return (
                      <div
                        key={type}
                        className={`component-item ${draggingPreset === type ? 'dragging' : ''}`}
                        draggable
                        onDragStart={(e) => handlePresetDragStart(e, type)}
                        onDragEnd={handlePresetDragEnd}
                        title={`拖拽添加${preset.label}`}
                      >
                        <div className="component-preview-wrapper">
                          <div
                            className="component-preview"
                            style={{
                              width: type === 'footer' ? '100%' : '48px',
                              height: type === 'footer' ? '16px' : '60px',
                              backgroundColor: preset.fillColor,
                              border: `1px solid ${preset.borderColor}`,
                              borderRadius: type === 'article-card' ? '8px' : '3px',
                              boxShadow: type === 'article-card' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                            }}
                          />
                        </div>
                        <div className="component-info">
                          <span className="component-label">{preset.label}</span>
                          <span className="component-desc">
                            {type === 'article-card' && '280 × 360'}
                            {type === 'sidebar' && '280 × 600'}
                            {type === 'footer' && '100% × 120'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <Canvas
                ref={canvasRef}
                blocks={blocks}
                selectedBlockId={selectedBlockId}
                onBlockUpdate={handleBlockUpdate}
                onBlockSelect={handleBlockSelect}
                onBlockDelete={handleBlockDelete}
                onDrop={handleCanvasDrop}
                onDragOver={handleCanvasDragOver}
              />
            </div>
          </div>

          <div className="right-panel">
            <PropertyPanel
              block={selectedBlock}
              onUpdate={(updates) =>
                selectedBlock && handleBlockUpdateEnd(selectedBlock.id, updates)
              }
            />
            <SchemeManager
              schemes={schemes}
              canvasRef={canvasRef}
              blocks={blocks}
              onSave={handleSaveScheme}
              onLoad={handleLoadScheme}
              onDelete={handleDeleteScheme}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
