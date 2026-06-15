import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import { GameEngine } from './game/GameEngine';
import {
  CellEntityData,
  EvolutionNode,
  GameState,
  MovePattern
} from './game/types';
import { flattenTree, getMaxBreadth, getTreeDepth } from './game/EvolutionTree';

const MOVE_PATTERN_LABELS: Record<MovePattern, string> = {
  [MovePattern.LINEAR]: '直线游走',
  [MovePattern.SINUSOIDAL]: '正弦波动',
  [MovePattern.JITTER]: '随机抖动'
};

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (v: number) => {
    const hex = Math.round(v * 255).toString(16).padStart(2, '0');
    return hex;
  };
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

function EnergyProgress({ value, max, hue }: { value: number; max: number; hue: number }) {
  const size = 110;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, value / max);
  const dashOffset = c * (1 - pct);
  const strokeColor = `hsl(${hue}, 85%, 65%)`;

  return (
    <div className="energy-container">
      <svg className="energy-svg" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle className="energy-track" cx={size / 2} cy={size / 2} r={r} />
        <circle
          className="energy-fill"
          cx={size / 2}
          cy={size / 2}
          r={r}
          style={{
            strokeDasharray: c.toFixed(2),
            strokeDashoffset: dashOffset.toFixed(2),
            stroke: strokeColor
          }}
        />
      </svg>
      <div className="energy-center">
        <div className="energy-count" style={{ color: strokeColor }}>
          {value}
        </div>
        <div className="energy-threshold">/ {max}</div>
      </div>
    </div>
  );
}

function DivisionDots({ count }: { count: number }) {
  const total = Math.max(count, 1);
  return (
    <div className="divisions-container">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className={`division-dot ${i < count ? 'filled' : ''}`} />
      ))}
    </div>
  );
}

interface TreeLayoutNode {
  node: EvolutionNode;
  x: number;
  y: number;
  parentX?: number;
  parentY?: number;
}

function layoutTree(
  root: EvolutionNode | null,
  nodeRadius: number = 16,
  levelGap: number = 60,
  siblingGap: number = 48
): { nodes: TreeLayoutNode[]; width: number; height: number } {
  if (!root) return { nodes: [], width: 0, height: 0 };

  const depth = getTreeDepth(root);
  const breadth = getMaxBreadth(root);

  function countLeaves(n: EvolutionNode): number {
    if (n.children.length === 0) return 1;
    return n.children.reduce((s, c) => s + countLeaves(c), 0);
  }

  const xPositions: Map<string, number> = new Map();
  let leafCounter = 0;

  function assignX(n: EvolutionNode, level: number): void {
    if (n.children.length === 0) {
      xPositions.set(n.cellId, leafCounter * siblingGap + nodeRadius);
      leafCounter++;
      return;
    }
    for (const child of n.children) {
      assignX(child, level + 1);
    }
    const firstChildX = xPositions.get(n.children[0].cellId)!;
    const lastChildX = xPositions.get(n.children[n.children.length - 1].cellId)!;
    xPositions.set(n.cellId, (firstChildX + lastChildX) / 2);
  }

  assignX(root, 0);

  const nodes: TreeLayoutNode[] = [];

  function traverse(n: EvolutionNode, level: number, parentX?: number, parentY?: number): void {
    const x = xPositions.get(n.cellId)!;
    const y = level * levelGap + nodeRadius;
    nodes.push({ node: n, x, y, parentX, parentY });
    for (const child of n.children) {
      traverse(child, level + 1, x, y);
    }
  }

  traverse(root, 0);

  let minX = Infinity,
    maxX = -Infinity;
  for (const n of nodes) {
    minX = Math.min(minX, n.x);
    maxX = Math.max(maxX, n.x);
  }
  const width = Math.max(maxX - minX + nodeRadius * 2, breadth * siblingGap + nodeRadius * 2);
  const height = depth * levelGap + nodeRadius * 2;

  const xOffset = nodeRadius - minX;
  for (const n of nodes) {
    n.x += xOffset;
    if (n.parentX !== undefined) n.parentX += xOffset;
  }

  return { nodes, width, height };
}

