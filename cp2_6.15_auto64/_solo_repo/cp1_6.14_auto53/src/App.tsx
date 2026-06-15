import { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine, GameState } from './GameEngine';
import { AIDifficulty } from './SinglePlayerAI';
import { ShrinkSpeed } from './Arena';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const showSettingsRef = useRef(false);
  const showDifficultyRef = useRef(false);
  const [gameState, setGameState] = useState<GameState>({
    mode: 'menu',
    playMode: 'dual',
    winner: null,
    p1Hp: 100,
    p1MaxHp: 100,
    p1Shield: 0,
    p2Hp: 100,
    p2MaxHp: 100,
    p2Shield: 0,
    elapsed: 0,
    isRedFlash: false,
    redFlashTimer: 0,
  });
  const [showSettings, setShowSettings] = useState(false);
  const [showDifficulty, setShowDifficulty] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [sensitivity, setSensitivity] = useState(50);
  const [shrinkSpeed, setShrinkSpeed] = useState<ShrinkSpeed>('medium');

  const setShowSettingsSync = useCallback((v: boolean) => {
    showSettingsRef.current = v;
    setShowSettings(v);
  }, []);

  const setShowDifficultySync = useCallback((v: boolean) => {
    showDifficultyRef.current = v;
    setShowDifficulty(v);
  }, []);

  useEffect(() => {
    const engine = new GameEngine();
    engineRef.current = engine;

    if (canvasRef.current) {
      engine.init(canvasRef.current);
    }

    engine.onStateChange = (state) => {
      setGameState({ ...state });
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      engine.handleKeyDown(e);

      if (engine.getState().mode === 'menu') {
        if (e.code === 'KeyL') {
          engine.startDual();
          setShowDifficultySync(false);
          setShowSettingsSync(false);
        } else if (e.code === 'KeyS' && !showSettingsRef.current) {
          setShowDifficultySync(true);
        } else if (e.code === 'KeyO') {
          setShowSettingsSync(true);
        }
      }

      if (e.code === 'Escape') {
        if (showSettingsRef.current) {
          setShowSettingsSync(false);
        } else if (showDifficultyRef.current) {
          setShowDifficultySync(false);
        } else if (engine.getState().mode !== 'menu') {
          engine.stop();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      engine.handleKeyUp(e);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      engine.stop();
    };
  }, [setShowSettingsSync, setShowDifficultySync]);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setShrinkSpeed(shrinkSpeed);
    }
  }, [shrinkSpeed]);

  const startDual = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.startDual();
      setShowDifficultySync(false);
      setShowSettingsSync(false);
    }
  }, [setShowDifficultySync, setShowSettingsSync]);

  const startSingle = useCallback((difficulty: AIDifficulty) => {
    if (engineRef.current) {
      engineRef.current.startSingle(difficulty);
      setShowDifficultySync(false);
      setShowSettingsSync(false);
    }
  }, [setShowDifficultySync, setShowSettingsSync]);

  const restart = useCallback(() => {
    if (engineRef.current) {
      const engine = engineRef.current;
      if (gameState.playMode === 'dual') {
        engine.startDual();
      } else {
        engine.startSingle(engine.aiDifficulty);
      }
    }
  }, [gameState.playMode]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const hpColor = (hp: number, maxHp: number) => {
    const ratio = hp / maxHp;
    if (ratio > 0.5) return '#4ade80';
    if (ratio > 0.25) return '#fbbf24';
    return '#ef4444';
  };

  const shieldDots = (shield: number) => {
    const count = Math.ceil(shield / 10);
    return Array.from({ length: 4 }, (_, i) => i < count);
  };

  return (
    <div className="game-container">
      <canvas ref={canvasRef} />

      {gameState.mode === 'playing' && (
        <div className="hud">
          <div className="health-bar-container">
            <span style={{ fontSize: 12, color: '#8b5cf6', fontWeight: 700, minWidth: 20 }}>P1</span>
            <div className="health-bar">
              <div
                className="health-bar-fill p1"
                style={{
                  width: `${gameState.p1Hp}%`,
                  background: `linear-gradient(90deg, ${hpColor(gameState.p1Hp, gameState.p1MaxHp)}, #4ade80)`,
                }}
              />
            </div>
            {shieldDots(gameState.p1Shield).map((filled, i) => (
              <div key={i} className={`shield-dot ${filled ? '' : 'empty'}`} />
            ))}
          </div>

          <div className="timer">{formatTime(gameState.elapsed)}</div>

          <div className="health-bar-container">
            {shieldDots(gameState.p2Shield).map((filled, i) => (
              <div key={i} className={`shield-dot ${filled ? '' : 'empty'}`} />
            ))}
            <div className="health-bar">
              <div
                className="health-bar-fill p2"
                style={{
                  width: `${gameState.p2Hp}%`,
                  background: `linear-gradient(270deg, ${hpColor(gameState.p2Hp, gameState.p2MaxHp)}, #4ade80)`,
                }}
              />
            </div>
            <span style={{ fontSize: 12, color: '#3b82f6', fontWeight: 700, minWidth: 20 }}>
              {gameState.playMode === 'single' ? 'AI' : 'P2'}
            </span>
          </div>
        </div>
      )}

      {gameState.mode === 'menu' && !showSettings && !showDifficulty && (
        <div className="glass-panel main-menu">
          <h1>OrbitWars</h1>
          <div className="menu-buttons">
            <button className="menu-btn" onClick={startDual}>
              双人对战 <span className="shortcut">[L]</span>
            </button>
            <button className="menu-btn" onClick={() => setShowDifficultySync(true)}>
              单人模式 <span className="shortcut">[S]</span>
            </button>
            <button className="menu-btn" onClick={() => setShowSettingsSync(true)}>
              设置 <span className="shortcut">[O]</span>
            </button>
          </div>
        </div>
      )}

      {gameState.mode === 'menu' && showDifficulty && (
        <div className="glass-panel main-menu">
          <h1>OrbitWars</h1>
          <p style={{ color: '#a0a0b0', fontSize: 14, marginTop: -8 }}>选择AI难度</p>
          <div className="difficulty-select">
            <button className="difficulty-btn" onClick={() => startSingle('easy')}>简单</button>
            <button className="difficulty-btn" onClick={() => startSingle('medium')}>中等</button>
            <button className="difficulty-btn" onClick={() => startSingle('hard')}>困难</button>
          </div>
          <button className="menu-btn" style={{ marginTop: 12 }} onClick={() => setShowDifficulty(false)}>
            返回
          </button>
        </div>
      )}

      {gameState.mode === 'menu' && showSettings && (
        <div className="glass-panel settings-panel">
          <h2>设置</h2>
          <div className="setting-row">
            <label>音效</label>
            <div
              className={`toggle-switch ${soundOn ? 'active' : ''}`}
              onClick={() => setSoundOn(!soundOn)}
            />
          </div>
          <div className="setting-row">
            <label>摇杆灵敏度</label>
            <input
              type="range"
              min="10"
              max="100"
              value={sensitivity}
              onChange={(e) => setSensitivity(Number(e.target.value))}
            />
            <span style={{ fontSize: 12, color: '#6366f1', minWidth: 30, textAlign: 'right' }}>
              {sensitivity}%
            </span>
          </div>
          <div className="setting-row">
            <label>安全区收缩速度</label>
            <select
              value={shrinkSpeed}
              onChange={(e) => setShrinkSpeed(e.target.value as ShrinkSpeed)}
            >
              <option value="slow">慢</option>
              <option value="medium">中</option>
              <option value="fast">快</option>
            </select>
          </div>
          <button
            className="menu-btn"
            style={{ marginTop: 16, alignSelf: 'center' }}
            onClick={() => setShowSettings(false)}
          >
            返回
          </button>
        </div>
      )}

      {gameState.mode === 'gameover' && (
        <div className="victory-screen">
          <h2>胜利！</h2>
          <p className="winner-label">
            {gameState.winner === 1 ? '玩家 1' : gameState.playMode === 'single' ? 'AI' : '玩家 2'} 获胜
          </p>
          <button className="menu-btn" onClick={restart}>
            再来一局
          </button>
        </div>
      )}
    </div>
  );
}
