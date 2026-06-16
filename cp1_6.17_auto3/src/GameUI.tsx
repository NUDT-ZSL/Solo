import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine, Node, AI, ToolType, GameState } from './GameEngine';

const NODE_COLORS: Record<string, string> = {
  terminal: '#00FF88',
  firewall: '#FF4444',
  target: '#FFD700',
  encrypted: '#4488FF',
  exit: '#9B59B6',
};

const TOOL_INFO: Record<ToolType, { name: string; desc: string; icon: string }> = {
  crawler: { name: '爬虫病毒', desc: '破解防火墙节点', icon: '🦠' },
  scanner: { name: '端口扫描器', desc: '显示周围AI位置', icon: '📡' },
  cloner: { name: '数据克隆器', desc: '窃取目标文件', icon: '💾' },
};

export const GameUI: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const [, forceUpdate] = useState(0);
  const [viewport, setViewport] = useState({ w: 1024, h: 768 });
  const [message, setMessage] = useState('');
  const [spaceHoldStart, setSpaceHoldStart] = useState<number | null>(null);
  const gridPhaseRef = useRef(0);

  useEffect(() => {
    const updateSize = () => {
      const w = Math.max(window.innerWidth, 1024);
      const h = Math.max(window.innerHeight, 768);
      setViewport({ w, h });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    engineRef.current = new GameEngine(viewport.w, viewport.h);
    forceUpdate((x) => x + 1);
  }, [viewport.w, viewport.h]);

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage((m) => (m === msg ? '' : m)), 1500);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !engineRef.current) return;
    const engine = engineRef.current;
    canvas.width = viewport.w;
    canvas.height = viewport.h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = (time: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = time;
      const dt = Math.min(0.05, (time - lastTimeRef.current) / 1000);
      lastTimeRef.current = time;
      gridPhaseRef.current += dt;

      engine.update(dt);
      drawScene(ctx, engine, time, gridPhaseRef.current, viewport);
      forceUpdate((x) => (x + 1) % 1000000);
      animFrameRef.current = requestAnimationFrame(render);
    };
    animFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [viewport]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && spaceHoldStart === null) {
        setSpaceHoldStart(performance.now());
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        if (spaceHoldStart !== null && performance.now() - spaceHoldStart >= 500) {
          engineRef.current?.activateStealth();
          showMessage('潜伏模式激活');
        }
        setSpaceHoldStart(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [spaceHoldStart]);

  const getAIPosition = (ai: AI, nodes: Node[]): { x: number; y: number } => {
    const curr = nodes[ai.currentNode];
    const tgt = nodes[ai.targetNode];
    if (!curr || !tgt) return { x: 0, y: 0 };
    return {
      x: curr.x + (tgt.x - curr.x) * ai.moveProgress,
      y: curr.y + (tgt.y - curr.y) * ai.moveProgress,
    };
  };

  const drawScene = (
    ctx: CanvasRenderingContext2D,
    engine: GameEngine,
    time: number,
    gridPhase: number,
    vp: { w: number; h: number },
  ) => {
    const { nodes, edges, playerNode, ais, scannerActive, stealthActive } = engine.state;
    ctx.clearRect(0, 0, vp.w, vp.h);

    drawGridBackground(ctx, vp, gridPhase, time);
    drawEdges(ctx, edges, nodes, time);

    for (const node of nodes) {
      drawNodeGlow(ctx, node, time);
    }

    for (const node of nodes) {
      drawNode(ctx, node, engine.state, time);
    }

    for (const ai of ais) {
      const pos = getAIPosition(ai, nodes);
      const showAI = scannerActive > 0 || stealthActive <= 0;
      if (showAI) {
        drawAIDetectRange(ctx, pos, ai, stealthActive > 0, time);
      }
    }

    for (const ai of ais) {
      const pos = getAIPosition(ai, nodes);
      const showAI = scannerActive > 0 || stealthActive <= 0;
      if (showAI) {
        drawAI(ctx, pos.x, pos.y, time);
      }
    }

    const player = nodes[playerNode];
    if (player) drawPlayer(ctx, player.x, player.y, time);

    if (engine.state.invalidPathFlash > 0) {
      ctx.fillStyle = `rgba(255, 68, 68, ${engine.state.invalidPathFlash * 2})`;
      ctx.fillRect(0, 0, vp.w, vp.h);
    }
  };

  const drawGridBackground = (
    ctx: CanvasRenderingContext2D,
    vp: { w: number; h: number },
    gridPhase: number,
    time: number,
  ) => {
    const spacing = 40;
    ctx.lineWidth = 1;
    const t = time * 0.001;
    for (let x = 0; x <= vp.w; x += spacing) {
      const flicker = 0.15 + 0.1 * Math.sin(t * 2 + x * 0.05);
      ctx.strokeStyle = `rgba(0, 220, 255, ${flicker})`;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, vp.h);
      ctx.stroke();
    }
    for (let y = 0; y <= vp.h; y += spacing) {
      const flicker = 0.15 + 0.1 * Math.sin(t * 2 + y * 0.05 + 1.5);
      ctx.strokeStyle = `rgba(0, 220, 255, ${flicker})`;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(vp.w, y);
      ctx.stroke();
    }
  };

  const drawEdges = (ctx: CanvasRenderingContext2D, edges: any[], nodes: Node[], time: number) => {
    for (const edge of edges) {
      const a = nodes[edge.from];
      const b = nodes[edge.to];
      if (!a || !b) continue;
      const isHighlighted =
        (a.type === 'encrypted' && b.id === engineRef.current?.state.playerNode) ||
        (b.type === 'encrypted' && a.id === engineRef.current?.state.playerNode);

      ctx.lineWidth = 2;
      ctx.strokeStyle = isHighlighted ? '#00DCFF' : '#333355';
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();

      const packetCount = 3;
      for (let i = 0; i < packetCount; i++) {
        const offset = (i / packetCount + edge.dataFlowOffset) % 1;
        const t = ((time * 0.0003) + offset) % 1;
        const px = a.x + (b.x - a.x) * t;
        const py = a.y + (b.y - a.y) * t;
        const color = isHighlighted ? '#00DCFF' : '#00AAFF';
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }
  };

  const drawNodeGlow = (ctx: CanvasRenderingContext2D, node: Node, time: number) => {
    const color = NODE_COLORS[node.type];
    const pulse = 0.5 + 0.3 * Math.sin(time * 0.003 + node.pulsePhase);
    const engine = engineRef.current;
    const isPlayerNode = engine && engine.state.playerNode === node.id;
    let pulseScale = 1;
    if (engine && engine.state.pulseNodes.has(node.id)) {
      const p = engine.state.pulseNodes.get(node.id)!;
      pulseScale = 1 + (1 - p / 0.5) * 0.5;
    }
    const baseR = 30 * pulseScale;

    for (let i = 3; i >= 0; i--) {
      const r = baseR + i * 15;
      const alpha = (isPlayerNode ? 0.35 : 0.15) * pulse * (1 - i / 4);
      const gradient = ctx.createRadialGradient(node.x, node.y, baseR * 0.5, node.x, node.y, r);
      gradient.addColorStop(0, hexToRgba(color, alpha));
      gradient.addColorStop(1, hexToRgba(color, 0));
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const drawNode = (ctx: CanvasRenderingContext2D, node: Node, state: GameState, time: number) => {
    const color = NODE_COLORS[node.type];
    const isPlayerNode = state.playerNode === node.id;
    const radius = 20;
    let pulseScale = 1;
    if (state.pulseNodes.has(node.id)) {
      const p = state.pulseNodes.get(node.id)!;
      pulseScale = 1 + (1 - p / 0.5) * 0.3;
    }
    const r = radius * pulseScale;

    ctx.shadowColor = color;
    ctx.shadowBlur = isPlayerNode ? 20 + 10 * Math.sin(time * 0.008) : 10;

    ctx.fillStyle = node.type === 'firewall' && !node.hacked ? '#220000' : '#0A0A1A';
    ctx.beginPath();
    ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.shadowBlur = 0;

    if (isPlayerNode) {
      for (let i = 0; i < 2; i++) {
        const t = ((time * 0.001) + i * 0.5) % 1;
        const pr = r + t * 25;
        ctx.strokeStyle = hexToRgba(color, 1 - t);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(node.x, node.y, pr, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    ctx.fillStyle = color;
    ctx.font = 'bold 12px Consolas';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const labels: Record<string, string> = {
      terminal: 'T',
      firewall: 'F',
      target: '★',
      encrypted: '⌂',
      exit: '⬆',
    };
    ctx.fillText(labels[node.type] || '?', node.x, node.y);
  };

  const drawAIDetectRange = (
    ctx: CanvasRenderingContext2D,
    pos: { x: number; y: number },
    ai: AI,
    stealth: boolean,
    time: number,
  ) => {
    const range = stealth ? 1 : ai.detectRange;
    const radius = range * 60 + 40 * Math.sin(time * 0.004);
    const gradient = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, radius);
    gradient.addColorStop(0, 'rgba(255, 220, 0, 0.15)');
    gradient.addColorStop(0.7, 'rgba(255, 180, 0, 0.05)');
    gradient.addColorStop(1, 'rgba(255, 180, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(255, 220, 0, ${0.4 + 0.2 * Math.sin(time * 0.006)})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  };

  const drawAI = (ctx: CanvasRenderingContext2D, x: number, y: number, time: number) => {
    const pulse = 0.7 + 0.3 * Math.sin(time * 0.006);
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 15 * pulse;
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(x, y, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#0A0A1A';
    ctx.font = 'bold 14px Consolas';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚙', x, y);
  };

  const drawPlayer = (ctx: CanvasRenderingContext2D, x: number, y: number, time: number) => {
    const pulse = 0.7 + 0.3 * Math.sin(time * 0.01);
    ctx.shadowColor = '#00DCFF';
    ctx.shadowBlur = 25 * pulse;
    ctx.fillStyle = '#00DCFF';
    ctx.beginPath();
    ctx.arc(x, y, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#0A0A1A';
    ctx.font = 'bold 14px Consolas';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('◉', x, y);
  };

  const hexToRgba = (hex: string, alpha: number): string => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!engineRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const state = engineRef.current.state;

    const hitNode = state.nodes.find((n) => {
      const dx = n.x - x;
      const dy = n.y - y;
      return Math.sqrt(dx * dx + dy * dy) <= 25;
    });

    if (hitNode) {
      const selectedTool = (Object.keys(state.tools) as ToolType[]).find(
        (k) => state.tools[k].selected,
      );
      if (selectedTool) {
        const result = engineRef.current.useTool(hitNode.id);
        if (result?.message) showMessage(result.message);
      } else {
        const ok = engineRef.current.movePlayer(hitNode.id);
        if (!ok && state.invalidPathFlash <= 0) {
          showMessage('路径非法或节点未破解');
        }
      }
    }
  };

  const state = engineRef.current?.state;
  if (!state) return null;

  const alertColor =
    state.alert < 40 ? '#00FF88' : state.alert < 75 ? '#FFAA00' : '#FF4444';

  return (
    <div style={styles.container}>
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        style={styles.canvas}
      />

      <div style={styles.topBar}>
        <div style={styles.alertWrap}>
          <span style={styles.label}>警报值</span>
          <div style={styles.alertBarBg}>
            <div
              style={{
                ...styles.alertBar,
                width: `${state.alert}%`,
                background: `linear-gradient(90deg, #00FF88, #FFAA00, #FF4444)`,
                transition: 'width 0.2s ease',
              }}
            />
          </div>
          <span style={{ ...styles.label, color: alertColor, fontWeight: 'bold' }}>
            {Math.floor(state.alert)}/100
          </span>
        </div>
        <div style={styles.scoreWrap}>
          <span style={styles.label}>得分</span>
          <span style={styles.scoreValue}>{state.score}</span>
          <span style={styles.label}>第 {state.round} 轮</span>
        </div>
      </div>

      <div style={styles.leftPanel}>
        <div style={styles.panelTitle}>工具冷却</div>
        {(Object.keys(state.tools) as ToolType[]).map((t) => {
          const tool = state.tools[t];
          const info = TOOL_INFO[t];
          const ready = tool.cooldown <= 0;
          const progress = ready ? 1 : 1 - tool.cooldown / 5;
          return (
            <div key={t} style={styles.toolArcWrap}>
              <svg width="64" height="64" style={styles.arcSvg}>
                <circle cx="32" cy="32" r="28" stroke="#333355" strokeWidth="6" fill="none" />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke={ready ? NODE_COLORS.terminal : '#555'}
                  strokeWidth="6"
                  fill="none"
                  strokeDasharray={`${progress * 175.9} 175.9`}
                  strokeLinecap="round"
                  transform="rotate(-90 32 32)"
                  style={{ transition: 'stroke 0.2s ease' }}
                />
              </svg>
              <div style={styles.arcIcon}>{info.icon}</div>
              <div style={styles.arcName}>{info.name}</div>
            </div>
          );
        })}
        <div style={styles.stealthWrap}>
          <div style={styles.panelTitle}>潜伏模式</div>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>
            长按空格0.5秒激活
          </div>
          {state.stealthActive > 0 ? (
            <div style={{ color: NODE_COLORS.terminal, fontWeight: 'bold' }}>
              激活中 {state.stealthActive.toFixed(1)}s
            </div>
          ) : state.stealthCooldown > 0 ? (
            <div style={{ color: '#888' }}>冷却 {state.stealthCooldown.toFixed(1)}s</div>
          ) : (
            <div style={{ color: NODE_COLORS.encrypted }}>就绪</div>
          )}
        </div>
      </div>

      <div style={styles.toolPanel}>
        {(Object.keys(state.tools) as ToolType[]).map((t) => {
          const tool = state.tools[t];
          const info = TOOL_INFO[t];
          const ready = tool.cooldown <= 0;
          return (
            <button
              key={t}
              onClick={() => ready && engineRef.current?.selectTool(t)}
              style={{
                ...styles.toolBtn,
                borderColor: tool.selected ? '#00DCFF' : ready ? '#555' : '#333',
                boxShadow: tool.selected
                  ? '0 0 20px rgba(0, 220, 255, 0.8), inset 0 0 10px rgba(0, 220, 255, 0.3)'
                  : 'none',
                cursor: ready ? 'pointer' : 'not-allowed',
                opacity: ready ? 1 : 0.5,
                transform: tool.selected ? 'scale(1.08)' : 'scale(1)',
                transition: 'all 0.3s ease',
              }}
            >
              <div style={styles.toolIcon}>{info.icon}</div>
              <div style={styles.toolName}>{info.name}</div>
              {!ready && (
                <div style={styles.cooldownOverlay}>{tool.cooldown.toFixed(1)}s</div>
              )}
            </button>
          );
        })}
      </div>

      {state.stealProgress > 0 && (
        <div style={styles.stealBar}>
          <div style={styles.label}>数据克隆中</div>
          <div style={styles.stealDots}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  ...styles.stealDot,
                  background: i < state.stealProgress ? '#FFD700' : '#333',
                  boxShadow: i < state.stealProgress ? '0 0 10px #FFD700' : 'none',
                }}
              />
            ))}
          </div>
        </div>
      )}

      {state.escapeMode && !state.gameOver && (
        <div style={styles.escapeTimer}>
          <div
            style={{
              ...styles.escapeNumber,
              animation: 'pulse 0.5s ease-in-out infinite',
            }}
          >
            {Math.ceil(state.escapeTimer)}
          </div>
          <div style={styles.escapeLabel}>逃离倒计时 - 前往紫色出口节点</div>
          <style>{`
            @keyframes pulse {
              0%, 100% { transform: scale(1); }
              50% { transform: scale(1.15); }
            }
          `}</style>
        </div>
      )}

      {state.gameOver && (
        <div style={styles.gameOver}>
          <div style={styles.gameOverTitle}>游戏结束</div>
          <div style={styles.gameOverScore}>最终得分: {state.score}</div>
          <button
            onClick={() => {
              engineRef.current = new GameEngine(viewport.w, viewport.h);
              forceUpdate((x) => x + 1);
            }}
            style={styles.restartBtn}
          >
            重新开始
          </button>
        </div>
      )}

      {message && <div style={styles.message}>{message}</div>}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    top: 0, left: 0,
    width: '100vw', height: '100vh',
    background: '#0A0A1A',
    overflow: 'hidden',
    minWidth: 1024,
    minHeight: 768,
  },
  canvas: {
    position: 'absolute',
    top: 0, left: 0,
    width: '100%', height: '100%',
    cursor: 'crosshair',
  },
  topBar: {
    position: 'absolute',
    top: 16, left: 16, right: 16,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
    pointerEvents: 'none',
  },
  alertWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: 'rgba(10, 10, 26, 0.7)',
    padding: '10px 16px',
    border: '1px solid #333355',
    borderRadius: 4,
    backdropFilter: 'blur(4px)',
  },
  alertBarBg: {
    width: 200,
    height: 10,
    background: '#111122',
    border: '1px solid #333355',
    overflow: 'hidden',
    borderRadius: 2,
  },
  alertBar: {
    height: '100%',
  },
  label: {
    fontSize: 12,
    color: '#8899BB',
    fontFamily: 'Consolas, monospace',
  },
  scoreWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    background: 'rgba(10, 10, 26, 0.7)',
    padding: '10px 16px',
    border: '1px solid #333355',
    borderRadius: 4,
    backdropFilter: 'blur(4px)',
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFD700',
    textShadow: '0 0 10px rgba(255, 215, 0, 0.6)',
    fontFamily: 'Consolas, monospace',
  },
  leftPanel: {
    position: 'absolute',
    top: 80,
    left: 16,
    width: 110,
    background: 'rgba(10, 10, 26, 0.7)',
    border: '1px solid #333355',
    borderRadius: 4,
    padding: 12,
    zIndex: 10,
    backdropFilter: 'blur(4px)',
  },
  panelTitle: {
    fontSize: 12,
    color: '#00DCFF',
    fontWeight: 'bold',
    marginBottom: 10,
    fontFamily: 'Consolas, monospace',
    textShadow: '0 0 5px rgba(0, 220, 255, 0.5)',
  },
  toolArcWrap: {
    position: 'relative',
    width: 64,
    height: 90,
    margin: '0 auto 12px',
    textAlign: 'center',
  },
  arcSvg: {
    display: 'block',
  },
  arcIcon: {
    position: 'absolute',
    top: 18,
    left: 0,
    width: 64,
    textAlign: 'center',
    fontSize: 20,
  },
  arcName: {
    fontSize: 10,
    color: '#8899BB',
    marginTop: 2,
    fontFamily: 'Consolas, monospace',
  },
  stealthWrap: {
    marginTop: 10,
    paddingTop: 10,
    borderTop: '1px solid #333355',
    fontFamily: 'Consolas, monospace',
  },
  toolPanel: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    display: 'flex',
    gap: 14,
    zIndex: 10,
  },
  toolBtn: {
    position: 'relative',
    width: 90,
    height: 90,
    borderRadius: '50%',
    background: 'rgba(10, 10, 26, 0.9)',
    border: '2px solid #555',
    color: '#00DCFF',
    fontFamily: 'Consolas, monospace',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backdropFilter: 'blur(4px)',
  },
  toolIcon: { fontSize: 26 },
  toolName: { fontSize: 10, color: '#AACCFF' },
  cooldownOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0, 0, 0, 0.6)',
    borderRadius: '50%',
    color: '#FF4444',
    fontSize: 14,
    fontWeight: 'bold',
  },
  stealBar: {
    position: 'absolute',
    top: 80,
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(10, 10, 26, 0.85)',
    border: '1px solid #FFD700',
    padding: '10px 20px',
    borderRadius: 4,
    zIndex: 10,
    backdropFilter: 'blur(4px)',
    textAlign: 'center',
  },
  stealDots: {
    display: 'flex',
    gap: 10,
    justifyContent: 'center',
    marginTop: 6,
  },
  stealDot: {
    width: 16, height: 16,
    borderRadius: '50%',
    transition: 'all 0.2s ease',
  },
  escapeTimer: {
    position: 'absolute',
    top: '40%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    textAlign: 'center',
    zIndex: 20,
    pointerEvents: 'none',
  },
  escapeNumber: {
    fontSize: 72,
    fontWeight: 'bold',
    color: '#FF4444',
    fontFamily: 'Consolas, monospace',
    textShadow: '0 0 30px rgba(255, 68, 68, 0.9), 0 0 60px rgba(255, 68, 68, 0.5)',
  },
  escapeLabel: {
    fontSize: 16,
    color: '#FF8888',
    fontFamily: 'Consolas, monospace',
    marginTop: 8,
  },
  gameOver: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0, 0, 0, 0.85)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    zIndex: 100,
    backdropFilter: 'blur(6px)',
  },
  gameOverTitle: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#FF4444',
    fontFamily: 'Consolas, monospace',
    textShadow: '0 0 30px rgba(255, 68, 68, 0.8)',
  },
  gameOverScore: {
    fontSize: 32,
    color: '#FFD700',
    fontFamily: 'Consolas, monospace',
  },
  restartBtn: {
    padding: '12px 32px',
    fontSize: 18,
    background: 'rgba(0, 220, 255, 0.1)',
    border: '2px solid #00DCFF',
    color: '#00DCFF',
    cursor: 'pointer',
    fontFamily: 'Consolas, monospace',
    borderRadius: 4,
    transition: 'all 0.2s ease',
  },
  message: {
    position: 'absolute',
    bottom: 140,
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(10, 10, 26, 0.9)',
    border: '1px solid #00DCFF',
    color: '#00DCFF',
    padding: '8px 20px',
    borderRadius: 4,
    fontFamily: 'Consolas, monospace',
    zIndex: 15,
    fontSize: 14,
    boxShadow: '0 0 15px rgba(0, 220, 255, 0.4)',
  },
};
