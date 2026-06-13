import { useState, useCallback, useEffect } from 'react';
import PixelCanvas from './components/PixelCanvas';
import ColorPalette from './components/ColorPalette';
import { exportToPNG, exportToSVG } from './utils/exportUtils';
import type { CanvasData } from './utils/exportUtils';

const GRID_SIZE = 32;
const CELL_SIZE = 20;
const MAX_UNDO_STEPS = 50;

export default function App() {
  const [canvasData, setCanvasData] = useState<CanvasData>(new Map());
  const [selectedColor, setSelectedColor] = useState('#ff0000');
  const [undoStack, setUndoStack] = useState<Array<CanvasData>>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [exportFormat, setExportFormat] = useState<'png' | 'svg'>('png');
  const [exportScale, setExportScale] = useState<1 | 2 | 4>(1);
  const [undoClickAnim, setUndoClickAnim] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const saveToUndoStack = useCallback((currentData: CanvasData) => {
    setUndoStack((prev) => {
      const newStack = [...prev, new Map(currentData)];
      if (newStack.length > MAX_UNDO_STEPS) {
        return newStack.slice(newStack.length - MAX_UNDO_STEPS);
      }
      return newStack;
    });
  }, []);

  const handlePixelDraw = useCallback(
    (x: number, y: number) => {
      if (!isDrawing) {
        setIsDrawing(true);
        saveToUndoStack(canvasData);
      }
      const key = `${x},${y}`;
      setCanvasData((prev) => {
        if (prev.get(key) === selectedColor) return prev;
        const next = new Map(prev);
        next.set(key, selectedColor);
        return next;
      });
    },
    [selectedColor, isDrawing, canvasData, saveToUndoStack]
  );

  const handleBatchPixelDraw = useCallback(
    (pixels: Array<{ x: number; y: number }>) => {
      setCanvasData((prev) => {
        const next = new Map(prev);
        let changed = false;
        for (const p of pixels) {
          const key = `${p.x},${p.y}`;
          if (next.get(key) !== selectedColor) {
            next.set(key, selectedColor);
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    },
    [selectedColor]
  );

  const handleDrawEnd = useCallback(() => {
    setIsDrawing(false);
  }, []);

  useEffect(() => {
    const handleUp = () => handleDrawEnd();
    window.addEventListener('mouseup', handleUp);
    return () => window.removeEventListener('mouseup', handleUp);
  }, [handleDrawEnd]);

  const handleUndo = useCallback(() => {
    setUndoClickAnim(true);
    setTimeout(() => setUndoClickAnim(false), 100);

    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const newStack = [...prev];
      const lastState = newStack.pop()!;
      setCanvasData(lastState);
      return newStack;
    });
  }, []);

  const handleClearCanvas = useCallback(() => {
    setCanvasData(new Map());
    setUndoStack([]);
    setShowClearConfirm(false);
  }, []);

  const handleExport = useCallback(() => {
    if (exportFormat === 'png') {
      exportToPNG(canvasData, GRID_SIZE, CELL_SIZE, exportScale);
    } else {
      exportToSVG(canvasData, GRID_SIZE, CELL_SIZE);
    }
    setShowExportModal(false);
  }, [canvasData, exportFormat, exportScale]);

  const renderExportModal = () => {
    if (!showExportModal) return null;
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}
        onClick={() => setShowExportModal(false)}
      >
        <div
          style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '24px',
            minWidth: '300px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            color: '#333',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>导出作品</h3>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500 }}>格式</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['png', 'svg'] as const).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setExportFormat(fmt)}
                  style={{
                    padding: '8px 20px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    background: exportFormat === fmt ? '#4a90e2' : '#fff',
                    color: exportFormat === fmt ? '#fff' : '#333',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 500,
                    transition: 'all 0.2s',
                  }}
                >
                  {fmt.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          {exportFormat === 'png' && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500 }}>缩放</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {([1, 2, 4] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setExportScale(s)}
                    style={{
                      padding: '8px 16px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      background: exportScale === s ? '#4a90e2' : '#fff',
                      color: exportScale === s ? '#fff' : '#333',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 500,
                      transition: 'all 0.2s',
                    }}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              onClick={() => setShowExportModal(false)}
              style={{
                padding: '8px 20px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                background: '#f5f5f5',
                color: '#666',
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'background 0.2s',
              }}
            >
              取消
            </button>
            <button
              onClick={handleExport}
              style={{
                padding: '8px 20px',
                border: 'none',
                borderRadius: '6px',
                background: '#4a90e2',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLElement).style.background = '#357abd';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.background = '#4a90e2';
              }}
            >
              确认导出
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderClearConfirm = () => {
    if (!showClearConfirm) return null;
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}
        onClick={() => setShowClearConfirm(false)}
      >
        <div
          style={{
            background: '#ff4444',
            borderRadius: '8px',
            padding: '24px',
            minWidth: '280px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            color: '#fff',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <h3 style={{ marginBottom: '12px', fontSize: '18px', fontWeight: 600 }}>⚠️ 清除画布</h3>
          <p style={{ marginBottom: '16px', fontSize: '14px', opacity: 0.9 }}>
            此操作将清空画布上所有内容，且不可撤销。确认清除吗？
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              onClick={() => setShowClearConfirm(false)}
              style={{
                padding: '8px 20px',
                border: 'none',
                borderRadius: '6px',
                background: '#888',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLElement).style.background = '#777';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.background = '#888';
              }}
            >
              取消
            </button>
            <button
              onClick={handleClearCanvas}
              style={{
                padding: '8px 20px',
                border: 'none',
                borderRadius: '6px',
                background: '#cc0000',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLElement).style.background = '#aa0000';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.background = '#cc0000';
              }}
            >
              确认清除
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (isMobile) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#1e1e2e',
        }}
      >
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <PixelCanvas
            canvasData={canvasData}
            gridSize={GRID_SIZE}
            cellSize={CELL_SIZE}
            onPixelDraw={handlePixelDraw}
            onBatchPixelDraw={handleBatchPixelDraw}
          />
        </div>
        <div
          style={{
            height: '80px',
            background: '#2a2a3e',
            borderTop: '1px solid #3a3a4e',
            display: 'flex',
            alignItems: 'center',
            padding: '0 8px',
            gap: '8px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              overflowX: 'auto',
              flex: 1,
              scrollbarWidth: 'none',
            }}
          >
            <ColorPalette
              selectedColor={selectedColor}
              onColorSelect={setSelectedColor}
              isMobile={true}
            />
          </div>
          <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
            <button
              onClick={() => setShowExportModal(true)}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                background: '#4a90e2',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLElement).style.background = '#357abd';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.background = '#4a90e2';
              }}
            >
              💾
            </button>
            <button
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: undoStack.length === 0 ? '#555' : '#eee',
                border: 'none',
                color: undoStack.length === 0 ? '#999' : '#333',
                cursor: undoStack.length === 0 ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s, transform 0.1s',
                transform: undoClickAnim ? 'scale(0.85)' : 'scale(1)',
              }}
            >
              ↩
            </button>
            <button
              onClick={() => setShowClearConfirm(true)}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                background: '#ff4444',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLElement).style.background = '#cc3333';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.background = '#ff4444';
              }}
            >
              🗑
            </button>
          </div>
        </div>
        {renderExportModal()}
        {renderClearConfirm()}
      </div>
    );
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        background: '#1e1e2e',
      }}
    >
      <div
        style={{
          width: '220px',
          background: '#2a2a3e',
          borderRadius: '12px',
          padding: '16px',
          margin: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          overflowY: 'auto',
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => setShowExportModal(true)}
          style={{
            width: '120px',
            height: '40px',
            borderRadius: '8px',
            background: '#4a90e2',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 600,
            alignSelf: 'center',
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLElement).style.background = '#357abd';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLElement).style.background = '#4a90e2';
          }}
        >
          💾 导出
        </button>

        <ColorPalette
          selectedColor={selectedColor}
          onColorSelect={setSelectedColor}
          isMobile={false}
        />

        <div style={{ flex: 1 }} />

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '12px',
          }}
        >
          <button
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            title="撤销"
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: undoStack.length === 0 ? '#555' : '#eee',
              border: 'none',
              color: undoStack.length === 0 ? '#999' : '#333',
              cursor: undoStack.length === 0 ? 'not-allowed' : 'pointer',
              fontSize: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s, transform 0.1s',
              transform: undoClickAnim ? 'scale(0.85)' : 'scale(1)',
            }}
          >
            ↩
          </button>
          <button
            onClick={() => setShowClearConfirm(true)}
            title="清除画布"
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: '#eee',
              border: 'none',
              color: '#333',
              cursor: 'pointer',
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.background = '#ddd';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.background = '#eee';
            }}
          >
            🗑
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'hidden', padding: '12px 12px 12px 0' }}>
        <PixelCanvas
          canvasData={canvasData}
          gridSize={GRID_SIZE}
          cellSize={CELL_SIZE}
          onPixelDraw={handlePixelDraw}
          onBatchPixelDraw={handleBatchPixelDraw}
        />
      </div>

      {renderExportModal()}
      {renderClearConfirm()}
    </div>
  );
}
