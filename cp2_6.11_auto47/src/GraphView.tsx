import React, { useState, useRef, useEffect } from 'react';
import type { MindMapNode, MindMapConnection } from './types';

interface GraphViewProps {
  nodes: MindMapNode[];
  connections: MindMapConnection[];
  onNodesChange: (nodes: MindMapNode[]) => void;
  onConnectionsChange: (connections: MindMapConnection[]) => void;
  onAddNode: (title: string, x: number, y: number) => void;
}

interface Point {
  x: number;
  y: number;
}

const GraphView: React.FC<GraphViewProps> = ({ nodes, connections, onNodesChange, onConnectionsChange, onAddNode }) => {
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 });
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<Point>({ x: 0, y: 0 });
  const [hoveredConnection, setHoveredConnection] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const getContainerPoint = (clientX: number, clientY: number): Point => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const getNodeCenter = (node: MindMapNode): Point => ({
    x: node.x + 75,
    y: node.y + 28,
  });

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    const point = getContainerPoint(e.clientX, e.clientY);
    setDraggingNodeId(nodeId);
    setDragOffset({
      x: point.x - node.x,
      y: point.y - node.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const point = getContainerPoint(e.clientX, e.clientY);
    setMousePos(point);

    if (draggingNodeId) {
      const newX = Math.max(0, point.x - dragOffset.x);
      const newY = Math.max(60, point.y - dragOffset.y);
      onNodesChange(
        nodes.map(n =>
          n.id === draggingNodeId ? { ...n, x: newX, y: newY } : n
        )
      );
    }
  };

  const handleMouseUp = () => {
    setDraggingNodeId(null);
    setConnectingFrom(null);
  };

  const handleNodeDoubleClick = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      setEditingNodeId(nodeId);
      setEditValue(node.title);
    }
  };

  const handleEditBlur = (nodeId: string) => {
    if (editValue.trim()) {
      onNodesChange(nodes.map(n => (n.id === nodeId ? { ...n, title: editValue.trim() } : n)));
    }
    setEditingNodeId(null);
    setEditValue('');
  };

  const handleConnectionStart = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    e.preventDefault();
    setConnectingFrom(nodeId);
  };

  const handleNodeMouseUpForConnect = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (connectingFrom && connectingFrom !== nodeId) {
      const exists = connections.some(
        c =>
          (c.fromId === connectingFrom && c.toId === nodeId) ||
          (c.fromId === nodeId && c.toId === connectingFrom)
      );
      if (!exists) {
        onConnectionsChange([
          ...connections,
          {
            id: `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            fromId: connectingFrom,
            toId: nodeId,
          },
        ]);
      }
      setConnectingFrom(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const text = e.dataTransfer.getData('text/plain');
    if (!text) return;
    const point = getContainerPoint(e.clientX, e.clientY);
    const x = Math.max(20, point.x - 75);
    const y = Math.max(80, point.y - 28);
    const title = text.slice(0, 20) + (text.length > 20 ? '...' : '');
    onAddNode(title, x, y);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDeleteConnection = (connId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('确定删除这条连线吗？')) {
      onConnectionsChange(connections.filter(c => c.id !== connId));
    }
  };

  const renderBezierPath = (from: MindMapNode, to: MindMapNode, id: string, isHovered: boolean) => {
    const start = getNodeCenter(from);
    const end = getNodeCenter(to);

    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const cx1 = start.x + dx * 0.5;
    const cy1 = start.y;
    const cx2 = end.x - dx * 0.5;
    const cy2 = end.y;

    const d = `M ${start.x} ${start.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${end.x} ${end.y}`;
    const gradientId = `grad-${id}`;

    return (
      <g key={id}>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3498DB" />
            <stop offset="100%" stopColor="#9B59B6" />
          </linearGradient>
        </defs>
        <path
          d={d}
          fill="none"
          stroke="transparent"
          strokeWidth="16"
          style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
          onClick={(e) => handleDeleteConnection(id, e)}
          onMouseEnter={() => setHoveredConnection(id)}
          onMouseLeave={() => setHoveredConnection(null)}
        />
        <path
          d={d}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth="2"
          strokeDasharray={isHovered ? '8,4' : 'none'}
          className={isHovered ? 'graph-view-connection-hovered' : ''}
          style={{
            pointerEvents: 'none',
            transition: 'stroke-dasharray 0.2s ease-out, opacity 0.2s ease-out',
            opacity: isHovered ? 1 : 1,
          }}
        />
        <circle cx={start.x} cy={start.y} r="4" fill="#3498DB" style={{ pointerEvents: 'none' }} />
        <circle cx={end.x} cy={end.y} r="4" fill="#9B59B6" style={{ pointerEvents: 'none' }} />
      </g>
    );
  };

  const renderTempConnection = () => {
    if (!connectingFrom) return null;
    const fromNode = nodes.find(n => n.id === connectingFrom);
    if (!fromNode) return null;
    const start = getNodeCenter(fromNode);
    const dx = mousePos.x - start.x;
    const dy = mousePos.y - start.y;
    const cx1 = start.x + dx * 0.5;
    const cy1 = start.y;
    const cx2 = mousePos.x - dx * 0.5;
    const cy2 = mousePos.y;
    const d = `M ${start.x} ${start.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${mousePos.x} ${mousePos.y}`;

    return (
      <path
        d={d}
        fill="none"
        stroke="#3498DB"
        strokeWidth="2"
        strokeDasharray="6,3"
        opacity="0.8"
        style={{ pointerEvents: 'none' }}
      />
    );
  };

  return (
    <div className="graph-view-container">
      <style>{`
        .graph-view-container {
          position: relative;
          width: 100%;
          height: 100%;
          background: #F5F0E8;
          overflow: hidden;
        }
        .graph-view-header {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          padding: 16px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          z-index: 10;
          border-bottom: 1px solid #BDC3C7;
          background: rgba(245, 240, 232, 0.95);
          backdrop-filter: blur(8px);
        }
        .graph-view-title {
          font-size: 16px;
          font-weight: 600;
          color: #2C3E50;
        }
        .graph-view-hint {
          font-size: 12px;
          color: #7F8C8D;
        }
        .graph-view-svg {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }
        .graph-view-svg path {
          pointer-events: stroke;
        }
        .graph-view-node {
          position: absolute;
          min-width: 150px;
          max-width: 200px;
          padding: 12px 16px;
          background: linear-gradient(135deg, #FFFFFF 0%, #F0F0F0 100%);
          border-radius: 12px;
          box-shadow: 2px 2px 8px rgba(0,0,0,0.12);
          transition: box-shadow 0.3s ease-out, transform 0.1s ease-out;
          user-select: none;
          border: 1px solid #BDC3C7;
          z-index: 5;
        }
        .graph-view-node:hover {
          box-shadow: 4px 4px 16px rgba(0,0,0,0.18);
        }
        .graph-view-node.dragging {
          transition: none;
          z-index: 20;
          box-shadow: 8px 8px 24px rgba(0,0,0,0.2);
        }
        .graph-view-node-title {
          font-size: 14px;
          font-weight: 500;
          color: #2C3E50;
          line-height: 1.4;
        }
        .graph-view-node-input {
          width: 100%;
          border: 1px solid #3498DB;
          border-radius: 4px;
          padding: 4px 8px;
          font-size: 14px;
          outline: none;
          background: #FFFFFF;
          color: #2C3E50;
        }
        .graph-view-connect-handle {
          position: absolute;
          right: -10px;
          top: 50%;
          transform: translateY(-50%);
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: linear-gradient(135deg, #3498DB, #9B59B6);
          cursor: crosshair;
          border: 3px solid #FFFFFF;
          box-shadow: 0 2px 6px rgba(0,0,0,0.25);
          z-index: 6;
          transition: transform 0.2s ease-out, box-shadow 0.2s ease-out;
        }
        .graph-view-connect-handle:hover {
          transform: translateY(-50%) scale(1.2);
          box-shadow: 0 3px 10px rgba(52, 152, 219, 0.5);
        }
        .graph-view-empty {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
          color: #7F8C8D;
          font-size: 14px;
          pointer-events: none;
        }
        .graph-view-drop-indicator {
          position: absolute;
          top: 60px;
          left: 20px;
          right: 20px;
          bottom: 20px;
          border: 2px dashed #3498DB;
          border-radius: 12px;
          background: rgba(52, 152, 219, 0.05);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #3498DB;
          font-size: 16px;
          font-weight: 500;
          pointer-events: none;
          z-index: 30;
        }
        @keyframes dash {
          0% { stroke-dashoffset: 0; opacity: 1; }
          50% { opacity: 0.5; }
          100% { stroke-dashoffset: -12; opacity: 1; }
        }
        @keyframes connectionBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .graph-view-connection-hovered {
          animation: dash 0.6s linear infinite, connectionBlink 0.8s ease-in-out infinite !important;
          stroke-dasharray: 8, 4 !important;
        }
      `}</style>

      <div className="graph-view-header">
        <span className="graph-view-title">🧠 思维导图</span>
        <span className="graph-view-hint">拖拽内容到此处 / 从节点边缘拖出连线</span>
      </div>

      <svg
        ref={svgRef}
        className="graph-view-svg"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {connections.map(conn => {
          const from = nodes.find(n => n.id === conn.fromId);
          const to = nodes.find(n => n.id === conn.toId);
          if (!from || !to) return null;
          return renderBezierPath(from, to, conn.id, hoveredConnection === conn.id);
        })}
        {renderTempConnection()}
      </svg>

      <div
        ref={containerRef}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {isDragOver && (
          <div className="graph-view-drop-indicator">
            释放以创建节点
          </div>
        )}

        {nodes.map(node => (
          <div
            key={node.id}
            className={`graph-view-node ${draggingNodeId === node.id ? 'dragging' : ''}`}
            style={{
              transform: `translate(${node.x}px, ${node.y}px)`,
              cursor: draggingNodeId === node.id ? 'grabbing' : 'grab',
            }}
            onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
            onDoubleClick={() => handleNodeDoubleClick(node.id)}
            onMouseUp={(e) => handleNodeMouseUpForConnect(e, node.id)}
          >
            <div
              className="graph-view-connect-handle"
              onMouseDown={(e) => handleConnectionStart(e, node.id)}
              title="拖出以创建连线"
            />
            {editingNodeId === node.id ? (
              <input
                autoFocus
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => handleEditBlur(node.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleEditBlur(node.id);
                }}
                className="graph-view-node-input"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="graph-view-node-title">{node.title}</span>
            )}
          </div>
        ))}

        {nodes.length === 0 && (
          <div className="graph-view-empty">
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>📌</div>
            <div>从左侧编辑器拖拽选中文本到这里</div>
            <div style={{ fontSize: '12px', marginTop: '6px', opacity: 0.8 }}>
              创建思维导图节点
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(GraphView);
