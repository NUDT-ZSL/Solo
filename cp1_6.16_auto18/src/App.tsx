import { useState, useCallback, useRef, useEffect } from 'react';
import Toolbar from './components/Toolbar';
import MaterialPanel from './components/MaterialPanel';
import CanvasArea from './components/CanvasArea';
import { canvasLogic } from './logic/CanvasLogic';
import { Material } from './data/materials';

export interface ToastMessage {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
}

function App() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const toastIdRef = useRef(0);
  const [isClearing, setIsClearing] = useState(false);

  const showToast = useCallback((type: ToastMessage['type'], message: string) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const updateHistoryState = useCallback(() => {
    setCanUndo(canvasLogic.canUndo());
    setCanRedo(canvasLogic.canRedo());
  }, []);

  const handleUndo = useCallback(() => {
    canvasLogic.undo();
    updateHistoryState();
  }, [updateHistoryState]);

  const handleRedo = useCallback(() => {
    canvasLogic.redo();
    updateHistoryState();
  }, [updateHistoryState]);

  const handleClear = useCallback(async () => {
    setIsClearing(true);
    try {
      await canvasLogic.clearCanvas();
      showToast('info', '画布已清空');
    } finally {
      setIsClearing(false);
      updateHistoryState();
    }
  }, [showToast, updateHistoryState]);

  const handleExport = useCallback(async () => {
    try {
      await canvasLogic.exportPNG();
      showToast('success', 'PNG图片导出成功！');
    } catch (e) {
      showToast('error', '导出失败，请重试');
    }
  }, [showToast]);

  const handleCanvasStateChange = useCallback(() => {
    updateHistoryState();
  }, [updateHistoryState]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const activeElement = document.activeElement;
        if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
          return;
        }
        canvasLogic.deleteSelected();
        updateHistoryState();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, updateHistoryState]);

  return (
    <div className="app-container">
      <Toolbar
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClear={handleClear}
        onExport={handleExport}
        canUndo={canUndo}
        canRedo={canRedo}
        isClearing={isClearing}
      />
      <div className="main-content">
        <MaterialPanel />
        <CanvasArea
          onStateChange={handleCanvasStateChange}
          onError={(msg) => showToast('error', msg)}
        />
      </div>

      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            <span className="toast-icon">
              {toast.type === 'success' && '✓'}
              {toast.type === 'error' && '✕'}
              {toast.type === 'info' && 'ℹ'}
            </span>
            <span className="toast-message">{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
