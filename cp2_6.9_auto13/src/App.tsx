import { useState, useCallback } from 'react';
import FlowCanvas from './components/FlowCanvas';
import Toolbar from './components/Toolbar';
import type { FlowNode, FlowEdge, NodeType } from './types';
import { calculateLayout, animatePositions } from './utils/layout';

function generateId(): string {
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export default function App() {
  const [nodes, setNodes] = useState<FlowNode[]>([]);
  const [edges, setEdges] = useState<FlowEdge[]>([]);
  const [selectedTool, setSelectedTool] = useState<NodeType | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const addNode = useCallback((type: NodeType, x: number, y: number) => {
    const node: FlowNode = {
      id: generateId(),
      type,
      x,
      y,
      text: type === 'rectangle' ? '矩形节点' : type === 'diamond' ? '判断节点' : '圆形节点',
      width: type === 'circle' ? 80 : 120,
      height: type === 'circle' ? 80 : 80,
    };
    setNodes((prev) => [...prev, node]);
    return node.id;
  }, []);

  const updateNodePosition = useCallback((id: string, x: number, y: number) => {
    setNodes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, x, y } : n))
    );
  }, []);

  const updateNodeText = useCallback((id: string, text: string) => {
    setNodes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, text } : n))
    );
  }, []);

  const addEdge = useCallback((source: string, target: string) => {
    if (source === target) return;
    const exists = edges.some(
      (e) => e.source === source && e.target === target
    );
    if (exists) return;
    const edge: FlowEdge = {
      id: generateId(),
      source,
      target,
      label: '',
    };
    setEdges((prev) => [...prev, edge]);
  }, [edges]);

  const updateEdgeLabel = useCallback((id: string, label: string) => {
    setEdges((prev) =>
      prev.map((e) => (e.id === id ? { ...e, label } : e))
    );
  }, []);

  const deleteSelected = useCallback(() => {
    if (selectedNodeId) {
      setNodes((prev) => prev.filter((n) => n.id !== selectedNodeId));
      setEdges((prev) =>
        prev.filter(
          (e) => e.source !== selectedNodeId && e.target !== selectedNodeId
        )
      );
      setSelectedNodeId(null);
    }
    if (selectedEdgeId) {
      setEdges((prev) => prev.filter((e) => e.id !== selectedEdgeId));
      setSelectedEdgeId(null);
    }
  }, [selectedNodeId, selectedEdgeId]);

  const clearCanvas = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setSelectedTool(null);
  }, []);

  const autoArrange = useCallback(() => {
    if (nodes.length === 0 || isAnimating) return;
    const canvasWidth = window.innerWidth - 60;
    const canvasHeight = window.innerHeight;
    const positions = calculateLayout(nodes, edges, canvasWidth, canvasHeight);

    setIsAnimating(true);
    animatePositions(
      nodes,
      positions,
      400,
      (updated) => setNodes(updated),
      () => setIsAnimating(false)
    );
  }, [nodes, edges, isAnimating]);

  const handleCanvasClick = useCallback(
    (x: number, y: number) => {
      if (selectedTool) {
        addNode(selectedTool, x, y);
      } else {
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
      }
    },
    [selectedTool, addNode]
  );

  const handleToolSelect = useCallback((tool: NodeType | null) => {
    setSelectedTool((prev) => (prev === tool ? null : tool));
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
  }, []);

  return (
    <div className="app-container">
      <Toolbar
        selectedTool={selectedTool}
        onToolSelect={handleToolSelect}
        onClear={clearCanvas}
        onAutoArrange={autoArrange}
        onDelete={deleteSelected}
        nodes={nodes}
        edges={edges}
      />
      <div className="canvas-wrapper">
        <FlowCanvas
          nodes={nodes}
          edges={edges}
          selectedNodeId={selectedNodeId}
          selectedEdgeId={selectedEdgeId}
          activeTool={selectedTool}
          onCanvasClick={handleCanvasClick}
          onNodeSelect={setSelectedNodeId}
          onEdgeSelect={setSelectedEdgeId}
          onNodeMove={updateNodePosition}
          onNodeTextEdit={updateNodeText}
          onEdgeLabelEdit={updateEdgeLabel}
          onAddEdge={addEdge}
          onDelete={deleteSelected}
        />
      </div>
    </div>
  );
}
