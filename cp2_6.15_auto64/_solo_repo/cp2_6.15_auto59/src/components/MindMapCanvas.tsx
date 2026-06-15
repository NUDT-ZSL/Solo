import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useMindMapStore, MindMapNode } from '../store';

const PRESET_COLORS = ['#e91e63', '#2196f3', '#4caf50', '#ff9800', '#9c27b0'];
const SPRING_STRENGTH = 0.05;
const SPRING_DAMPING = 0.7;
const REST_LENGTH = 150;
const ANIMATION_DURATION = 500;

interface Velocity { x: number; y: number; }

const MindMapCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);

  const nodes = useMindMapStore(s => s.nodes);
  const selectedNodeIds = useMindMapStore(s => s.selectedNodeIds);
  const selectedNodeId = useMindMapStore(s => s.selectedNodeId);
  const highlightedNodeIds = useMindMapStore(s => s.highlightedNodeIds);
  const remoteEdits = useMindMapStore(s => s.remoteEdits);
  const createNode = useMindMapStore(s => s.createNode);
  const updateNode = useMindMapStore(s => s.updateNode);
  const moveNode = useMindMapStore(s => s.moveNode);
  const selectNode = useMindMapStore(s => s.selectNode);
  const userId = useMindMapStore(s => s.userId);

  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [creatingChild, setCreatingChild] = useState<{ parentId: string; startX: number; startY: number } | null>(null);
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editPos, setEditPos] = useState({ x: 0, y: 0 });
  const [hoverPlus, setHoverPlus] = useState<string | null>(null);
  const velocities = useRef<Map<string, Velocity>>(new Map());
  const springAnimating = useRef(false);
  const springStart = useRef(0);
  const blinkPhase = useRef(0);

  const screenToWorld = useCallback((sx: number, sy: number) => ({
    x: (sx - offset.x) / scale,
    y: (sy - offset.y) / scale,
  }), [offset, scale]);

  const worldToScreen = useCallback((wx: number, wy: number) => ({
    x: wx * scale + offset.x,
    y: wy * scale + offset.y,
  }), [offset, scale]);

  const findNodeAt = useCallback((wx: number, wy: number): MindMapNode | null => {
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      const dx = wx - n.x;
      const dy = wy - n.y;
      if (dx * dx + dy * dy <= n.style.radius * n.style.radius) return n;
    }
    return null;
  }, [nodes]);

  const findPlusButton = useCallback((wx: number, wy: number): string | null => {
    for (const n of nodes) {
      const px = n.x + n.style.radius * 0.7;
      const py = n.y - n.style.radius * 0.7;
      const dx = wx - px;
      const dy = wy - py;
      if (dx * dx + dy * dy <= 144) return n.id;
    }
    return null;
  }, [nodes]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = container.clientWidth;
    const h = container.clientHeight;
    canvas.width = w * window.devicePixelRatio;
    canvas.height = h * window.devicePixelRatio;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);

    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 0.5 / scale;
    const gridSize = 20;
    const startX = Math.floor(-offset.x / scale / gridSize) * gridSize;
    const startY = Math.floor(-offset.y / scale / gridSize) * gridSize;
    const endX = startX + w / scale + gridSize;
    const endY = startY + h / scale + gridSize;
    for (let gx = startX; gx <= endX; gx += gridSize) {
      ctx.beginPath();
      ctx.moveTo(gx, startY);
      ctx.lineTo(gx, endY);
      ctx.stroke();
    }
    for (let gy = startY; gy <= endY; gy += gridSize) {
      ctx.beginPath();
      ctx.moveTo(startX, gy);
      ctx.lineTo(endX, gy);
      ctx.stroke();
    }

    nodes.filter(n => n.parentId).forEach(n => {
      const parent = nodes.find(p => p.id === n.parentId);
      if (!parent) return;

      ctx.beginPath();
      const mx = (parent.x + n.x) / 2;
      const my1 = parent.y;
      const my2 = n.y;
      ctx.moveTo(parent.x, parent.y);
      ctx.bezierCurveTo(mx, my1, mx, my2, n.x, n.y);
      ctx.strokeStyle = '#9e9e9e';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    if (creatingChild) {
      const parent = nodes.find(n => n.id === creatingChild.parentId);
      if (parent) {
        ctx.beginPath();
        ctx.moveTo(parent.x, parent.y);
        const mx = (parent.x + creatingChild.startX) / 2;
        ctx.bezierCurveTo(mx, parent.y, mx, creatingChild.startY, creatingChild.startX, creatingChild.startY);
        ctx.strokeStyle = '#2196f3';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    const now = Date.now();
    blinkPhase.current = (now % 1500) / 1500;

    nodes.forEach(n => {
      const isSelected = selectedNodeIds.includes(n.id);
      const isHighlighted = highlightedNodeIds.includes(n.id);
      const remoteEdit = remoteEdits.get(n.id);

      if (isHighlighted) {
        ctx.save();
        ctx.shadowColor = '#ff4080';
        ctx.shadowBlur = 20 + Math.sin(now / 200) * 8;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.style.radius + 6, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 64, 128, 0.15)';
        ctx.fill();
        ctx.restore();
      }

      if (remoteEdit && now - remoteEdit.timestamp < 1500) {
        const alpha = 0.1 * (1 - (now - remoteEdit.timestamp) / 1500);
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.style.radius + 8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(n.x + n.style.radius + 16, n.y - n.style.radius - 8, 12, 0, Math.PI * 2);
        ctx.fillStyle = remoteEdit.color;
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(remoteEdit.userId.slice(0, 2).toUpperCase(), n.x + n.style.radius + 16, n.y - n.style.radius - 8);
      }

      ctx.beginPath();
      ctx.arc(n.x, n.y, n.style.radius, 0, Math.PI * 2);
      ctx.fillStyle = n.style.bgColor;
      ctx.fill();

      if (n.style.colorMark) {
        ctx.beginPath();
        ctx.arc(n.x + n.style.radius * 0.6, n.y - n.style.radius * 0.6, 6, 0, Math.PI * 2);
        ctx.fillStyle = n.style.colorMark;
        ctx.fill();
      }

      if (isSelected) {
        const dashOffset = blinkPhase.current * 20;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.style.radius + 4, 0, Math.PI * 2);
        ctx.strokeStyle = '#00bcd4';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.lineDashOffset = -dashOffset;
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.fillStyle = n.style.textColor || '#ffffff';
      const fontSize = n.style.bold ? 15 : 14;
      ctx.font = `${n.style.bold ? 'bold ' : ''}${fontSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const maxWidth = n.style.radius * 1.6;
      const text = n.text || '';
      if (text) {
        const lines: string[] = [];
        let currentLine = '';
        for (const char of text) {
          const testLine = currentLine + char;
          if (ctx.measureText(testLine).width > maxWidth) {
            lines.push(currentLine);
            currentLine = char;
          } else {
            currentLine = testLine;
          }
        }
        lines.push(currentLine);
        const lineHeight = fontSize + 2;
        const startY = n.y - ((lines.length - 1) * lineHeight) / 2;
        lines.forEach((line, i) => {
          ctx.fillText(line, n.x, startY + i * lineHeight);
        });
      }

      const px = n.x + n.style.radius * 0.7;
      const py = n.y - n.style.radius * 0.7;
      ctx.beginPath();
      ctx.arc(px, py, hoverPlus === n.id ? 14 : 12, 0, Math.PI * 2);
      ctx.fillStyle = hoverPlus === n.id ? '#1976d2' : '#2196f3';
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('+', px, py);

      ctx.beginPath();
      ctx.moveTo(n.x + n.style.radius * 0.25, n.y + n.style.radius * 0.65);
      ctx.lineTo(n.x + n.style.radius * 0.15, n.y + n.style.radius * 0.35);
      ctx.lineTo(n.x + n.style.radius * 0.45, n.y + n.style.radius * 0.35);
      ctx.lineTo(n.x + n.style.radius * 0.55, n.y + n.style.radius * 0.65);
      ctx.lineTo(n.x + n.style.radius * 0.5, n.y + n.style.radius * 0.85);
      ctx.lineTo(n.x + n.style.radius * 0.3, n.y + n.style.radius * 0.85);
      ctx.closePath();
      const bookmarked = false;
      ctx.fillStyle = bookmarked ? '#ffeb3b' : 'rgba(0,0,0,0.2)';
      ctx.fill();
    });

    ctx.restore();
  }, [nodes, selectedNodeIds, highlightedNodeIds, remoteEdits, offset, scale, creatingChild, hoverPlus]);

  const animateSpring = useCallback(() => {
    if (!springAnimating.current) return;
    const elapsed = Date.now() - springStart.current;
    if (elapsed > ANIMATION_DURATION) {
      springAnimating.current = false;
      velocities.current.clear();
      draw();
      return;
    }

    const store = useMindMapStore.getState();
    const currentNodes = store.nodes;

    currentNodes.forEach(n => {
      if (!n.parentId) return;
      const parent = currentNodes.find(p => p.id === n.parentId);
      if (!parent) return;

      let vel = velocities.current.get(n.id) || { x: 0, y: 0 };
      const dx = parent.x - n.x;
      const dy = parent.y - n.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = SPRING_STRENGTH * (dist - REST_LENGTH);
      vel.x += force * (dx / dist);
      vel.y += force * (dy / dist);
      vel.x *= SPRING_DAMPING;
      vel.y *= SPRING_DAMPING;
      velocities.current.set(n.id, vel);
    });

    let maxMovement = 0;
    currentNodes.forEach(n => {
      const vel = velocities.current.get(n.id);
      if (!vel) return;
      const newX = n.x + vel.x;
      const newY = n.y + vel.y;
      const movement = Math.sqrt(vel.x * vel.x + vel.y * vel.y);
      maxMovement = Math.max(maxMovement, movement);
      if (movement > 0.5) {
        store.moveNode(n.id, newX, newY);
      }
    });

    draw();
    if (maxMovement > 0.5) {
      animFrameRef.current = requestAnimationFrame(animateSpring);
    } else {
      springAnimating.current = false;
      velocities.current.clear();
    }
  }, [draw]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const world = screenToWorld(sx, sy);

    const plusId = findPlusButton(world.x, world.y);
    if (plusId && e.button === 0) {
      setCreatingChild({ parentId: plusId, startX: world.x, startY: world.y });
      return;
    }

    const node = findNodeAt(world.x, world.y);
    if (node && e.button === 0) {
      setDragging(node.id);
      setDragStart({ x: world.x - node.x, y: world.y - node.y });
      return;
    }

    if (e.button === 0 || e.button === 1) {
      setPanning(true);
      setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    }
  }, [screenToWorld, findNodeAt, findPlusButton, offset]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const world = screenToWorld(sx, sy);

    if (creatingChild) {
      setCreatingChild(prev => prev ? { ...prev, startX: world.x, startY: world.y } : null);
      return;
    }

    if (dragging) {
      const nx = world.x - dragStart.x;
      const ny = world.y - dragStart.y;
      moveNode(dragging, nx, ny);
      return;
    }

    if (panning) {
      setOffset({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      return;
    }

    const plusId = findPlusButton(world.x, world.y);
    setHoverPlus(plusId);
    canvasRef.current!.style.cursor = plusId ? 'pointer' : (findNodeAt(world.x, world.y) ? 'grab' : 'default');
  }, [creatingChild, dragging, panning, dragStart, panStart, screenToWorld, findPlusButton, findNodeAt, moveNode]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (creatingChild) {
      const parent = nodes.find(n => n.id === creatingChild.parentId);
      if (parent) {
        const dx = creatingChild.startX - parent.x;
        const dy = creatingChild.startY - parent.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 50) {
          createNode(parent, creatingChild.startX, creatingChild.startY);
        }
      }
      setCreatingChild(null);
      return;
    }

    if (dragging) {
      springAnimating.current = true;
      springStart.current = Date.now();
      animateSpring();
      setDragging(null);
      return;
    }

    if (panning) {
      setPanning(false);
    }
  }, [creatingChild, dragging, panning, nodes, createNode, animateSpring]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (dragging || panning) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const world = screenToWorld(sx, sy);
    const node = findNodeAt(world.x, world.y);
    selectNode(node?.id || null, e.ctrlKey || e.metaKey);
  }, [screenToWorld, findNodeAt, selectNode, dragging, panning]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const world = screenToWorld(sx, sy);
    const node = findNodeAt(world.x, world.y);
    if (node) {
      setEditingNode(node.id);
      setEditText(node.text);
      const screenPos = worldToScreen(node.x, node.y);
      setEditPos({ x: screenPos.x - 100, y: screenPos.y - 15 });
    } else if (nodes.length === 0) {
      createNode(null, world.x, world.y);
    }
  }, [screenToWorld, findNodeAt, worldToScreen, nodes, createNode]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newScale = Math.max(0.1, Math.min(5, scale * zoomFactor));
    const newOffset = {
      x: sx - (sx - offset.x) * (newScale / scale),
      y: sy - (sy - offset.y) * (newScale / scale),
    };
    setScale(newScale);
    setOffset(newOffset);
  }, [scale, offset]);

  const handleEditKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && editingNode) {
      updateNode({ id: editingNode, text: editText });
      setEditingNode(null);
    } else if (e.key === 'Escape') {
      setEditingNode(null);
    }
  }, [editingNode, editText, updateNode]);

  const handleEditBlur = useCallback(() => {
    if (editingNode) {
      updateNode({ id: editingNode, text: editText });
      setEditingNode(null);
    }
  }, [editingNode, editText, updateNode]);

  useEffect(() => {
    const handleResize = () => draw();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [draw]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
      {editingNode && (
        <input
          className="node-text-input"
          style={{ left: editPos.x, top: editPos.y }}
          value={editText}
          onChange={e => setEditText(e.target.value)}
          onKeyDown={handleEditKeyDown}
          onBlur={handleEditBlur}
          autoFocus
        />
      )}
    </div>
  );
};

export default MindMapCanvas;
