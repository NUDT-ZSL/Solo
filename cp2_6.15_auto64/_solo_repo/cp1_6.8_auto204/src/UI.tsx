import React, { useRef, useEffect, useState, useCallback } from 'react';
import { BrushEngine, BrushSettings, StrokePoint } from './BrushEngine';
import { Poem, getPoems, generatePoetryAnimation } from './PoetryManager';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  life: number;
  maxLife: number;
}

interface CanvasProps {
  brushEngine: BrushEngine | null;
  onCanvasReady: (engine: BrushEngine) => void;
}

function InkCanvas({ brushEngine, onCanvasReady }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<BrushEngine | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (engineRef.current) return;

    const engine = new BrushEngine();
    engine.attachCanvas(canvasRef.current);
    engineRef.current = engine;
    onCanvasReady(engine);

    const handleResize = () => engine.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      engine.destroy();
      engineRef.current = null;
    };
  }, [onCanvasReady]);

  const getCanvasPos = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!engineRef.current) return;
      e.preventDefault();
      const pos = getCanvasPos(e);
      engineRef.current.onPointerDown(pos.x, pos.y);
    },
    [getCanvasPos]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!engineRef.current) return;
      const pos = getCanvasPos(e);
      engineRef.current.onPointerMove(pos.x, pos.y);
    },
    [getCanvasPos]
  );

  const handlePointerUp = useCallback(() => {
    if (!engineRef.current) return;
    engineRef.current.onPointerUp();
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        touchAction: 'none',
        cursor: 'crosshair',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    />
  );
}

