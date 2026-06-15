import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { GameEngine, GameSnapshot, GameSettings } from './GameEngine';
import type { PillarData } from './DrumManager';

interface UILayerProps {
  engine: GameEngine;
}

export function UILayer({ engine }: UILayerProps) {
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null);

  useEffect(() => {
    const unsub = engine.subscribe((s) => setSnapshot(s));
    return unsub;
  }, [engine]);

  if (!snapshot) return null;

  return (
    <div className="game-root">
      <ParticleCanvas engine={engine} />
      <div className="game-layer">
        {snapshot.phase === 'menu' && <MenuScreen engine={engine} />}
        {snapshot.phase === 'countdown' && <CountdownOverlay value={snapshot.countdownValue} level={snapshot.level} />}
        {(snapshot.phase === 'playing' || snapshot.phase === 'levelComplete') && (
          <>
            <TopBar score={snapshot.score} highScore={snapshot.highScore} combo={snapshot.combo} lastHitQuality={snapshot.lastHitQuality} />
            <PillarGrid pillars={snapshot.pillarStates.pillars} engine={engine} phase={snapshot.phase} />
            <ProgressBar progress={snapshot.progress} />
            <SettingsPanel settings={snapshot.settings} engine={engine} />
          </>
        )}
        {snapshot.phase === 'levelComplete' && <LevelCompleteOverlay score={snapshot.score} combo={snapshot.maxCombo} level={snapshot.level} />}
        {snapshot.phase === 'gameOver' && <GameOverOverlay score={snapshot.score} highScore={snapshot.highScore} maxCombo={snapshot.maxCombo} engine={engine} />}
      </div>
    </div>
  );
}

function MenuScreen({ engine }: { engine: GameEngine }) {
  return (
    <div className="menu-screen">
      <div className="menu-title">
        <h1>鼓韵图腾</h1>
        <p className="menu-subtitle">Drum Rhythm Totem</p>
      </div>
      <div className="menu-decoration">
        <div className="menu-totem" />
        <div className="menu-totem" />
        <div className="menu-totem" />
      </div>
      <button className="menu-start-btn" onClick={() => engine.startGame()}>
        <span className="btn-icon">🥁</span>
        开始演奏
      </button>
      <p className="menu-hint">点击发光的图腾石柱，跟随鼓点击打！</p>
    </div>
  );
}

function CountdownOverlay({ value, level }: { value: number; level: GameSnapshot['level'] }) {
  return (
    <div className="countdown-overlay">
      {level && <p className="countdown-level">{level.name}</p>}
      <div className="countdown-number" key={value}>
        {value > 0 ? value : '开始！'}
      </div>
    </div>
  );
}

function TopBar({
  score,
  highScore,
  combo,
  lastHitQuality,
}: {
  score: number;
  highScore: number;
  combo: number;
  lastHitQuality: GameSnapshot['lastHitQuality'];
}) {
  const comboScale = combo > 0 ? 1 + Math.min(combo * 0.03, 0.5) : 1;

  return (
    <div className="top-bar">
      <div className="score-panel">
        <div className="score-label">得分</div>
        <div className="score-value">{score.toLocaleString()}</div>
      </div>
      <div className="combo-panel" style={{ transform: `scale(${comboScale})` }}>
        <div className={`combo-count ${lastHitQuality || ''}`}>
          {combo}
        </div>
        <div className="combo-label">连击</div>
      </div>
      <div className="score-panel">
        <div className="score-label">最高分</div>
        <div className="score-value high">{highScore.toLocaleString()}</div>
      </div>
    </div>
  );
}

function PillarGrid({
  pillars,
  engine,
  phase,
}: {
  pillars: PillarData[];
  engine: GameEngine;
  phase: GameSnapshot['phase'];
}) {
  const cols = Math.ceil(Math.sqrt(pillars.length));
  const canClick = phase === 'playing';

  const handleClick = useCallback(
    (index: number) => {
      if (canClick) engine.handlePillarClick(index);
    },
    [engine, canClick]
  );

  return (
    <div className="pillar-area">
      <div className="pillar-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {pillars.map((p) => (
          <Pillar key={p.index} data={p} onClick={handleClick} />
        ))}
      </div>
    </div>
  );
}

