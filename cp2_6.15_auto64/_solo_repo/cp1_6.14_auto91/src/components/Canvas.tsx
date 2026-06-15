import React, { useRef, useState, useCallback, useEffect } from 'react';
import { NodeData, Connection, NodeType, TOOL_NODES } from '../types';

const NODE_WIDTH = 180;
const NODE_HEADER_HEIGHT = 36;
const NODE_BODY_HEIGHT = 48;
const NODE_HEIGHT = NODE_HEADER_HEIGHT + NODE_BODY_HEIGHT;
const PORT_RADIUS = 6;
const GRID_SIZE = 20;

interface CanvasProps {
  nodes: NodeData[];
  connections: Connection[];
  selectedNodeId: string | null;
  onNodeMove: (nodeId: string, x: number, y: number) => void;
  onNodeSelect: (nodeId: string | null) => void;
  onNodeAdd: (type: NodeType, x: number, y: number) => void;
  onNodeDelete: (nodeId: string) => void;
  onConnectionAdd: (connection: Connection) => void;
  onConnectionDelete: (connectionId: string) => void;
  onNodeDoubleClick: (nodeId: string) => void;
}

interface DragState {
  type: 'node' | 'canvas' | 'port' | null;
  nodeId?: string;
  startMouseX: number;
  startMouseY: number;
  startNodeX?: number;
  startNodeY?: number;
  startPanX?: number;
  startPanY?: number;
  sourceNodeId?: string;
  sourcePort?: string;
}

