import React, { useRef, useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { NodeData, EdgeData } from '../shared/types';
import { PRESET_COLORS } from '../shared/types';

interface CanvasProps {
  nodes: NodeData[];
  edges: EdgeData[];
  darkMode: boolean;
  onAddNode: (node: NodeData) => void;
  onUpdateNode: (node: NodeData) => void;
  onDeleteNode: (nodeId: string) => void;
  onAddEdge: (edge: EdgeData) => void;
  onUpdateEdge: (edge: EdgeData) => void;
  onDeleteEdge: (edgeId: string) => void;
  onError: (msg: string) => void;
}

interface ViewState {
  offsetX: number;
  offsetY: number;
  scale: number;
}

export default function Canvas({
  nodes,
  edges,
  darkMode,
  onAddNode,
  onUpdateNode,
  onDeleteNode,
  onAddEdge,
  onUpdateEdge,
  onDeleteEdge,
  onError,
}: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<ViewState>({ offsetX: 0, offsetY: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0, ox: 0, oy: 0 });
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, nx: 0, ny: 0 });
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null);
  const [colorPickerNode, setColorPickerNode] = useState<string | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const worldToScreen = useCallback((wx: number, wy: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (wx + view.offsetX) * view.scale + rect.width / 2,
      y: (wy + view.offsetY) * view.scale + rect.height / 2,
    };
  }, [view]);

  const screenToWorld = useCallback((sx: number, sy: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (sx - rect.width / 2) / view.scale - view.offsetX,
      y: (sy - rect.height / 2) / view.scale - view.offsetY,
    };
  }, [view]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setView((v) => ({
      ...v,
      scale: Math.max(0.2, Math.min(3, v.scale * delta)),
    }));
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const prevent = (e: WheelEvent) => e.preventDefault();
    el.addEventListener('wheel', prevent, { passive: false });
    return () => el.removeEventListener('wheel', prevent);
  }, []);

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.target !== e.currentTarget && !(e.target as HTMLElement).classList.contains('canvas-grid')) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX, y: e.clientY, ox: view.offsetX, oy: view.offsetY });
    setSelectedNodeId(null);
    setColorPickerNode(null);
    setEditingNodeId(null);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const localX = e.clientX - rect.left;
    const localY = e.clientY - rect.top;
    setMousePos({ x: localX, y: localY });

    if (isPanning) {
      const dx = (e.clientX - panStart.x) / view.scale;
      const dy = (e.clientY - panStart.y) / view.scale;
      setView((v) => ({ ...v, offsetX: panStart.ox + dx, offsetY: panStart.oy + dy }));
    }

    if (draggingNodeId) {
      const dx = (e.clientX - dragStart.x) / view.scale;
      const dy = (e.clientY - dragStart.y) / view.scale;
      const node = nodes.find((n) => n.id === draggingNodeId);
      if (node) {
        onUpdateNode({ ...node, x: dragStart.nx + dx, y: dragStart.ny + dy });
      }
    }
  };

  const handleCanvasMouseUp = () => {
    setIsPanning(false);
    if (connectingFrom) {
      setConnectingFrom(null);
    }
    setDraggingNodeId(null);
  };

  const handleNodeMouseDown = (e: React.MouseEvent, node: NodeData) => {
    e.stopPropagation();
    if ((e.target as HTMLElement).classList.contains('color-dot')) return;
    if ((e.target as HTMLElement).classList.contains('node-textarea')) return;

    if (e.shiftKey || e.button === 2) {
      setConnectingFrom(node.id);
      return;
    }

    setSelectedNodeId(node.id);
    setDraggingNodeId(node.id);
    setDragStart({ x: e.clientX, y: e.clientY, nx: node.x, ny: node.y });
  };

  const handleNodeMouseUp = (e: React.MouseEvent, node: NodeData) => {
    e.stopPropagation();
    if (connectingFrom && connectingFrom !== node.id) {
      const edge: EdgeData = {
        id: uuidv4(),
        from: connectingFrom,
        to: node.id,
        label: '',
      };
      onAddEdge(edge);
      setConnectingFrom(null);
    }
  };

  const handleNodeDoubleClick = (e: React.MouseEvent, node: NodeData) => {
    e.stopPropagation();
    setEditingNodeId(node.id);
  };

  const handleNodeKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, node: NodeData) => {
    if (e.key === 'Escape') {
      setEditingNodeId(null);
    }
  };

  const handleNodeBlur = (e: React.FocusEvent<HTMLTextAreaElement>, node: NodeData) => {
    const text = e.target.value.slice(0, 200);
    if (text !== node.text) {
      onUpdateNode({ ...node, text });
    }
    setEditingNodeId(null);
  };

  const handleColorDotClick = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    setColorPickerNode(colorPickerNode === nodeId ? null : nodeId);
  };

  const handleColorPick = (e: React.MouseEvent, color: string, node: NodeData) => {
    e.stopPropagation();
    onUpdateNode({ ...node, color });
    setColorPickerNode(null);
  };

  const handleAddNode = () => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const center = screenToWorld(rect.width / 2, rect.height / 2);
    const node: NodeData = {
      id: uuidv4(),
      x: center.x + (Math.random() - 0.5) * 200,
      y: center.y + (Math.random() - 0.5) * 150,
      width: 120,
      height: 60,
      text: '新节点',
      color: '#60A5FA',
    };
    onAddNode(node);
  };

  const handleZoomIn = () => setView((v) => ({ ...v, scale: Math.min(3, v.scale * 1.2) }));
  const handleZoomOut = () => setView((v) => ({ ...v, scale: Math.max(0.2, v.scale / 1.2) }));
  const handleReset = () => setView({ offsetX: 0, offsetY: 0, scale: 1 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let initialDistance = 0;
    let initialScale = 1;

    const getDistance = (t1: Touch, t2: Touch) => {
      const dx = t1.clientX - t2.clientX;
      const dy = t1.clientY - t2.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        initialDistance = getDistance(e.touches[0], e.touches[1]);
        initialScale = view.scale;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dist = getDistance(e.touches[0], e.touches[1]);
        const newScale = (dist / initialDistance) * initialScale;
        setView((v) => ({ ...v, scale: Math.max(0.2, Math.min(3, newScale)) }));
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
    };
  }, [view.scale]);

  const handleEdgeLabelDoubleClick = (e: React.MouseEvent, edgeId: string) => {
    e.stopPropagation();
    setEditingEdgeId(edgeId);
  };

  const handleEdgeLabelBlur = (e: React.FocusEvent<HTMLInputElement>, edge: EdgeData) => {
    const label = e.target.value.slice(0, 30);
    if (label !== edge.label) {
      onUpdateEdge({ ...edge, label });
    }
    setEditingEdgeId(null);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeId && !editingNodeId && !editingEdgeId) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        onDeleteNode(selectedNodeId);
        setSelectedNodeId(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedNodeId, editingNodeId, editingEdgeId, onDeleteNode]);

  const renderGrid = () => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const gridSize = 40 * view.scale;
    const offsetX = (view.offsetX * view.scale + rect.width / 2) % gridSize;
    const offsetY = (view.offsetY * view.scale + rect.height / 2) % gridSize;
    const lineColor = darkMode ? '#374151' : '#E5E7EB';
    return (
      <svg className="canvas-grid" width={rect.width} height={rect.height}>
        <defs>
          <pattern id="grid" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse" x={offsetX} y={offsetY}>
            <path d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`} fill="none" stroke={lineColor} strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
    );
  };

  const renderEdges = () => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const arrowColor = darkMode ? '#9CA3AF' : '#6B7280';

    const getNodeCenter = (nodeId: string) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return { x: 0, y: 0 };
      return worldToScreen(node.x + node.width / 2, node.y + node.height / 2);
    };

    return (
      <svg className="svg-layer" width={rect.width} height={rect.height}>
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
            <polygon points="0 0, 10 3, 0 6" fill={arrowColor} />
          </marker>
        </defs>
        {edges.map((edge) => {
          const from = getNodeCenter(edge.from);
          const to = getNodeCenter(edge.to);
          const midX = (from.x + to.x) / 2;
          const midY = (from.y + to.y) / 2;
          const isEditing = editingEdgeId === edge.id;

          return (
            <g key={edge.id}>
              <path
                d={`M ${from.x} ${from.y} L ${to.x} ${to.y}`}
                stroke={arrowColor}
                strokeWidth={2}
                fill="none"
                markerEnd="url(#arrowhead)"
                style={{ transition: 'all 0.3s ease-out' }}
              />
              {isEditing ? (
                <foreignObject x={midX - 40} y={midY - 12} width={80} height={24}>
                  <input
                    className="edge-label-input"
                    defaultValue={edge.label}
                    autoFocus
                    maxLength={30}
                    onBlur={(e) => handleEdgeLabelBlur(e, edge)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                      if (e.key === 'Escape') setEditingEdgeId(null);
                    }}
                  />
                </foreignObject>
              ) : (
                <text
                  className="edge-label"
                  x={midX}
                  y={midY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  onDoubleClick={(e) => handleEdgeLabelDoubleClick(e, edge.id)}
                >
                  {edge.label || '双击编辑'}
                </text>
              )}
            </g>
          );
        })}
        {connectingFrom && mousePos && (() => {
          const from = getNodeCenter(connectingFrom);
          return (
            <path
              d={`M ${from.x} ${from.y} L ${mousePos.x} ${mousePos.y}`}
              stroke={arrowColor}
              strokeWidth={2}
              strokeDasharray="5,5"
              fill="none"
            />
          );
        })()}
      </svg>
    );
  };

  return (
    <div
      className="canvas-container"
      ref={containerRef}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleCanvasMouseMove}
      onMouseUp={handleCanvasMouseUp}
      onMouseLeave={handleCanvasMouseUp}
      onWheel={handleWheel}
      onContextMenu={(e) => e.preventDefault()}
    >
      {renderGrid()}
      {renderEdges()}
      {nodes.map((node) => {
        const pos = worldToScreen(node.x, node.y);
        const width = node.width * view.scale;
        const height = node.height * view.scale;
        const isSelected = selectedNodeId === node.id;
        const isEditing = editingNodeId === node.id;
        const borderColor = node.color || '#9CA3AF';
        const textColor = node.color || (darkMode ? '#F9FAFB' : '#111827');

        return (
          <div
            key={node.id}
            className={`node ${isSelected ? 'selected' : ''}`}
            style={{
              left: pos.x,
              top: pos.y,
              width,
              height,
              borderColor,
              color: isEditing ? undefined : textColor,
              fontSize: 13 * view.scale,
            }}
            onMouseDown={(e) => handleNodeMouseDown(e, node)}
            onMouseUp={(e) => handleNodeMouseUp(e, node)}
            onDoubleClick={(e) => handleNodeDoubleClick(e, node)}
          >
            <div
              className="color-dot"
              style={{ background: node.color || '#9CA3AF', borderColor: darkMode ? '#374151' : '#fff' }}
              onClick={(e) => handleColorDotClick(e, node.id)}
            />
            {colorPickerNode === node.id && (
              <div className="color-picker" onClick={(e) => e.stopPropagation()}>
                {PRESET_COLORS.map((c) => (
                  <div
                    key={c}
                    className="swatch"
                    style={{ background: c, borderColor: c === node.color ? (darkMode ? '#fff' : '#111827') : 'transparent' }}
                    onClick={(e) => handleColorPick(e, c, node)}
                  />
                ))}
              </div>
            )}
            {isEditing ? (
              <textarea
                className="node-textarea"
                defaultValue={node.text}
                autoFocus
                maxLength={200}
                onBlur={(e) => handleNodeBlur(e, node)}
                onKeyDown={(e) => handleNodeKeyDown(e, node)}
              />
            ) : (
              <span>{node.text || '双击编辑'}</span>
            )}
          </div>
        );
      })}

      <button className="add-node-btn" onClick={handleAddNode}>+ 添加节点</button>

      <div className="canvas-controls">
        <button onClick={handleZoomIn} title="放大">+</button>
        <button onClick={handleZoomOut} title="缩小">−</button>
        <button onClick={handleReset} title="重置">⟳</button>
      </div>
    </div>
  );
}
