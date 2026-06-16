import { useEffect, useRef, useState, useCallback } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { getConfig, saveScore, type GameConfig } from './services/api';
import { GameEngine } from './engine/GameEngine';

const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 600;

interface Stats {
  count: number;
  avgEnergy: number;
  attractorsLeft: number;
  repellentsLeft: number;
  histogram: number[];
}

export default function App() {
  const [config, setConfig] = useState<GameConfig | null>(null);
  const [stats, setStats] = useState<Stats>({
    count: 0,
    avgEnergy: 0,
    attractorsLeft: 5,
    repellentsLeft: 5,
    histogram: new Array(10).fill(0),
  });
  const [showHelp, setShowHelp] = useState(false);
  const engineRef = useRef<GameEngine | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    let mounted = true;
    getConfig().then((c) => {
      if (mounted) setConfig(c);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!engineRef.current) return;
    const interval = setInterval(() => {
      if (engineRef.current) {
        setStats(engineRef.current.getStats());
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [config]);

  const handleEngineReady = useCallback((engine: GameEngine) => {
    engineRef.current = engine;
    startTimeRef.current = Date.now();
    setStats(engine.getStats());
  }, []);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (engineRef.current) {
        const duration = (Date.now() - startTimeRef.current) / 1000;
        const curStats = engineRef.current.getStats();
        saveScore({
          playerName: 'Player',
          maxMicrobeCount: engineRef.current.maxMicrobeCount,
          avgEnergy: curStats.avgEnergy,
          duration,
          timestamp: Date.now(),
        });
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const getBarColor = (index: number) => {
    const t = index / 9;
    const r = Math.round(255 * (1 - t) + 72 * t);
    const g = Math.round(107 * (1 - t) + 219 * t);
    const b = Math.round(107 * (1 - t) + 251 * t);
    return `rgb(${r}, ${g}, ${b})`;
  };

  const maxHistVal = Math.max(1, ...stats.histogram);

  if (!config) {
    return (
      <div className="app-container" style={{ justifyContent: 'center' }}>
        <div style={{ color: '#8b949e', fontFamily: 'monospace' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="header">
        <h1 className="header-title">MICROBIAL CHEMOTAXIS SIMULATOR</h1>
        <div className="header-divider" />
        <button
          className="help-button"
          onClick={() => setShowHelp(true)}
          title="Help"
        >
          ?
        </button>
      </div>

      <div className="game-wrapper">
        <div className="game-canvas-container">
          <GameCanvas
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            config={config}
            onEngineReady={handleEngineReady}
          />
        </div>

        <div className="stats-panel">
          <div className="stats-title">Real-time Stats</div>
          <div className="stats-item">
            <span>Microbes:</span>
            <span className="stats-value">{stats.count}</span>
          </div>
          <div className="stats-item">
            <span>Avg Energy:</span>
            <span className={stats.avgEnergy < 30 ? 'stats-value danger' : 'stats-value'}>
              {stats.avgEnergy.toFixed(1)}
            </span>
          </div>
          <div className="stats-item">
            <span>Attractors:</span>
            <span className="stats-value">{stats.attractorsLeft}</span>
          </div>
          <div className="stats-item">
            <span>Repellents:</span>
            <span className="stats-value">{stats.repellentsLeft}</span>
          </div>

          <div className="stats-title" style={{ marginTop: 12 }}>Energy Distribution</div>
          <div className="histogram-container">
            {stats.histogram.map((val, i) => (
              <div
                key={i}
                className="histogram-bar"
                style={{
                  height: `${(val / maxHistVal) * 90 + 10}px`,
                  backgroundColor: getBarColor(i),
                }}
                title={`${i * 10}-${(i + 1) * 10}: ${val}`}
              />
            ))}
          </div>
        </div>
      </div>

      {showHelp && (
        <div className="help-modal-overlay" onClick={() => setShowHelp(false)}>
          <div className="help-modal" onClick={(e) => e.stopPropagation()}>
            <div className="help-modal-title">操作说明</div>
            <div className="help-modal-text">
              <div>• <strong>左键点击</strong>：投放引诱剂（绿色），微生物会朝浓度高的方向移动</div>
              <div>• <strong>右键点击</strong>：投放排斥剂（红色），微生物会远离浓度源</div>
              <div>• <strong>鼠标悬停微生物</strong>：查看其能量值</div>
              <div>• 引诱剂/排斥剂各最多同时存在5个</div>
              <div>• 每个化学场持续8秒，半径80px</div>
              <div>• 微生物进入高浓度区（&gt;70%）时速度提升1.5倍</div>
              <div>• 微生物碰撞时会弹开，若能量都低于20则会融合</div>
            </div>
            <button className="help-modal-close" onClick={() => setShowHelp(false)}>
              知道了
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