const Canvas: React.FC<CanvasProps> = ({
  nodes,
  connections,
  selectedNodeId,
  onNodeMove,
  onNodeSelect,
  onNodeAdd,
  onNodeDelete,
  onConnectionAdd,
  onConnectionDelete,
  onNodeDoubleClick,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [dragState, setDragState] = useState<DragState>({ type: null, startMouseX: 0, startMouseY: 0 });
  const [tempConnection, setTempConnection] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [hoveredPort, setHoveredPort] = useState<{ nodeId: string; portType: 'input' | 'output' } | null>(null);

  const getSVGPoint = useCallback((clientX: number, clientY: number): { x: number; y: number } => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    return {
      x: (clientX - rect.left - pan.x) / zoom,
      y: (clientY - rect.top - pan.y) / zoom,
    };
  }, [pan, zoom]);

  const handleDrop = useCallback((e: React.DragEvent<SVGSVGElement>) => {
    e.preventDefault();
    const nodeType = e.dataTransfer.getData('application/flowcanvas-node-type') || e.dataTransfer.getData('text/plain') as NodeType;
    if (!nodeType) return;

    const point = getSVGPoint(e.clientX, e.clientY);
    onNodeAdd(nodeType, point.x - NODE_WIDTH / 2, point.y - NODE_HEIGHT / 2);
  }, [getSVGPoint, onNodeAdd]);

  const handleDragOver = useCallback((e: React.DragEvent<SVGSVGElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom((prev) => Math.max(0.5, Math.min(2.0, prev + delta)));
  }, []);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (e.target === svgRef.current || (e.target as Element).classList.contains('canvas-bg')) {
      onNodeSelect(null);
      setDragState({
        type: 'canvas',
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        startPanX: pan.x,
        startPanY: pan.y,
      });
    }
  }, [pan, onNodeSelect]);

  const handleNodeMouseDown = useCallback((e: React.MouseEvent<SVGGElement>, nodeId: string) => {
    e.stopPropagation();
    onNodeSelect(nodeId);

    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;

    setDragState({
      type: 'node',
      nodeId,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startNodeX: node.position.x,
      startNodeY: node.position.y,
    });
  }, [nodes, onNodeSelect]);

  const handlePortMouseDown = useCallback((e: React.MouseEvent<SVGCircleElement>, nodeId: string, portType: 'input' | 'output') => {
    e.stopPropagation();
    e.preventDefault();

    if (portType === 'output') {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;

      const portX = node.position.x + NODE_WIDTH;
      const portY = node.position.y + NODE_HEADER_HEIGHT + NODE_BODY_HEIGHT / 2;

      setDragState({
        type: 'port',
        sourceNodeId: nodeId,
        sourcePort: 'output',
        startMouseX: e.clientX,
        startMouseY: e.clientY,
      });

      setTempConnection({
        x1: portX,
        y1: portY,
        x2: portX,
        y2: portY,
      });
    }
  }, [nodes]);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!dragState.type) return;

    if (dragState.type === 'canvas') {
      const dx = e.clientX - dragState.startMouseX;
      const dy = e.clientY - dragState.startMouseY;
      setPan({
        x: (dragState.startPanX ?? 0) + dx,
        y: (dragState.startPanY ?? 0) + dy,
      });
    } else if (dragState.type === 'node' && dragState.nodeId) {
      const dx = (e.clientX - dragState.startMouseX) / zoom;
      const dy = (e.clientY - dragState.startMouseY) / zoom;
      const newX = Math.round(((dragState.startNodeX ?? 0) + dx) / GRID_SIZE) * GRID_SIZE;
      const newY = Math.round(((dragState.startNodeY ?? 0) + dy) / GRID_SIZE) * GRID_SIZE;
      onNodeMove(dragState.nodeId, newX, newY);
    } else if (dragState.type === 'port' && tempConnection && dragState.sourceNodeId) {
      const point = getSVGPoint(e.clientX, e.clientY);
      setTempConnection({
        ...tempConnection,
        x2: point.x,
        y2: point.y,
      });
    }
  }, [dragState, zoom, onNodeMove, tempConnection, getSVGPoint]);

  const handleMouseUp = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (dragState.type === 'port' && dragState.sourceNodeId) {
      const point = getSVGPoint(e.clientX, e.clientY);

      let targetNodeId: string | null = null;
      for (const node of nodes) {
        const inputPortX = node.position.x;
        const inputPortY = node.position.y + NODE_HEADER_HEIGHT + NODE_BODY_HEIGHT / 2;
        const dist = Math.sqrt((point.x - inputPortX) ** 2 + (point.y - inputPortY) ** 2);
        if (dist < 20 && node.id !== dragState.sourceNodeId) {
          targetNodeId = node.id;
          break;
        }
      }

      if (targetNodeId) {
        const toolDef = TOOL_NODES.find((t) => t.type === nodes.find((n) => n.id === targetNodeId)?.type);
        if (toolDef?.hasInput) {
          const alreadyConnected = connections.some(
            (c) => c.targetNodeId === targetNodeId && c.targetPort === 'input'
          );
          if (!alreadyConnected) {
            const newConnection: Connection = {
              id: `conn-${Date.now()}`,
              sourceNodeId: dragState.sourceNodeId,
              sourcePort: 'output',
              targetNodeId,
              targetPort: 'input',
            };
            onConnectionAdd(newConnection);
          }
        }
      }
    }

    setDragState({ type: null, startMouseX: 0, startMouseY: 0 });
    setTempConnection(null);
  }, [dragState, nodes, connections, getSVGPoint, onConnectionAdd]);

  const handleNodeDoubleClick = useCallback((e: React.MouseEvent<SVGGElement>, nodeId: string) => {
    e.stopPropagation();
    onNodeDoubleClick(nodeId);
  }, [onNodeDoubleClick]);

  const handleConnectionClick = useCallback((e: React.MouseEvent<SVGPathElement>, connectionId: string) => {
    e.stopPropagation();
    onConnectionDelete(connectionId);
  }, [onConnectionDelete]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeId) {
      onNodeDelete(selectedNodeId);
    }
  }, [selectedNodeId, onNodeDelete]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown as unknown as EventListener);
    return () => window.removeEventListener('keydown', handleKeyDown as unknown as EventListener);
  }, [handleKeyDown]);

  const getBezierPath = (x1: number, y1: number, x2: number, y2: number): string => {
    const dx = Math.abs(x2 - x1) * 0.5;
    const cp1x = x1 + dx;
    const cp1y = y1;
    const cp2x = x2 - dx;
    const cp2y = y2;
    return `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`;
  };

  const renderGrid = () => {
    const patterns = [];
    const size = GRID_SIZE * zoom;
    const offsetX = pan.x % size;
    const offsetY = pan.y % size;

    patterns.push(
      <pattern key="grid" id="grid" width={size} height={size} patternUnits="userSpaceOnUse" x={offsetX} y={offsetY}>
        <circle cx={size / 2} cy={size / 2} r={1} fill="#d0d0d0" />
      </pattern>
    );

    return patterns;
  };

  const getNodeIcon = (type: NodeType): string => {
    return TOOL_NODES.find((t) => t.type === type)?.icon || '📦';
  };

  const getNodeLabel = (type: NodeType): string => {
    return TOOL_NODES.find((t) => t.type === type)?.label || type;
  };

  const getNodeDef = (type: NodeType) => {
    return TOOL_NODES.find((t) => t.type === type);
  };

  const renderNode = (node: NodeData) => {
    const isSelected = selectedNodeId === node.id;
    const nodeDef = getNodeDef(node.type);
    const hasInput = nodeDef?.hasInput ?? false;
    const hasOutput = nodeDef?.hasOutput ?? false;
    const icon = getNodeIcon(node.type);
    const label = getNodeLabel(node.type);

    const inputPortX = node.position.x;
    const inputPortY = node.position.y + NODE_HEADER_HEIGHT + NODE_BODY_HEIGHT / 2;
    const outputPortX = node.position.x + NODE_WIDTH;
    const outputPortY = node.position.y + NODE_HEADER_HEIGHT + NODE_BODY_HEIGHT / 2;

    return (
      <g
        key={node.id}
        className={`canvas-node ${isSelected ? 'selected' : ''} ${node.status}`}
        onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
        onDoubleClick={(e) => handleNodeDoubleClick(e, node.id)}
      >
        <rect
          className="canvas-node-body"
          x={node.position.x}
          y={node.position.y}
          width={NODE_WIDTH}
          height={NODE_HEIGHT}
          rx={16}
          ry={16}
        />
        <rect
          className="canvas-node-header"
          x={node.position.x}
          y={node.position.y}
          width={NODE_WIDTH}
          height={NODE_HEADER_HEIGHT}
          rx={16}
          ry={16}
        />
        <rect
          className="canvas-node-header"
          x={node.position.x}
          y={node.position.y + NODE_HEADER_HEIGHT - 8}
          width={NODE_WIDTH}
          height={8}
        />
        <text
          className="canvas-node-icon-text"
          x={node.position.x + 20}
          y={node.position.y + NODE_HEADER_HEIGHT / 2}
        >
          {icon}
        </text>
        <text
          className="canvas-node-title"
          x={node.position.x + 42}
          y={node.position.y + NODE_HEADER_HEIGHT / 2}
          dominantBaseline="central"
        >
          {label}
        </text>
        {node.status === 'success' && (
          <text
            x={node.position.x + NODE_WIDTH - 20}
            y={node.position.y + NODE_HEADER_HEIGHT / 2}
            dominantBaseline="central"
            fontSize={14}
          >
            ✓
          </text>
        )}
        {node.status === 'error' && (
          <text
            x={node.position.x + NODE_WIDTH - 20}
            y={node.position.y + NODE_HEADER_HEIGHT / 2}
            dominantBaseline="central"
            fontSize={14}
          >
            ✗
          </text>
        )}

        {hasInput && (
          <g>
            <circle
              className="port"
              cx={inputPortX}
              cy={inputPortY}
              r={PORT_RADIUS}
              onMouseEnter={() => setHoveredPort({ nodeId: node.id, portType: 'input' })}
              onMouseLeave={() => setHoveredPort(null)}
              fill={hoveredPort?.nodeId === node.id && hoveredPort?.portType === 'input' ? '#00d1b2' : '#666666'}
            />
            <text
              className="port-label"
              x={inputPortX + 12}
              y={inputPortY}
              dominantBaseline="central"
            >
              输入
            </text>
          </g>
        )}

        {hasOutput && (
          <g>
            <circle
              className="port"
              cx={outputPortX}
              cy={outputPortY}
              r={PORT_RADIUS}
              onMouseDown={(e) => handlePortMouseDown(e, node.id, 'output')}
              onMouseEnter={() => setHoveredPort({ nodeId: node.id, portType: 'output' })}
              onMouseLeave={() => setHoveredPort(null)}
              fill={hoveredPort?.nodeId === node.id && hoveredPort?.portType === 'output' ? '#00d1b2' : '#666666'}
            />
            <text
              className="port-label"
              x={outputPortX - 12}
              y={outputPortY}
              dominantBaseline="central"
              textAnchor="end"
            >
              输出
            </text>
          </g>
        )}
      </g>
    );
  };

  const renderConnection = (conn: Connection) => {
    const sourceNode = nodes.find((n) => n.id === conn.sourceNodeId);
    const targetNode = nodes.find((n) => n.id === conn.targetNodeId);
    if (!sourceNode || !targetNode) return null;

    const x1 = sourceNode.position.x + NODE_WIDTH;
    const y1 = sourceNode.position.y + NODE_HEADER_HEIGHT + NODE_BODY_HEIGHT / 2;
    const x2 = targetNode.position.x;
    const y2 = targetNode.position.y + NODE_HEADER_HEIGHT + NODE_BODY_HEIGHT / 2;

    return (
      <path
        key={conn.id}
        className="connection-path"
        d={getBezierPath(x1, y1, x2, y2)}
        onClick={(e) => handleConnectionClick(e, conn.id)}
      />
    );
  };

  const renderTempConnection = () => {
    if (!tempConnection) return null;
    return (
      <path
        className="temp-connection"
        d={getBezierPath(tempConnection.x1, tempConnection.y1, tempConnection.x2, tempConnection.y2)}
      />
    );
  };

  return (
    <div className="canvas-container">
      <svg
        ref={svgRef}
        className="canvas-svg"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onWheel={handleWheel}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        tabIndex={0}
      >
        <defs>
          {renderGrid()}
        </defs>
        <rect
          className="canvas-bg"
          x={0}
          y={0}
          width="100%"
          height="100%"
          fill="url(#grid)"
        />
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {connections.map(renderConnection)}
          {renderTempConnection()}
          {nodes.map(renderNode)}
        </g>
      </svg>
    </div>
  );
};

export default Canvas;
