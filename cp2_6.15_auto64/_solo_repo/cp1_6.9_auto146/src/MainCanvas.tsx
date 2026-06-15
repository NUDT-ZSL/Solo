import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import type { MindMapNode, Connection, CursorInfo } from './types';
import { NODE_DIAMETER, CONNECTION_COLOR } from './types';

interface Props {
  nodes: MindMapNode[];
  connections: Connection[];
  cursors: Record<string, CursorInfo & { timestamp: number }>;
  currentUserId: string;
  currentNickname: string;
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
  onCreateNode: (data: { x: number; y: number; content?: string }) => void;
  onUpdateNode: (data: Partial<MindMapNode> & { id: string }) => void;
  onDeleteNode: (nodeId: string) => void;
  onCreateConnection: (data: Omit<Connection, 'id'>) => void;
  onUpdateConnection: (data: Partial<Connection> & { id: string }) => void;
  onDeleteConnection: (connectionId: string) => void;
  onCursorMove: (x: number, y: number) => void;
  searchKeyword: string;
}

type DragState =
  | { type: 'none' }
  | { type: 'node'; nodeId: string; offsetX: number; offsetY: number; lastEmit: number }
  | { type: 'pan'; startX: number; startY: number; origX: number; origY: number }
  | { type: 'connect'; fromNodeId: string; startX: number; startY: number; curX: number; curY: number };

