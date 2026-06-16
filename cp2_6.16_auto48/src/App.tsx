import React, { useState, useEffect } from 'react';
import GraphView from './components/GraphView';
import GanttChart from './components/GanttChart';
import DetailPanel from './components/DetailPanel';
import ThemeToggle from './components/ThemeToggle';
import { useData } from './hooks/useData';
import type { Theme } from './types';

const THEME_STORAGE_KEY = 'mindmap-scheduler-theme';

function loadTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
  } catch (e) {
    console.error('Failed to load theme:', e);
  }
  return 'light';
}

function saveTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (e) {
    console.error('Failed to save theme:', e);
  }
}

const App: React.FC = () => {
  const {
    nodes,
    rootId,
    selectedNodeId,
    setSelectedNodeId,
    addNode,
    deleteNode,
    updateNode,
    moveNode,
    toggleCollapse,
    getSelectedNode,
  } = useData();

  const [theme, setTheme] = useState<Theme>(loadTheme);
  const [ganttCollapsed, setGanttCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);

  useEffect(() => {
    saveTheme(theme);
  }, [theme]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 900);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    setDetailPanelOpen(selectedNodeId !== null);
  }, [selectedNodeId]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const handleSelectNode = (nodeId: string | null) => {
    setSelectedNodeId(nodeId);
  };

  const handleCloseDetailPanel = () => {
    setSelectedNodeId(null);
  };

  const selectedNode = getSelectedNode();

  const themeStyles = {
    appBg: theme === 'dark' ? '#0f172a' : '#f0f4f8',
  };

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: themeStyles.appBg,
        overflow: 'hidden',
        position: 'relative',
        transition: 'background-color 300ms ease',
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
      }}
    >
      <ThemeToggle theme={theme} onToggle={handleToggleTheme} />

      {isMobile ? (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            padding: '16px',
            boxSizing: 'border-box',
            gap: '16px',
          }}
        >
          <div style={{ height: '60%', position: 'relative' }}>
            <GraphView
              nodes={nodes}
              rootId={rootId}
              selectedNodeId={selectedNodeId}
              theme={theme}
              onSelectNode={handleSelectNode}
              onAddNode={addNode}
              onDeleteNode={deleteNode}
              onMoveNode={moveNode}
            />
            {detailPanelOpen && (
              <DetailPanel
                node={selectedNode}
                isOpen={detailPanelOpen}
                theme={theme}
                onClose={handleCloseDetailPanel}
                onUpdate={updateNode}
              />
            )}
          </div>
          <div style={{ height: '40%', position: 'relative' }}>
            <GanttChart
              nodes={nodes}
              rootId={rootId}
              selectedNodeId={selectedNodeId}
              theme={theme}
              collapsed={ganttCollapsed}
              onToggleCollapse={() => setGanttCollapsed(!ganttCollapsed)}
              onSelectNode={handleSelectNode}
              onToggleNodeCollapse={toggleCollapse}
            />
          </div>
        </div>
      ) : (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            padding: '20px',
            boxSizing: 'border-box',
            gap: '20px',
          }}
        >
          <div style={{ width: '70%', height: '100%', position: 'relative' }}>
            <GraphView
              nodes={nodes}
              rootId={rootId}
              selectedNodeId={selectedNodeId}
              theme={theme}
              onSelectNode={handleSelectNode}
              onAddNode={addNode}
              onDeleteNode={deleteNode}
              onMoveNode={moveNode}
            />
          </div>

          <div style={{ width: '30%', height: '100%', position: 'relative' }}>
            <GanttChart
              nodes={nodes}
              rootId={rootId}
              selectedNodeId={selectedNodeId}
              theme={theme}
              collapsed={ganttCollapsed}
              onToggleCollapse={() => setGanttCollapsed(!ganttCollapsed)}
              onSelectNode={handleSelectNode}
              onToggleNodeCollapse={toggleCollapse}
            />

            {detailPanelOpen && (
              <DetailPanel
                node={selectedNode}
                isOpen={detailPanelOpen}
                theme={theme}
                onClose={handleCloseDetailPanel}
                onUpdate={updateNode}
              />
            )}
          </div>
        </div>
      )}

      <div
        style={{
          position: 'absolute',
          bottom: '20px',
          left: '20px',
          backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
          padding: '12px 16px',
          borderRadius: '10px',
          border: `1px solid ${theme === 'dark' ? '#334155' : '#e2e8f0'}`,
          fontSize: '12px',
          color: theme === 'dark' ? '#94a3b8' : '#64748b',
          lineHeight: 1.6,
          maxWidth: '280px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}
      >
        <div style={{ fontWeight: 600, color: theme === 'dark' ? '#f1f5f9' : '#1e293b', marginBottom: '6px' }}>
          操作提示
        </div>
        <div>🖱️ 滚轮缩放画布</div>
        <div>✋ 拖拽空白处平移</div>
        <div>📦 拖拽节点移动位置</div>
        <div>👆 双击节点创建子任务</div>
        <div>🗑️ 右键节点删除</div>
      </div>
    </div>
  );
};

export default App;
