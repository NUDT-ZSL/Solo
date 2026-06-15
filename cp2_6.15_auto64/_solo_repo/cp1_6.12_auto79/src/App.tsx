import React, { useState, useRef, useCallback, useEffect } from 'react';
import { FlowchartData, ToolType, DividerState } from './types';
import { CanvasManager } from './canvas/CanvasManager';
import { exportToJson } from './jsonExport/JsonExporter';
import Canvas from './components/Canvas';
import JsonPreview from './components/JsonPreview';
import Toolbar from './components/Toolbar';
import RippleButton from './components/RippleButton';

const initialData: FlowchartData = {
  version: '1.0.0',
  nodes: [],
  connections: [],
};

const App: React.FC = () => {
  const [data, setData] = useState<FlowchartData>(initialData);
  const [currentTool, setCurrentTool] = useState<ToolType>('draw');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [divider, setDivider] = useState<DividerState>({ leftPercent: 70, isDragging: false });
  const [isMobile, setIsMobile] = useState(false);
  const [jsonPanelVisible, setJsonPanelVisible] = useState(true);
  const [rippleKey, setRippleKey] = useState(0);
  const canvasManagerRef = useRef<CanvasManager | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleDataChange = useCallback((newData: FlowchartData) => {
    setData(newData);
  }, []);

  const handleExport = useCallback(() => {
    exportToJson(data);
    setRippleKey(k => k + 1);
  }, [data]);

  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setDivider(d => ({ ...d, isDragging: true }));

    const handleMouseMove = (ev: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const percent = ((ev.clientX - rect.left) / rect.width) * 100;
      const clamped = Math.max(30, Math.min(80, percent));
      setDivider(d => ({ ...d, leftPercent: clamped }));
    };

    const handleMouseUp = () => {
      setDivider(d => ({ ...d, isDragging: false }));
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (canvasManagerRef.current) {
        canvasManagerRef.current.handleResize();
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, []);

  const handleNodeSelect = useCallback((nodeId: string | null) => {
    setSelectedNodeId(nodeId);
    setSelectedConnectionId(null);
    if (canvasManagerRef.current) {
      canvasManagerRef.current.setSelectedNodeId(nodeId);
      canvasManagerRef.current.setSelectedConnectionId(null);
    }
  }, []);

  const handleConnectionSelect = useCallback((connId: string | null) => {
    setSelectedConnectionId(connId);
    setSelectedNodeId(null);
    if (canvasManagerRef.current) {
      canvasManagerRef.current.setSelectedConnectionId(connId);
      canvasManagerRef.current.setSelectedNodeId(null);
    }
  }, []);

  const selectedNode = data.nodes.find(n => n.id === selectedNodeId);

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#1e1e2e',
        color: '#cdd6f4',
        fontFamily: "'Inter', sans-serif",
        overflow: 'hidden',
      }}
    >
      <style>{`
        @keyframes fadeInNode {
          from { opacity: 0; transform: translateX(8px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeOutNode {
          from { opacity: 1; background-color: rgba(243, 139, 168, 0.3); }
          to { opacity: 0; background-color: transparent; }
        }
        @keyframes dashBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #181825; }
        ::-webkit-scrollbar-thumb { background: #45475a; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #585b70; }
      `}</style>

      <Toolbar
        currentTool={currentTool}
        onToolChange={setCurrentTool}
        onExport={handleExport}
      />

      <div
        ref={containerRef}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          style={{
            flex: isMobile ? 'none' : 'none',
            width: isMobile ? '100%' : `${divider.leftPercent}%`,
            height: isMobile ? (jsonPanelVisible ? '60%' : '100%') : '100%',
            position: 'relative',
            transition: divider.isDragging ? 'none' : 'width 200ms ease-out',
            minWidth: 0,
          }}
        >
          <Canvas
            data={data}
            currentTool={currentTool}
            onDataChange={handleDataChange}
            onNodeSelect={handleNodeSelect}
            onConnectionSelect={handleConnectionSelect}
            canvasManagerRef={canvasManagerRef}
          />

          {selectedNode && (
            <div
              style={{
                position: 'absolute',
                bottom: '12px',
                left: '12px',
                background: '#2b2b3cee',
                borderRadius: '8px',
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <span style={{ fontSize: '12px', color: '#6c7086' }}>标签:</span>
              <input
                type="text"
                value={selectedNode.label}
                onChange={e => {
                  if (canvasManagerRef.current) {
                    canvasManagerRef.current.updateNodeLabel(selectedNode.id, e.target.value);
                    setData(canvasManagerRef.current.getData());
                  }
                }}
                placeholder="输入文本..."
                style={{
                  background: '#1e1e2e',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  color: '#cdd6f4',
                  fontSize: '12px',
                  outline: 'none',
                  width: '120px',
                  fontFamily: "'Inter', sans-serif",
                }}
              />
              <span
                style={{
                  fontSize: '11px',
                  color: SHAPE_COLORS_DISPLAY[selectedNode.type],
                  background: SHAPE_COLORS_DISPLAY[selectedNode.type] + '22',
                  padding: '2px 6px',
                  borderRadius: '4px',
                }}
              >
                {selectedNode.type}
              </span>
            </div>
          )}
        </div>

        {!isMobile && (
          <div
            onMouseDown={handleDividerMouseDown}
            style={{
              width: divider.isDragging ? '4px' : '2px',
              cursor: 'col-resize',
              background: divider.isDragging
                ? '#89b4fa'
                : 'rgba(255,255,255,0.08)',
              transition: divider.isDragging ? 'none' : 'all 200ms ease-out',
              flexShrink: 0,
              position: 'relative',
              zIndex: 10,
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '8px',
                height: '40px',
                borderRadius: '4px',
                background: divider.isDragging ? '#89b4fa' : 'rgba(255,255,255,0.12)',
                cursor: 'col-resize',
                transition: 'all 200ms ease-out',
              }}
            />
          </div>
        )}

        {isMobile && jsonPanelVisible && (
          <div
            style={{
              height: '4px',
              background: '#89b4fa44',
              cursor: 'row-resize',
              flexShrink: 0,
            }}
          />
        )}

        <div
          style={{
            width: isMobile ? '100%' : `${100 - divider.leftPercent}%`,
            height: isMobile ? (jsonPanelVisible ? '40%' : '0') : '100%',
            background: '#181825',
            borderLeft: isMobile ? 'none' : '1px solid rgba(255,255,255,0.04)',
            borderTop: isMobile ? '1px solid rgba(255,255,255,0.04)' : 'none',
            overflow: 'hidden',
            transition: divider.isDragging ? 'none' : 'width 200ms ease-out',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              background: '#2b2b3c',
              borderBottom: '1px solid rgba(255,255,255,0.04)',
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#89b4fa',
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              JSON 预览
            </span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: '#6c7086' }}>
                {data.nodes.length} 节点 · {data.connections.length} 连线
              </span>
              {isMobile && (
                <button
                  onClick={() => setJsonPanelVisible(false)}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '4px',
                    color: '#6c7086',
                    cursor: 'pointer',
                    padding: '2px 8px',
                    fontSize: '11px',
                  }}
                >
                  收起
                </button>
              )}
            </div>
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <JsonPreview data={data} />
          </div>
        </div>

        {isMobile && !jsonPanelVisible && (
          <button
            onClick={() => setJsonPanelVisible(true)}
            style={{
              position: 'absolute',
              bottom: '12px',
              right: '12px',
              background: '#2b2b3c',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: '#89b4fa',
              padding: '8px 14px',
              cursor: 'pointer',
              fontSize: '12px',
              fontFamily: "'Inter', sans-serif",
              zIndex: 20,
              transition: 'all 200ms ease-out',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.02)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
            }}
          >
            📋 查看 JSON
          </button>
        )}
      </div>
    </div>
  );
};

const SHAPE_COLORS_DISPLAY: Record<string, string> = {
  'rectangle': '#89b4fa',
  'diamond': '#a6e3a1',
  'rounded-rectangle': '#89b4fa',
};

export default App;