const MainCanvas = ({
  nodes,
  connections,
  cursors,
  currentUserId,
  currentNickname,
  selectedNodeId,
  onSelectNode,
  onCreateNode,
  onUpdateNode,
  onDeleteNode,
  onCreateConnection,
  onUpdateConnection,
  onDeleteConnection,
  onCursorMove,
  searchKeyword,
}: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragState, setDragState] = useState<DragState>({ type: 'none' });
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [editingConnId, setEditingConnId] = useState<string | null>(null);
  const [editingConnLabel, setEditingConnLabel] = useState('');
  const [cursorTrails, setCursorTrails] = useState<{ id: number; x: number; y: number; color: string }[]>([]);
  const trailCounter = useRef(0);
  const lastCursorPos = useRef<{ x: number; y: number } | null>(null);

  const screenToWorld = useCallback((sx: number, sy: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (sx - rect.left - offset.x) / scale,
      y: (sy - rect.top - offset.y) / scale,
    };
  }, [offset, scale]);

  const worldToScreen = useCallback((wx: number, wy: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: wx * scale + offset.x + rect.left,
      y: wy * scale + offset.y + rect.top,
    };
  }, [offset, scale]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const delta = -e.deltaY * 0.001;
    const newScale = Math.min(3, Math.max(0.5, scale * (1 + delta)));
    const worldX = (mx - offset.x) / scale;
    const worldY = (my - offset.y) / scale;
    setOffset({
      x: mx - worldX * newScale,
      y: my - worldY * newScale,
    });
    setScale(newScale);
  }, [scale, offset]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (editingNodeId || editingConnId) return;
    if (e.button === 2) {
      e.preventDefault();
      setDragState({ type: 'pan', startX: e.clientX, startY: e.clientY, origX: offset.x, origY: offset.y });
      return;
    }
    if (e.button === 0 && (e.target as HTMLElement).classList.contains('canvas-bg')) {
      onSelectNode(null);
    }
  }, [offset, onSelectNode, editingNodeId, editingConnId]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const world = screenToWorld(e.clientX, e.clientY);
    onCursorMove(world.x, world.y);

    const last = lastCursorPos.current;
    if (last && Math.hypot(e.clientX - last.x, e.clientY - last.y) > 8) {
      const color = nicknameToColor(currentNickname);
      const newTrail = {
        id: trailCounter.current++,
        x: world.x,
        y: world.y,
        color,
      };
      setCursorTrails((prev) => [...prev.slice(-15), newTrail]);
      setTimeout(() => {
        setCursorTrails((prev) => prev.filter((t) => t.id !== newTrail.id));
      }, 500);
    }
    lastCursorPos.current = { x: e.clientX, y: e.clientY };

    if (dragState.type === 'node') {
      const now = Date.now();
      const dx = world.x - dragState.offsetX;
      const dy = world.y - dragState.offsetY;
      if (now - dragState.lastEmit >= 30) {
        onUpdateNode({ id: dragState.nodeId, x: dx, y: dy });
        setDragState((s) => (s.type === 'node' ? { ...s, lastEmit: now } : s));
      }
    } else if (dragState.type === 'pan') {
      setOffset({
        x: dragState.origX + (e.clientX - dragState.startX),
        y: dragState.origY + (e.clientY - dragState.startY),
      });
    } else if (dragState.type === 'connect') {
      setDragState((s) => (s.type === 'connect' ? { ...s, curX: world.x, curY: world.y } : s));
    }
  }, [dragState, onUpdateNode, onCursorMove, screenToWorld, currentNickname]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (dragState.type === 'connect') {
      const world = screenToWorld(e.clientX, e.clientY);
      const targetNode = findNodeAt(world.x, world.y, nodes);
      if (targetNode && targetNode.id !== dragState.fromNodeId) {
        const exists = connections.some(
          (c) =>
            (c.fromNodeId === dragState.fromNodeId && c.toNodeId === targetNode.id) ||
            (c.fromNodeId === targetNode.id && c.toNodeId === dragState.fromNodeId)
        );
        if (!exists) {
          onCreateConnection({
            fromNodeId: dragState.fromNodeId,
            toNodeId: targetNode.id,
            label: '',
            curveType: 'bezier',
          });
        }
      }
    }
    if (dragState.type !== 'none') {
      setDragState({ type: 'none' });
    }
  }, [dragState, nodes, connections, onCreateConnection, screenToWorld]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).classList.contains('canvas-bg')) {
      const world = screenToWorld(e.clientX, e.clientY);
      onCreateNode({ x: world.x - NODE_DIAMETER / 2, y: world.y - NODE_DIAMETER / 2 });
    }
  }, [screenToWorld, onCreateNode]);

  const handleNodeMouseDown = useCallback((e: React.MouseEvent, node: MindMapNode) => {
    e.stopPropagation();
    onSelectNode(node.id);
    if (e.button !== 0) return;
    const world = screenToWorld(e.clientX, e.clientY);
    setDragState({
      type: 'node',
      nodeId: node.id,
      offsetX: world.x - node.x,
      offsetY: world.y - node.y,
      lastEmit: Date.now(),
    });
  }, [screenToWorld, onSelectNode]);

  const handleNodeDoubleClick = useCallback((e: React.MouseEvent, node: MindMapNode) => {
    e.stopPropagation();
    setEditingNodeId(node.id);
    setEditingContent(node.content);
  }, []);

  const startNodeEdit = useCallback((node: MindMapNode) => {
    setEditingNodeId(node.id);
    setEditingContent(node.content);
  }, []);

  const confirmNodeEdit = useCallback(() => {
    if (editingNodeId) {
      onUpdateNode({ id: editingNodeId, content: editingContent });
      setEditingNodeId(null);
      setEditingContent('');
    }
  }, [editingNodeId, editingContent, onUpdateNode]);

  const handleNodeEdgeMouseDown = useCallback((e: React.MouseEvent, node: MindMapNode) => {
    e.stopPropagation();
    e.preventDefault();
    const centerX = node.x + NODE_DIAMETER / 2;
    const centerY = node.y + NODE_DIAMETER / 2;
    const world = screenToWorld(e.clientX, e.clientY);
    setDragState({
      type: 'connect',
      fromNodeId: node.id,
      startX: centerX,
      startY: centerY,
      curX: world.x,
      curY: world.y,
    });
  }, [screenToWorld]);

  const handleConnLabelDoubleClick = useCallback((e: React.MouseEvent, conn: Connection) => {
    e.stopPropagation();
    setEditingConnId(conn.id);
    setEditingConnLabel(conn.label);
  }, []);

  const confirmConnEdit = useCallback(() => {
    if (editingConnId) {
      onUpdateConnection({ id: editingConnId, label: editingConnLabel });
      setEditingConnId(null);
      setEditingConnLabel('');
    }
  }, [editingConnId, editingConnLabel, onUpdateConnection]);

  const deleteSelected = useCallback(() => {
    if (selectedNodeId) {
      onDeleteNode(selectedNodeId);
    }
  }, [selectedNodeId, onDeleteNode]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (editingNodeId || editingConnId) {
        if (e.key === 'Escape') {
          setEditingNodeId(null);
          setEditingConnId(null);
        }
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeId && !isInputActive()) {
        e.preventDefault();
        deleteSelected();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedNodeId, editingNodeId, editingConnId, deleteSelected]);

  const searchMatches = useMemo(() => {
    if (!searchKeyword.trim()) return new Set<string>();
    const kw = searchKeyword.toLowerCase();
    return new Set(nodes.filter((n) => n.content.toLowerCase().includes(kw)).map((n) => n.id));
  }, [nodes, searchKeyword]);

  return (
    <div
      className="main-canvas-container"
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDoubleClick={handleDoubleClick}
      onWheel={handleWheel}
      onContextMenu={(e) => e.preventDefault()}
    >
      <svg
        ref={svgRef}
        className="canvas-svg"
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          transformOrigin: '0 0',
        }}
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill={CONNECTION_COLOR} />
          </marker>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect
          className="canvas-bg"
          x="-5000"
          y="-5000"
          width="10000"
          height="10000"
          fill="url(#grid)"
        />

        {connections.map((conn) => {
          const fromNode = nodes.find((n) => n.id === conn.fromNodeId);
          const toNode = nodes.find((n) => n.id === conn.toNodeId);
          if (!fromNode || !toNode) return null;
          return renderConnection(conn, fromNode, toNode, editingConnId, editingConnLabel, handleConnLabelDoubleClick, confirmConnEdit, setEditingConnLabel);
        })}

        {dragState.type === 'connect' && (
          <path
            className="connection-path preview-connection"
            d={bezierPath(
              dragState.startX,
              dragState.startY,
              dragState.curX,
              dragState.curY
            )}
            stroke={CONNECTION_COLOR}
            strokeWidth="2"
            strokeDasharray="6,4"
            fill="none"
            style={{ opacity: 0.7 }}
          />
        )}

        {nodes.map((node) => renderNode(node, selectedNodeId, editingNodeId, editingContent, searchMatches, handleNodeMouseDown, handleNodeDoubleClick, handleNodeEdgeMouseDown, startNodeEdit, confirmNodeEdit, setEditingContent, onDeleteNode))}

        {Object.entries(cursors).map(([uid, cur]) =>
          uid !== currentUserId ? (
            <g key={uid} transform={`translate(${cur.x}, ${cur.y})`} className="remote-cursor-group">
              <circle r="30" fill={nicknameToColor(cur.nickname)} opacity="0.15" />
              <circle r="10" fill={nicknameToColor(cur.nickname)} opacity="0.4" />
              <circle r="5" fill={nicknameToColor(cur.nickname)} />
              <text x="12" y="-10" fontSize="12" fill="white" className="cursor-label">
                {cur.nickname}
              </text>
            </g>
          ) : null
        )}

        {cursorTrails.map((t) => (
          <circle
            key={t.id}
            cx={t.x}
            cy={t.y}
            r="6"
            fill={t.color}
            className="cursor-trail"
          />
        ))}
      </svg>
      <div className="canvas-hud">
        <div className="zoom-info">缩放：{(scale * 100).toFixed(0)}%</div>
        <div className="hint-text">双击创建节点 · 右键拖动画布 · 滚轮缩放 · Delete删除</div>
      </div>
    </div>
  );
};

