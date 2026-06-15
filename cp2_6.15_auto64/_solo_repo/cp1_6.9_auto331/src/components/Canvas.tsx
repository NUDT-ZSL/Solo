import { useRef, useEffect, useState, useCallback } from 'react';
import { DialogueNode, Connection, generateId } from '../types';

interface CanvasProps {
  nodes: DialogueNode[];
  connections: Connection[];
  selectedNodeId: string | null;
  onNodesChange: (nodes: DialogueNode[]) => void;
  onConnectionsChange: (connections: Connection[]) => void;
  onSelectNode: (id: string | null) => void;
  onSaveHistory: (nodes: DialogueNode[], connections: Connection[]) => void;
  onShowToast: (msg: string) => void;
}

const NODE_WIDTH = 200;
const NODE_HEIGHT = 120;
const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 800;
const GRID_SIZE = 40;
const PORT_RADIUS = 7;
const CURVE_COLOR = '#e94560';
const CURVE_HOVER_COLOR = '#ff6b6b';

type DragState = {
  type: 'node' | 'pan' | 'connect' | 'create' | null;
  nodeId?: string;
  startX?: number;
  startY?: number;
  offsetX?: number;
  offsetY?: number;
  tempFromId?: string;
  tempToX?: number;
  tempToY?: number;
};

