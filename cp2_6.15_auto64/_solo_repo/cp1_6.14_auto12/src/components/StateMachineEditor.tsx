import React, { useCallback, useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { SpriteService, SpriteFrame } from '../services/SpriteService';
import { StorageService } from '../services/StorageService';
import { eventBus } from '../utils/EventBus';
import TransitionModal, {
  TransitionFormData,
  CurvePreview,
  CURVE_FUNCTIONS,
} from './TransitionModal';

export type LoopMode = 'once' | 'loop' | 'pingpong';
export type CurveType = 'EaseInOut' | 'EaseOut' | 'Linear';
export type TriggerType = 'KeyboardKey' | 'Timer' | 'AnimationEnd';

export interface StateNode {
  id: string;
  name: string;
  spriteId: number;
  loopMode: LoopMode;
  enterCurve: CurveType;
  exitCurve: CurveType;
  x: number;
  y: number;
}

export interface Transition {
  id: string;
  fromId: string;
  toId: string;
  triggerType: TriggerType;
  triggerValue: string;
  duration: number;
  curve: CurveType;
  midFrames: number[];
}

interface Props {
  onPlayState: (node: StateNode | null, transition?: Transition) => void;
}

const NODE_W = 160;
const NODE_H = 50;
const PORT_R = 8;

interface DragState {
  nodeId: string;
  offsetX: number;
  offsetY: number;
}

interface ConnectState {
  fromId: string;
  mx: number;
  my: number;
}

const StateMachineEditor: React.FC<Props> = ({ onPlayState }) => {
  const [nodes, setNodes] = useState<StateNode[]>([]);
  const [transitions, setTransitions] = useState<Transition[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [sprites, setSprites] = useState<SpriteFrame[]>([]);
  const [mobileTab, setMobileTab] = useState<'nodes' | 'props' | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [modalFromId, setModalFromId] = useState<string | null>(null);
  const [modalToId, setModalToId] = useState<string | null>(null);
  const [transitionForm, setTransitionForm] = useState<TransitionFormData>({
    triggerType: 'KeyboardKey',
    triggerValue: 'KeyW',
    duration: 300,
    curve: 'EaseInOut',
    midFrames: [],
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodeCounter = useRef(0);
  const animFrameRef = useRef<number>(0);

  const nodesRef = useRef<StateNode[]>([]);
  const transitionsRef = useRef<Transition[]>([]);
  const selectedRef = useRef<string | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const connectRef = useRef<ConnectState | null>(null);
  const hoverPortRef = useRef<string | null>(null);

  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => { transitionsRef.current = transitions; }, [transitions]);
  useEffect(() => { selectedRef.current = selectedNodeId; }, [selectedNodeId]);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null;
  const selectedTransitions = transitions.filter(
    (t) => t.fromId === selectedNodeId || t.toId === selectedNodeId
  );

  useEffect(() => {
    SpriteService.getAllSprites().then(setSprites);
  }, []);

  useEffect(() => {
    nodeCounter.current = nodes.length;
  }, [nodes]);

  const addNode = useCallback(() => {
    const sprite = SpriteService.getRandomSprite();
    const idx = nodeCounter.current + 1;
    const node: StateNode = {
      id: uuidv4(),
      name: `State ${idx}`,
      spriteId: sprite.id,
      loopMode: 'loop',
      enterCurve: 'EaseInOut',
      exitCurve: 'EaseInOut',
      x: 200 + Math.random() * 300,
      y: 100 + Math.random() * 200,
    };
    setNodes((prev) => [...prev, node]);
    setSelectedNodeId(node.id);
    nodeCounter.current = idx;
  }, []);

  const deleteNode = useCallback(
    (id: string) => {
      setNodes((prev) => prev.filter((n) => n.id !== id));
      setTransitions((prev) =>
        prev.filter((t) => t.fromId !== id && t.toId !== id)
      );
      if (selectedNodeId === id) setSelectedNodeId(null);
    },
    [selectedNodeId]
  );

  const updateNode = useCallback(
    (id: string, updates: Partial<StateNode>) => {
      setNodes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, ...updates } : n))
      );
    },
    []
  );

  const saveConfig = useCallback(async () => {
    try {
      await StorageService.saveConfig({ name: 'untitled', nodes, transitions });
      eventBus.emit('config:saved');
    } catch {}
  }, [nodes, transitions]);

  const exportConfig = useCallback(() => {
    const data = {
      nodes: nodes.map((n) => ({
        id: n.id,
        name: n.name,
        spriteId: n.spriteId,
        loopMode: n.loopMode,
        enterCurve: n.enterCurve,
        exitCurve: n.exitCurve,
        position: { x: n.x, y: n.y },
      })),
      transitions: transitions.map((t) => ({
        id: t.id,
        from: t.fromId,
        to: t.toId,
        trigger: { type: t.triggerType, value: t.triggerValue },
        duration: t.duration,
        curve: t.curve,
        midFrames: t.midFrames,
      })),
    };
    const json = JSON.stringify(data, null, 2);
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(`<!DOCTYPE html><html><head><title>StateMachine Export</title>
<style>body{background:#0b0b1a;color:#e2e8f0;font-family:monospace;padding:24px;margin:0}
pre{white-space:pre-wrap;word-break:break-all;font-size:13px;line-height:1.6;background:#16162a;padding:20px;border-radius:12px;border:1px solid #334155}
.btn-copy{background:#f59e0b;border:none;color:#000;padding:10px 20px;border-radius:8px;cursor:pointer;font-size:14px;margin-bottom:16px;font-weight:600}
.btn-copy:hover{background:#d97706}</style></head>
<body><button class="btn-copy" onclick="navigator.clipboard.writeText(document.querySelector('pre').textContent).then(()=>{this.textContent='Copied!';setTimeout(()=>this.textContent='Copy to Clipboard',2000)})">Copy to Clipboard</button>
<pre>${json.replace(/</g, '&lt;')}</pre></body></html>`);
      w.document.close();
    }
  }, [nodes, transitions]);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const targetW = Math.round(rect.width * dpr);
    const targetH = Math.round(rect.height * dpr);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const w = rect.width;
    const h = rect.height;

    ctx.fillStyle = '#0f0f1a';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = '#333344';
    ctx.lineWidth = 0.5;
    const grid = 40;
    for (let x = 0; x < w; x += grid) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += grid) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    const currentNodes = nodesRef.current;
    const currentTransitions = transitionsRef.current;
    const currentSelected = selectedRef.current;

    currentTransitions.forEach((t) => {
      const from = currentNodes.find((n) => n.id === t.fromId);
      const to = currentNodes.find((n) => n.id === t.toId);
      if (!from || !to) return;

      const fx = from.x + NODE_W / 2;
      const fy = from.y + NODE_H / 2;
      const tx = to.x + NODE_W / 2;
      const ty = to.y + NODE_H / 2;

      if (t.fromId === t.toId) {
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(fx, from.y - 20, 30, 18, 0, -Math.PI, 0);
        ctx.stroke();
        ctx.fillStyle = '#6366f1';
        ctx.beginPath();
        ctx.moveTo(fx + 30, from.y - 20);
        ctx.lineTo(fx + 24, from.y - 28);
        ctx.lineTo(fx + 36, from.y - 24);
        ctx.closePath();
        ctx.fill();
        return;
      }

      const dx = tx - fx;
      const dy = ty - fy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 1) return;

      const nx = -dy / dist;
      const ny = dx / dist;
      const curvature = Math.min(dist * 0.25, 60);
      const cx1 = (fx + tx) / 2 + nx * curvature;
      const cy1 = (fy + ty) / 2 + ny * curvature;

      const isSel = t.fromId === currentSelected || t.toId === currentSelected;
      ctx.strokeStyle = isSel ? '#8b5cf6' : '#6366f1';
      ctx.lineWidth = isSel ? 2.5 : 1.5;
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.quadraticCurveTo(cx1, cy1, tx, ty);
      ctx.stroke();

      const tp = 0.85;
      const ax =
        2 * (1 - tp) * (cx1 - fx) + 2 * tp * (tx - cx1);
      const ay =
        2 * (1 - tp) * (cy1 - fy) + 2 * tp * (ty - cy1);
      const angle = Math.atan2(ay, ax);
      const as = 10;
      ctx.fillStyle = isSel ? '#8b5cf6' : '#6366f1';
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx - as * Math.cos(angle - Math.PI / 6), ty - as * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(tx - as * Math.cos(angle + Math.PI / 6), ty - as * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fill();

      const mt = 0.5;
      const lx = (1 - mt) * (1 - mt) * fx + 2 * (1 - mt) * mt * cx1 + mt * mt * tx;
      const ly = (1 - mt) * (1 - mt) * fy + 2 * (1 - mt) * mt * cy1 + mt * mt * ty;
      ctx.fillStyle = '#9ca3af';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      const label =
        t.triggerType === 'KeyboardKey'
          ? t.triggerValue.replace('Key', '')
          : t.triggerType === 'Timer'
          ? `${t.duration}ms`
          : 'AnimEnd';
      ctx.fillText(label, lx, ly - 6);
      ctx.textAlign = 'left';
    });

    const conn = connectRef.current;
    if (conn) {
      const from = currentNodes.find((n) => n.id === conn.fromId);
      if (from) {
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(from.x + NODE_W, from.y + NODE_H / 2);
        ctx.lineTo(conn.mx, conn.my);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    currentNodes.forEach((node) => {
      const isSel = node.id === currentSelected;
      const sprite = SpriteService.getSpriteById(node.spriteId);
      const color = sprite ? SpriteService.getSpriteColor(sprite.name) : '#6366f1';

      if (isSel) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 16;
      }

      ctx.fillStyle = isSel ? '#1e293b' : '#16213e';
      ctx.beginPath();
      ctx.roundRect(node.x, node.y, NODE_W, NODE_H, 8);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.strokeStyle = isSel ? color : '#334155';
      ctx.lineWidth = isSel ? 2 : 1;
      ctx.beginPath();
      ctx.roundRect(node.x, node.y, NODE_W, NODE_H, 8);
      ctx.stroke();

      if (isSel) {
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.roundRect(node.x, node.y, 4, NODE_H, [8, 0, 0, 8]);
        ctx.fill();
      }

      if (sprite) {
        const spriteCanvas = SpriteService.generateSpriteCanvas(sprite);
        ctx.drawImage(
          spriteCanvas, 0, 0, sprite.width, sprite.height,
          node.x + 8, node.y + 5, 36, 36
        );
      }

      ctx.fillStyle = '#ffffff';
      ctx.font = '14px sans-serif';
      ctx.fillText(node.name, node.x + 50, node.y + 30);

      const px = node.x + NODE_W;
      const py = node.y + NODE_H / 2;
      const isHoverPort = hoverPortRef.current === node.id;
      ctx.fillStyle = isHoverPort ? '#22c55e' : '#334155';
      ctx.beginPath();
      ctx.arc(px, py, PORT_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = isHoverPort ? '#22c55e' : '#64748b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(px, py, PORT_R, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = isHoverPort ? '#ffffff' : '#9ca3af';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('+', px, py + 3.5);
      ctx.textAlign = 'left';
    });
  }, []);

  useEffect(() => {
    let active = true;
    const loop = () => {
      if (!active) return;
      drawCanvas();
      animFrameRef.current = requestAnimationFrame(loop);
    };
    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      active = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [drawCanvas]);

  const getPos = useCallback((e: React.MouseEvent): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const findNodeAt = useCallback((x: number, y: number): StateNode | null => {
    const ns = nodesRef.current;
    for (let i = ns.length - 1; i >= 0; i--) {
      const n = ns[i];
      if (x >= n.x && x <= n.x + NODE_W && y >= n.y && y <= n.y + NODE_H) {
        return n;
      }
    }
    return null;
  }, []);

  const isOnPort = useCallback((x: number, y: number, node: StateNode): boolean => {
    const px = node.x + NODE_W;
    const py = node.y + NODE_H / 2;
    const dx = x - px;
    const dy = y - py;
    return dx * dx + dy * dy <= (PORT_R + 4) * (PORT_R + 4);
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const pos = getPos(e);
      const node = findNodeAt(pos.x, pos.y);

      if (node && isOnPort(pos.x, pos.y, node)) {
        connectRef.current = { fromId: node.id, mx: pos.x, my: pos.y };
        return;
      }

      if (node) {
        setSelectedNodeId(node.id);
        dragRef.current = {
          nodeId: node.id,
          offsetX: pos.x - node.x,
          offsetY: pos.y - node.y,
        };
        const canvas = canvasRef.current;
        if (canvas) canvas.style.cursor = 'grabbing';
      } else {
        setSelectedNodeId(null);
      }
    },
    [getPos, findNodeAt, isOnPort]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const pos = getPos(e);
      const drag = dragRef.current;
      const conn = connectRef.current;

      if (drag) {
        const newX = pos.x - drag.offsetX;
        const newY = pos.y - drag.offsetY;
        nodesRef.current = nodesRef.current.map((n) =>
          n.id === drag.nodeId ? { ...n, x: newX, y: newY } : n
        );
        return;
      }

      if (conn) {
        connectRef.current = { ...conn, mx: pos.x, my: pos.y };
        return;
      }

      const node = findNodeAt(pos.x, pos.y);
      if (node && isOnPort(pos.x, pos.y, node)) {
        hoverPortRef.current = node.id;
        if (canvasRef.current) canvasRef.current.style.cursor = 'crosshair';
      } else if (node) {
        hoverPortRef.current = null;
        if (canvasRef.current) canvasRef.current.style.cursor = 'grab';
      } else {
        hoverPortRef.current = null;
        if (canvasRef.current) canvasRef.current.style.cursor = 'default';
      }
    },
    [getPos, findNodeAt, isOnPort]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      const canvas = canvasRef.current;
      if (canvas) canvas.style.cursor = 'default';

      if (dragRef.current) {
        setNodes([...nodesRef.current]);
        dragRef.current = null;
        return;
      }

      const conn = connectRef.current;
      if (conn) {
        const pos = getPos(e);
        const target = findNodeAt(pos.x, pos.y);
        if (target && target.id !== conn.fromId) {
          setModalFromId(conn.fromId);
          setModalToId(target.id);
          setTransitionForm({
            triggerType: 'KeyboardKey',
            triggerValue: 'KeyW',
            duration: 300,
            curve: 'EaseInOut',
            midFrames: [],
          });
          setShowModal(true);
        }
        connectRef.current = null;
      }
    },
    [getPos, findNodeAt]
  );

  const handleMouseLeave = useCallback(() => {
    if (dragRef.current) {
      setNodes([...nodesRef.current]);
    }
    dragRef.current = null;
    connectRef.current = null;
    hoverPortRef.current = null;
  }, []);

  const confirmTransition = useCallback(() => {
    if (!modalFromId || !modalToId) return;
    const t: Transition = {
      id: uuidv4(),
      fromId: modalFromId,
      toId: modalToId,
      ...transitionForm,
    };
    setTransitions((prev) => [...prev, t]);
    setShowModal(false);
    setModalFromId(null);
    setModalToId(null);
  }, [modalFromId, modalToId, transitionForm]);

  const handlePlayCurrent = useCallback(() => {
    if (selectedNode) onPlayState(selectedNode);
  }, [selectedNode, onPlayState]);

  const triggerEvent = useCallback(
    (eventType: string, value: string) => {
      if (!selectedNodeId) return;
      const match = transitions.find(
        (t) =>
          t.fromId === selectedNodeId &&
          t.triggerType === eventType &&
          (eventType === 'AnimationEnd' || t.triggerValue === value)
      );
      if (match) {
        const targetNode = nodes.find((n) => n.id === match.toId);
        if (targetNode) onPlayState(targetNode, match);
      }
    },
    [selectedNodeId, transitions, nodes, onPlayState]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const keyMap: Record<string, string> = {
        w: 'KeyW', a: 'KeyA', s: 'KeyS', d: 'KeyD',
        arrowup: 'ArrowUp', arrowdown: 'ArrowDown',
        arrowleft: 'ArrowLeft', arrowright: 'ArrowRight',
      };
      const mapped = keyMap[key];
      if (mapped) triggerEvent('KeyboardKey', mapped);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [triggerEvent]);

  const fromNode = nodes.find((n) => n.id === modalFromId) || null;
  const toNode = nodes.find((n) => n.id === modalToId) || null;

  const renderNodeList = () => (
    <div className="panel-left">
      <div className="panel-left-header">
        <span className="panel-title">States</span>
        <button className="btn-add" onClick={addNode}>
          + Add State
        </button>
      </div>
      <div className="node-list">
        {nodes.map((node) => {
          const sprite = SpriteService.getSpriteById(node.spriteId);
          const color = sprite ? SpriteService.getSpriteColor(sprite.name) : '#6366f1';
          return (
            <div
              key={node.id}
              className={`node-item ${node.id === selectedNodeId ? 'selected' : ''}`}
              onClick={() => setSelectedNodeId(node.id)}
            >
              {node.id === selectedNodeId && <div className="node-indicator" />}
              <div className="node-thumb" style={{ borderColor: color }}>
                <span style={{ color, fontSize: 11 }}>
                  {sprite?.name?.slice(0, 4) || '????'}
                </span>
              </div>
              <span className="node-name">{node.name}</span>
              <button
                className="node-delete"
                onClick={(e) => { e.stopPropagation(); deleteNode(node.id); }}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderPropertyPanel = () => (
    <div className="panel-right">
      {selectedNode ? (
        <>
          <div className="panel-right-header">Properties</div>
          <div className="prop-group">
            <label className="prop-label">Name</label>
            <input
              className="prop-input"
              value={selectedNode.name}
              onChange={(e) => updateNode(selectedNode.id, { name: e.target.value })}
            />
          </div>
          <div className="prop-group">
            <label className="prop-label">Sprite</label>
            <select
              className="prop-input"
              value={selectedNode.spriteId}
              onChange={(e) => updateNode(selectedNode.id, { spriteId: Number(e.target.value) })}
            >
              {sprites.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="prop-group">
            <label className="prop-label">Loop Mode</label>
            <select
              className="prop-input"
              value={selectedNode.loopMode}
              onChange={(e) => updateNode(selectedNode.id, { loopMode: e.target.value as LoopMode })}
            >
              <option value="once">Once</option>
              <option value="loop">Loop</option>
              <option value="pingpong">PingPong</option>
            </select>
          </div>
          <div className="prop-group">
            <label className="prop-label">
              Enter Curve
              <CurvePreview curve={selectedNode.enterCurve} color="#22c55e" />
            </label>
            <select
              className="prop-input"
              value={selectedNode.enterCurve}
              onChange={(e) => updateNode(selectedNode.id, { enterCurve: e.target.value as CurveType })}
            >
              <option value="EaseInOut">EaseInOut</option>
              <option value="EaseOut">EaseOut</option>
              <option value="Linear">Linear</option>
            </select>
          </div>
          <div className="prop-group">
            <label className="prop-label">
              Exit Curve
              <CurvePreview curve={selectedNode.exitCurve} color="#f59e0b" />
            </label>
            <select
              className="prop-input"
              value={selectedNode.exitCurve}
              onChange={(e) => updateNode(selectedNode.id, { exitCurve: e.target.value as CurveType })}
            >
              <option value="EaseInOut">EaseInOut</option>
              <option value="EaseOut">EaseOut</option>
              <option value="Linear">Linear</option>
            </select>
          </div>
          <div className="prop-group">
            <label className="prop-label">
              Transitions ({selectedTransitions.length})
            </label>
            <div className="transition-list">
              {selectedTransitions.map((t) => {
                const isOut = t.fromId === selectedNode.id;
                const other = nodes.find((n) => n.id === (isOut ? t.toId : t.fromId));
                return (
                  <div key={t.id} className="transition-item">
                    <span className="transition-dir">
                      {isOut ? '→' : '←'} {other?.name || '?'}
                    </span>
                    <span className="transition-trigger">
                      {t.triggerType === 'KeyboardKey'
                        ? t.triggerValue.replace('Key', '')
                        : t.triggerType === 'Timer'
                        ? `Timer(${t.duration}ms)`
                        : 'AnimEnd'}
                    </span>
                    <button
                      className="transition-delete"
                      onClick={() => setTransitions((prev) => prev.filter((tr) => tr.id !== t.id))}
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
          <button className="btn-play-node" onClick={handlePlayCurrent}>
            ▶ Play This State
          </button>
        </>
      ) : (
        <div className="panel-right-empty">
          <p>Select a state node to edit properties</p>
          <p className="hint">Drag from the + port on a node to create a transition</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="editor-container">
      <div className="editor-toolbar">
        <div className="toolbar-title">StateMachineForge</div>
        <div className="toolbar-actions">
          <button className="btn-save" onClick={saveConfig}>
            💾 Save
          </button>
          <button className="btn-export" onClick={exportConfig}>
            Export Config
          </button>
        </div>
      </div>
      <div className="editor-body">
        <div className="mobile-tabs">
          <button
            className={`mobile-tab ${mobileTab === 'nodes' ? 'active' : ''}`}
            onClick={() => setMobileTab(mobileTab === 'nodes' ? null : 'nodes')}
          >
            States
          </button>
          <button
            className={`mobile-tab ${mobileTab === 'props' ? 'active' : ''}`}
            onClick={() => setMobileTab(mobileTab === 'props' ? null : 'props')}
          >
            Properties
          </button>
        </div>
        <div className={`panel-left-wrapper ${mobileTab === 'nodes' ? 'mobile-open' : ''}`}>
          {renderNodeList()}
        </div>
        <div className="canvas-container">
          <canvas
            ref={canvasRef}
            className="state-canvas"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
          />
          <div className="canvas-hint">
            Drag node to move · Drag + port to connect
          </div>
        </div>
        <div className={`panel-right-wrapper ${mobileTab === 'props' ? 'mobile-open' : ''}`}>
          {renderPropertyPanel()}
        </div>
      </div>
      <TransitionModal
        visible={showModal}
        fromNode={fromNode}
        toNode={toNode}
        form={transitionForm}
        onFormChange={setTransitionForm}
        onConfirm={confirmTransition}
        onCancel={() => { setShowModal(false); setModalFromId(null); setModalToId(null); }}
      />
    </div>
  );
};

export default StateMachineEditor;