function EvolutionTreeView({ root }: { root: EvolutionNode | null }) {
  const { nodes, width, height } = useMemo(() => layoutTree(root), [root]);
  const padding = 24;
  const totalW = width + padding * 2;
  const totalH = height + padding * 2;

  if (!root || nodes.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-emoji">🔬</div>
        <div>暂无进化数据</div>
      </div>
    );
  }

  return (
    <svg
      className="tree-svg"
      width={totalW}
      height={totalH}
      viewBox={`0 0 ${totalW} ${totalH}`}
    >
      <g transform={`translate(${padding}, ${padding})`}>
        {nodes.map((n, i) =>
          n.parentX !== undefined && n.parentY !== undefined ? (
            <path
              key={`link-${i}`}
              className="tree-link"
              d={`M ${n.parentX} ${n.parentY} C ${n.parentX} ${(n.parentY + n.y) / 2}, ${n.x} ${(n.parentY + n.y) / 2}, ${n.x} ${n.y}`}
              style={{
                stroke: `hsla(${(n.node.hue + 200) % 360}, 60%, 55%, 0.4)`
              }}
            />
          ) : null
        )}
        {nodes.map((n, i) => {
          const color = `hsl(${n.node.hue}, 85%, 60%)`;
          const isDead = n.node.deathTime !== undefined;
          return (
            <g key={`node-${i}`} transform={`translate(${n.x}, ${n.y})`}>
              <circle
                className="tree-node-circle"
                r={14}
                fill={color}
                style={{ opacity: isDead ? 0.55 : 1 }}
              />
              <circle r={4} fill="rgba(255,255,255,0.85)" />
              <text className="tree-node-text" y={28}>
                {n.node.birthTime.toFixed(1)}s
              </text>
              {isDead && (
                <text
                  className="tree-node-text"
                  y={40}
                  style={{ fill: 'rgba(255,255,255,0.35)' }}
                >
                  → {n.node.deathTime!.toFixed(1)}s
                </text>
              )}
            </g>
          );
        })}
      </g>
    </svg>
  );
}

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const energyThresholdRef = useRef(5);

  const [gameState, setGameState] = useState<GameState>({
    status: 'playing',
    score: 0,
    survivalTime: 0,
    selectedCellId: null,
    playerCells: [],
    enemySpawnTimer: 0
  });
  const [selectedCell, setSelectedCell] = useState<CellEntityData | null>(null);
  const [evolutionRoot, setEvolutionRoot] = useState<EvolutionNode | null>(null);
  const [showGameOver, setShowGameOver] = useState(false);

  const [scoreBump, setScoreBump] = useState(false);
  const prevScoreRef = useRef(0);
  const scoreBumpTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (gameState.score !== prevScoreRef.current) {
      prevScoreRef.current = gameState.score;
      setScoreBump(true);
      if (scoreBumpTimerRef.current) window.clearTimeout(scoreBumpTimerRef.current);
      scoreBumpTimerRef.current = window.setTimeout(() => setScoreBump(false), 300);
    }
  }, [gameState.score]);

  const handleStateChange = useCallback((partial: Partial<GameState>) => {
    setGameState(prev => ({ ...prev, ...partial }));
  }, []);

  const handleGameOver = useCallback((root: EvolutionNode) => {
    setEvolutionRoot(root);
    setShowGameOver(true);
  }, []);

  const handleSelectedCellChange = useCallback((cell: CellEntityData | null) => {
    setSelectedCell(cell);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (engineRef.current) {
        engineRef.current.resize(rect.width, rect.height);
      }
    };

    resize();
    const rect = container.getBoundingClientRect();

    const engine = new GameEngine(
      {
        ...canvas,
        width: rect.width,
        height: rect.height
      } as HTMLCanvasElement,
      {
        onStateChange: handleStateChange,
        onGameOver: handleGameOver,
        onSelectedCellChange: handleSelectedCellChange
      }
    );
    engineRef.current = engine;
    energyThresholdRef.current = engine.getEnergyThreshold();

    const ctx = canvas.getContext('2d');
    if (ctx) {
      const dpr = window.devicePixelRatio || 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    const ro = new ResizeObserver(resize);
    ro.observe(container);

    engine.start();

    return () => {
      ro.disconnect();
      engine.stop();
      engineRef.current = null;
    };
  }, [handleStateChange, handleGameOver, handleSelectedCellChange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !engineRef.current) return;

    const getLocalPos = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: clientX - rect.left,
        y: clientY - rect.top
      };
    };

    let dragging = false;

    const onMove = (x: number, y: number) => {
      engineRef.current?.setMouseTarget(x, y);
    };

    const onMouseDown = (e: MouseEvent) => {
      const { x, y } = getLocalPos(e.clientX, e.clientY);
      const selected = engineRef.current?.selectCellAt(x, y);
      if (!selected) {
        dragging = true;
        onMove(x, y);
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!dragging) return;
      const { x, y } = getLocalPos(e.clientX, e.clientY);
      onMove(x, y);
    };

    const onMouseUp = () => {
      dragging = false;
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      e.preventDefault();
      const t = e.touches[0];
      const { x, y } = getLocalPos(t.clientX, t.clientY);
      const selected = engineRef.current?.selectCellAt(x, y);
      if (!selected) {
        dragging = true;
        onMove(x, y);
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!dragging || e.touches.length === 0) return;
      e.preventDefault();
      const t = e.touches[0];
      const { x, y } = getLocalPos(t.clientX, t.clientY);
      onMove(x, y);
    };

    const onTouchEnd = () => {
      dragging = false;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        engineRef.current?.triggerSplit();
      }
    };

    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd);
    window.addEventListener('keydown', onKeyDown);

    return () => {
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const handleRestart = useCallback(() => {
    setShowGameOver(false);
    setEvolutionRoot(null);
    engineRef.current?.restart();
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowGameOver(false);
  }, []);

  const energyMax = energyThresholdRef.current;
  const cellColor = selectedCell
    ? hslToHex(selectedCell.hue, selectedCell.saturation * 100, selectedCell.lightness * 100)
    : '#5ad7ff';
  const splitReady = selectedCell ? selectedCell.energy >= energyMax : false;
  const patternLabel = selectedCell ? MOVE_PATTERN_LABELS[selectedCell.movePattern] : '';

  const totalCells = evolutionRoot ? flattenTree(evolutionRoot).length : 0;
  const maxDivision = evolutionRoot
    ? flattenTree(evolutionRoot).reduce((m, n) => Math.max(m, n.divisionCount), 0)
    : 0;

  return (
    <div className="app">
      <div className="canvas-container" ref={containerRef}>
        <canvas ref={canvasRef} className="game-canvas" />
        <div className="hud">
          <div className="hud-item">
            <span className="hud-label">吞噬</span>
            <span className={`hud-value ${scoreBump ? 'bump' : ''}`}>{gameState.score}</span>
          </div>
          <div className="hud-item">
            <span className="hud-label">生存</span>
            <span className="hud-value">{gameState.survivalTime.toFixed(1)}s</span>
          </div>
        </div>
      </div>

      <aside className="info-panel">
        <div className="panel-title">
          <span className="panel-title-dot" />
          细胞状态
        </div>

        <div className="panel-section">
          <span className="section-label">颜色</span>
          <div className="color-row">
            <div
              className="color-swatch"
              style={{
                background: cellColor,
                color: cellColor
              }}
            />
            <span className="color-hex">{cellColor.toUpperCase()}</span>
          </div>
        </div>

        <div className="panel-section">
          <span className="section-label">大小</span>
          <div>
            <span className="size-value">
              {selectedCell ? selectedCell.radius.toFixed(1) : '0.0'}
            </span>
            <span className="size-unit">px</span>
          </div>
        </div>

        <div className="panel-section">
          <span className="section-label">能量</span>
          <EnergyProgress
            value={selectedCell?.energy ?? 0}
            max={energyMax}
            hue={selectedCell?.hue ?? 200}
          />
          <div className={`energy-hint ${splitReady ? 'ready' : ''}`}>
            {splitReady ? '✨ 按 空格 分裂' : `吞噬 ${Math.max(0, energyMax - (selectedCell?.energy ?? 0))} 个可分裂`}
          </div>
        </div>

        <div className="panel-section">
          <span className="section-label">分裂次数</span>
          <DivisionDots count={selectedCell?.divisionCount ?? 0} />
        </div>

        <div className="panel-section">
          <span className="section-label">移动模式</span>
          {selectedCell && <span className="pattern-tag">{patternLabel}</span>}
        </div>

        <div className="hint-box">
          <div className="hint-line">
            <span className="key-cap">拖拽</span>
            <span>控制主细胞移动</span>
          </div>
          <div className="hint-line">
            <span className="key-cap">点击</span>
            <span>子细胞切换控制</span>
          </div>
          <div className="hint-line">
            <span className="key-cap">空格</span>
            <span>能量满时分裂</span>
          </div>
          <div className="hint-line">
            <span className="key-cap">吞噬</span>
            <span>体型需大于目标10%</span>
          </div>
        </div>
      </aside>

      {showGameOver && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <h2 className="modal-title">🌿 进化树 · 家族史</h2>
                <p className="modal-subtitle">
                  你的细胞家族在微观世界中留下了这段传奇谱系，每一个节点都是一次勇敢的分裂与进化。
                </p>
              </div>
            </div>

            <div className="modal-stats">
              <div className="stat-block">
                <span className="stat-label">总吞噬</span>
                <span className="stat-value">{gameState.score}</span>
              </div>
              <div className="stat-block">
                <span className="stat-label">生存时间</span>
                <span className="stat-value">{gameState.survivalTime.toFixed(1)}s</span>
              </div>
              <div className="stat-block">
                <span className="stat-label">细胞总数</span>
                <span className="stat-value">{totalCells}</span>
              </div>
              <div className="stat-block">
                <span className="stat-label">最深代数</span>
                <span className="stat-value">{maxDivision + 1}</span>
              </div>
            </div>

            <div className="tree-scroll">
              <EvolutionTreeView root={evolutionRoot} />
            </div>

            <div className="tree-legend">
              <div className="legend-item">
                <span className="legend-swatch" style={{ background: 'hsl(200, 85%, 60%)' }} />
                <span>存活细胞</span>
              </div>
              <div className="legend-item">
                <span
                  className="legend-swatch"
                  style={{ background: 'hsl(200, 50%, 45%)', opacity: 0.55 }}
                />
                <span>已分裂/吞噬</span>
              </div>
              <div className="legend-item">
                <span>数字</span>
                <span>分裂时间 (秒)</span>
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={handleCloseModal}>
                查看进化树
              </button>
              <button className="btn btn-primary" onClick={handleRestart}>
                🔄 再来一局
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
