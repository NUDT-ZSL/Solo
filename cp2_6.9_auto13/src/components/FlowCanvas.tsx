import {
  useRef,
  useState,
  useEffect,
  useCallback,
  MouseEvent as ReactMouseEvent,
  TouchEvent as ReactTouchEvent,
} from 'react';
import type { FlowNode, FlowEdge, NodeType, Position } from '../types';

interface FlowCanvasProps {
  nodes: FlowNode[];
  edges: FlowEdge[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  activeTool: NodeType | null;
  onCanvasClick: (x: number, y: number) => void;
  onNodeSelect: (id: string | null) => void;
  onEdgeSelect: (id: string | null) => void;
  onNodeMove: (id: string, x: number, y: number) => void;
  onNodeTextEdit: (id: string, text: string) => void;
  onEdgeLabelEdit: (id: string, label: string) => void;
  onAddEdge: (source: string, target: string) => void;
  onDelete: () => void;
}

interface DragState {
  nodeId: string;
  offsetX: number;
  offsetY: number;
}

interface ConnectState {
  sourceId: string;
  startPos: Position;
  currentPos: Position;
}

function getNodeCenter(node: FlowNode): Position {
  return { x: node.x, y: node.y };
}

function getNodeEdgePoint(
  node: FlowNode,
  target: Position
): Position {
  const center = { x: node.x, y: node.y };
  const dx = target.x - center.x;
  const dy = target.y - center.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist === 0) return center;

  let w = node.width / 2;
  let h = node.height / 2;

  if (node.type === 'circle') {
    return {
      x: center.x + (dx / dist) * w,
      y: center.y + (dy / dist) * h,
    };
  }

  const tan = Math.abs(dy / dx);
  const edgeTan = h / w;

  if (tan < edgeTan) {
    const sign = dx > 0 ? 1 : -1;
    return {
      x: center.x + sign * w,
      y: center.y + sign * w * (dy / dx),
    };
  } else {
    const sign = dy > 0 ? 1 : -1;
    return {
      x: center.x + sign * h * (dx / dy),
      y: center.y + sign * h,
    };
  }
}

function buildBezierPath(
  start: Position,
  end: Position
): string {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const offset = Math.max(Math.abs(dx) * 0.5, 60);

  let c1x = start.x + offset;
  let c1y = start.y;
  let c2x = end.x - offset;
  let c2y = end.y;

  if (Math.abs(dx) < Math.abs(dy)) {
    c1x = start.x;
    c1y = start.y + (dy > 0 ? offset : -offset);
    c2x = end.x;
    c2y = end.y - (dy > 0 ? offset : -offset);
  }

  return `M ${start.x} ${start.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${end.x} ${end.y}`;
}

function getBezierMidpoint(
  start: Position,
  end: Position
): Position {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  return {
    x: start.x + dx / 2,
    y: start.y + dy / 2,
  };
}

