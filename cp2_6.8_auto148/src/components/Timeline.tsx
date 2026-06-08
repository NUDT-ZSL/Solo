import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { TimelineNode } from '../types';
import { icons } from '../icons';

interface TimelineProps {
  nodes: TimelineNode[];
  zoom: number;
  onCanvasClick: (position: number) => void;
  onNodeDrag: (id: string, position: number) => void;
  onNodeClick: (id: string) => void;
  selectedNodeId: string | null;
}

const NODE_SIZE = 40;
const TIMELINE_Y = 200;
const MIN_WIDTH = 2000;
const DRAG_THRESHOLD = 5;

function Timeline({ nodes, zoom, onCanvasClick, onNodeDrag, onNodeClick, selectedNodeId }: TimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredCurveIndex, setHoveredCurveIndex] = useState<number | null>(null);
  const dragStartPos = useRef<{ x: number; nodePosition: number } | null>(null);
  const hasMoved = useRef(false);
  const draggingNodeId = useRef<string | null>(null);

  const containerWidth = useMemo(() => {
    if (nodes.length === 0) return MIN_WIDTH;
    const maxPosition = Math.max(...nodes.map(n => n.position));
    return Math.max(MIN_WIDTH, (maxPosition + 200) * zoom);
  }, [nodes, zoom]);

  const scaledPosition = useCallback((position: number) => position * zoom, [zoom]);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).dataset.canvas === 'true') {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const scrollLeft = containerRef.current?.scrollLeft || 0;
        const clickX = e.clientX - rect.left + scrollLeft;
        const position = clickX / zoom;
        onCanvasClick(position);
      }
    }
  }, [onCanvasClick, zoom]);

  const handleNodeMouseDown = useCallback((e: React.MouseEvent, node: TimelineNode) => {
    e.stopPropagation();
    e.preventDefault();
    draggingNodeId.current = node.id;
    setDraggingId(node.id);
    hasMoved.current = false;
    dragStartPos.current = {
      x: e.clientX,
      nodePosition: node.position,
    };
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStartPos.current || !draggingNodeId.current) return;
      const deltaX = Math.abs(e.clientX - dragStartPos.current.x);
      if (deltaX > DRAG_THRESHOLD) {
        hasMoved.current = true;
      }
      if (hasMoved.current) {
        const actualDeltaX = e.clientX - dragStartPos.current.x;
        const newPosition = Math.max(20, dragStartPos.current.nodePosition + actualDeltaX / zoom);
        onNodeDrag(draggingNodeId.current, newPosition);
      }
    };

    const handleMouseUp = () => {
      if (draggingNodeId.current && !hasMoved.current) {
        onNodeClick(draggingNodeId.current);
      }
      draggingNodeId.current = null;
      setDraggingId(null);
      dragStartPos.current = null;
      hasMoved.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [onNodeDrag, onNodeClick, zoom]);

  const getBezierPath = useCallback((x1: number, x2: number, y: number) => {
    const midX = (x1 + x2) / 2;
    return `M ${x1} ${y} C ${midX} ${y}, ${midX} ${y}, ${x2} ${y}`;
  }, []);

  const sortedNodes = useMemo(() => 
    [...nodes].sort((a, b) => a.position - b.position),
    [nodes]
  );

  const nodeIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    sortedNodes.forEach((node, index) => {
      map.set(node.id, index + 1);
    });
    return map;
  }, [sortedNodes]);

  return (
    <div
      ref={containerRef}
      data-canvas="true"
      onMouseDown={handleCanvasMouseDown}
      style={{
        width: containerWidth,
        minWidth: '100%',
        height: 400,
        position: 'relative',
        cursor: 'crosshair',
      }}
    >
      <svg
        data-canvas="true"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: containerWidth,
          height: 400,
          pointerEvents: 'none',
        }}
      >
        {sortedNodes.map((node, index) => {
          if (index === sortedNodes.length - 1) return null;
          const nextNode = sortedNodes[index + 1];
          const x1 = scaledPosition(node.position);
          const x2 = scaledPosition(nextNode.position);
          const isHovered = hoveredCurveIndex === index;
          
          return (
            <path
              key={`curve-${node.id}-${nextNode.id}`}
              d={getBezierPath(x1, x2, TIMELINE_Y)}
              stroke={isHovered ? '#6366F1' : '#CBD5E1'}
              strokeWidth={isHovered ? 3 : 2}
              fill="none"
              style={{
                transition: 'all 0.3s ease',
                pointerEvents: 'stroke',
                cursor: 'pointer',
              }}
              onMouseEnter={() => setHoveredCurveIndex(index)}
              onMouseLeave={() => setHoveredCurveIndex(null)}
            />
          );
        })}
      </svg>

      {sortedNodes.map((node) => {
        const x = scaledPosition(node.position);
        const isDragging = draggingId === node.id;
        const isSelected = selectedNodeId === node.id;
        const isHovered = hoveredNodeId === node.id;
        const IconComponent = icons[node.icon as keyof typeof icons] || icons.star;
        const displayNumber = nodeIndexMap.get(node.id) || 1;

        return (
          <div
            key={node.id}
            onMouseDown={(e) => handleNodeMouseDown(e, node)}
            onMouseEnter={() => setHoveredNodeId(node.id)}
            onMouseLeave={() => setHoveredNodeId(null)}
            style={{
              position: 'absolute',
              left: x - NODE_SIZE / 2,
              top: TIMELINE_Y - NODE_SIZE / 2,
              width: NODE_SIZE,
              height: NODE_SIZE,
              borderRadius: '50%',
              backgroundColor: '#4F46E5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: isDragging ? 'grabbing' : 'grab',
              transform: isDragging ? 'scale(1.2)' : (isHovered ? 'scale(1.05)' : 'scale(1)'),
              boxShadow: isDragging 
                ? '0 0 8px 4px rgba(129, 140, 248, 0.6)' 
                : (isSelected ? '0 0 0 3px rgba(99, 102, 241, 0.3)' : '0 2px 8px rgba(79, 70, 229, 0.3)'),
              transition: isDragging ? 'none' : 'all 0.2s ease',
              zIndex: isDragging ? 100 : 10,
              userSelect: 'none',
            }}
          >
            {node.icon ? (
              <IconComponent size={20} color="#FFFFFF" />
            ) : (
              <span style={{ color: '#FFFFFF', fontWeight: 600, fontSize: 16 }}>
                {displayNumber}
              </span>
            )}
          </div>
        );
      })}

      {sortedNodes.map((node) => {
        const x = scaledPosition(node.position);
        return (
          <div
            key={`date-${node.id}`}
            style={{
              position: 'absolute',
              left: x,
              top: TIMELINE_Y + NODE_SIZE / 2 + 8,
              transform: 'translateX(-50%)',
              fontSize: '12px',
              color: '#94A3B8',
              fontWeight: 500,
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
            }}
          >
            {node.date}
          </div>
        );
      })}

      {sortedNodes.map((node) => {
        if (!node.title) return null;
        const x = scaledPosition(node.position);
        return (
          <div
            key={`title-${node.id}`}
            style={{
              position: 'absolute',
              left: x,
              top: TIMELINE_Y - NODE_SIZE / 2 - 28,
              transform: 'translateX(-50%)',
              fontSize: '13px',
              color: '#475569',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              maxWidth: 150,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              pointerEvents: 'none',
              textAlign: 'center',
            }}
          >
            {node.title}
          </div>
        );
      })}
    </div>
  );
}

export default Timeline;
