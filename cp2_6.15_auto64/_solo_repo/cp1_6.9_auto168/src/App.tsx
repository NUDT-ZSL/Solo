import React, { useEffect, useRef, useState, useCallback } from 'react';
import { TerrainEngine, InkType, StatsData } from './TerrainEngine';
import { ParticleSystem } from './ParticleSystem';
import { ToolBar } from './ToolBar';
import { StatsPanel } from './StatsPanel';

const CELL_SIZE = 8;
const REDUCE_PARTICLE_THRESHOLD = 12000;

interface ResetDialogProps {
  onConfirm: () => void;
  onCancel: () => void;
}

const ResetDialog: React.FC<ResetDialogProps> = ({ onConfirm, onCancel }) => {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(10, 10, 26, 0.85)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: 'rgba(26, 26, 46, 0.95)',
          border: '1px solid #4a4a6a',
          borderRadius: 14,
          padding: '32px 40px',
          textAlign: 'center',
          boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
          maxWidth: 380
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            color: '#ff6666',
            fontSize: 18,
            fontWeight: 600,
            marginBottom: 12
          }}
        >
          ⚠ 确认重置
        </div>
        <div
          style={{
            color: '#d0d0e0',
            fontSize: 14,
            lineHeight: 1.6,
            marginBottom: 28
          }}
        >
          此操作将清空所有墨迹和地形变化，<br />
          恢复初始空白网格状态。<br />
          <span style={{ color: '#8a8aa0', fontSize: 12 }}>
            （已保存的快照也将被清除）
          </span>
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '10px 24px',
              borderRadius: 8,
              border: '1px solid #3a3a5a',
              background: 'transparent',
              color: '#a0a0c0',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
              transition: 'all 0.15s ease'
            }}
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '10px 24px',
              borderRadius: 8,
              border: 'none',
              background: 'linear-gradient(135deg, #ff5555, #cc3333)',
              color: '#fff',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              boxShadow: '0 2px 12px rgba(255,85,85,0.3)',
              transition: 'all 0.15s ease'
            }}
          >
            确认重置
          </button>
        </div>
      </div>
    </div>
  );
};

interface NotificationProps {
  message: string;
  type: 'success' | 'info' | 'warning';
}

