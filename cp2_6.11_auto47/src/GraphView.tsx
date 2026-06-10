import React, { useState, useRef } from 'react';
import type { MindMapNode, MindMapConnection } from './types';

interface GraphViewProps {
  nodes: MindMapNode[];
  connections: MindMapConnection[];
  onNodesChange: (nodes: MindMapNode[]) => void;
  onConnectionsChange: (connections: MindMapConnection[]) => void;
  onAddNode: (title: string, x: number, y: number) => void;
}

const GraphView: React.FC<GraphViewProps> = ({ nodes, connections, onNodesChange, onConnectionsChange, onAddNode }) => {
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [hoveredConnection, setHoveredConnection] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setDraggingNodeId(nodeId);
    setDragOffset({
      x: e.clientX - rect.left - node.x,
      y: e.clientY - rect.top - node.y,
    });
  };

  const handleNodeMouseMove = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });

    if (draggingNodeId) {
      const newX = e.clientX - rect.left - dragOffset.x;
      const newY = e.clientY - rect.top - dragOffset.y;
      onNodesChange(
        nodes.map(n =>
          n.id === draggingNodeId ? { ...n, x: Math.max(0, newX), y: Math.max(0, newY) } : n
        )
      );
    }
  };

  const handleNodeMouseUp = () => {
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

  const handleConnectionEnd = (e: React.MouseEvent, nodeId: string) => {
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
            id: `conn-${Date.now()}`,
            fromId: connectingFrom,
            toId: nodeId,
          },
        ]);
      }
    }
    setConnectingFrom(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const text = e.dataTransfer.getData('text/plain');
    if (!text) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left - 60;
    const y = e.clientY - rect.top - 20;
    const title = text.slice(0, 20) + (text.length > 20 ? '...' : '');
    onAddNode(title, Math.max(10, x), Math.max(10, y));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const getNodeCenter = (node: MindMapNode) => ({
    x: node.x + 60,
    y: node.y + 20,
  });

  const renderBezierPath = (from: MindMapNode, to: MindMapNode, id: string, isHovered: boolean) => {
    const start = getNodeCenter(from);
    const end = getNodeCenter(to);
    const dx = Math.abs(end.x - start.x);
    const cp1 = { x: start.x + dx * 0.5, y: start.y };
    const cp2 = { x: end.x - dx * 0.5, y: end.y };
    const d = `M ${start.x} ${start.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${end.x} ${end.y}`;
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
          stroke={`url(#${gradientId})`}
          strokeWidth="2"
          strokeDasharray={isHovered ? '8,4' : undefined}
          style={{
            cursor: 'pointer',
            animation: isHovered ? 'dash 0.5s linear infinite' : undefined,
            transition: 'all 0.3s ease-out',
          }}
          onMouseEnter={() => setHoveredConnection(id)}
          onMouseLeave={() => setHoveredConnection(null)}
          onClick={(e) => {
            e.stopPropagation();
            if (confirm('删除此连线？')) {
              onConnectionsChange(connections.filter(c => c.id !== id));
            }
          }}
        />
        <circle cx={start.x} cy={start.y} r="4" fill="#3498DB" />
        <circle cx={end.x} cy={end.y} r="4" fill="#9B59B6" />
      </g>
    );
  };

  return (
    <div
      ref={containerRef}
      style={styles.container}
      onMouseMove={handleNodeMouseMove}
      onMouseUp={handleNodeMouseUp}
      onMouseLeave={handleNodeMouseUp}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <div style={styles.header}>
        <span style={styles.title}>🧠 思维导图</span>
        <span style={styles.hint}>拖拽内容到此处 / 从节点边缘拖出连线</span>
      </div>

      <svg style={styles.svg} onMouseMove={handleNodeMouseMove} onMouseUp={handleNodeMouseUp}>
        <style>{`
          @keyframes dash {
            to { stroke-dashoffset: -12; }
          }
        `}</style>
        {connections.map(conn => {
          const from = nodes.find(n => n.id === conn.fromId);
          const to = nodes.find(n => n.id === conn.toId);
          if (!from || !to) return null;
          return renderBezierPath(from, to, conn.id, hoveredConnection === conn.id);
        })}
        {connectingFrom && (() => {
          const fromNode = nodes.find(n => n.id === connectingFrom);
          if (!fromNode) return null;
          const start = getNodeCenter(fromNode);
          const dx = Math.abs(mousePos.x - start.x);
          const cp1 = { x: start.x + dx * 0.5, y: start.y };
          const cp2 = { x: mousePos.x - dx * 0.5, y: mousePos.y };
          return (
            <path
              d={`M ${start.x} ${start.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${mousePos.x} ${mousePos.y}`}
              fill="none"
              stroke="#3498DB"
              strokeWidth="2"
              strokeDasharray="6,3"
              opacity="0.7"
            />
          );
        })()}
      </svg>

      {nodes.map(node => (
        <div
          key={node.id}
          style={{
            ...styles.nodeCard,
            transform: `translate(${node.x}px, ${node.y}px)`,
            cursor: draggingNodeId === node.id ? 'grabbing' : 'grab',
          }}
          onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
          onDoubleClick={() => handleNodeDoubleClick(node.id)}
          onMouseUp={(e) => handleConnectionEnd(e, node.id)}
        >
          <div
            style={styles.connectHandle}
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
              style={styles.nodeInput}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span style={styles.nodeTitle}>{node.title}</span>
          )}
        </div>
      ))}

      {nodes.length === 0 && (
        <div style={styles.emptyHint}>
          <div>📌 从左侧编辑器拖拽内容到这里</div>
          <div style={{ fontSize: '12px', color: '#7F8C8D', marginTop: '8px' }}>
            创建思维导图节点
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    width: '100%',
    height: '100%',
    background: '#F5F0E8',
    overflow: 'hidden',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: '16px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
    borderBottom: '1px solid #BDC3C7',
    background: 'rgba(245, 240, 232, 0.9)',
    backdropFilter: 'blur(8px)',
  },
  title: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#2C3E50',
  },
  hint: {
    fontSize: '12px',
    color: '#7F8C8D',
  },
  svg: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
  },
  nodeCard: {
    position: 'absolute',
    minWidth: '120px',
    padding: '12px 18px',
    background: 'linear-gradient(135deg, #FFFFFF 0%, #F0F0F0 100%)',
    borderRadius: '12px',
    boxShadow: '2px 2px 8px rgba(0,0,0,0.12)',
    transition: 'box-shadow 0.3s ease-out',
    userSelect: 'none',
    border: '1px solid #BDC3C7',
  },
  nodeTitle: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#2C3E50',
  },
  nodeInput: {
    border: '1px solid #3498DB',
    borderRadius: '4px',
    padding: '4px 8px',
    fontSize: '14px',
    outline: 'none',
    background: '#FFFFFF',
    color: '#2C3E50',
    minWidth: '100px',
  },
  connectHandle: {
    position: 'absolute',
    right: '-8px',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #3498DB, #9B59B6)',
    cursor: 'crosshair',
    border: '2px solid #FFFFFF',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
  },
  emptyHint: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    textAlign: 'center',
    color: '#7F8C8D',
    fontSize: '14px',
  },
};

export default React.memo(GraphView);
