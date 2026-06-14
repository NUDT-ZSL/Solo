import React, { useState, useCallback, useEffect } from 'react';
import { NodeData, Connection, NodeType, NodeConfig, NodeOutput, ChartConfig, TOOL_NODES } from './types';
import { runPipeline } from './dataflow';
import ToolPanel from './components/ToolPanel';
import Canvas from './components/Canvas';
import ResultPanel from './components/ResultPanel';
import NodeConfigModal from './components/NodeConfigModal';

let nodeIdCounter = 0;
function generateNodeId(): string {
  nodeIdCounter++;
  return `node-${Date.now()}-${nodeIdCounter}`;
}

const App: React.FC = () => {
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [executing, setExecuting] = useState(false);
  const [results, setResults] = useState<Map<string, NodeOutput>>(new Map());
  const [configModalNodeId, setConfigModalNodeId] = useState<string | null>(null);
  const [toolPanelOpen, setToolPanelOpen] = useState(false);
  const [resultPanelOpen, setResultPanelOpen] = useState(false);
  const [isNarrowScreen, setIsNarrowScreen] = useState(false);

  useEffect(() => {
    const checkScreen = () => {
      setIsNarrowScreen(window.innerWidth < 1024);
    };
    checkScreen();
    window.addEventListener('resize', checkScreen);
    return () => window.removeEventListener('resize', checkScreen);
  }, []);

  const handleNodeAdd = useCallback((type: NodeType, x: number, y: number) => {
    const toolDef = TOOL_NODES.find((t) => t.type === type);
    if (!toolDef) return;

    const newNode: NodeData = {
      id: generateNodeId(),
      type,
      position: { x, y },
      config: { ...toolDef.defaultConfig },
      status: 'idle',
    };

    setNodes((prev) => [...prev, newNode]);
  }, []);

  const handleNodeMove = useCallback((nodeId: string, x: number, y: number) => {
    setNodes((prev) =>
      prev.map((n) => (n.id === nodeId ? { ...n, position: { x, y } } : n))
    );
  }, []);

  const handleNodeSelect = useCallback((nodeId: string | null) => {
    setSelectedNodeId(nodeId);
  }, []);

  const handleNodeDelete = useCallback((nodeId: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== nodeId));
    setConnections((prev) => prev.filter((c) => c.sourceNodeId !== nodeId && c.targetNodeId !== nodeId));
    setSelectedNodeId(null);
    setResults((prev) => {
      const next = new Map(prev);
      next.delete(nodeId);
      return next;
    });
  }, []);

  const handleConnectionAdd = useCallback((connection: Connection) => {
    setConnections((prev) => [...prev, connection]);
  }, []);

  const handleConnectionDelete = useCallback((connectionId: string) => {
    setConnections((prev) => prev.filter((c) => c.id !== connectionId));
  }, []);

  const handleNodeDoubleClick = useCallback((nodeId: string) => {
    setConfigModalNodeId(nodeId);
  }, []);

  const handleConfigSave = useCallback((nodeId: string, config: NodeConfig) => {
    setNodes((prev) =>
      prev.map((n) => (n.id === nodeId ? { ...n, config } : n))
    );
    setConfigModalNodeId(null);
  }, []);

  const handleConfigClose = useCallback(() => {
    setConfigModalNodeId(null);
  }, []);

  const handleRun = useCallback(async () => {
    if (executing || nodes.length === 0) return;

    setExecuting(true);
    setResults(new Map());

    setNodes((prev) => prev.map((n) => ({ ...n, status: 'idle' as const })));

    try {
      const { results: execResults, nodeStatuses } = await runPipeline(
        nodes,
        connections,
        (nodeId) => {
          setNodes((prev) =>
            prev.map((n) => (n.id === nodeId ? { ...n, status: 'running' as const } : n))
          );
        },
        (nodeId, success, error) => {
          setNodes((prev) =>
            prev.map((n) =>
              n.id === nodeId
                ? { ...n, status: success ? ('success' as const) : ('error' as const), errorMessage: error }
                : n
            )
          );
        }
      );

      setResults(execResults);

      if (isNarrowScreen) {
        setResultPanelOpen(true);
      }
    } finally {
      setExecuting(false);
    }
  }, [executing, nodes, connections, isNarrowScreen]);

  const configModalNode = configModalNodeId
    ? nodes.find((n) => n.id === configModalNodeId) || null
    : null;

  const lastResultNodeId = selectedNodeId || (nodes.length > 0 ? nodes[nodes.length - 1].id : null);
  const lastResultNode = lastResultNodeId ? nodes.find((n) => n.id === lastResultNodeId) : null;
  const lastResultOutput = lastResultNodeId ? results.get(lastResultNodeId) || null : null;
  const lastChartConfig = lastResultNode?.type === 'chart' ? (lastResultNode.config as ChartConfig) : undefined;

  const toggleToolPanel = () => {
    setToolPanelOpen((prev) => !prev);
    if (resultPanelOpen) setResultPanelOpen(false);
  };

  const toggleResultPanel = () => {
    setResultPanelOpen((prev) => !prev);
    if (toolPanelOpen) setToolPanelOpen(false);
  };

  return (
    <div className="app-container">
      <div className="top-bar">
        <div className="top-bar-left">
          {isNarrowScreen && (
            <button className="hamburger-btn" onClick={toggleToolPanel} title="工具面板">
              ☰
            </button>
          )}
          <h1 className="app-title">FlowCanvas</h1>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {isNarrowScreen && (
            <button className="hamburger-btn" onClick={toggleResultPanel} title="结果面板">
              📊
            </button>
          )}
          <button className="run-btn" onClick={handleRun} disabled={executing}>
            {executing ? '执行中...' : '▶ 运行'}
          </button>
        </div>
      </div>

      <div className="main-content">
        <ToolPanel isOpen={isNarrowScreen ? toolPanelOpen : true} />

        {(isNarrowScreen && (toolPanelOpen || resultPanelOpen)) && (
          <div
            className="drawer-overlay visible"
            onClick={() => {
              setToolPanelOpen(false);
              setResultPanelOpen(false);
            }}
          />
        )}

        <Canvas
          nodes={nodes}
          connections={connections}
          selectedNodeId={selectedNodeId}
          onNodeMove={handleNodeMove}
          onNodeSelect={handleNodeSelect}
          onNodeAdd={handleNodeAdd}
          onNodeDelete={handleNodeDelete}
          onConnectionAdd={handleConnectionAdd}
          onConnectionDelete={handleConnectionDelete}
          onNodeDoubleClick={handleNodeDoubleClick}
        />

        <ResultPanel
          isOpen={isNarrowScreen ? resultPanelOpen : true}
          nodeId={lastResultNodeId}
          nodeType={lastResultNode?.type || null}
          output={lastResultOutput}
          chartConfig={lastChartConfig}
        />
      </div>

      {configModalNode && (
        <NodeConfigModal
          node={configModalNode}
          onSave={handleConfigSave}
          onClose={handleConfigClose}
        />
      )}
    </div>
  );
};

export default App;
