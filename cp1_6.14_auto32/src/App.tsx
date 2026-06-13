import { useState, useCallback, useEffect } from 'react';
import LevelEditor from './LevelEditor';
import { LevelElement, EditorMode } from './types';
import './App.css';

const SAMPLE_LEVEL: LevelElement[] = [
  { id: 'start-ground', type: 'platform', x: 0, y: 480, width: 400, height: 40, color: '#22c55e' },
  { id: 'p1', type: 'platform', x: 500, y: 420, width: 120, height: 20, color: '#22c55e' },
  { id: 's1', type: 'spike', x: 620, y: 490, width: 30, height: 30, color: '#ff4444' },
  { id: 'p2', type: 'platform', x: 720, y: 380, width: 100, height: 20, color: '#22c55e' },
  { id: 'c1', type: 'collectible', x: 750, y: 340, width: 30, height: 30, color: '#ffd700' },
  { id: 'p3', type: 'platform', x: 900, y: 420, width: 150, height: 20, color: '#22c55e' },
  { id: 'o1', type: 'obstacle', x: 1000, y: 360, width: 40, height: 60, color: '#a78bfa' },
  { id: 'p4', type: 'platform', x: 1150, y: 480, width: 300, height: 40, color: '#22c55e' },
  { id: 'g1', type: 'goal', x: 1380, y: 400, width: 40, height: 80, color: '#00d4ff' },
];

export default function App() {
  const [mode, setMode] = useState<EditorMode>('edit');
  const [elements, setElements] = useState<LevelElement[]>(SAMPLE_LEVEL);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [isNarrowScreen, setIsNarrowScreen] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => {
      setIsNarrowScreen(window.innerWidth < 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleModeToggle = useCallback(() => {
    setMode(prev => prev === 'edit' ? 'play' : 'edit');
  }, []);

  const handleElementsChange = useCallback((newElements: LevelElement[]) => {
    setElements(newElements);
  }, []);

  const leftWidth = isNarrowScreen ? 180 : 220;
  const rightWidth = isNarrowScreen ? 220 : 280;

  return (
    <div className="app-container">
      <div className="toolbar">
        <div className="toolbar-title">
          <span className="title-icon">🎮</span>
          <span className="title-text">跑酷关卡编辑器</span>
        </div>
        <div className="toolbar-actions">
          <button
            className={`mode-btn ${mode === 'edit' ? 'active' : ''}`}
            onClick={() => mode === 'play' && handleModeToggle()}
            style={{
              opacity: mode === 'edit' ? 1 : 0.6,
            }}
          >
            ✏️ 编辑模式
          </button>
          <button
            className="test-btn"
            onClick={handleModeToggle}
            onMouseDown={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)';
            }}
            onMouseUp={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
            }}
          >
            {mode === 'edit' ? '▶ 测试运行' : '⏹ 停止测试'}
          </button>
        </div>
      </div>

      <div className="main-content">
        {isNarrowScreen && (
          <button
            className="collapse-btn left-collapse"
            onClick={() => setLeftCollapsed(!leftCollapsed)}
            style={{
              left: leftCollapsed ? '4px' : `${leftWidth - 16}px`,
            }}
          >
            {leftCollapsed ? '▶' : '◀'}
          </button>
        )}

        <div
          className="left-panel"
          style={{
            width: leftCollapsed ? 0 : leftWidth,
            minWidth: leftCollapsed ? 0 : leftWidth,
          }}
        >
          {!leftCollapsed && (
            <div className="toolbox-wrapper">
              <LevelEditor
                mode={mode}
                elements={elements}
                onElementsChange={handleElementsChange}
                showToolbox={true}
                showProperties={false}
              />
            </div>
          )}
        </div>

        <div className="canvas-area">
          <LevelEditor
            mode={mode}
            elements={elements}
            onElementsChange={handleElementsChange}
            showToolbox={false}
            showProperties={false}
            isMainCanvas={true}
          />
        </div>

        {isNarrowScreen && (
          <button
            className="collapse-btn right-collapse"
            onClick={() => setRightCollapsed(!rightCollapsed)}
            style={{
              right: rightCollapsed ? '4px' : `${rightWidth - 16}px`,
            }}
          >
            {rightCollapsed ? '◀' : '▶'}
          </button>
        )}

        <div
          className="right-panel"
          style={{
            width: rightCollapsed ? 0 : rightWidth,
            minWidth: rightCollapsed ? 0 : rightWidth,
          }}
        >
          {!rightCollapsed && (
            <LevelEditor
              mode={mode}
              elements={elements}
              onElementsChange={handleElementsChange}
              showToolbox={false}
              showProperties={true}
            />
          )}
        </div>
      </div>
    </div>
  );
}