function isInputActive() {
  const el = document.activeElement;
  return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA');
}

function findNodeAt(wx: number, wy: number, nodes: MindMapNode[]): MindMapNode | null {
  for (const node of nodes) {
    const cx = node.x + NODE_DIAMETER / 2;
    const cy = node.y + NODE_DIAMETER / 2;
    if (Math.hypot(wx - cx, wy - cy) <= NODE_DIAMETER / 2) {
      return node;
    }
  }
  return null;
}

function bezierPath(x1: number, y1: number, x2: number, y2: number): string {
  const dx = Math.abs(x2 - x1);
  const cpx1 = x1 + dx * 0.4;
  const cpx2 = x2 - dx * 0.4;
  return `M ${x1} ${y1} C ${cpx1} ${y1}, ${cpx2} ${y2}, ${x2} ${y2}`;
}

function straightPath(x1: number, y1: number, x2: number, y2: number): string {
  return `M ${x1} ${y1} L ${x2} ${y2}`;
}

function nicknameToColor(nickname: string): string {
  let hash = 0;
  for (let i = 0; i < nickname.length; i++) {
    hash = nickname.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 75%, 60%)`;
}

function renderNode(
  node: MindMapNode,
  selectedNodeId: string | null,
  editingNodeId: string | null,
  editingContent: string,
  searchMatches: Set<string>,
  handleNodeMouseDown: (e: React.MouseEvent, node: MindMapNode) => void,
  handleNodeDoubleClick: (e: React.MouseEvent, node: MindMapNode) => void,
  handleNodeEdgeMouseDown: (e: React.MouseEvent, node: MindMapNode) => void,
  startNodeEdit: (node: MindMapNode) => void,
  confirmNodeEdit: () => void,
  setEditingContent: (v: string) => void,
  onDeleteNode: (id: string) => void
) {
  const cx = node.x + NODE_DIAMETER / 2;
  const cy = node.y + NODE_DIAMETER / 2;
  const isSelected = selectedNodeId === node.id;
  const isEditing = editingNodeId === node.id;
  const isSearchHit = searchMatches.has(node.id);

  return (
    <g
      key={node.id}
      id={`node-${node.id}`}
      transform={`translate(${node.x}, ${node.y})`}
      className={`mindmap-node ${isSelected ? 'selected' : ''} ${isSearchHit ? 'search-hit' : ''}`}
      style={{
        transition: 'transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        cursor: 'grab',
      }}
      onMouseDown={(e) => handleNodeMouseDown(e, node)}
      onDoubleClick={(e) => handleNodeDoubleClick(e, node)}
    >
      {isSearchHit && (
        <circle
          cx={NODE_DIAMETER / 2}
          cy={NODE_DIAMETER / 2}
          r={NODE_DIAMETER / 2 + 8}
          fill="none"
          stroke="#FFE66D"
          strokeWidth="3"
          strokeDasharray="4,2"
          className="search-hit-ring"
        />
      )}
      <circle
        cx={NODE_DIAMETER / 2}
        cy={NODE_DIAMETER / 2}
        r={NODE_DIAMETER / 2}
        fill={node.color}
        stroke={isSelected ? '#ffffff' : 'rgba(255,255,255,0.25)'}
        strokeWidth={node.borderWidth + (isSelected ? 1 : 0)}
        opacity={0.92}
        style={{
          filter: isSelected
            ? `drop-shadow(0 0 12px ${node.color}) drop-shadow(0 4px 8px rgba(0,0,0,0.4))`
            : 'drop-shadow(0 2px 6px rgba(0,0,0,0.4))',
        }}
      />
      {isEditing ? (
        <foreignObject x="6" y={NODE_DIAMETER / 2 - 14} width={NODE_DIAMETER - 12} height="28">
          <input
            autoFocus
            value={editingContent}
            onChange={(e) => setEditingContent(e.target.value)}
            onBlur={confirmNodeEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') confirmNodeEdit();
              if (e.key === 'Escape') startNodeEdit(node);
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              height: '100%',
              background: 'rgba(255,255,255,0.95)',
              border: 'none',
              borderRadius: '4px',
              textAlign: 'center',
              fontSize: `${node.fontSize}px`,
              outline: 'none',
              padding: 0,
              color: '#1a1a2e',
            }}
          />
        </foreignObject>
      ) : (
        <text
          x={NODE_DIAMETER / 2}
          y={NODE_DIAMETER / 2 + node.fontSize / 3}
          textAnchor="middle"
          fontSize={node.fontSize}
          fill="#1a1a2e"
          fontWeight="600"
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {truncateText(node.content, node.fontSize)}
        </text>
      )}
      <circle
        cx={NODE_DIAMETER}
        cy={NODE_DIAMETER / 2}
        r="6"
        fill={CONNECTION_COLOR}
        stroke="white"
        strokeWidth="1.5"
        style={{ cursor: 'crosshair' }}
        onMouseDown={(e) => handleNodeEdgeMouseDown(e, node)}
      />
      {isSelected && (
        <g transform={`translate(${NODE_DIAMETER - 10}, -8)`}>
          <circle
            r="9"
            fill="#ff4757"
            stroke="white"
            strokeWidth="1.5"
            style={{ cursor: 'pointer' }}
            onClick={(e) => {
              e.stopPropagation();
              onDeleteNode(node.id);
            }}
          />
          <text x="0" y="3.5" textAnchor="middle" fontSize="11" fill="white" style={{ pointerEvents: 'none', fontWeight: 'bold' }}>
            ×
          </text>
        </g>
      )}
    </g>
  );
}

function truncateText(text: string, fontSize: number): string {
  const maxChars = Math.max(2, Math.floor(NODE_DIAMETER / (fontSize * 0.6)));
  if (text.length <= maxChars) return text;
  return text.substring(0, maxChars - 1) + '…';
}

function renderConnection(
  conn: Connection,
  fromNode: MindMapNode,
  toNode: MindMapNode,
  editingConnId: string | null,
  editingConnLabel: string,
  onDoubleClick: (e: React.MouseEvent, conn: Connection) => void,
  confirmEdit: () => void,
  setEditingLabel: (v: string) => void
) {
  const fx = fromNode.x + NODE_DIAMETER / 2;
  const fy = fromNode.y + NODE_DIAMETER / 2;
  const tx = toNode.x + NODE_DIAMETER / 2;
  const ty = toNode.y + NODE_DIAMETER / 2;

  const angle = Math.atan2(ty - fy, tx - fx);
  const startX = fx + Math.cos(angle) * (NODE_DIAMETER / 2);
  const startY = fy + Math.sin(angle) * (NODE_DIAMETER / 2);
  const endX = tx - Math.cos(angle) * (NODE_DIAMETER / 2 + 6);
  const endY = ty - Math.sin(angle) * (NODE_DIAMETER / 2 + 6);

  const path = conn.curveType === 'straight'
    ? straightPath(startX, startY, endX, endY)
    : bezierPath(startX, startY, endX, endY);

  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2;
  const isEditing = editingConnId === conn.id;

  return (
    <g key={conn.id} className="connection-group" style={{ pointerEvents: 'stroke' }}>
      <path
        d={path}
        stroke="transparent"
        strokeWidth="14"
        fill="none"
      />
      <path
        className="connection-path animate-connection"
        d={path}
        stroke={CONNECTION_COLOR}
        strokeWidth="2"
        fill="none"
        markerEnd="url(#arrowhead)"
        style={{
          filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))',
        }}
      />
      {conn.label && !isEditing && (
        <g
          onDoubleClick={(e) => onDoubleClick(e, conn)}
          style={{ cursor: 'pointer' }}
        >
          <rect
            x={midX - conn.label.length * 4 - 8}
            y={midY - 10}
            width={conn.label.length * 8 + 16}
            height="20"
            rx="4"
            fill="rgba(255,255,255,0.25)"
            stroke="rgba(255,255,255,0.3)"
          />
          <text
            x={midX}
            y={midY + 4}
            textAnchor="middle"
            fontSize="12"
            fill="white"
            style={{ pointerEvents: 'none' }}
          >
            {conn.label}
          </text>
        </g>
      )}
      {isEditing && (
        <foreignObject x={midX - 60} y={midY - 12} width="120" height="24">
          <input
            autoFocus
            value={editingConnLabel}
            onChange={(e) => setEditingLabel(e.target.value)}
            onBlur={confirmEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') confirmEdit();
            }}
            placeholder="添加标签..."
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              height: '100%',
              background: 'rgba(255,255,255,0.95)',
              border: '1px solid ' + CONNECTION_COLOR,
              borderRadius: '4px',
              textAlign: 'center',
              fontSize: '12px',
              outline: 'none',
              padding: '0 4px',
              color: '#1a1a2e',
            }}
          />
        </foreignObject>
      )}
      {!conn.label && !isEditing && (
        <g
          onDoubleClick={(e) => onDoubleClick(e, conn)}
          style={{ cursor: 'pointer' }}
        >
          <circle cx={midX} cy={midY} r="8" fill={CONNECTION_COLOR} opacity="0.5" />
          <text x={midX} y={midY + 4} textAnchor="middle" fontSize="12" fill="white" style={{ pointerEvents: 'none', fontWeight: 'bold' }}>
            +
          </text>
        </g>
      )}
    </g>
  );
}

export default MainCanvas;
