import { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from './GameEngine';
import { CanvasRender } from './CanvasRender';
import {
  CrystalColor,
  COLOR_HEX,
  type GameStats
} from './types';

const COLOR_NAMES: Record<CrystalColor, string> = {
  red: '赤晶',
  blue: '蓝晶',
  yellow: '黄晶'
};

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const rendererRef = useRef<CanvasRender | null>(null);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const selectedColorRef = useRef<CrystalColor>('red');

  const [selectedColor, setSelectedColor] = useState<CrystalColor>('red');
  const [stats, setStats] = useState<GameStats>({
    crystalCount: 0,
    spriteCount: 0,
    topSpriteEnergy: 0,
    topSpriteState: 'normal',
    topSpriteColor: null
  });
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    selectedColorRef.current = selectedColor;
  }, [selectedColor]);

  const handleResize = useCallback(() => {
    if (!containerRef.current || !canvasRef.current || !rendererRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    rendererRef.current.resize(rect.width, rect.height);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const engine = new GameEngine();
    const renderer = new CanvasRender(canvas, rect.width, rect.height);

    engineRef.current = engine;
    rendererRef.current = renderer;

    const loop = (time: number) => {
      const last = lastTimeRef.current || time;
      const dt = Math.min(50, time - last);
      lastTimeRef.current = time;

      engine.update(dt);
      const data = engine.getRenderData();
      renderer.render(data);

      setStats(prev => {
        if (
          prev.crystalCount !== data.stats.crystalCount ||
          prev.spriteCount !== data.stats.spriteCount ||
          prev.topSpriteEnergy !== data.stats.topSpriteEnergy ||
          prev.topSpriteState !== data.stats.topSpriteState ||
          prev.topSpriteColor !== data.stats.topSpriteColor
        ) {
          return data.stats;
        }
        return prev;
      });

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [handleResize]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const engine = engineRef.current;
    const renderer = rendererRef.current;
    if (!canvas || !engine || !renderer) return;

    const rect = canvas.getBoundingClientRect();
    const sx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const sy = (e.clientY - rect.top) * (canvas.height / rect.height);
    const pos = renderer.screenToGrid(sx, sy);
    if (pos) {
      engine.placeCrystal(pos.row, pos.col, selectedColorRef.current);
      forceUpdate(v => v + 1);
    }
  };

  const colorStateText = stats.topSpriteState === 'rage' ? '狂暴⚡' : '正常';
  const stateColor = stats.topSpriteState === 'rage' ? '#ff6688' : '#88ccff';

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: 'linear-gradient(180deg, #0a0a2e 0%, #1a1a4e 100%)',
        fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif'
      }}
    >
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          cursor: 'crosshair'
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: 24,
          left: 24,
          width: 260,
          padding: 18,
          background: 'rgba(20, 20, 50, 0.55)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          borderRadius: 14,
          border: '1px solid rgba(100, 140, 255, 0.25)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          color: '#e8ecff',
          fontSize: 13
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 14, letterSpacing: 1, color: '#fff' }}>
          💎 晶灵育成 · 共生网格
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
          <StatBox label="晶块总数" value={stats.crystalCount} color="#ffcc66" />
          <StatBox label="精灵数量" value={stats.spriteCount} color="#66ddff" />
        </div>

        <div
          style={{
            padding: 10,
            background: 'rgba(0,0,0,0.25)',
            borderRadius: 8,
            marginBottom: 14,
            border: '1px solid rgba(255,255,255,0.06)'
          }}
        >
          <div style={{ fontSize: 11, opacity: 0.65, marginBottom: 4 }}>首席精灵</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: 4,
                background: stats.topSpriteColor ? COLOR_HEX[stats.topSpriteColor] : 'rgba(255,255,255,0.1)',
                boxShadow: stats.topSpriteColor ? `0 0 8px ${COLOR_HEX[stats.topSpriteColor]}` : 'none'
              }}
            />
            <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{stats.topSpriteEnergy}</span>
            <span style={{ fontSize: 12, color: stateColor, marginLeft: 'auto', fontWeight: 600 }}>
              {colorStateText}
            </span>
          </div>
        </div>

        <div
          style={{
            padding: 12,
            background: 'rgba(0,0,0,0.25)',
            borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.06)'
          }}
        >
          <div style={{ fontSize: 11, opacity: 0.65, marginBottom: 10, textAlign: 'center', letterSpacing: 1 }}>
            · 共生图谱 ·
          </div>
          <SymbiosisChart />
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          top: 24,
          right: 24,
          padding: 18,
          background: 'rgba(20, 20, 50, 0.55)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          borderRadius: 14,
          border: '1px solid rgba(100, 140, 255, 0.25)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          color: '#e8ecff'
        }}
      >
        <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 10 }}>选择晶块颜色</div>
        <div style={{ display: 'flex', gap: 10 }}>
          {(['red', 'blue', 'yellow'] as CrystalColor[]).map(c => (
            <button
              key={c}
              onClick={() => setSelectedColor(c)}
              style={{
                width: 52,
                height: 52,
                borderRadius: 12,
                border: selectedColor === c
                  ? `2px solid #ffffff`
                  : `2px solid rgba(255,255,255,0.15)`,
                background: `linear-gradient(135deg, ${COLOR_HEX[c]}99 0%, ${COLOR_HEX[c]}55 100%)`,
                boxShadow: selectedColor === c
                  ? `0 0 20px ${COLOR_HEX[c]}, inset 0 0 12px rgba(255,255,255,0.3)`
                  : `inset 0 0 8px rgba(0,0,0,0.2)`,
                cursor: 'pointer',
                transform: selectedColor === c ? 'scale(1.08)' : 'scale(1)',
                transition: 'all 0.15s ease',
                color: '#fff',
                fontWeight: 700,
                fontSize: 11,
                letterSpacing: 0.5
              }}
            >
              {COLOR_NAMES[c]}
            </button>
          ))}
        </div>
        <div style={{ marginTop: 12, fontSize: 11, opacity: 0.55, textAlign: 'center', maxWidth: 180 }}>
          点击网格放置晶块
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '12px 28px',
          background: 'rgba(20, 20, 50, 0.55)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          borderRadius: 999,
          border: '1px solid rgba(100, 140, 255, 0.2)',
          color: '#aabbee',
          fontSize: 12,
          textAlign: 'center',
          letterSpacing: 0.3
        }}
      >
        🔴→🔵→🟡→🔴 敌对吞噬 · 同色/异色共鸣 · 能量满20孵化 · 能量满40狂暴
      </div>
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div
      style={{
        padding: '8px 10px',
        background: 'rgba(0,0,0,0.25)',
        borderRadius: 8,
        border: '1px solid rgba(255,255,255,0.06)'
      }}
    >
      <div style={{ fontSize: 10, opacity: 0.55, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
    </div>
  );
}