function wrapText(text: string, maxWidth: number): string[] {
  const chars = text.split('');
  const lines: string[] = [];
  let current = '';
  const approxCharWidth = 12;

  for (const char of chars) {
    if (char === '\n') {
      lines.push(current);
      current = '';
      continue;
    }
    if ((current.length + 1) * approxCharWidth > maxWidth && current) {
      lines.push(current);
      current = char;
    } else {
      current += char;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 4);
}

export default function FlowCanvas({
  nodes,
  edges,
  selectedNodeId,
  selectedEdgeId,
  activeTool,
  onCanvasClick,
  onNodeSelect,
  onEdgeSelect,
  onNodeMove,
  onNodeTextEdit,
  onEdgeLabelEdit,
  onAddEdge,
  onDelete,
}: FlowCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [connect, setConnect] = useState<ConnectState | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editPosition, setEditPosition] = useState<Position | null>(null);
  const [longPressTimer, setLongPressTimer] = useState<number | null>(null);
  const [touchStartPos, setTouchStartPos] = useState<Position | null>(null);
  const [touchStartNodeId, setTouchStartNodeId] = useState<string | null>(null);

  const getSVGPoint = useCallback((clientX: number, clientY: number): Position => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (editingNodeId || editingEdgeId) return;
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
        onDelete();
      }
      if (e.key === 'Escape') {
        onNodeSelect(null);
        onEdgeSelect(null);
        setEditingNodeId(null);
        setEditingEdgeId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onDelete, onNodeSelect, onEdgeSelect, editingNodeId, editingEdgeId]);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const point = getSVGPoint(e.clientX, e.clientY);
      if (drag) {
        onNodeMove(drag.nodeId, point.x - drag.offsetX, point.y - drag.offsetY);
      }
      if (connect) {
        setConnect({ ...connect, currentPos: point });
      }
    },
    [drag, connect, onNodeMove, getSVGPoint]
  );

  const handleMouseUp = useCallback(
    (e: MouseEvent) => {
      if (connect) {
        const point = getSVGPoint(e.clientX, e.clientY);
        const targetNode = nodes.find((n) => {
          const dx = n.x - point.x;
          const dy = n.y - point.y;
          const r = Math.max(n.width, n.height) / 2;
          return Math.sqrt(dx * dx + dy * dy) < r + 20;
        });
        if (targetNode && targetNode.id !== connect.sourceId) {
          onAddEdge(connect.sourceId, targetNode.id);
        }
        setConnect(null);
      }
      setDrag(null);
    },
    [connect, nodes, onAddEdge, getSVGPoint]
  );

  useEffect(() => {
    if (drag || connect) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [drag, connect, handleMouseMove, handleMouseUp]);

  const handleNodeMouseDown = (
    e: ReactMouseEvent<SVGGElement>,
    node: FlowNode
  ) => {
    e.stopPropagation();
    onNodeSelect(node.id);
    onEdgeSelect(null);

    const point = getSVGPoint(e.clientX, e.clientY);

    if (e.shiftKey) {
      const center = getNodeCenter(node);
      const edgePoint = getNodeEdgePoint(node, point);
      setConnect({
        sourceId: node.id,
        startPos: edgePoint,
        currentPos: point,
      });
      return;
    }

    setDrag({
      nodeId: node.id,
      offsetX: point.x - node.x,
      offsetY: point.y - node.y,
    });
  };

  const handleNodeTouchStart = (
    e: ReactTouchEvent<SVGGElement>,
    node: FlowNode
  ) => {
    e.stopPropagation();
    const touch = e.touches[0];
    const point = getSVGPoint(touch.clientX, touch.clientY);
    setTouchStartPos(point);
    setTouchStartNodeId(node.id);
    onNodeSelect(node.id);
    onEdgeSelect(null);

    const timer = window.setTimeout(() => {
      const center = getNodeCenter(node);
      setConnect({
        sourceId: node.id,
        startPos: getNodeEdgePoint(node, center),
        currentPos: point,
      });
      setLongPressTimer(null);
    }, 500);
    setLongPressTimer(timer);
  };

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      const touch = e.touches[0];
      const point = getSVGPoint(touch.clientX, touch.clientY);

      if (longPressTimer) {
        clearTimeout(longPressTimer);
        setLongPressTimer(null);
      }

      if (connect) {
        setConnect({ ...connect, currentPos: point });
      } else if (touchStartNodeId && touchStartPos) {
        setDrag({
          nodeId: touchStartNodeId,
          offsetX: point.x - (touchStartPos.x - (nodes.find(n => n.id === touchStartNodeId)?.x || 0)),
          offsetY: point.y - (touchStartPos.y - (nodes.find(n => n.id === touchStartNodeId)?.y || 0)),
        });
        const node = nodes.find((n) => n.id === touchStartNodeId);
        if (node) {
          const nodeData = node;
          onNodeMove(
            touchStartNodeId,
            point.x - (touchStartPos.x - nodeData.x),
            point.y - (touchStartPos.y - nodeData.y)
          );
        }
      }
    },
    [connect, touchStartNodeId, touchStartPos, longPressTimer, getSVGPoint, nodes, onNodeMove]
  );

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        setLongPressTimer(null);
      }

      if (connect) {
        const touch = e.changedTouches[0];
        const point = getSVGPoint(touch.clientX, touch.clientY);
        const targetNode = nodes.find((n) => {
          const dx = n.x - point.x;
          const dy = n.y - point.y;
          const r = Math.max(n.width, n.height) / 2;
          return Math.sqrt(dx * dx + dy * dy) < r + 30;
        });
        if (targetNode && targetNode.id !== connect.sourceId) {
          onAddEdge(connect.sourceId, targetNode.id);
        }
        setConnect(null);
      }

      setTouchStartPos(null);
      setTouchStartNodeId(null);
      setDrag(null);
    },
    [connect, longPressTimer, nodes, onAddEdge, getSVGPoint]
  );

  useEffect(() => {
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    return () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchMove, handleTouchEnd]);

  const handleNodeDoubleClick = (
    e: ReactMouseEvent<SVGGElement>,
    node: FlowNode
  ) => {
    e.stopPropagation();
    setEditingNodeId(node.id);
    setEditValue(node.text);
    const svg = svgRef.current;
    if (svg) {
      const rect = svg.getBoundingClientRect();
      setEditPosition({
        x: node.x - rect.left - 60,
        y: node.y - rect.top - 12,
      });
    }
  };

  const handleEdgeDoubleClick = (
    e: ReactMouseEvent,
    edge: FlowEdge
  ) => {
    e.stopPropagation();
    const source = nodes.find((n) => n.id === edge.source);
    const target = nodes.find((n) => n.id === edge.target);
    if (!source || !target) return;

    const start = getNodeEdgePoint(source, getNodeCenter(target));
    const end = getNodeEdgePoint(target, getNodeCenter(source));
    const mid = getBezierMidpoint(start, end);

    setEditingEdgeId(edge.id);
    setEditValue(edge.label);
    const svg = svgRef.current;
    if (svg) {
      const rect = svg.getBoundingClientRect();
      setEditPosition({
        x: mid.x - rect.left - 50,
        y: mid.y - rect.top - 12,
      });
    }
  };

  const handleEditSubmit = () => {
    if (editingNodeId) {
      onNodeTextEdit(editingNodeId, editValue);
    }
    if (editingEdgeId) {
      onEdgeLabelEdit(editingEdgeId, editValue);
    }
    setEditingNodeId(null);
    setEditingEdgeId(null);
    setEditValue('');
    setEditPosition(null);
  };

  const handleEditBlur = () => {
    handleEditSubmit();
  };

  const handleSVGClick = (e: ReactMouseEvent<SVGSVGElement>) => {
    const point = getSVGPoint(e.clientX, e.clientY);
    onCanvasClick(point.x, point.y);
  };

  const handleEdgeClick = (e: ReactMouseEvent, edgeId: string) => {
    e.stopPropagation();
    onEdgeSelect(edgeId);
    onNodeSelect(null);
  };

  const renderNodeShape = (node: FlowNode, isSelected: boolean) => {
    const className = `node-${node.type}${isSelected ? ' selected' : ''}`;

    if (node.type === 'rectangle') {
      return (
        <rect
          className={className}
          x={node.x - node.width / 2}
          y={node.y - node.height / 2}
          width={node.width}
          height={node.height}
        />
      );
    }
    if (node.type === 'diamond') {
      const cx = node.x;
      const cy = node.y;
      const hw = node.width / 2;
      const hh = node.height / 2;
      const points = `${cx},${cy - hh} ${cx + hw},${cy} ${cx},${cy + hh} ${cx - hw},${cy}`;
      return <polygon className={className} points={points} />;
    }
    return (
      <ellipse
        className={className}
        cx={node.x}
        cy={node.y}
        rx={node.width / 2}
        ry={node.height / 2}
      />
    );
  };

  const renderNodeText = (node: FlowNode) => {
    const maxWidth = node.type === 'circle' ? node.width * 0.7 : node.width * 0.8;
    const lines = wrapText(node.text, maxWidth);
    const lineHeight = 16;
    const startY = node.y - ((lines.length - 1) * lineHeight) / 2;

    return lines.map((line, i) => (
      <text
        key={i}
        className="node-text"
        x={node.x}
        y={startY + i * lineHeight}
      >
        {line}
      </text>
    ));
  };

  const renderEdge = (edge: FlowEdge) => {
    const source = nodes.find((n) => n.id === edge.source);
    const target = nodes.find((n) => n.id === edge.target);
    if (!source || !target) return null;

    const sourceCenter = getNodeCenter(source);
    const targetCenter = getNodeCenter(target);
    const start = getNodeEdgePoint(source, targetCenter);
    const end = getNodeEdgePoint(target, sourceCenter);
    const path = buildBezierPath(start, end);
    const mid = getBezierMidpoint(start, end);
    const isSelected = edge.id === selectedEdgeId;

    return (
      <g key={edge.id}>
        <path
          className={`edge-path${isSelected ? ' selected' : ''}`}
          d={path}
          markerEnd={`url(#arrowhead${isSelected ? '-selected' : ''})`}
          onClick={(e) => handleEdgeClick(e, edge.id)}
          onDoubleClick={(e) => handleEdgeDoubleClick(e, edge)}
        />
        {edge.label && (
          <g onClick={(e) => handleEdgeClick(e, edge.id)}>
            <rect
              className="edge-label-bg"
              x={mid.x - edge.label.length * 6 - 8}
              y={mid.y - 12}
              width={edge.label.length * 12 + 16}
              height={24}
            />
            <text
              className="edge-label"
              x={mid.x}
              y={mid.y}
              onDoubleClick={(e) => handleEdgeDoubleClick(e, edge)}
            >
              {edge.label}
            </text>
          </g>
        )}
      </g>
    );
  };

  const renderTempEdge = () => {
    if (!connect) return null;
    const source = nodes.find((n) => n.id === connect.sourceId);
    if (!source) return null;
    const path = buildBezierPath(connect.startPos, connect.currentPos);
    return <path className="edge-path temp" d={path} />;
  };

  return (
    <div ref={wrapperRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <svg
        ref={svgRef}
        className={`canvas-svg${connect ? ' connecting' : ''}`}
        onClick={handleSVGClick}
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
            <polygon className="arrow-head" points="0 0, 10 3.5, 0 7" />
          </marker>
          <marker
            id="arrowhead-selected"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon className="arrow-head selected" points="0 0, 10 3.5, 0 7" />
          </marker>
        </defs>

        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="rgba(241, 245, 249, 0.04)"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        {edges.map(renderEdge)}
        {renderTempEdge()}

        {nodes.map((node) => (
          <g
            key={node.id}
            className="node-group"
            onMouseDown={(e) => handleNodeMouseDown(e, node)}
            onTouchStart={(e) => handleNodeTouchStart(e, node)}
            onDoubleClick={(e) => handleNodeDoubleClick(e, node)}
          >
            {renderNodeShape(node, node.id === selectedNodeId)}
            {renderNodeText(node)}
          </g>
        ))}
      </svg>

      {(editingNodeId || editingEdgeId) && editPosition && (
        <input
          className="text-edit-input"
          style={{
            left: editPosition.x + 60,
            top: editPosition.y + 12,
            width: 120,
          }}
          autoFocus
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleEditSubmit();
            if (e.key === 'Escape') {
              setEditingNodeId(null);
              setEditingEdgeId(null);
              setEditValue('');
              setEditPosition(null);
            }
          }}
          onBlur={handleEditBlur}
        />
      )}
    </div>
  );
}