const Notification: React.FC<NotificationProps> = ({ message, type }) => {
  const colors = {
    success: { bg: 'rgba(68, 255, 170, 0.15)', border: '#44ffaa', color: '#44ffaa' },
    info: { bg: 'rgba(68, 136, 255, 0.15)', border: '#4488ff', color: '#6699ff' },
    warning: { bg: 'rgba(255, 170, 68, 0.15)', border: '#ffaa44', color: '#ffaa44' }
  };
  const c = colors[type];

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 30,
        left: '50%',
        transform: 'translateX(-50%)',
        background: c.bg,
        border: `1px solid ${c.border}`,
        color: c.color,
        padding: '10px 24px',
        borderRadius: 8,
        fontSize: 13,
        fontWeight: 500,
        backdropFilter: 'blur(8px)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        zIndex: 500,
        animation: 'none'
      }}
    >
      {message}
    </div>
  );
};

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<TerrainEngine | null>(null);
  const particlesRef = useRef<ParticleSystem | null>(null);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  const [selectedInk, setSelectedInk] = useState<InkType>('lava');
  const [autoEcoMode, setAutoEcoMode] = useState(false);
  const [stats, setStats] = useState<StatsData>({
    lava: { count: 0, energy: 0, evolutionRate: 0 },
    water: { count: 0, energy: 0, evolutionRate: 0 },
    plant: { count: 0, energy: 0, evolutionRate: 0 }
  });
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'warning' } | null>(null);

  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });

  const showNotification = useCallback((message: string, type: 'success' | 'info' | 'warning' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 2000);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      if (engineRef.current) {
        engineRef.current.resize(canvas.width, canvas.height);
      }
    };

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const engine = new TerrainEngine(canvas.width, canvas.height, CELL_SIZE);
    engineRef.current = engine;

    const particles = new ParticleSystem();
    particlesRef.current = particles;

    engine.setStatsCallback((s) => {
      setStats(s);
      const totalCells = engine.getTotalCellCount();
      particles.setReducedParticles(totalCells > REDUCE_PARTICLE_THRESHOLD);
    });

    window.addEventListener('resize', resize);

    const renderGrid = (ctx: CanvasRenderingContext2D) => {
      ctx.strokeStyle = '#2a2a4a';
      ctx.lineWidth = 0.5;
      ctx.beginPath();

      for (let x = 0; x <= canvas.width; x += CELL_SIZE) {
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, canvas.height);
      }
      for (let y = 0; y <= canvas.height; y += CELL_SIZE) {
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(canvas.width, y + 0.5);
      }
      ctx.stroke();
    };

    const renderTerrain = (ctx: CanvasRenderingContext2D) => {
      const grid = engine.grid;
      for (let y = 0; y < engine.rows; y++) {
        for (let x = 0; x < engine.cols; x++) {
          const cell = grid[y][x];
          if (cell.type === 'empty') continue;

          let color: string;
          switch (cell.type) {
            case 'lava':
              const lavaHeat = Math.min(1, cell.energy / 100);
              const lr = 255;
              const lg = Math.floor(68 + lavaHeat * 60);
              const lb = Math.floor(68 * lavaHeat);
              color = `rgb(${lr},${lg},${lb})`;
              break;
            case 'water':
              const waterDeep = Math.min(1, cell.energy / 100);
              const wr = Math.floor(68 * (1 - waterDeep * 0.5));
              const wg = Math.floor(136 + waterDeep * 40);
              const wb = 255;
              color = `rgb(${wr},${wg},${wb})`;
              break;
            case 'plant':
              const plantGrow = Math.min(1, cell.energy / 100);
              const pr = Math.floor(68 * (1 - plantGrow * 0.5));
              const pg = Math.floor(200 + plantGrow * 55);
              const pb = Math.floor(102 + plantGrow * 50);
              color = `rgb(${pr},${pg},${pb})`;
              break;
            case 'stone':
              color = '#888899';
              break;
            case 'scorched':
              color = '#3a2a1a';
              break;
            default:
              continue;
          }

          ctx.fillStyle = color;
          const px = x * CELL_SIZE;
          const py = y * CELL_SIZE;
          ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);

          if (cell.boostedUntil > performance.now() && cell.type === 'plant') {
            ctx.fillStyle = 'rgba(102, 255, 200, 0.25)';
            ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
          }
        }
      }
    };

    const renderBoundaryGlow = (ctx: CanvasRenderingContext2D, _now: number) => {
      if (engine.boundaryGlowPositions.size === 0) return;
      const alpha = engine.getBoundaryGlowAlpha();
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 8;
      ctx.fillStyle = '#ffffff';
      engine.boundaryGlowPositions.forEach(pos => {
        const [sx, sy] = pos.split(',').map(Number);
        ctx.fillRect(sx * CELL_SIZE, sy * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      });
      ctx.restore();
    };

    const loop = (now: number) => {
      const dt = now - lastTimeRef.current;
      lastTimeRef.current = now;

      ctx.fillStyle = '#0a0a1a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      renderGrid(ctx);

      engine.update(dt, now);
      particles.update(now, engine.burnAreas, CELL_SIZE);

      renderTerrain(ctx);
      renderBoundaryGlow(ctx, now);
      particles.render(ctx, now);

      rafRef.current = requestAnimationFrame(loop);
    };

    lastTimeRef.current = performance.now();
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setAutoEcoMode(autoEcoMode);
    }
  }, [autoEcoMode]);

  const getCanvasCoords = (e: React.MouseEvent | MouseEvent): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!engineRef.current) return;
    isDraggingRef.current = true;
    const pos = getCanvasCoords(e);
    lastMousePosRef.current = pos;
    engineRef.current.releaseInk(pos.x, pos.y, selectedInk, 56);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !engineRef.current) return;
    const pos = getCanvasCoords(e);
    const dx = pos.x - lastMousePosRef.current.x;
    const dy = pos.y - lastMousePosRef.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 4) {
      engineRef.current.releaseInk(pos.x, pos.y, selectedInk, 40);
      lastMousePosRef.current = pos;
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 's') {
        e.preventDefault();
        if (engineRef.current) {
          engineRef.current.saveSnapshot();
          showNotification('✓ 已保存地形快照', 'success');
        }
      } else if (key === 'l') {
        e.preventDefault();
        if (engineRef.current) {
          const loaded = engineRef.current.loadSnapshot();
          if (loaded) {
            showNotification('✓ 已加载最近的快照', 'success');
          } else {
            showNotification('⚠ 没有可加载的快照', 'warning');
          }
        }
      } else if (key === 'r') {
        e.preventDefault();
        setShowResetDialog(true);
      } else if (key === '1') {
        setSelectedInk('lava');
      } else if (key === '2') {
        setSelectedInk('water');
      } else if (key === '3') {
        setSelectedInk('plant');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showNotification]);

  const handleConfirmReset = () => {
    if (engineRef.current) {
      engineRef.current.reset();
    }
    if (particlesRef.current) {
      particlesRef.current.clear();
    }
    setShowResetDialog(false);
    showNotification('✓ 画布已重置', 'success');
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        background: '#0a0a1a',
        overflow: 'hidden',
        minWidth: 800
      }}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          cursor: 'crosshair'
        }}
      />

      <ToolBar
        selectedInk={selectedInk}
        onSelectInk={setSelectedInk}
        autoEcoMode={autoEcoMode}
        onToggleAutoEco={() => {
          setAutoEcoMode(!autoEcoMode);
          showNotification(
            !autoEcoMode ? '✓ 生态演化模式已开启' : '生态演化模式已关闭',
            !autoEcoMode ? 'success' : 'info'
          );
        }}
      />

      <StatsPanel stats={stats} />

      <div
        style={{
          position: 'absolute',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          color: '#4a4a6a',
          fontSize: 11,
          pointerEvents: 'none',
          zIndex: 5,
          letterSpacing: 0.5
        }}
      >
        点击 / 拖拽鼠标释放墨迹 · 按 1/2/3 切换属性 · S保存 L加载 R重置
      </div>

      {showResetDialog && (
        <ResetDialog
          onConfirm={handleConfirmReset}
          onCancel={() => setShowResetDialog(false)}
        />
      )}

      {notification && (
        <Notification message={notification.message} type={notification.type} />
      )}
    </div>
  );
};

export default App;
