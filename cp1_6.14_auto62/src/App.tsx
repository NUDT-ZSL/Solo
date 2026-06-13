import React, { useRef, useEffect, useState, useCallback } from 'react';
import { TreeDataManager, SkillCategory, SkillNode, ConnectionType } from './TreeDataManager';
import { SkillTreeCanvas, CanvasCallbacks } from './SkillTreeCanvas';
import { ToolPanel, SidebarToolbox } from './ToolPanel';
import { DetailPanel } from './DetailPanel';
import {
  SkillNodeTooltip,
  ConnectionModeIndicator,
  CanvasOverlay,
} from './SkillNodeComponent';

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const skillCanvasRef = useRef<SkillTreeCanvas | null>(null);
  const managerRef = useRef(new TreeDataManager());
  const containerRef = useRef<HTMLDivElement>(null);

  const [nodes, setNodes] = useState<SkillNode[]>([]);
  const [connections, setConnections] = useState(managerRef.current.getConnections());
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<SkillNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [connectionSourceId, setConnectionSourceId] = useState<string | null>(null);
  const [scale, setScale] = useState(1.0);
  const [showGrid, setShowGrid] = useState(true);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  const selectedNode = selectedNodeId
    ? managerRef.current.getNode(selectedNodeId) ?? null
    : null;

  const prerequisiteNodes = selectedNodeId
    ? managerRef.current
        .getNodePrerequisites(selectedNodeId)
        .map(n => ({ id: n.id, name: n.name, connectionId: '' }))
    : [];

  const allPrerequisiteEntries = selectedNodeId
    ? managerRef.current
        .getConnections()
        .filter(c => c.targetId === selectedNodeId)
        .map(c => {
          const srcNode = managerRef.current.getNode(c.sourceId);
          return {
            id: srcNode?.id || '',
            name: srcNode?.name || '未知',
            connectionId: c.id,
          };
        })
    : [];

  const syncFromManager = useCallback(() => {
    setNodes(managerRef.current.getNodes());
    setConnections(managerRef.current.getConnections());
  }, []);

  useEffect(() => {
    const unsub = managerRef.current.subscribe(syncFromManager);
    return unsub;
  }, [syncFromManager]);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (windowWidth < 1200) {
      if (!leftCollapsed) setLeftCollapsed(true);
      if (!rightCollapsed) setRightCollapsed(true);
    }
  }, [windowWidth, leftCollapsed, rightCollapsed]);

  useEffect(() => {
    if (!canvasRef.current) return;

    const callbacks: CanvasCallbacks = {
      onSelectNode: (id) => {
        setSelectedNodeId(id);
      },
      onNodePositionChange: (id, x, y) => {
        managerRef.current.updateNode(id, { x, y });
      },
      onRequestConnection: (sourceId, targetId, type) => {
        const conn = managerRef.current.addConnection(sourceId, targetId, type);
        if (conn && skillCanvasRef.current) {
          skillCanvasRef.current.animateConnectionAdd(conn.id);
        }
        setConnectionSourceId(null);
        if (skillCanvasRef.current) {
          skillCanvasRef.current.setConnectionSource(null);
        }
      },
      onRemoveConnection: (connectionId) => {
        managerRef.current.removeConnection(connectionId);
      },
      onHoverNode: (node, sx, sy) => {
        setHoveredNode(node);
        setTooltipPos({ x: sx, y: sy });
      },
      onDropTemplate: (category, worldX, worldY) => {
        managerRef.current.addNode({
          category: category as SkillCategory,
          x: worldX,
          y: worldY,
        });
      },
      onScaleChange: (s) => {
        setScale(s);
      },
    };

    const canvas = new SkillTreeCanvas(canvasRef.current, callbacks);
    skillCanvasRef.current = canvas;

    return () => {
      canvas.destroy();
      skillCanvasRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (skillCanvasRef.current) {
      skillCanvasRef.current.setData(nodes, connections);
    }
  }, [nodes, connections]);

  useEffect(() => {
    if (skillCanvasRef.current) {
      skillCanvasRef.current.setSelectedNode(selectedNodeId);
    }
  }, [selectedNodeId]);

  const handleImport = useCallback((json: string) => {
    try {
      managerRef.current.importJSON(json);
      setSelectedNodeId(null);
      setConnectionSourceId(null);
    } catch (e) {
      alert('导入失败：JSON 格式无效');
    }
  }, []);

  const handleExport = useCallback(() => {
    const json = managerRef.current.exportJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'skill-tree.json';
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleSave = useCallback(() => {
    const json = managerRef.current.exportJSON();
    localStorage.setItem('skill-tree-save', json);
  }, []);

  const handleResetView = useCallback(() => {
    skillCanvasRef.current?.resetView();
    setScale(1.0);
  }, []);

  const handleClear = useCallback(() => {
    if (window.confirm('确定要清空整个技能树吗？此操作不可撤销。')) {
      managerRef.current.clear();
      setSelectedNodeId(null);
      setConnectionSourceId(null);
    }
  }, []);

  const handleUpdateNode = useCallback((id: string, updates: Partial<SkillNode>) => {
    managerRef.current.updateNode(id, updates);
  }, []);

  const handleRemoveNode = useCallback((id: string) => {
    managerRef.current.removeNode(id);
    setSelectedNodeId(null);
  }, []);

  const handleRemoveConnection = useCallback((connectionId: string) => {
    managerRef.current.removeConnection(connectionId);
  }, []);

  const handleAddConnection = useCallback((sourceId: string, targetId: string, type: ConnectionType) => {
    managerRef.current.addConnection(sourceId, targetId, type);
  }, []);

  const handleToggleGrid = useCallback(() => {
    const next = !showGrid;
    setShowGrid(next);
    skillCanvasRef.current?.setShowGrid(next);
  }, [showGrid]);

  const handleCancelConnection = useCallback(() => {
    setConnectionSourceId(null);
    skillCanvasRef.current?.setConnectionSource(null);
  }, []);

  const connectionSourceName = connectionSourceId
    ? managerRef.current.getNode(connectionSourceId)?.name || ''
    : '';

  const leftWidth = windowWidth < 1200
    ? (leftCollapsed ? 40 : 240)
    : 280;
  const rightWidth = windowWidth < 1200
    ? (rightCollapsed ? 40 : 240)
    : 300;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        background: '#0d1b2a',
        overflow: 'hidden',
      }}
    >
      <ToolPanel
        onImport={handleImport}
        onExport={handleExport}
        onSave={handleSave}
        onResetView={handleResetView}
        onClear={handleClear}
      />

      <div
        style={{
          display: 'flex',
          flex: 1,
          overflow: 'hidden',
          padding: 16,
          gap: 16,
        }}
      >
        <div
          style={{
            width: leftWidth,
            transition: 'width 0.3s ease',
            position: 'relative',
            flexShrink: 0,
          }}
        >
          {leftCollapsed ? (
            <button
              onClick={() => setLeftCollapsed(false)}
              style={{
                width: 40,
                height: 40,
                background: '#16213e',
                border: 'none',
                borderRadius: 8,
                color: '#4fc3f7',
                cursor: 'pointer',
                fontSize: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ▶
            </button>
          ) : (
            <div style={{ position: 'relative' }}>
              {windowWidth < 1200 && (
                <button
                  onClick={() => setLeftCollapsed(true)}
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    background: 'transparent',
                    border: 'none',
                    color: '#5a6a7a',
                    cursor: 'pointer',
                    fontSize: 14,
                    zIndex: 10,
                  }}
                >
                  ✕
                </button>
              )}
              <SidebarToolbox />
            </div>
          )}
        </div>

        <div
          ref={containerRef}
          style={{
            flex: 1,
            position: 'relative',
            borderRadius: 12,
            overflow: 'hidden',
            border: '1px solid #1a3a5c',
          }}
        >
          <canvas
            ref={canvasRef}
            style={{
              width: '100%',
              height: '100%',
              display: 'block',
              cursor: connectionSourceId ? 'crosshair' : 'default',
            }}
          />

          {hoveredNode && !selectedNodeId && (
            <SkillNodeTooltip node={hoveredNode} x={tooltipPos.x} y={tooltipPos.y} />
          )}

          {connectionSourceId && (
            <ConnectionModeIndicator
              sourceName={connectionSourceName}
              onCancel={handleCancelConnection}
            />
          )}

          <CanvasOverlay
            scale={scale}
            showGrid={showGrid}
            onToggleGrid={handleToggleGrid}
          />
        </div>

        <div
          style={{
            width: rightWidth,
            transition: 'width 0.3s ease',
            position: 'relative',
            flexShrink: 0,
          }}
        >
          {rightCollapsed ? (
            <button
              onClick={() => setRightCollapsed(false)}
              style={{
                width: 40,
                height: 40,
                background: '#1a1a2e',
                border: 'none',
                borderRadius: 8,
                color: '#4fc3f7',
                cursor: 'pointer',
                fontSize: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ◀
            </button>
          ) : (
            <div style={{ position: 'relative' }}>
              {windowWidth < 1200 && (
                <button
                  onClick={() => setRightCollapsed(true)}
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    background: 'transparent',
                    border: 'none',
                    color: '#5a6a7a',
                    cursor: 'pointer',
                    fontSize: 14,
                    zIndex: 10,
                  }}
                >
                  ✕
                </button>
              )}
              <DetailPanel
                node={selectedNode}
                prerequisiteNodeNames={allPrerequisiteEntries}
                onUpdateNode={handleUpdateNode}
                onRemoveConnection={handleRemoveConnection}
                onRemoveNode={handleRemoveNode}
                onAddConnection={handleAddConnection}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
