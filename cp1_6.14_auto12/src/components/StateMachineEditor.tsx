import React, { useCallback, useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { SpriteService, SpriteFrame } from '../services/SpriteService';
import { StorageService } from '../services/StorageService';
import { eventBus } from '../utils/EventBus';

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

const CURVE_FUNCTIONS: Record<CurveType, (t: number) => number> = {
  EaseInOut: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  EaseOut: (t) => 1 - Math.pow(1 - t, 3),
  Linear: (t) => t,
};

function drawCurvePreview(
  canvas: HTMLCanvasElement,
  curve: CurveType,
  color: string
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(w, 0);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i <= 100; i++) {
    const t = i / 100;
    const v = CURVE_FUNCTIONS[curve](t);
    const x = t * w;
    const y = h - v * h;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

const CanvasCurvePreview: React.FC<{ curve: CurveType; color: string }> = ({
  curve,
  color,
}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current) drawCurvePreview(ref.current, curve, color);
  }, [curve, color]);
  return (
    <canvas
      ref={ref}
      width={60}
      height={30}
      style={{ verticalAlign: 'middle', marginLeft: 6, borderRadius: 4 }}
    />
  );
};

const StateMachineEditor: React.FC<Props> = ({ onPlayState }) => {
  const [nodes, setNodes] = useState<StateNode[]>([]);
  const [transitions, setTransitions] = useState<Transition[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [sprites, setSprites] = useState<SpriteFrame[]>([]);
  const [dragging, setDragging] = useState<{
    id: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const [connecting, setConnecting] = useState<{
    fromId: string;
    mx: number;
    my: number;
  } | null>(null);
  const [showTransitionModal, setShowTransitionModal] = useState(false);
  const [pendingTransition, setPendingTransition] = useState<{
    fromId: string;
    toId: string;
  } | null>(null);
  const [transitionForm, setTransitionForm] = useState<{
    triggerType: TriggerType;
    triggerValue: string;
    duration: number;
    curve: CurveType;
    midFrames: number[];
  }>({
    triggerType: 'KeyboardKey',
    triggerValue: 'KeyW',
    duration: 300,
    curve: 'EaseInOut',
    midFrames: [],
  });
  const [mobileTab, setMobileTab] = useState<'nodes' | 'props' | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const nodeCounter = useRef(0);
  const animFrameRef = useRef<number>(0);

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
      await StorageService.saveConfig({
        name: 'untitled',
        nodes,
        transitions,
      });
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
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(`
        <html><head><title>StateMachine Export</title>
        <style>body{background:#0b0b1a;color:#e2e8f0;font-family:monospace;padding:24px}
        pre{white-space:pre-wrap;word-break:break-all;font-size:13px;line-height:1.6}
        button{background:#f59e0b;border:none;color:#000;padding:10px 20px;border-radius:8px;cursor:pointer;font-size:14px;margin-bottom:16px}
        button:hover{background:#d97706}</style></head>
        <body><button onclick="navigator.clipboard.writeText(document.querySelector('pre').textContent);this.textContent='Copied!'">Copy to Clipboard</button>
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
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const w = rect.width;
    const h = rect.height;

    ctx.fillStyle = '#0f0f1a';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = '#333344';
    ctx.lineWidth = 0.5;
    const gridSize = 40;
    for (let x = 0; x < w; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    transitions.forEach((t) => {
      const from = nodes.find((n) => n.id === t.fromId);
      const to = nodes.find((n) => n.id === t.toId);
      if (!from || !to) return;

      const fx = from.x + 80;
      const fy = from.y + 25;
      const tx = to.x + 80;
      const ty = to.y + 25;

      const isSelfLoop = t.fromId === t.toId;
      if (isSelfLoop) {
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(fx, fy - 30, 30, 20, 0, -Math.PI, 0);
        ctx.stroke();
        ctx.fillStyle = '#6366f1';
        ctx.beginPath();
        ctx.moveTo(fx + 30, fy - 30);
        ctx.lineTo(fx + 24, fy - 38);
        ctx.lineTo(fx + 36, fy - 34);
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

      const isSelected =
        t.fromId === selectedNodeId || t.toId === selectedNodeId;
      ctx.strokeStyle = isSelected ? '#8b5cf6' : '#6366f1';
      ctx.lineWidth = isSelected ? 2.5 : 1.5;
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.quadraticCurveTo(cx1, cy1, tx, ty);
      ctx.stroke();

      const tParam = 0.85;
      const bx =
        (1 - tParam) * (1 - tParam) * fx +
        2 * (1 - tParam) * tParam * cx1 +
        tParam * tParam * tx;
      const by =
        (1 - tParam) * (1 - tParam) * fy +
        2 * (1 - tParam) * tParam * cy1 +
        tParam * tParam * ty;
      const ax =
        2 * (1 - tParam) * (cx1 - fx) + 2 * tParam * (tx - cx1);
      const ay =
        2 * (1 - tParam) * (cy1 - fy) + 2 * tParam * (ty - cy1);
      const angle = Math.atan2(ay, ax);

      const arrowSize = 10;
      ctx.fillStyle = isSelected ? '#8b5cf6' : '#6366f1';
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(
        tx - arrowSize * Math.cos(angle - Math.PI / 6),
        ty - arrowSize * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        tx - arrowSize * Math.cos(angle + Math.PI / 6),
        ty - arrowSize * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fill();

      const midT = 0.5;
      const labelX =
        (1 - midT) * (1 - midT) * fx +
        2 * (1 - midT) * midT * cx1 +
        midT * midT * tx;
      const labelY =
        (1 - midT) * (1 - midT) * fy +
        2 * (1 - midT) * midT * cy1 +
        midT * midT * ty;
      ctx.fillStyle = '#9ca3af';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      const triggerLabel =
        t.triggerType === 'KeyboardKey'
          ? t.triggerValue.replace('Key', '')
          : t.triggerType === 'Timer'
          ? `${t.duration}ms`
          : 'AnimEnd';
      ctx.fillText(triggerLabel, labelX, labelY - 6);
      ctx.textAlign = 'left';
    });

    if (connecting) {
      const from = nodes.find((n) => n.id === connecting.fromId);
      if (from) {
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(from.x + 80, from.y + 25);
        ctx.lineTo(connecting.mx, connecting.my);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    nodes.forEach((node) => {
      const isSelected = node.id === selectedNodeId;
      const sprite = SpriteService.getSpriteById(node.spriteId);
      const color = sprite ? SpriteService.getSpriteColor(sprite.name) : '#6366f1';

      if (isSelected) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 16;
      }

      ctx.fillStyle = isSelected ? '#1e293b' : '#16213e';
      ctx.beginPath();
      ctx.roundRect(node.x, node.y, 160, 50, 8);
      ctx.fill();

      ctx.shadowBlur = 0;

      ctx.strokeStyle = isSelected ? color : '#334155';
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.beginPath();
      ctx.roundRect(node.x, node.y, 160, 50, 8);
      ctx.stroke();

      if (isSelected) {
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.roundRect(node.x, node.y, 4, 50, [8, 0, 0, 8]);
        ctx.fill();
      }

      if (sprite) {
        const spriteCanvas = SpriteService.generateSpriteCanvas(sprite);
        ctx.drawImage(
          spriteCanvas,
          0,
          0,
          sprite.width,
          sprite.height,
          node.x + 8,
          node.y + 5,
          36,
          36
        );
      }

      ctx.fillStyle = '#ffffff';
      ctx.font = '14px sans-serif';
      ctx.fillText(node.name, node.x + 50, node.y + 30);

      const transCount = transitions.filter(
        (t) => t.fromId === node.id || t.toId === node.id
      ).length;
      ctx.fillStyle = '#9ca3af';
      ctx.font = '10px sans-serif';
      ctx.fillText(`${transCount}`, node.x + 140, node.y + 14);
    });
  }, [nodes, transitions, selectedNodeId, connecting]);

  useEffect(() => {
    const loop = () => {
      drawCanvas();
      animFrameRef.current = requestAnimationFrame(loop);
    };
    animFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [drawCanvas]);

  const getCanvasPos = useCallback(
    (e: React.MouseEvent): { x: number; y: number } => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    },
    []
  );

  const findNodeAt = useCallback(
    (x: number, y: number): StateNode | null => {
      for (let i = nodes.length - 1; i >= 0; i--) {
        const n = nodes[i];
        if (x >= n.x && x <= n.x + 160 && y >= n.y && y <= n.y + 50) {
          return n;
        }
      }
      return null;
    },
    [nodes]
  );

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const pos = getCanvasPos(e);
      const node = findNodeAt(pos.x, pos.y);
      if (node) {
        setSelectedNodeId(node.id);
        if (e.shiftKey) {
          setConnecting({ fromId: node.id, mx: pos.x, my: pos.y });
        } else {
          setDragging({
            id: node.id,
            offsetX: pos.x - node.x,
            offsetY: pos.y - node.y,
          });
        }
      } else {
        setSelectedNodeId(null);
      }
    },
    [getCanvasPos, findNodeAt]
  );

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const pos = getCanvasPos(e);
      if (dragging) {
        setNodes((prev) =>
          prev.map((n) =>
            n.id === dragging.id
              ? { ...n, x: pos.x - dragging.offsetX, y: pos.y - dragging.offsetY }
              : n
          )
        );
      }
      if (connecting) {
        setConnecting((prev) =>
          prev ? { ...prev, mx: pos.x, my: pos.y } : null
        );
      }
    },
    [dragging, connecting, getCanvasPos]
  );

  const handleCanvasMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (connecting) {
        const pos = getCanvasPos(e);
        const target = findNodeAt(pos.x, pos.y);
        if (target && target.id !== connecting.fromId) {
          setPendingTransition({
            fromId: connecting.fromId,
            toId: target.id,
          });
          setShowTransitionModal(true);
          setTransitionForm({
            triggerType: 'KeyboardKey',
            triggerValue: 'KeyW',
            duration: 300,
            curve: 'EaseInOut',
            midFrames: [],
          });
        }
        setConnecting(null);
      }
      setDragging(null);
    },
    [connecting, getCanvasPos, findNodeAt]
  );

  const confirmTransition = useCallback(() => {
    if (!pendingTransition) return;
    const t: Transition = {
      id: uuidv4(),
      fromId: pendingTransition.fromId,
      toId: pendingTransition.toId,
      ...transitionForm,
    };
    setTransitions((prev) => [...prev, t]);
    setShowTransitionModal(false);
    setPendingTransition(null);
  }, [pendingTransition, transitionForm]);

  const handlePlayCurrent = useCallback(() => {
    if (selectedNode) {
      onPlayState(selectedNode);
    }
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
        if (targetNode) {
          onPlayState(targetNode, match);
        }
      }
    },
    [selectedNodeId, transitions, nodes, onPlayState]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const keyMap: Record<string, string> = {
        w: 'KeyW',
        a: 'KeyA',
        s: 'KeyS',
        d: 'KeyD',
        arrowup: 'ArrowUp',
        arrowdown: 'ArrowDown',
        arrowleft: 'ArrowLeft',
        arrowright: 'ArrowRight',
      };
      const mapped = keyMap[key];
      if (mapped) {
        triggerEvent('KeyboardKey', mapped);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [triggerEvent]);

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
          const color = sprite
            ? SpriteService.getSpriteColor(sprite.name)
            : '#6366f1';
          return (
            <div
              key={node.id}
              className={`node-item ${node.id === selectedNodeId ? 'selected' : ''}`}
              onClick={() => setSelectedNodeId(node.id)}
            >
              {node.id === selectedNodeId && (
                <div className="node-indicator" />
              )}
              <div
                className="node-thumb"
                style={{ borderColor: color }}
              >
                <span style={{ color, fontSize: 11 }}>
                  {sprite?.name?.slice(0, 4) || '????'}
                </span>
              </div>
              <span className="node-name">{node.name}</span>
              <button
                className="node-delete"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteNode(node.id);
                }}
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
              onChange={(e) =>
                updateNode(selectedNode.id, { name: e.target.value })
              }
            />
          </div>
          <div className="prop-group">
            <label className="prop-label">Sprite</label>
            <select
              className="prop-input"
              value={selectedNode.spriteId}
              onChange={(e) =>
                updateNode(selectedNode.id, {
                  spriteId: Number(e.target.value),
                })
              }
            >
              {sprites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="prop-group">
            <label className="prop-label">Loop Mode</label>
            <select
              className="prop-input"
              value={selectedNode.loopMode}
              onChange={(e) =>
                updateNode(selectedNode.id, {
                  loopMode: e.target.value as LoopMode,
                })
              }
            >
              <option value="once">Once</option>
              <option value="loop">Loop</option>
              <option value="pingpong">PingPong</option>
            </select>
          </div>
          <div className="prop-group">
            <label className="prop-label">
              Enter Curve
              <CanvasCurvePreview
                curve={selectedNode.enterCurve}
                color="#22c55e"
              />
            </label>
            <select
              className="prop-input"
              value={selectedNode.enterCurve}
              onChange={(e) =>
                updateNode(selectedNode.id, {
                  enterCurve: e.target.value as CurveType,
                })
              }
            >
              <option value="EaseInOut">EaseInOut</option>
              <option value="EaseOut">EaseOut</option>
              <option value="Linear">Linear</option>
            </select>
          </div>
          <div className="prop-group">
            <label className="prop-label">
              Exit Curve
              <CanvasCurvePreview
                curve={selectedNode.exitCurve}
                color="#f59e0b"
              />
            </label>
            <select
              className="prop-input"
              value={selectedNode.exitCurve}
              onChange={(e) =>
                updateNode(selectedNode.id, {
                  exitCurve: e.target.value as CurveType,
                })
              }
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
                const isOutgoing = t.fromId === selectedNode.id;
                const otherNode = nodes.find((n) =>
                  n.id === (isOutgoing ? t.toId : t.fromId)
                );
                return (
                  <div key={t.id} className="transition-item">
                    <span className="transition-dir">
                      {isOutgoing ? '→' : '←'} {otherNode?.name || '?'}
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
                      onClick={() =>
                        setTransitions((prev) =>
                          prev.filter((tr) => tr.id !== t.id)
                        )
                      }
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
          <p className="hint">Hold Shift + drag from a node to create a transition</p>
        </div>
      )}
    </div>
  );

  const renderTransitionModal = () => {
    if (!showTransitionModal || !pendingTransition) return null;
    const fromNode = nodes.find((n) => n.id === pendingTransition.fromId);
    const toNode = nodes.find((n) => n.id === pendingTransition.toId);

    return (
      <div className="modal-overlay" onClick={() => setShowTransitionModal(false)}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-title">
            Transition: {fromNode?.name} → {toNode?.name}
          </div>
          <div className="prop-group">
            <label className="prop-label">Trigger Type</label>
            <select
              className="prop-input"
              value={transitionForm.triggerType}
              onChange={(e) =>
                setTransitionForm((f) => ({
                  ...f,
                  triggerType: e.target.value as TriggerType,
                }))
              }
            >
              <option value="KeyboardKey">KeyboardKey</option>
              <option value="Timer">Timer</option>
              <option value="AnimationEnd">AnimationEnd</option>
            </select>
          </div>
          {transitionForm.triggerType === 'KeyboardKey' && (
            <div className="prop-group">
              <label className="prop-label">Key</label>
              <select
                className="prop-input"
                value={transitionForm.triggerValue}
                onChange={(e) =>
                  setTransitionForm((f) => ({
                    ...f,
                    triggerValue: e.target.value,
                  }))
                }
              >
                <option value="KeyW">W</option>
                <option value="KeyA">A</option>
                <option value="KeyS">S</option>
                <option value="KeyD">D</option>
                <option value="ArrowUp">↑</option>
                <option value="ArrowDown">↓</option>
                <option value="ArrowLeft">←</option>
                <option value="ArrowRight">→</option>
              </select>
            </div>
          )}
          <div className="prop-group">
            <label className="prop-label">
              Duration: {transitionForm.duration}ms
            </label>
            <input
              type="range"
              min={0}
              max={2000}
              step={10}
              value={transitionForm.duration}
              onChange={(e) =>
                setTransitionForm((f) => ({
                  ...f,
                  duration: Number(e.target.value),
                }))
              }
              className="prop-slider"
            />
          </div>
          <div className="prop-group">
            <label className="prop-label">
              Curve
              <CanvasCurvePreview
                curve={transitionForm.curve}
                color="#6366f1"
              />
            </label>
            <select
              className="prop-input"
              value={transitionForm.curve}
              onChange={(e) =>
                setTransitionForm((f) => ({
                  ...f,
                  curve: e.target.value as CurveType,
                }))
              }
            >
              <option value="EaseInOut">EaseInOut</option>
              <option value="EaseOut">EaseOut</option>
              <option value="Linear">Linear</option>
            </select>
          </div>
          <div className="prop-group">
            <label className="prop-label">
              Mid Frames (max 3): {transitionForm.midFrames.length}
            </label>
            <div className="mid-frames">
              {[0, 1, 2].map((i) => (
                <button
                  key={i}
                  className={`mid-frame-btn ${transitionForm.midFrames.includes(i) ? 'active' : ''}`}
                  onClick={() =>
                    setTransitionForm((f) => {
                      const has = f.midFrames.includes(i);
                      return {
                        ...f,
                        midFrames: has
                          ? f.midFrames.filter((v) => v !== i)
                          : f.midFrames.length < 3
                          ? [...f.midFrames, i]
                          : f.midFrames,
                      };
                    })
                  }
                >
                  Frame {i + 1}
                </button>
              ))}
            </div>
          </div>
          <div className="modal-actions">
            <button
              className="btn-cancel"
              onClick={() => setShowTransitionModal(false)}
            >
              Cancel
            </button>
            <button className="btn-confirm" onClick={confirmTransition}>
              Create Transition
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderMobileTabs = () => (
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
        {renderMobileTabs()}
        <div
          className={`panel-left-wrapper ${mobileTab === 'nodes' ? 'mobile-open' : ''}`}
        >
          {renderNodeList()}
        </div>
        <div className="canvas-container" ref={canvasContainerRef}>
          <canvas
            ref={canvasRef}
            className="state-canvas"
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={() => {
              setDragging(null);
              setConnecting(null);
            }}
          />
          <div className="canvas-hint">
            Shift+Drag from node to create transition
          </div>
        </div>
        <div
          className={`panel-right-wrapper ${mobileTab === 'props' ? 'mobile-open' : ''}`}
        >
          {renderPropertyPanel()}
        </div>
      </div>
      {renderTransitionModal()}
    </div>
  );
};

export default StateMachineEditor;
