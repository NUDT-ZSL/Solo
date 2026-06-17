import React, { useState, useRef, useEffect, useCallback } from 'react';
import BrushCanvas, { BrushCanvasHandle, ExportOptions } from './modules/brush/BrushCanvas';
import { BrushConfig } from './modules/brush/BrushEngine';
import PoetrySelector from './modules/poetry/PoetrySelector';
import { Poetry } from './modules/poetry/PoetryLibrary';
import ExportPanel, { ExportOptions as ExportPanelOptions } from './modules/export/ExportPanel';

type AppMode = 'tracing' | 'free';

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 800;

const DEFAULT_BRUSH_CONFIG: Partial<BrushConfig> = {
  minWidth: 2,
  maxWidth: 5,
  startOpacity: 0.9,
  endOpacity: 0.3,
  smoothing: 0.4,
};

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>('tracing');
  const [selectedPoetry, setSelectedPoetry] = useState<Poetry | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const canvasRef = useRef<BrushCanvasHandle>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handlePoetrySelect = useCallback((poetry: Poetry) => {
    setSelectedPoetry(poetry);
    if (mode === 'free') {
      setMode('tracing');
    }
  }, [mode]);

  const handleModeToggle = useCallback(() => {
    setMode(prev => (prev === 'tracing' ? 'free' : 'tracing'));
  }, []);

  const handleUndo = useCallback(() => {
    canvasRef.current?.undo();
  }, []);

  const handleClear = useCallback(() => {
    setShowConfirmDialog(true);
  }, []);

  const handleConfirmClear = useCallback(() => {
    canvasRef.current?.clear();
    setShowConfirmDialog(false);
  }, []);

  const handleCancelClear = useCallback(() => {
    setShowConfirmDialog(false);
  }, []);

  const handleSave = useCallback(() => {
    setShowExportPanel(true);
  }, []);

  const handleExport = useCallback((options: ExportPanelOptions) => {
    const svgContent = canvasRef.current?.exportToSVG({
      scrollStyle: options.scrollStyle,
      showSeal: options.showSeal,
      sealText: options.sealText,
    });

    if (svgContent) {
      const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().slice(0, 10);
      const fileName = selectedPoetry
        ? `墨韵_${selectedPoetry.title}_${timestamp}.svg`
        : `墨韵_创作_${timestamp}.svg`;
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }, [selectedPoetry]);

  const responsiveCanvasSize = useCallback(() => {
    if (isMobile) {
      const maxWidth = Math.min(window.innerWidth - 20, 500);
      const ratio = CANVAS_HEIGHT / CANVAS_WIDTH;
      return {
        width: maxWidth,
        height: Math.floor(maxWidth * ratio),
      };
    }
    return { width: CANVAS_WIDTH, height: CANVAS_HEIGHT };
  }, [isMobile]);

  const [canvasSize, setCanvasSize] = useState(responsiveCanvasSize());

  useEffect(() => {
    const updateSize = () => setCanvasSize(responsiveCanvasSize());
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [responsiveCanvasSize]);

  const modeLabel = mode === 'tracing' ? '临摹模式' : '创作模式';
  const nextModeLabel = mode === 'tracing' ? '自由创作' : '临摹模式';

  return (
    <div className="app-container">
      <div className="main-content">
        <div style={{ position: 'relative' }}>
          <BrushCanvas
            ref={canvasRef}
            width={canvasSize.width}
            height={canvasSize.height}
            poetryText={selectedPoetry?.content}
            mode={mode}
            brushConfig={DEFAULT_BRUSH_CONFIG}
          />

          <div className="canvas-header">
            <div className="mode-label">{modeLabel}</div>
            {selectedPoetry && (
              <div className="poetry-name">
                {selectedPoetry.dynasty}·{selectedPoetry.author}《{selectedPoetry.title}》
              </div>
            )}
          </div>

          <button className="mode-toggle" onClick={handleModeToggle}>
            {nextModeLabel}
          </button>

          <div className="toolbar">
            <button
              className="toolbar-btn"
              onClick={handleUndo}
              title="撤销"
            >
              ↩
            </button>
            <button
              className="toolbar-btn"
              onClick={handleClear}
              title="清空"
            >
              🗑
            </button>
            <button
              className="toolbar-btn"
              onClick={handleSave}
              title="保存"
            >
              💾
            </button>
          </div>
        </div>
      </div>

      {isMobile && (
        <button
          className="mobile-toggle-btn"
          onClick={() => setMobileSidebarOpen(true)}
        >
          📜
        </button>
      )}

      <PoetrySelector
        selectedPoetryId={selectedPoetry?.id}
        onSelect={handlePoetrySelect}
        isMobile={isMobile}
        isOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      <ExportPanel
        isOpen={showExportPanel}
        onClose={() => setShowExportPanel(false)}
        onExport={handleExport}
      />

      {showConfirmDialog && (
        <div className="confirm-dialog">
          <div className="confirm-dialog-box">
            <div className="confirm-dialog-text">
              确定要清空画布吗？
              <br />
              此操作不可撤销
            </div>
            <div className="confirm-dialog-buttons">
              <button className="confirm-btn cancel" onClick={handleCancelClear}>
                取消
              </button>
              <button className="confirm-btn danger" onClick={handleConfirmClear}>
                清空
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
