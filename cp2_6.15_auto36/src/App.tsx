import React, { useState, useRef, useEffect, useCallback } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useLayoutState } from './hooks/useLayoutState';
import { Canvas } from './components/Canvas';
import { ToolPanel } from './components/ToolPanel';
import { ExportModal } from './components/ExportModal';
import { MaterialPanel } from './components/MaterialPanel';

const App: React.FC = () => {
  const {
    elements,
    selectedId,
    background,
    canUndo,
    canRedo,
    lastAction,
    addElement,
    updateElement,
    deleteElement,
    selectElement,
    updateBackground,
    undo,
    redo,
    setLastAction,
  } = useLayoutState();

  const canvasRef = useRef<HTMLDivElement>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [newElementId, setNewElementId] = useState<string | null>(null);
  const [leftDrawerOpen, setLeftDrawerOpen] = useState(false);
  const [rightDrawerOpen, setRightDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (lastAction) {
      setToastMessage(lastAction);
      setShowToast(true);
      const timer = setTimeout(() => {
        setShowToast(false);
        setLastAction('');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [lastAction, setLastAction]);

  const handleAddElement = useCallback((type: any, x: number, y: number) => {
    addElement(type, x, y);
    const newId = elements.length > 0 ? elements[elements.length - 1].id : null;
    if (newId) {
      setNewElementId(newId);
      setTimeout(() => setNewElementId(null), 200);
    }
  }, [addElement, elements]);

  const handleUpdateElement = useCallback((id: string, updates: any) => {
    updateElement(id, updates);
  }, [updateElement]);

  const selectedElement = elements.find(el => el.id === selectedId) || null;

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="app-container">
        {isMobile && (
          <>
            <button
              className="drawer-toggle left"
              onClick={() => setLeftDrawerOpen(!leftDrawerOpen)}
            >
              {leftDrawerOpen ? '‹' : '›'}
            </button>
            <button
              className="drawer-toggle right"
              onClick={() => setRightDrawerOpen(!rightDrawerOpen)}
            >
              {rightDrawerOpen ? '›' : '‹'}
            </button>
          </>
        )}

        <MaterialPanel isOpen={!isMobile || leftDrawerOpen} />

        <div className="canvas-container">
          <div className="canvas-toolbar">
            <div className="toolbar-left">
              <button
                className="toolbar-btn"
                onClick={undo}
                disabled={!canUndo}
                title="撤销 (Ctrl+Z)"
              >
                ↶ 撤销
              </button>
              <button
                className="toolbar-btn"
                onClick={redo}
                disabled={!canRedo}
                title="重做 (Ctrl+Shift+Z)"
              >
                ↷ 重做
              </button>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              杂志封面设计工具
            </div>
            <div className="toolbar-right">
              <button
                className="toolbar-btn primary"
                onClick={() => setShowExportModal(true)}
              >
                ⬇ 导出
              </button>
            </div>
          </div>

          {showToast && (
            <div className="action-toast" key={toastMessage}>
              {toastMessage}
            </div>
          )}

          <div 
            className="canvas-wrapper"
            onClick={() => {
              if (isMobile) {
                setLeftDrawerOpen(false);
                setRightDrawerOpen(false);
              }
            }}
          >
            <Canvas
              elements={elements}
              selectedId={selectedId}
              background={background}
              onAddElement={handleAddElement}
              onUpdateElement={handleUpdateElement}
              onSelectElement={selectElement}
              onDeleteElement={deleteElement}
              canvasRef={canvasRef}
              newElementId={newElementId}
            />
          </div>
        </div>

        <div className={`tool-panel ${!isMobile || rightDrawerOpen ? 'open' : ''}`} style={isMobile ? { display: 'flex' } : undefined}>
          <ToolPanel
            selectedElement={selectedElement}
            background={background}
            onUpdateElement={handleUpdateElement}
            onUpdateBackground={updateBackground}
          />
        </div>

        <ExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          canvasRef={canvasRef}
        />
      </div>
    </DndProvider>
  );
};

export default App;
