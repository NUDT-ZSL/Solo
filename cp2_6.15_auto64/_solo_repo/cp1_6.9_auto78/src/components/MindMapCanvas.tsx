import React, { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { MindMapNode, MindMapEdge, MindMapState, DraggingUser } from '../socket';

export interface MindMapCanvasHandle {
  addRootNode: () => void;
  addChildNode: () => void;
  deleteSelected: () => void;
  undo: () => void;
  redo: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
  setStateFromOutside: (state: MindMapState) => void;
  canUndo: boolean;
  canRedo: boolean;
}

interface Props {
  roomId: string;
  userId: string;
  userName: string;
  state: MindMapState;
  onStateChange: (state: MindMapState) => void;
  onCreateNode: (node: Omit<MindMapNode, 'id' | 'createdAt'> & { id?: string }) => string;
  onMoveNode: (nodeId: string, x: number, y: number) => void;
  onUpdateNodeText: (nodeId: string, text: string) => void;
  onDeleteNode: (nodeId: string) => void;
  onCreateEdge: (from: string, to: string) => void;
  onDeleteEdge: (edgeId: string) => void;
  onDragStart: (nodeId: string) => void;
  onDragEnd: (nodeId: string) => void;
  remoteDraggingUsers: Map<string, DraggingUser>;
}

const NODE_RADIUS = 20;
const EDGE_THRESHOLD = 5;
const EDGE_SCROLL_MARGIN = 10;
const SOFT_COLORS = ['#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];
const ROOT_COLOR = '#10B981';

interface HistoryEntry {
  state: MindMapState;
}

interface NewNodeAnim {
  id: string;
  startTime: number;
}

function randomSoftColor(): string {
  return SOFT_COLORS[Math.floor(Math.random() * SOFT_COLORS.length)];
}

function cloneState(state: MindMapState): MindMapState {
  return {
    nodes: state.nodes.map(n => ({ ...n })),
    edges: state.edges.map(e => ({ ...e }))
  };
}

const MindMapCanvas = forwardRef<MindMapCanvasHandle, Props>((props, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const viewStateRef = useRef({ offsetX: 0, offsetY: 0, scale: 1 });
  const [, forceRender] = useState(0);

  const selectedNodeIdRef = useRef<string | null>(null);
  const selectedEdgeIdRef = useRef<string | null>(null);

  const [editingNode, setEditingNode] = useState<{ id: string; x: number; y: number } | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const interactionRef = useRef({
    draggingNodeId: null as string | null,
    dragOffsetX: 0,
    dragOffsetY: 0,
    panning: false,
    panStartX: 0,
    panStartY: 0,
    panOffsetStartX: 0,
    panOffsetStartY: 0,
    creatingEdge: false,
    edgeFromNodeId: null as string | null,
    edgeCurrentX: 0,
    edgeCurrentY: 0
  });

  const historyRef = useRef<HistoryEntry[]>([{ state: cloneState(props.state) }]);
  const historyIndexRef = useRef(0);
  const [canUndoState, setCanUndoState] = useState(false);
  const [canRedoState, setCanRedoState] = useState(false);

  const newNodeAnimsRef = useRef<Map<string, NewNodeAnim>>(new Map());
  const animFrameRef = useRef<number>(0);
  const lastFrameTimeRef = useRef(0);

  const autoScrollRef = useRef({ vx: 0, vy: 0, lastCheckTime: 0 });
  const moveThrottleRef = useRef<{ nodeId: string; x: number; y: number; lastSend: number } | null>(null);

  const touchStateRef = useRef({
    active: false,
    initialPinchDist: 0,
    initialScale: 1,
    initialCenterX: 0,
    initialCenterY: 0,
    initialOffsetX: 0,
    initialOffsetY: 0,
    lastTouchTime: 0
  });

  const pushHistory = useCallback((state: MindMapState) => {
    const newEntry: HistoryEntry = { state: cloneState(state) };
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(newEntry);
    historyIndexRef.current = historyRef.current.length - 1;
    if (historyRef.current.length > 100) {
      historyRef.current.shift();
      historyIndexRef.current--;
    }
    updateHistoryButtons();
  }, []);

  const updateHistoryButtons = useCallback(() => {
    setCanUndoState(historyIndexRef.current > 0);
    setCanRedoState(historyIndexRef.current < historyRef.current.length - 1);
  }, []);

  const screenToWorld = (sx: number, sy: number) => {
    const { offsetX, offsetY, scale } = viewStateRef.current;
    return {
      x: (sx - offsetX) / scale,
      y: (sy - offsetY) / scale
    };
  };

  const worldToScreen = (wx: number, wy: number) => {
    const { offsetX, offsetY, scale } = viewStateRef.current;
    return {
      x: wx * scale + offsetX,
      y: wy * scale + offsetY
    };
  };

  const hitTestNode = (x: number, y: number): MindMapNode | null => {
    for (let i = props.state.nodes.length - 1; i >= 0; i--) {
      const node = props.state.nodes[i];
      const dx = x - node.x;
      const dy = y - node.y;
      if (dx * dx + dy * dy <= NODE_RADIUS * NODE_RADIUS) {
        return node;
      }
    }
    return null;
  };

  const pointToSegmentDist = (px: number, py: number, x1: number, y1: number, x2: number, y2: number): number => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) {
      const ddx = px - x1;
      const ddy = py - y1;
      return Math.sqrt(ddx * ddx + ddy * ddy);
    }
    let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const cx = x1 + t * dx;
    const cy = y1 + t * dy;
    const edx = px - cx;
    const edy = py - cy;
    return Math.sqrt(edx * edx + edy * edy);
  };

  const hitTestEdge = (x: number, y: number): MindMapEdge | null => {
    for (let i = props.state.edges.length - 1; i >= 0; i--) {
      const edge = props.state.edges[i];
      const from = props.state.nodes.find(n => n.id === edge.from);
      const to = props.state.nodes.find(n => n.id === edge.to);
      if (!from || !to) continue;
      const d = pointToSegmentDist(x, y, from.x, from.y, to.x, to.y);
      if (d <= EDGE_THRESHOLD) return edge;
    }
    return null;
  };

  const getNodeScreenPos = (node: MindMapNode) => {
    const { offsetX, offsetY, scale } = viewStateRef.current;
    return {
      x: node.x * scale + offsetX,
      y: node.y * scale + offsetY,
      r: NODE_RADIUS * scale
    };
  };

  const addNewNodeAnim = (id: string) => {
    newNodeAnimsRef.current.set(id, { id, startTime: performance.now() });
  };

  const draw = useCallback((timestamp: number) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const cssW = container.clientWidth;
    const cssH = container.clientHeight;

    if (canvas.width !== cssW * dpr || canvas.height !== cssH * dpr) {
      canvas.width = cssW * dpr;
      canvas.height = cssH * dpr;
      canvas.style.width = cssW + 'px';
      canvas.style.height = cssH + 'px';
    }

    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = '#16213E';
    ctx.fillRect(0, 0, cssW, cssH);

    drawGrid(ctx, cssW, cssH);

    const { offsetX, offsetY, scale } = viewStateRef.current;
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    const time = timestamp;

    for (const edge of props.state.edges) {
      drawEdge(ctx, edge, time);
    }

    const ia = interactionRef.current;
    if (ia.creatingEdge && ia.edgeFromNodeId) {
      const fromNode = props.state.nodes.find(n => n.id === ia.edgeFromNodeId);
      if (fromNode) {
        const world = screenToWorld(ia.edgeCurrentX, ia.edgeCurrentY);
        drawEdgeLine(ctx, fromNode.x, fromNode.y, world.x, world.y, '#3B82F6', 2, true, time, false);
      }
    }

    const draggingNodeIds = new Set<string>();
    for (const du of props.remoteDraggingUsers.values()) {
      draggingNodeIds.add(du.nodeId);
    }

    for (const node of props.state.nodes) {
      const isRemoteDragging = draggingNodeIds.has(node.id);
      const isSelfDragging = ia.draggingNodeId === node.id;
      drawNode(ctx, node, time, isRemoteDragging, isSelfDragging);
    }

    for (const du of props.remoteDraggingUsers.values()) {
      const node = props.state.nodes.find(n => n.id === du.nodeId);
      if (node) {
        drawRemoteAvatar(ctx, node, du.userName);
      }
    }

    ctx.restore();
  }, [props.state, props.remoteDraggingUsers]);

  const drawGrid = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const { offsetX, offsetY, scale } = viewStateRef.current;
    const gridSize = 50 * scale;
    if (gridSize < 10) return;

    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;

    const startX = -((-offsetX) % gridSize);
    const startY = -((-offsetY) % gridSize);

    ctx.beginPath();
    for (let x = startX; x < w; x += gridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    for (let y = startY; y < h; y += gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();
  };

  const drawEdge = (ctx: CanvasRenderingContext2D, edge: MindMapEdge, time: number) => {
    const from = props.state.nodes.find(n => n.id === edge.from);
    const to = props.state.nodes.find(n => n.id === edge.to);
    if (!from || !to) return;

    const isSelected = selectedEdgeIdRef.current === edge.id;
    const color = isSelected ? '#3B82F6' : '#888';
    const lineWidth = isSelected ? 2.5 : 1.5;

    drawEdgeLine(ctx, from.x, from.y, to.x, to.y, color, lineWidth, true, time, isSelected);
  };

  const drawEdgeLine = (
    ctx: CanvasRenderingContext2D,
    x1: number, y1: number,
    x2: number, y2: number,
    color: string, lineWidth: number,
    withArrow: boolean, time: number,
    glowOn: boolean
  ) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    if (withArrow) {
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const arrowLen = 10;
      const arrowAngle = Math.PI / 6;

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(
        x2 - arrowLen * Math.cos(angle - arrowAngle),
        y2 - arrowLen * Math.sin(angle - arrowAngle)
      );
      ctx.lineTo(
        x2 - arrowLen * Math.cos(angle + arrowAngle),
        y2 - arrowLen * Math.sin(angle + arrowAngle)
      );
      ctx.closePath();
      ctx.fill();

      if (glowOn) {
        const pulse = 0.3 + 0.3 * Math.sin(time / 500);
        ctx.save();
        ctx.globalAlpha = pulse;
        ctx.shadowColor = color;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(x2, y2, 4, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.restore();
      }
    }
  };

  const drawNode = (
    ctx: CanvasRenderingContext2D,
    node: MindMapNode,
    time: number,
    isRemoteDragging: boolean,
    isSelfDragging: boolean
  ) => {
    let scale = 1;
    const anim = newNodeAnimsRef.current.get(node.id);
    if (anim) {
      const elapsed = time - anim.startTime;
      const duration = 300;
      if (elapsed < duration) {
        const t = elapsed / duration;
        scale = 0.3 + 0.7 * (1 - Math.pow(1 - t, 3));
        scale = scale + 0.15 * t * (1 - t) * 4;
      } else {
        newNodeAnimsRef.current.delete(node.id);
      }
    }

    const isSelected = selectedNodeIdRef.current === node.id;

    ctx.save();
    ctx.translate(node.x, node.y);
    ctx.scale(scale, scale);

    if (isRemoteDragging) {
      ctx.globalAlpha = 0.7;
    }

    if (isSelected) {
      const pulse = 0.3 + 0.3 * Math.sin(time / 500);
      ctx.beginPath();
      ctx.arc(0, 0, NODE_RADIUS + 8, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(59, 130, 246, ${pulse})`;
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    if (node.isRoot) {
      ctx.shadowColor = 'rgba(16, 185, 129, 0.5)';
      ctx.shadowBlur = 15;
    }

    ctx.beginPath();
    ctx.arc(0, 0, NODE_RADIUS, 0, Math.PI * 2);
    const color = node.isRoot ? ROOT_COLOR : node.color;
    const gradient = ctx.createRadialGradient(-5, -5, 2, 0, 0, NODE_RADIUS);
    gradient.addColorStop(0, lightenColor(color, 20));
    gradient.addColorStop(1, color);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.shadowBlur = 0;

    ctx.strokeStyle = isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.2)';
    ctx.lineWidth = isSelected ? 2 : 1;
    ctx.stroke();

    ctx.fillStyle = '#F5F5F5';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const displayText = node.text.length > 8 ? node.text.substring(0, 7) + '…' : node.text;
    ctx.fillText(displayText, 0, 0);

    ctx.restore();
  };

  const drawRemoteAvatar = (ctx: CanvasRenderingContext2D, node: MindMapNode, userName: string) => {
    const x = node.x + NODE_RADIUS * 0.7;
    const y = node.y - NODE_RADIUS * 0.7;
    const r = 10;

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 4;

    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = '#3B82F6';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.shadowBlur = 0;

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const initial = userName.substring(0, 1).toUpperCase();
    ctx.fillText(initial, x, y);

    ctx.restore();
  };

  const lightenColor = (hex: string, amount: number): string => {
    const c = hex.replace('#', '');
    const r = Math.min(255, parseInt(c.substring(0, 2), 16) + amount);
    const g = Math.min(255, parseInt(c.substring(2, 4), 16) + amount);
    const b = Math.min(255, parseInt(c.substring(4, 6), 16) + amount);
    return `rgb(${r},${g},${b})`;
  };

  const animate = (timestamp: number) => {
    const dt = timestamp - lastFrameTimeRef.current;
    lastFrameTimeRef.current = timestamp;

    handleAutoScroll(dt);
    flushMoveThrottle(timestamp);

    draw(timestamp);
    animFrameRef.current = requestAnimationFrame(animate);
  };

  const handleAutoScroll = (dt: number) => {
    const container = containerRef.current;
    if (!container) return;
    const { vx, vy } = autoScrollRef.current;
    if (vx !== 0 || vy !== 0) {
      viewStateRef.current.offsetX += vx * dt;
      viewStateRef.current.offsetY += vy * dt;

      const ia = interactionRef.current;
      if (ia.draggingNodeId) {
        const node = props.state.nodes.find(n => n.id === ia.draggingNodeId);
        if (node) {
          const newState = cloneState(props.state);
          const targetNode = newState.nodes.find(n => n.id === ia.draggingNodeId);
          if (targetNode) {
            targetNode.x += (vx * dt) / viewStateRef.current.scale;
            targetNode.y += (vy * dt) / viewStateRef.current.scale;
            props.onStateChange(newState);
            scheduleNodeMove(targetNode.id, targetNode.x, targetNode.y);
          }
        }
      }
      forceRender(n => n + 1);
    }
  };

  const scheduleNodeMove = (nodeId: string, x: number, y: number) => {
    moveThrottleRef.current = { nodeId, x, y, lastSend: performance.now() };
  };

  const flushMoveThrottle = (timestamp: number) => {
    const mt = moveThrottleRef.current;
    if (mt && timestamp - mt.lastSend >= 30) {
      props.onMoveNode(mt.nodeId, mt.x, mt.y);
      mt.lastSend = timestamp;
    }
  };

  const flushFinalMove = () => {
    const mt = moveThrottleRef.current;
    if (mt) {
      props.onMoveNode(mt.nodeId, mt.x, mt.y);
      moveThrottleRef.current = null;
    }
  };

  const updateAutoScrollVelocity = (mouseX: number, mouseY: number) => {
    const container = containerRef.current;
    if (!container) {
      autoScrollRef.current.vx = 0;
      autoScrollRef.current.vy = 0;
      return;
    }
    const rect = container.getBoundingClientRect();
    const x = mouseX - rect.left;
    const y = mouseY - rect.top;
    const w = rect.width;
    const h = rect.height;

    let vx = 0, vy = 0;
    const k = 0.8;

    if (x < EDGE_SCROLL_MARGIN) vx = -(EDGE_SCROLL_MARGIN - x) * k;
    if (x > w - EDGE_SCROLL_MARGIN) vx = (x - (w - EDGE_SCROLL_MARGIN)) * k;
    if (y < EDGE_SCROLL_MARGIN) vy = -(EDGE_SCROLL_MARGIN - y) * k;
    if (y > h - EDGE_SCROLL_MARGIN) vy = (y - (h - EDGE_SCROLL_MARGIN)) * k;

    autoScrollRef.current.vx = vx;
    autoScrollRef.current.vy = vy;
  };

  const getEventXY = (e: React.MouseEvent | MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 2) return;

    const { x, y } = getEventXY(e);
    const world = screenToWorld(x, y);

    const ia = interactionRef.current;

    const nodeHit = hitTestNode(world.x, world.y);
    if (nodeHit) {
      if (e.button === 0) {
        if (e.shiftKey) {
          ia.creatingEdge = true;
          ia.edgeFromNodeId = nodeHit.id;
          ia.edgeCurrentX = x;
          ia.edgeCurrentY = y;
        } else {
          ia.draggingNodeId = nodeHit.id;
          ia.dragOffsetX = world.x - nodeHit.x;
          ia.dragOffsetY = world.y - nodeHit.y;
          selectedNodeIdRef.current = nodeHit.id;
          selectedEdgeIdRef.current = null;
          props.onDragStart(nodeHit.id);
        }
        forceRender(n => n + 1);
        return;
      }
    }

    const edgeHit = hitTestEdge(world.x, world.y);
    if (edgeHit) {
      selectedEdgeIdRef.current = edgeHit.id;
      selectedNodeIdRef.current = null;
      forceRender(n => n + 1);
      return;
    }

    selectedNodeIdRef.current = null;
    selectedEdgeIdRef.current = null;

    ia.panning = true;
    ia.panStartX = e.clientX;
    ia.panStartY = e.clientY;
    ia.panOffsetStartX = viewStateRef.current.offsetX;
    ia.panOffsetStartY = viewStateRef.current.offsetY;

    forceRender(n => n + 1);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const { x, y } = getEventXY(e);
    const ia = interactionRef.current;

    if (ia.draggingNodeId) {
      const world = screenToWorld(x, y);
      const newState = cloneState(props.state);
      const node = newState.nodes.find(n => n.id === ia.draggingNodeId);
      if (node) {
        node.x = world.x - ia.dragOffsetX;
        node.y = world.y - ia.dragOffsetY;
        props.onStateChange(newState);
        scheduleNodeMove(node.id, node.x, node.y);
      }
      updateAutoScrollVelocity(e.clientX, e.clientY);
    } else {
      autoScrollRef.current.vx = 0;
      autoScrollRef.current.vy = 0;
    }

    if (ia.panning) {
      viewStateRef.current.offsetX = ia.panOffsetStartX + (e.clientX - ia.panStartX);
      viewStateRef.current.offsetY = ia.panOffsetStartY + (e.clientY - ia.panStartY);
    }

    if (ia.creatingEdge) {
      ia.edgeCurrentX = x;
      ia.edgeCurrentY = y;
    }

    forceRender(n => n + 1);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    const { x, y } = getEventXY(e);
    const world = screenToWorld(x, y);
    const ia = interactionRef.current;

    if (ia.draggingNodeId) {
      const finalState = cloneState(props.state);
      pushHistory(finalState);
      props.onDragEnd(ia.draggingNodeId);
      flushFinalMove();
      ia.draggingNodeId = null;
    }

    autoScrollRef.current.vx = 0;
    autoScrollRef.current.vy = 0;

    if (ia.panning) {
      ia.panning = false;
    }

    if (ia.creatingEdge && ia.edgeFromNodeId) {
      const nodeHit = hitTestNode(world.x, world.y);
      if (nodeHit && nodeHit.id !== ia.edgeFromNodeId) {
        props.onCreateEdge(ia.edgeFromNodeId, nodeHit.id);
        setTimeout(() => pushHistory(props.state), 10);
      }
      ia.creatingEdge = false;
      ia.edgeFromNodeId = null;
    }

    forceRender(n => n + 1);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    const { x, y } = getEventXY(e);
    const world = screenToWorld(x, y);
    const nodeHit = hitTestNode(world.x, world.y);
    if (nodeHit) {
      const sp = getNodeScreenPos(nodeHit);
      setEditingNode({ id: nodeHit.id, x: sp.x, y: sp.y });
    } else {
      createNodeAt(world.x, world.y, false);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const { x, y } = getEventXY(e);
    const world = screenToWorld(x, y);

    const edgeHit = hitTestEdge(world.x, world.y);
    if (edgeHit) {
      props.onDeleteEdge(edgeHit.id);
      selectedEdgeIdRef.current = null;
      setTimeout(() => pushHistory(props.state), 10);
      return;
    }

    const nodeHit = hitTestNode(world.x, world.y);
    if (nodeHit) {
      props.onDeleteNode(nodeHit.id);
      if (selectedNodeIdRef.current === nodeHit.id) {
        selectedNodeIdRef.current = null;
      }
      setTimeout(() => pushHistory(props.state), 10);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const { x, y } = getEventXY(e);
    const world = screenToWorld(x, y);
    const delta = -e.deltaY * 0.001;
    const newScale = Math.max(0.2, Math.min(5, viewStateRef.current.scale * (1 + delta)));
    const ratio = newScale / viewStateRef.current.scale;
    viewStateRef.current.scale = newScale;
    viewStateRef.current.offsetX = x - world.x * newScale;
    viewStateRef.current.offsetY = y - world.y * newScale;
    forceRender(n => n + 1);
  };

  const createNodeAt = (x: number, y: number, isRoot: boolean) => {
    const tempId = 'temp_' + Date.now();
    const node: Omit<MindMapNode, 'id' | 'createdAt'> & { id?: string } = {
      id: tempId,
      x,
      y,
      text: isRoot ? '中心主题' : '新节点',
      color: isRoot ? ROOT_COLOR : randomSoftColor(),
      isRoot
    };
    const newState = cloneState(props.state);
    newState.nodes.push({
      ...node,
      id: tempId,
      createdAt: Date.now()
    } as MindMapNode);
    props.onStateChange(newState);
    addNewNodeAnim(tempId);
    pushHistory(newState);
    const realId = props.onCreateNode(node);
    setTimeout(() => {
      const s = cloneState(props.state);
      const idx = s.nodes.findIndex(n => n.id === tempId);
      if (idx >= 0) {
        s.nodes[idx].id = realId;
        props.onStateChange(s);
        selectedNodeIdRef.current = realId;
      }
      if (newNodeAnimsRef.current.has(tempId)) {
        const anim = newNodeAnimsRef.current.get(tempId)!;
        newNodeAnimsRef.current.delete(tempId);
        newNodeAnimsRef.current.set(realId, anim);
      }
      forceRender(n => n + 1);
    }, 50);
  };

  const handleEditSubmit = (id: string, text: string) => {
    props.onUpdateNodeText(id, text.substring(0, 50));
    setTimeout(() => pushHistory(props.state), 10);
    setEditingNode(null);
  };

  useEffect(() => {
    if (editingNode && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingNode]);

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    const ts = touchStateRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (e.touches.length === 1) {
      const t = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const x = t.clientX - rect.left;
      const y = t.clientY - rect.top;
      const world = screenToWorld(x, y);
      const nodeHit = hitTestNode(world.x, world.y);
      const ia = interactionRef.current;

      if (nodeHit) {
        ia.draggingNodeId = nodeHit.id;
        ia.dragOffsetX = world.x - nodeHit.x;
        ia.dragOffsetY = world.y - nodeHit.y;
        selectedNodeIdRef.current = nodeHit.id;
        selectedEdgeIdRef.current = null;
        props.onDragStart(nodeHit.id);
      } else {
        ia.panning = true;
        ia.panStartX = t.clientX;
        ia.panStartY = t.clientY;
        ia.panOffsetStartX = viewStateRef.current.offsetX;
        ia.panOffsetStartY = viewStateRef.current.offsetY;
      }
      ts.lastTouchTime = Date.now();
    } else if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dx = t2.clientX - t1.clientX;
      const dy = t2.clientY - t1.clientY;
      ts.initialPinchDist = Math.sqrt(dx * dx + dy * dy);
      ts.initialScale = viewStateRef.current.scale;
      ts.initialCenterX = (t1.clientX + t2.clientX) / 2;
      ts.initialCenterY = (t1.clientY + t2.clientY) / 2;
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      const world = screenToWorld(ts.initialCenterX - rect.left, ts.initialCenterY - rect.top);
      ts.initialOffsetX = viewStateRef.current.offsetX;
      ts.initialOffsetY = viewStateRef.current.offsetY;
      touchStateRef.current = ts;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ia = interactionRef.current;
    const ts = touchStateRef.current;

    if (e.touches.length === 1) {
      const t = e.touches[0];
      if (ia.draggingNodeId) {
        const x = t.clientX - rect.left;
        const y = t.clientY - rect.top;
        const world = screenToWorld(x, y);
        const newState = cloneState(props.state);
        const node = newState.nodes.find(n => n.id === ia.draggingNodeId);
        if (node) {
          node.x = world.x - ia.dragOffsetX;
          node.y = world.y - ia.dragOffsetY;
          props.onStateChange(newState);
          scheduleNodeMove(node.id, node.x, node.y);
        }
      } else if (ia.panning) {
        viewStateRef.current.offsetX = ia.panOffsetStartX + (t.clientX - ia.panStartX);
        viewStateRef.current.offsetY = ia.panOffsetStartY + (t.clientY - ia.panStartY);
      }
    } else if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dx = t2.clientX - t1.clientX;
      const dy = t2.clientY - t1.clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (ts.initialPinchDist > 0) {
        const ratio = dist / ts.initialPinchDist;
        const newScale = Math.max(0.2, Math.min(5, ts.initialScale * ratio));
        const centerX = (t1.clientX + t2.clientX) / 2;
        const centerY = (t1.clientY + t2.clientY) / 2;
        const world = screenToWorld(ts.initialCenterX - rect.left, ts.initialCenterY - rect.top);
        viewStateRef.current.scale = newScale;
        viewStateRef.current.offsetX = (centerX - rect.left) - world.x * newScale + (centerX - ts.initialCenterX);
        viewStateRef.current.offsetY = (centerY - rect.top) - world.y * newScale + (centerY - ts.initialCenterY);
      }
    }
    forceRender(n => n + 1);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const ia = interactionRef.current;
    const ts = touchStateRef.current;
    const dt = Date.now() - ts.lastTouchTime;

    if (ia.draggingNodeId) {
      const finalState = cloneState(props.state);
      pushHistory(finalState);
      props.onDragEnd(ia.draggingNodeId);
      flushFinalMove();
      ia.draggingNodeId = null;
    }
    ia.panning = false;
    ia.creatingEdge = false;

    if (e.touches.length === 0 && dt < 200) {
      // tap - handled by touchend coordinates would be complex, skip for simplicity
    }
    forceRender(n => n + 1);
  };

  useImperativeHandle(ref, () => ({
    addRootNode: () => {
      const cx = -viewStateRef.current.offsetX / viewStateRef.current.scale + 100;
      const cy = -viewStateRef.current.offsetY / viewStateRef.current.scale + 100;
      createNodeAt(cx, cy, true);
    },
    addChildNode: () => {
      let baseX = -viewStateRef.current.offsetX / viewStateRef.current.scale + 200;
      let baseY = -viewStateRef.current.offsetY / viewStateRef.current.scale + 100;
      if (selectedNodeIdRef.current) {
        const sel = props.state.nodes.find(n => n.id === selectedNodeIdRef.current);
        if (sel) {
          baseX = sel.x + 80;
          baseY = sel.y;
        }
      }
      createNodeAt(baseX, baseY, false);
    },
    deleteSelected: () => {
      if (selectedNodeIdRef.current) {
        props.onDeleteNode(selectedNodeIdRef.current);
        selectedNodeIdRef.current = null;
        setTimeout(() => pushHistory(props.state), 10);
      } else if (selectedEdgeIdRef.current) {
        props.onDeleteEdge(selectedEdgeIdRef.current);
        selectedEdgeIdRef.current = null;
        setTimeout(() => pushHistory(props.state), 10);
      }
      forceRender(n => n + 1);
    },
    undo: () => {
      if (historyIndexRef.current > 0) {
        historyIndexRef.current--;
        const entry = historyRef.current[historyIndexRef.current];
        props.onStateChange(cloneState(entry.state));
        updateHistoryButtons();
      }
    },
    redo: () => {
      if (historyIndexRef.current < historyRef.current.length - 1) {
        historyIndexRef.current++;
        const entry = historyRef.current[historyIndexRef.current];
        props.onStateChange(cloneState(entry.state));
        updateHistoryButtons();
      }
    },
    zoomIn: () => {
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const world = screenToWorld(cx, cy);
      const newScale = Math.min(5, viewStateRef.current.scale * 1.2);
      viewStateRef.current.scale = newScale;
      viewStateRef.current.offsetX = cx - world.x * newScale;
      viewStateRef.current.offsetY = cy - world.y * newScale;
      forceRender(n => n + 1);
    },
    zoomOut: () => {
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const world = screenToWorld(cx, cy);
      const newScale = Math.max(0.2, viewStateRef.current.scale / 1.2);
      viewStateRef.current.scale = newScale;
      viewStateRef.current.offsetX = cx - world.x * newScale;
      viewStateRef.current.offsetY = cy - world.y * newScale;
      forceRender(n => n + 1);
    },
    resetView: () => {
      viewStateRef.current = { offsetX: 100, offsetY: 100, scale: 1 };
      forceRender(n => n + 1);
    },
    setStateFromOutside: (state: MindMapState) => {
      pushHistory(state);
    },
    get canUndo() { return canUndoState; },
    get canRedo() { return canRedoState; }
  }), [canUndoState, canRedoState, props.state]);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [draw]);

  useEffect(() => {
    viewStateRef.current = { offsetX: 100, offsetY: 100, scale: 1 };
    forceRender(n => n + 1);
    historyRef.current = [{ state: cloneState(props.state) }];
    historyIndexRef.current = 0;
    updateHistoryButtons();
  }, [props.roomId]);

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
        background: '#16213E'
      }}
      onContextMenu={handleContextMenu}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          cursor: interactionRef.current.draggingNodeId ? 'grabbing' :
            interactionRef.current.panning ? 'grab' :
              interactionRef.current.creatingEdge ? 'crosshair' : 'default'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />

      {editingNode && (
        <div
          style={{
            position: 'absolute',
            left: editingNode.x - 90,
            top: editingNode.y - 18,
            zIndex: 200,
            pointerEvents: 'auto'
          }}
          onClick={e => e.stopPropagation()}
        >
          <input
            ref={editInputRef}
            type="text"
            defaultValue={props.state.nodes.find(n => n.id === editingNode.id)?.text || ''}
            maxLength={50}
            onBlur={e => handleEditSubmit(editingNode.id, e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleEditSubmit(editingNode.id, (e.target as HTMLInputElement).value);
              if (e.key === 'Escape') setEditingNode(null);
            }}
            style={{
              width: '180px',
              padding: '6px 10px',
              borderRadius: '8px',
              border: '2px solid #3B82F6',
              background: 'rgba(26,26,46,0.95)',
              color: '#F5F5F5',
              fontSize: '13px',
              outline: 'none',
              textAlign: 'center',
              boxShadow: '0 4px 20px rgba(0,0,0,0.4)'
            }}
          />
        </div>
      )}

      <div style={{
        position: 'absolute',
        bottom: '16px',
        left: '16px',
        padding: '6px 12px',
        background: 'rgba(255,255,255,0.08)',
        backdropFilter: 'blur(8px)',
        borderRadius: '6px',
        fontSize: '11px',
        color: 'rgba(245,245,245,0.6)',
        pointerEvents: 'none',
        zIndex: 50
      }}>
        {Math.round(viewStateRef.current.scale * 100)}% · 双击创建节点 · Shift+拖拽连线 · 右键删除
      </div>
    </div>
  );
});

MindMapCanvas.displayName = 'MindMapCanvas';
export default MindMapCanvas;