function SymbiosisChart() {
  const box = (label: string, color: string, cx: number, cy: number) => (
    <g key={label}>
      <circle
        cx={cx}
        cy={cy}
        r={18}
        fill={color}
        fillOpacity={0.75}
        stroke="#ffffff"
        strokeWidth={1.5}
        strokeOpacity={0.4}
      />
      <circle cx={cx} cy={cy} r={18} fill="none" stroke={color} strokeWidth={1} opacity={0.4}>
        <animate attributeName="r" from="18" to="28" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" from="0.4" to="0" dur="2s" repeatCount="indefinite" />
      </circle>
      <text
        x={cx}
        y={cy + 4}
        textAnchor="middle"
        fontSize={12}
        fontWeight={700}
        fill="#fff"
      >
        {label}
      </text>
    </g>
  );

  const arrow = (fromX: number, fromY: number, toX: number, toY: number, color: string) => {
    const dx = toX - fromX;
    const dy = toY - fromY;
    const angle = Math.atan2(dy, dx);
    const headLen = 6;
    return (
      <g key={`${fromX}-${fromY}-${toX}-${toY}`}>
        <defs>
          <marker id={`arrow-${color.replace('#', '')}`} markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
            <path d="M0,0 L0,6 L9,3 z" fill={color} />
          </marker>
        </defs>
        <path
          d={`M ${fromX + Math.cos(angle) * 20} ${fromY + Math.sin(angle) * 20} Q ${(fromX + toX) / 2 - Math.sin(angle) * 15} ${(fromY + toY) / 2 + Math.cos(angle) * 15} ${toX - Math.cos(angle) * 22} ${toY - Math.sin(angle) * 22}`}
          stroke={color}
          strokeWidth={2.5}
          strokeOpacity={0.85}
          fill="none"
          strokeLinecap="round"
          markerEnd={`url(#arrow-${color.replace('#', '')})`}
        />
      </g>
    );
  };

  return (
    <svg viewBox="0 0 230 170" width="100%" style={{ display: 'block' }}>
      {arrow(115, 35, 190, 115, COLOR_HEX.red)}
      {arrow(190, 115, 40, 115, COLOR_HEX.blue)}
      {arrow(40, 115, 115, 35, COLOR_HEX.yellow)}

      {box('红', COLOR_HEX.red, 115, 35)}
      {box('蓝', COLOR_HEX.blue, 190, 115)}
      {box('黄', COLOR_HEX.yellow, 40, 115)}
    </svg>
  );
}
