import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import type { MindMapNode, Priority, Theme } from '../types';

interface GraphViewProps {
  nodes: Record<string, MindMapNode>;
  rootId: string;
  selectedNodeId: string | null;
  theme: Theme;
  onSelectNode: (id: string | null) => void;
  onAddNode: (parentId: string) => void;
  onDeleteNode: (id: string) => void;
  onMoveNode: (id: string, x: number, y: number) => void;
}

const NODE_WIDTH = 220;
const NODE_HEIGHT = 80;
const GRID_SIZE = 40;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.0;
const ZOOM_STEP = 0.1;

const priorityColors: Record<Priority, string> = {
  high: '#ef4444',
  medium: '#eab308',
  low: '#22c55e',
};

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${month}/${day}`;
}

function snapToGrid(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

function getBezierPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): string {
  const dx = Math.abs(x2 - x1) * 0.5;
  const cx1 = x1 + dx;
  const cy1 = y1;
  const cx2 = x2 - dx;
  const cy2 = y2;
  return `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;
}

const GraphView: React.FC<GraphViewProps> = ({
  nodes,
  rootId,
  selectedNodeId,
  theme,
  onSelectNode,
  onAddNode,
  onDeleteNode,
  onMoveNode,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const [animatingNodes, setAnimatingNodes] = useState<Set<string>>(new Set());

  const [canvasSize, setCanvasSize] = useState({ width: 2000, height: 1500 });

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const width = Math.max(2000, rect.width * 2);
        const height = Math.max(1500, rect.height * 2);
        setCanvasSize({ width, height });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const visibleNodes = useMemo(() => {
    const visible = new Set<string>();

    function traverse(nodeId: string) {
      const node = nodes[nodeId];
      if (!node) return;
      visible.add(nodeId);
      if (!node.collapsed) {
        node.children.forEach((childId) => traverse(childId));
      }
    }

    if (rootId) {
      traverse(rootId);
    }

    return visible;
  }, [nodes, rootId]);

  const edges = useMemo(() => {
    const edgeList: { id: string; from: string; to: string }[] = [];

    function traverse(nodeId: string) {
      const node = nodes[nodeId];
      if (!node || node.collapsed) return;

      node.children.forEach((childId) => {
        if (nodes[childId]) {
          edgeList.push({
            id: `${nodeId}-${childId}`,
            from: nodeId,
            to: childId,
          });
          traverse(childId);
        }
      });
    }

    if (rootId) {
      traverse(rootId);
    }

    return edgeList;
  }, [nodes, rootId]);

  const getScreenCoords = useCallback(
    (clientX: number, clientY: number) => {
      if (!svgRef.current) return { x: 0, y: 0 };
      const rect = svgRef.current.getBoundingClientRect();
      return {
        x: (clientX - rect.left - viewport.x) / viewport.zoom,
        y: (clientY - rect.top - viewport.y) / viewport.zoom,
      };
    },
    [viewport]
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, viewport.zoom + delta));

      if (svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const scaleChange = newZoom / viewport.zoom;
        const newX = mouseX - (mouseX - viewport.x) * scaleChange;
        const newY = mouseY - (mouseY - viewport.y) * scaleChange;

        setViewport({ x: newX, y: newY, zoom: newZoom });
      }
    },
    [viewport]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      const target = e.target as SVGElement;
      if (target.closest('.node-group') || target.closest('.edge-path')) return;

      setIsPanning(true);
      setPanStart({
        x: e.clientX - viewport.x,
        y: e.clientY - viewport.y,
      });
    },
    [viewport]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        setViewport((prev) => ({
          ...prev,
          x: e.clientX - panStart.x,
          y: e.clientY - panStart.y,
        }));
      }

      if (draggingNode) {
        const coords = getScreenCoords(e.clientX, e.clientY);
        let newX = coords.x - dragOffset.x;
        let newY = coords.y - dragOffset.y;

        newX = Math.max(0, Math.min(canvasSize.width - NODE_WIDTH, newX));
        newY = Math.max(0, Math.min(canvasSize.height - NODE_HEIGHT, newY));

        onMoveNode(draggingNode, newX, newY);
      }
    },
    [isPanning, panStart, draggingNode, dragOffset, getScreenCoords, onMoveNode, canvasSize]
  );

  const handleMouseUp = useCallback(() => {
    if (isPanning) {
      setIsPanning(false);
    }

    if (draggingNode) {
      const node = nodes[draggingNode];
      if (node) {
        const snappedX = snapToGrid(node.x);
        const snappedY = snapToGrid(node.y);

        setAnimatingNodes((prev) => new Set(prev).add(draggingNode));
        onMoveNode(draggingNode, snappedX, snappedY);

        setTimeout(() => {
          setAnimatingNodes((prev) => {
            const next = new Set(prev);
            next.delete(draggingNode);
            return next;
          });
        }, 150);
      }
      setDraggingNode(null);
    }
  }, [isPanning, draggingNode, nodes, onMoveNode]);

  const handleNodeMouseDown = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      e.stopPropagation();
      if (e.button !== 0) return;

      const node = nodes[nodeId];
      if (!node) return;

      const coords = getScreenCoords(e.clientX, e.clientY);
      setDragOffset({
        x: coords.x - node.x,
        y: coords.y - node.y,
      });
      setDraggingNode(nodeId);
    },
    [nodes, getScreenCoords]
  );

  const handleNodeClick = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      e.stopPropagation();
      if (!draggingNode) {
        onSelectNode(nodeId);
      }
    },
    [onSelectNode, draggingNode]
  );

  const handleNodeDoubleClick = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      e.stopPropagation();
      onAddNode(nodeId);
    },
    [onAddNode]
  );

  const handleNodeContextMenu = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      e.preventDefault();
      e.stopPropagation();
      if (nodeId !== rootId) {
        onDeleteNode(nodeId);
      }
    },
    [onDeleteNode, rootId]
  );

  const handleCanvasClick = useCallback(() => {
    onSelectNode(null);
  }, [onSelectNode]);

  const themeColors = useMemo(() => {
    if (theme === 'dark') {
      return {
        canvasBg: '#1e293b',
        canvasBorder: '#334155',
        edgeStroke: '#475569',
        edgeHover: '#3b82f6',
        gridColor: '#334155',
      };
    }
    return {
      canvasBg: '#ffffff',
      canvasBorder: '#e2e8f0',
      edgeStroke: '#94a3b8',
      edgeHover: '#3b82f6',
      gridColor: '#f1f5f9',
    };
  }, [theme]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: themeColors.canvasBg,
        borderRadius: '16px',
        border: `1px solid ${themeColors.canvasBorder}`,
        padding: '20px',
        boxSizing: 'border-box',
        overflow: 'hidden',
        position: 'relative',
      }}
      onWheel={handleWheel}
    >
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleCanvasClick}
      >
        <defs>
          <linearGradient id="nodeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={theme === 'dark' ? '#334155' : '#ffffff'} />
            <stop offset="100%" stopColor={theme === 'dark' ? '#1e293b' : '#f8fafc'} />
          </linearGradient>
          <filter id="nodeShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000000" floodOpacity="0.08" />
          </filter>
          <filter id="nodeShadowHover" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#000000" floodOpacity="0.12" />
          </filter>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g
          style={{
            transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
            transformOrigin: '0 0',
            transition: isPanning ? 'none' : 'transform 200ms ease-out',
          }}
        >
          <pattern id="grid" width={GRID_SIZE} height={GRID_SIZE} patternUnits="userSpaceOnUse">
            <path
              d={`M ${GRID_SIZE} 0 L 0 0 0 ${GRID_SIZE}`}
              fill="none"
              stroke={themeColors.gridColor}
              strokeWidth="0.5"
            />
          </pattern>
          <rect
            x="0"
            y="0"
            width={canvasSize.width}
            height={canvasSize.height}
            fill="url(#grid)"
          />

          <g className="edges">
            {edges.map((edge) => {
              const fromNode = nodes[edge.from];
              const toNode = nodes[edge.to];
              if (!fromNode || !toNode) return null;

              const x1 = fromNode.x + NODE_WIDTH;
              const y1 = fromNode.y + NODE_HEIGHT / 2;
              const x2 = toNode.x;
              const y2 = toNode.y + NODE_HEIGHT / 2;

              const isHovered = hoveredEdgeId === edge.id;

              return (
                <path
                  key={edge.id}
                  className="edge-path"
                  d={getBezierPath(x1, y1, x2, y2)}
                  fill="none"
                  stroke={isHovered ? themeColors.edgeHover : themeColors.edgeStroke}
                  strokeWidth={isHovered ? 3 : 2}
                  style={{
                    cursor: 'pointer',
                    transition: 'stroke 150ms ease, stroke-width 150ms ease',
                  }}
                  onMouseEnter={() => setHoveredEdgeId(edge.id)}
                  onMouseLeave={() => setHoveredEdgeId(null)}
                />
              );
            })}
          </g>

          <g className="nodes">
            {Array.from(visibleNodes).map((nodeId) => {
              const node = nodes[nodeId];
              if (!node) return null;

              const isSelected = selectedNodeId === nodeId;
              const isHovered = hoveredNodeId === nodeId;
              const isAnimating = animatingNodes.has(nodeId);
              const isDragging = draggingNode === nodeId;

              return (
                <g
                  key={node.id}
                  className="node-group"
                  transform={`translate(${node.x}, ${node.y})`}
                  style={{
                    cursor: isDragging ? 'grabbing' : 'grab',
                    transition: isAnimating ? 'transform 150ms ease' : 'none',
                  }}
                  onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                  onClick={(e) => handleNodeClick(e, node.id)}
                  onDoubleClick={(e) => handleNodeDoubleClick(e, node.id)}
                  onContextMenu={(e) => handleNodeContextMenu(e, node.id)}
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                >
                  {node.isMilestone ? (
                    <polygon
                      points={`${NODE_WIDTH / 2},0 ${NODE_WIDTH},${NODE_HEIGHT / 2} ${NODE_WIDTH / 2},${NODE_HEIGHT} 0,${NODE_HEIGHT / 2}`}
                      fill="url(#nodeGradient)"
                      stroke={isSelected ? '#3b82f6' : 'transparent'}
                      strokeWidth={isSelected ? 2 : 0}
                      filter={isSelected ? 'url(#glow)' : isHovered ? 'url(#nodeShadowHover)' : 'url(#nodeShadow)'}
                    />
                  ) : (
                    <rect
                      width={NODE_WIDTH}
                      height={NODE_HEIGHT}
                      rx="12"
                      ry="12"
                      fill="url(#nodeGradient)"
                      stroke={isSelected ? '#3b82f6' : 'transparent'}
                      strokeWidth={isSelected ? 2 : 0}
                      filter={isSelected ? 'url(#glow)' : isHovered ? 'url(#nodeShadowHover)' : 'url(#nodeShadow)'}
                    />
                  )}

                  <circle
                    cx={NODE_WIDTH - 16}
                    cy="16"
                    r="6"
                    fill={priorityColors[node.priority]}
                  />

                  <foreignObject
                    x="16"
                    y="14"
                    width={NODE_WIDTH - 32}
                    height={NODE_HEIGHT - 28}
                  >
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '16px',
                          fontWeight: 600,
                          color: theme === 'dark' ? '#f1f5f9' : '#1e293b',
                          lineHeight: 1.3,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          wordBreak: 'break-word',
                        }}
                      >
                        {node.title}
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#64748b',
                          marginTop: 'auto',
                        }}
                      >
                        {formatDate(node.dueDate)}
                      </div>
                    </div>
                  </foreignObject>

                  {node.children.length > 0 && (
                    <g
                      transform={`translate(${NODE_WIDTH - 10}, ${NODE_HEIGHT / 2 - 4})`}
                      style={{ cursor: 'pointer' }}
                    >
                      <circle cx="4" cy="4" r="8" fill={theme === 'dark' ? '#334155' : '#e2e8f0'} />
                      <path
                        d={node.collapsed ? 'M 1 4 L 7 4 M 4 1 L 4 7' : 'M 1 4 L 7 4'}
                        stroke={theme === 'dark' ? '#94a3b8' : '#64748b'}
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        </g>
      </svg>

      <div
        style={{
          position: 'absolute',
          bottom: '16px',
          right: '16px',
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          backgroundColor: theme === 'dark' ? '#334155' : '#ffffff',
          padding: '8px 12px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          fontSize: '12px',
          color: theme === 'dark' ? '#94a3b8' : '#64748b',
        }}
      >
        <span>{Math.round(viewport.zoom * 100)}%</span>
      </div>
    </div>
  );
};

export default GraphView;