function Pillar({ data, onClick }: { data: PillarData; onClick: (i: number) => void }) {
  const glowClass = data.state === 'idle' ? '' : `pillar-${data.state}`;
  const intensityStyle = {
    '--glow': data.glowIntensity,
    '--bounce-y': `${data.bounceY}px`,
    '--burst': data.glowBurstProgress,
  } as React.CSSProperties;

  return (
    <div
      className={`pillar ${glowClass}`}
      style={intensityStyle}
      onClick={() => onClick(data.index)}
    >
      <div className="pillar-body">
        <div className="pillar-cap" />
        <div className="pillar-shaft">
          <div className="pillar-glyph" />
          <div className="pillar-glyph" />
          <div className="pillar-glyph" />
        </div>
        <div className="pillar-base" />
      </div>
      {data.glowBurstProgress > 0 && (
        <div
          className="glow-burst"
          style={{ opacity: data.glowBurstProgress }}
        />
      )}
      {data.state === 'preview' && (
        <div className="preview-ring" />
      )}
    </div>
  );
}

function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="progress-bar-container">
      <div className="progress-bar" style={{ width: `${progress * 100}%` }} />
    </div>
  );
}

function SettingsPanel({
  settings,
  engine,
}: {
  settings: GameSettings;
  engine: GameEngine;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`settings-panel ${open ? 'open' : ''}`}>
      <button className="settings-toggle" onClick={() => setOpen((o) => !o)}>
        ⚙
      </button>
      {open && (
        <div className="settings-body">
          <h3>设置</h3>
          <SliderControl
            label="音乐音量"
            value={settings.musicVolume}
            min={0}
            max={1}
            step={0.05}
            onChange={(v) => engine.updateSettings({ musicVolume: v })}
          />
          <SliderControl
            label="特效音量"
            value={settings.sfxVolume}
            min={0}
            max={1}
            step={0.05}
            onChange={(v) => engine.updateSettings({ sfxVolume: v })}
          />
          <SliderControl
            label="延迟校准"
            value={settings.latencyOffset}
            min={-100}
            max={100}
            step={5}
            onChange={(v) => engine.updateSettings({ latencyOffset: v })}
            formatValue={(v) => `${v > 0 ? '+' : ''}${v}ms`}
          />
          <button className="settings-back" onClick={() => engine.backToMenu()}>
            返回菜单
          </button>
        </div>
      )}
    </div>
  );
}

function SliderControl({
  label,
  value,
  min,
  max,
  step,
  onChange,
  formatValue,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  formatValue?: (v: number) => string;
}) {
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div className="slider-control">
      <div className="slider-header">
        <span className="slider-label">{label}</span>
        <span className="slider-value">{formatValue ? formatValue(value) : Math.round(value * 100)}%</span>
      </div>
      <div className="slider-track">
        <div className="slider-fill" style={{ width: `${pct}%` }} />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="slider-input"
        />
      </div>
    </div>
  );
}

function LevelCompleteOverlay({
  score,
  combo,
  level,
}: {
  score: number;
  combo: number;
  level: GameSnapshot['level'];
}) {
  return (
    <div className="overlay level-complete-overlay">
      <h2>演奏完成！</h2>
      {level && <p className="overlay-level-name">{level.name}</p>}
      <div className="overlay-stats">
        <div>得分：{score.toLocaleString()}</div>
        <div>最大连击：{combo}</div>
      </div>
      <p className="overlay-hint">下一关即将开始...</p>
    </div>
  );
}

function GameOverOverlay({
  score,
  highScore,
  maxCombo,
  engine,
}: {
  score: number;
  highScore: number;
  maxCombo: number;
  engine: GameEngine;
}) {
  return (
    <div className="overlay game-over-overlay">
      <h2>鼓韵终章</h2>
      <div className="overlay-stats">
        <div>最终得分：{score.toLocaleString()}</div>
        <div>最高分：{highScore.toLocaleString()}</div>
        <div>最大连击：{maxCombo}</div>
      </div>
      <div className="overlay-buttons">
        <button className="menu-start-btn" onClick={() => engine.startGame()}>
          再次演奏
        </button>
        <button className="menu-start-btn secondary" onClick={() => engine.backToMenu()}>
          返回菜单
        </button>
      </div>
    </div>
  );
}

function ParticleCanvas({ engine }: { engine: GameEngine }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const draw = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      const particles = engine.getParticles();
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        const alpha = p.life / p.maxLife;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = p.size * 2;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animId);
  }, [engine]);

  return <canvas ref={canvasRef} className="particle-canvas" />;
}