function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener('resize', resize);

    const w = () => window.innerWidth;
    const h = () => window.innerHeight;

    for (let i = 0; i < 40; i++) {
      particlesRef.current.push(createParticle(w(), h()));
    }

    const animate = () => {
      ctx.clearRect(0, 0, w(), h());
      const particles = particlesRef.current;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life++;

        if (p.life > p.maxLife || p.x < -10 || p.x > w() + 10 || p.y < -10 || p.y > h() + 10) {
          particles[i] = createParticle(w(), h());
          continue;
        }

        const lifeRatio = p.life / p.maxLife;
        const fadeIn = Math.min(1, p.life / 60);
        const fadeOut = Math.max(0, 1 - Math.pow(lifeRatio, 2));
        const alpha = p.opacity * fadeIn * fadeOut;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(60, 50, 40, ${alpha})`;
        ctx.fill();
      }
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
}

function createParticle(canvasW: number, canvasH: number): Particle {
  return {
    x: Math.random() * canvasW,
    y: Math.random() * canvasH,
    vx: (Math.random() - 0.5) * 0.3,
    vy: -Math.random() * 0.2 - 0.05,
    size: Math.random() * 2.5 + 0.5,
    opacity: Math.random() * 0.12 + 0.02,
    life: 0,
    maxLife: 600 + Math.random() * 800,
  };
}

interface ToolbarProps {
  settings: BrushSettings;
  onSettingsChange: (settings: BrushSettings) => void;
  onClear: () => void;
  visible: boolean;
}

function Toolbar({ settings, onSettingsChange, onClear, visible }: ToolbarProps) {
  const [collapsed, setCollapsed] = useState(false);

  const handleChange = (key: keyof BrushSettings, value: number) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 16,
        right: 16,
        zIndex: 100,
        transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateX(0)' : 'translateX(20px)',
      }}
    >
      <div
        style={{
          background: 'rgba(40, 36, 32, 0.82)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: 12,
          padding: collapsed ? '12px 16px' : '20px 24px',
          color: '#e8e0d4',
          fontFamily: "'Ma Shan Zheng', cursive",
          fontSize: 15,
          minWidth: collapsed ? 48 : 240,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            userSelect: 'none',
          }}
          onClick={() => setCollapsed(!collapsed)}
        >
          <span style={{ fontSize: 18, letterSpacing: 2 }}>笔韵</span>
          <span style={{ fontSize: 12, opacity: 0.6 }}>{collapsed ? '◀' : '▶'}</span>
        </div>

        {!collapsed && (
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <SliderRow
              label="笔宽"
              value={settings.baseWidth}
              min={4}
              max={40}
              onChange={(v) => handleChange('baseWidth', v)}
            />
            <SliderRow
              label="速度感应"
              value={settings.speedSensitivity}
              min={0}
              max={2}
              step={0.1}
              onChange={(v) => handleChange('speedSensitivity', v)}
            />
            <SliderRow
              label="墨色感应"
              value={settings.pressureSensitivity}
              min={0}
              max={1}
              step={0.05}
              onChange={(v) => handleChange('pressureSensitivity', v)}
            />
            <SliderRow
              label="晕染速度"
              value={settings.diffusionSpeed}
              min={0}
              max={1}
              step={0.05}
              onChange={(v) => handleChange('diffusionSpeed', v)}
            />
            <SliderRow
              label="消逝速度"
              value={settings.fadeSpeed}
              min={0.0005}
              max={0.01}
              step={0.0005}
              onChange={(v) => handleChange('fadeSpeed', v)}
            />

            <button
              onClick={onClear}
              style={{
                marginTop: 8,
                padding: '8px 0',
                background: 'rgba(180, 60, 40, 0.3)',
                border: '1px solid rgba(180, 60, 40, 0.4)',
                borderRadius: 6,
                color: '#e8d4cc',
                fontFamily: "'Ma Shan Zheng', cursive",
                fontSize: 16,
                cursor: 'pointer',
                transition: 'all 0.2s',
                letterSpacing: 4,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(180, 60, 40, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(180, 60, 40, 0.3)';
              }}
            >
              清空画布
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span>{label}</span>
        <span style={{ opacity: 0.6, fontSize: 13 }}>{value.toFixed(step < 1 ? 2 : 0)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{
          width: '100%',
          accentColor: '#a08060',
          height: 4,
        }}
      />
    </div>
  );
}

interface PoetrySelectorProps {
  poems: Poem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  visible: boolean;
}

function PoetrySelector({ poems, selectedId, onSelect, visible }: PoetrySelectorProps) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 16,
        left: 16,
        zIndex: 100,
        transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateX(0)' : 'translateX(-20px)',
      }}
    >
      <div
        style={{
          background: 'rgba(40, 36, 32, 0.82)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: 12,
          padding: '16px 20px',
          color: '#e8e0d4',
          fontFamily: "'Ma Shan Zheng', cursive",
          boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div style={{ fontSize: 18, letterSpacing: 2, marginBottom: 10 }}>诗韵</div>
        <select
          value={selectedId || ''}
          onChange={(e) => onSelect(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 6,
            color: '#e8e0d4',
            fontFamily: "'Ma Shan Zheng', cursive",
            fontSize: 15,
            cursor: 'pointer',
            outline: 'none',
            appearance: 'none',
          }}
        >
          <option value="" style={{ background: '#2a2520' }}>
            选择诗词...
          </option>
          {poems.map((p) => (
            <option key={p.id} value={p.id} style={{ background: '#2a2520' }}>
              {p.title} - {p.author}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

interface TitleOverlayProps {
  visible: boolean;
}

function TitleOverlay({ visible }: TitleOverlayProps) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        left: 0,
        right: 0,
        textAlign: 'center',
        zIndex: 50,
        pointerEvents: 'none',
        transition: 'opacity 1s cubic-bezier(0.4, 0, 0.2, 1)',
        opacity: visible ? 0.7 : 0,
      }}
    >
      <div
        style={{
          fontFamily: "'Ma Shan Zheng', cursive",
          fontSize: 28,
          color: '#3a342c',
          letterSpacing: 12,
          textShadow: '0 1px 2px rgba(0,0,0,0.1)',
        }}
      >
        墨韵流形
      </div>
      <div
        style={{
          fontFamily: "'Ma Shan Zheng', cursive",
          fontSize: 14,
          color: '#6a6054',
          marginTop: 4,
          letterSpacing: 4,
        }}
      >
        以指代笔 · 以屏为纸
      </div>
    </div>
  );
}

export { InkCanvas, ParticleBackground, Toolbar, PoetrySelector, TitleOverlay };