export default function Canvas({
  nodes, connections, selectedNodeId,
  onNodesChange, onConnectionsChange, onSelectNode,
  onSaveHistory, onShowToast,
}: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<DragState>({ type: null });
  const [hoveredConnId, setHoveredConnId] = useState<string | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [animationTime, setAnimationTime] = useState(0);
  const [flyInNodes, setFlyInNodes] = useState<Map<string, { startTime: number; fromX: number; fromY: number; angle: number }>>(new Map());

  const screenToWorld = useCallback((sx: number, sy: number) => ({
    x: (sx - pan.x) / scale,
    y: (sy - pan.y) / scale,
  }), [pan, scale]);

  const getNodePort = (node: DialogueNode, type: 'in' | 'out') => {
    return type === 'in'
      ? { x: node.x, y: node.y + NODE_HEIGHT / 2 }
      : { x: node.x + NODE_WIDTH, y: node.y + NODE_HEIGHT / 2 };
  };

  const pointInNode = (px: number, py: number, node: DialogueNode) => {
    return px >= node.x && px <= node.x + NODE_WIDTH &&
           py >= node.y && py <= node.y + NODE_HEIGHT;
  };

  const pointInPort = (px: number, py: number, node: DialogueNode, type: 'in' | 'out') => {
    const port = getNodePort(node, type);
    const dx = px - port.x;
    const dy = py - port.y;
    return dx * dx + dy * dy <= (PORT_RADIUS + 4) * (PORT_RADIUS + 4);
  };

  const bezierPoint = (t: number, x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) => {
    const u = 1 - t;
    return {
      x: u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3,
      y: u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3,
    };
  };

  const distToCurve = (px: number, py: number, from: DialogueNode, to: DialogueNode) => {
    const p0 = getNodePort(from, 'out');
    const p3 = getNodePort(to, 'in');
    const dx = Math.max(60, Math.abs(p3.x - p0.x) * 0.5);
    const p1 = { x: p0.x + dx, y: p0.y };
    const p2 = { x: p3.x - dx, y: p3.y };
    let minDist = Infinity;
    for (let i = 0; i <= 50; i++) {
      const t = i / 50;
      const pt = bezierPoint(t, p0.x, p0.y, p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
      const d = Math.hypot(px - pt.x, py - pt.y);
      if (d < minDist) minDist = d;
    }
    return minDist;
  };

  useEffect(() => {
    if (nodes.length > 0 && flyInNodes.size === 0) {
      const now = performance.now();
      const newMap = new Map<string, { startTime: number; fromX: number; fromY: number; angle: number }>();
      nodes.forEach((n, i) => {
        newMap.set(n.id, {
          startTime: now + i * 50,
          fromX: n.x + (Math.random() - 0.5) * 200,
          fromY: n.y - 400 - Math.random() * 200,
          angle: (Math.random() - 0.5) * 0.5,
        });
      });
      setFlyInNodes(newMap);
    }
  }, []);

  useEffect(() => {
    let raf: number;
    const animate = () => {
      setAnimationTime(performance.now());
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = CANVAS_WIDTH * dpr;
    canvas.height = CANVAS_HEIGHT * dpr;
    canvas.style.width = `${CANVAS_WIDTH}px`;
    canvas.style.height = `${CANVAS_HEIGHT}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.save();
    ctx.strokeStyle = 'rgba(42, 42, 78, 0.3)';
    ctx.lineWidth = 1;
    for (let x = (pan.x % (GRID_SIZE * scale)); x < CANVAS_WIDTH; x += GRID_SIZE * scale) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let y = (pan.y % (GRID_SIZE * scale)); y < CANVAS_HEIGHT; y += GRID_SIZE * scale) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(scale, scale);

    const now = performance.now();

    connections.forEach(conn => {
      const from = nodes.find(n => n.id === conn.from);
      const to = nodes.find(n => n.id === conn.to);
      if (!from || !to) return;

      const isHovered = hoveredConnId === conn.id;
      const p0 = getNodePort(from, 'out');
      const p3 = getNodePort(to, 'in');
      const dx = Math.max(60, Math.abs(p3.x - p0.x) * 0.5);
      const p1 = { x: p0.x + dx, y: p0.y };
      const p2 = { x: p3.x - dx, y: p3.y };

      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
      ctx.strokeStyle = isHovered ? CURVE_HOVER_COLOR : CURVE_COLOR;
      ctx.lineWidth = isHovered ? 3 : 2;
      ctx.stroke();

      const flowT = ((now / 1000) * 2) % 1;
      const dot = bezierPoint(flowT, p0.x, p0.y, p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#ff6b6b';
      ctx.fill();

      const arrowT = 0.92;
      const arrowPos = bezierPoint(arrowT, p0.x, p0.y, p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
      const arrowDir = bezierPoint(arrowT + 0.01, p0.x, p0.y, p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
      const angle = Math.atan2(arrowDir.y - arrowPos.y, arrowDir.x - arrowPos.x);
      ctx.save();
      ctx.translate(arrowPos.x, arrowPos.y);
      ctx.rotate(angle);
      ctx.fillStyle = isHovered ? CURVE_HOVER_COLOR : CURVE_COLOR;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-10, -5);
      ctx.lineTo(-10, 5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    });

    if (dragState.current.type === 'connect' && dragState.current.tempFromId) {
      const from = nodes.find(n => n.id === dragState.current.tempFromId);
      if (from) {
        const p0 = getNodePort(from, 'out');
        const p3 = { x: dragState.current.tempToX!, y: dragState.current.tempToY! };
        const dx = Math.max(60, Math.abs(p3.x - p0.x) * 0.5);
        const p1 = { x: p0.x + dx, y: p0.y };
        const p2 = { x: p3.x - dx, y: p3.y };
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
        ctx.strokeStyle = 'rgba(255,107,107,0.8)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    const getCurrentNodePos = (node: DialogueNode) => {
      const fly = flyInNodes.get(node.id);
      if (fly) {
        const elapsed = now - fly.startTime;
        const duration = 800;
        if (elapsed < duration) {
          const t = elapsed / duration;
          const ease = 1 - Math.pow(1 - t, 3);
          const rot = fly.angle * (1 - ease);
          return {
            x: fly.fromX + (node.x - fly.fromX) * ease,
            y: fly.fromY + (node.y - fly.fromY) * ease,
            rotation: rot,
          };
        } else {
          setFlyInNodes(prev => {
            const next = new Map(prev);
            next.delete(node.id);
            return next;
          });
        }
      }
      return { x: node.x, y: node.y, rotation: 0 };
    };

    nodes.forEach(node => {
      const pos = getCurrentNodePos(node);
      const isSelected = node.id === selectedNodeId;
      const isEditing = node.id === editingNodeId;

      ctx.save();
      if (pos.rotation) {
        ctx.translate(pos.x + NODE_WIDTH / 2, pos.y + NODE_HEIGHT / 2);
        ctx.rotate(pos.rotation);
        ctx.translate(-(pos.x + NODE_WIDTH / 2), -(pos.y + NODE_HEIGHT / 2));
      }

      const gradient = ctx.createLinearGradient(pos.x, pos.y, pos.x + NODE_WIDTH, pos.y + NODE_HEIGHT);
      gradient.addColorStop(0, node.bgColor);
      gradient.addColorStop(1, shadeColor(node.bgColor, 15));

      ctx.shadowColor = 'rgba(233, 69, 96, 0.3)';
      ctx.shadowBlur = 15;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      const radius = 12;
      roundRect(ctx, pos.x, pos.y, NODE_WIDTH, NODE_HEIGHT, radius);
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 4;
      ctx.shadowOffsetX = 0;
      roundRect(ctx, pos.x, pos.y, NODE_WIDTH, NODE_HEIGHT, radius);
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      if (isSelected) {
        ctx.strokeStyle = '#e94560';
        ctx.lineWidth = 2;
        roundRect(ctx, pos.x, pos.y, NODE_WIDTH, NODE_HEIGHT, radius);
        ctx.stroke();
      }

      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 1;
      roundRect(ctx, pos.x, pos.y, NODE_WIDTH, NODE_HEIGHT, radius);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(pos.x + 12, pos.y + 38);
      ctx.lineTo(pos.x + NODE_WIDTH - 12, pos.y + 38);
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = '600 13px -apple-system, sans-serif';
      ctx.textBaseline = 'top';
      const title = node.title || '未命名节点';
      ctx.fillText(truncateText(ctx, title, NODE_WIDTH - 24), pos.x + 12, pos.y + 13);

      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = '11px -apple-system, sans-serif';
      const content = node.content || '双击编辑对话内容...';
      const lines = wrapText(ctx, content, NODE_WIDTH - 24, 3);
      lines.forEach((line, i) => {
        ctx.fillText(line, pos.x + 12, pos.y + 48 + i * 15);
      });

      const inPort = getNodePort({ ...node, x: pos.x, y: pos.y } as DialogueNode, 'in');
      const outPort = getNodePort({ ...node, x: pos.x, y: pos.y } as DialogueNode, 'out');

      ctx.beginPath();
      ctx.arc(inPort.x, inPort.y, PORT_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = '#1a1a2e';
      ctx.fill();
      ctx.strokeStyle = node.avatarColor;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(outPort.x, outPort.y, PORT_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = '#e94560';
      ctx.fill();
      ctx.strokeStyle = '#ff6b6b';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.restore();
    });

    ctx.restore();
  }, [nodes, connections, selectedNodeId, hoveredConnId, pan, scale, animationTime, flyInNodes, editingNodeId]);

  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const world = screenToWorld(sx, sy);

    if (e.shiftKey) {
      for (const node of nodes) {
        if (pointInPort(world.x, world.y, node, 'out')) {
          dragState.current = {
            type: 'connect',
            tempFromId: node.id,
            startX: sx,
            startY: sy,
            tempToX: world.x,
            tempToY: world.y,
          };
          onSelectNode(node.id);
          return;
        }
      }
    }

    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i];
      if (pointInNode(world.x, world.y, node)) {
        dragState.current = {
          type: 'node',
          nodeId: node.id,
          startX: sx,
          startY: sy,
          offsetX: world.x - node.x,
          offsetY: world.y - node.y,
        };
        onSelectNode(node.id);
        return;
      }
    }

    dragState.current = {
      type: 'pan',
      startX: sx,
      startY: sy,
      offsetX: pan.x,
      offsetY: pan.y,
    };
    onSelectNode(null);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const world = screenToWorld(sx, sy);

    const ds = dragState.current;
    if (ds.type === 'node' && ds.nodeId) {
      const newNodes = nodes.map(n =>
        n.id === ds.nodeId
          ? { ...n, x: Math.round(world.x - (ds.offsetX || 0)), y: Math.round(world.y - (ds.offsetY || 0)) }
          : n
      );
      onNodesChange(newNodes);
    } else if (ds.type === 'pan') {
      setPan({
        x: (ds.offsetX || 0) + (sx - (ds.startX || 0)),
        y: (ds.offsetY || 0) + (sy - (ds.startY || 0)),
      });
    } else if (ds.type === 'connect') {
      dragState.current = { ...ds, tempToX: world.x, tempToY: world.y };
    } else {
      let found: string | null = null;
      for (const conn of connections) {
        const from = nodes.find(n => n.id === conn.from);
        const to = nodes.find(n => n.id === conn.to);
        if (from && to && distToCurve(world.x, world.y, from, to) < 6) {
          found = conn.id;
          break;
        }
      }
      setHoveredConnId(found);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const world = screenToWorld(sx, sy);

    const ds = dragState.current;

    if (ds.type === 'connect' && ds.tempFromId) {
      let targetId: string | null = null;
      for (const node of nodes) {
        if (node.id !== ds.tempFromId && pointInPort(world.x, world.y, node, 'in')) {
          targetId = node.id;
          break;
        }
      }
      if (targetId) {
        const exists = connections.some(c => c.from === ds.tempFromId && c.to === targetId);
        if (!exists) {
          const newConn: Connection = { id: generateId(), from: ds.tempFromId, to: targetId };
          const newConnections = [...connections, newConn];
          onSaveHistory(nodes, newConnections);
          onConnectionsChange(newConnections);
          onShowToast('↔ 已创建连接');
        }
      }
    }

    if (ds.type === 'node' && ds.nodeId) {
      const moved = Math.abs(sx - (ds.startX || 0)) + Math.abs(sy - (ds.startY || 0));
      if (moved > 3) {
        onSaveHistory(nodes, connections);
      }
    }

    dragState.current = { type: null };
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const world = screenToWorld(sx, sy);

    for (let i = nodes.length - 1; i >= 0; i--) {
      if (pointInNode(world.x, world.y, nodes[i])) {
        setEditingNodeId(nodes[i].id);
        onSelectNode(nodes[i].id);
        return;
      }
    }

    const randomColor = () => {
      const h = Math.floor(Math.random() * 360);
      return `hsl(${h}, 70%, 55%)`;
    };

    const newNode: DialogueNode = {
      id: generateId(),
      x: Math.round(world.x - NODE_WIDTH / 2),
      y: Math.round(world.y - NODE_HEIGHT / 2),
      title: '',
      content: '',
      bgColor: '#16213e',
      avatarColor: randomColor(),
      typingSpeed: 50,
    };
    const newNodes = [...nodes, newNode];
    onSaveHistory(newNodes, connections);
    onNodesChange(newNodes);
    onSelectNode(newNode.id);
    setEditingNodeId(newNode.id);
    onShowToast('+ 创建新节点');
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.001;
    const newScale = Math.max(0.3, Math.min(3, scale * (1 + delta)));
    setScale(newScale);
  };

  const handleConnectionClick = (e: React.MouseEvent) => {
    if (!hoveredConnId) return;
    if (e.detail === 2) {
      const newConns = connections.filter(c => c.id !== hoveredConnId);
      onSaveHistory(nodes, newConns);
      onConnectionsChange(newConns);
      setHoveredConnId(null);
      onShowToast('✕ 删除连接');
    }
  };

  return (
    <div
      ref={containerRef}
      style={styles.container}
      onWheel={handleWheel}
    >
      <canvas
        ref={canvasRef}
        style={styles.canvas}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        onClick={handleConnectionClick}
      />
      <div style={styles.hintOverlay}>
        <div style={styles.hintText}>
          <span style={styles.hintKey}>双击</span> 创建节点　
          <span style={styles.hintKey}>Shift+拖拽</span> 连接　
          <span style={styles.hintKey}>滚轮</span> 缩放　
          <span style={styles.hintKey}>拖动空白</span> 平移　
          <span style={styles.hintKey}>双击连线</span> 删除
        </div>
      </div>
      <div style={styles.zoomIndicator}>
        <button onClick={() => setScale(s => Math.min(3, s * 1.2))} style={styles.zoomBtn}>＋</button>
        <span style={styles.zoomText}>{Math.round(scale * 100)}%</span>
        <button onClick={() => setScale(s => Math.max(0.3, s / 1.2))} style={styles.zoomBtn}>－</button>
        <div style={{ width: 1, height: 16, background: '#3a3a5e', margin: '0 8px' }} />
        <button onClick={() => { setPan({ x: 0, y: 0 }); setScale(1); }} style={styles.zoomBtn}>⌂</button>
      </div>
    </div>
  );
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let result = text;
  while (result.length > 0 && ctx.measureText(result + '…').width > maxWidth) {
    result = result.slice(0, -1);
  }
  return result + '…';
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const lines: string[] = [];
  let current = '';
  for (const ch of text) {
    if (ch === '\n') {
      lines.push(current);
      current = '';
      if (lines.length >= maxLines - 1) break;
      continue;
    }
    if (ctx.measureText(current + ch).width > maxWidth) {
      lines.push(current);
      current = ch;
      if (lines.length >= maxLines - 1) break;
    } else {
      current += ch;
    }
  }
  if (lines.length < maxLines) {
    lines.push(lines.length === maxLines - 1 ? truncateText(ctx, current, maxWidth) : current);
  }
  while (lines.length < maxLines) lines.push('');
  return lines;
}

function shadeColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, (num >> 16) + Math.round(255 * percent / 100));
  const g = Math.min(255, ((num >> 8) & 0x00ff) + Math.round(255 * percent / 100));
  const b = Math.min(255, (num & 0x0000ff) + Math.round(255 * percent / 100));
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

const styles = {
  container: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    background: '#1a1a2e',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  } as React.CSSProperties,
  canvas: {
    cursor: 'grab',
    userSelect: 'none',
    borderRadius: 4,
  } as React.CSSProperties,
  hintOverlay: {
    position: 'absolute',
    bottom: 16,
    left: '50%',
    transform: 'translateX(-50%)',
    pointerEvents: 'none',
  } as React.CSSProperties,
  hintText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    background: 'rgba(0,0,0,0.3)',
    padding: '8px 14px',
    borderRadius: 20,
    backdropFilter: 'blur(6px)',
  } as React.CSSProperties,
  hintKey: {
    color: '#e94560',
    fontWeight: 600,
  } as React.CSSProperties,
  zoomIndicator: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    background: 'rgba(15,15,35,0.8)',
    padding: '6px 10px',
    borderRadius: 8,
    backdropFilter: 'blur(6px)',
    border: '1px solid #2a2a4e',
  } as React.CSSProperties,
  zoomBtn: {
    width: 24,
    height: 24,
    border: 'none',
    background: 'rgba(255,255,255,0.05)',
    color: '#aaaacc',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 14,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  } as React.CSSProperties,
  zoomText: {
    fontSize: 12,
    color: '#aaaacc',
    minWidth: 40,
    textAlign: 'center',
  } as React.CSSProperties,
};
