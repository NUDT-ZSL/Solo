import React, { useState, useCallback, useRef } from 'react';
import GameCanvas, { GameCallbacks } from './components/GameCanvas';
import HUD from './components/HUD';

type Screen = 'title' | 'playing' | 'levelComplete';

export default function App() {
  const [screen, setScreen] = useState<Screen>('title');
  const [level, setLevel] = useState(1);
  const [paused, setPaused] = useState(false);
  const [activated, setActivated] = useState(0);
  const [total, setTotal] = useState(0);
  const [gameKey, setGameKey] = useState(0);
  const [fadeClass, setFadeClass] = useState('fade-in');
  const completeTimerRef = useRef<number>(0);

  const transitionTo = useCallback((nextScreen: Screen, callback?: () => void) => {
    setFadeClass('fade-out');
    setTimeout(() => {
      callback?.();
      setFadeClass('fade-in');
    }, 300);
  }, []);

  const handleStart = useCallback(() => {
    transitionTo('playing', () => {
      setLevel(1);
      setPaused(false);
      setActivated(0);
      setTotal(0);
      setGameKey(k => k + 1);
      setScreen('playing');
    });
  }, [transitionTo]);

  const handleReset = useCallback(() => {
    setPaused(false);
    setActivated(0);
    setGameKey(k => k + 1);
  }, []);

  const handlePause = useCallback(() => setPaused(true), []);
  const handleResume = useCallback(() => setPaused(false), []);

  const handleLevelComplete = useCallback(() => {
    clearTimeout(completeTimerRef.current);
    transitionTo('levelComplete', () => {
      setScreen('levelComplete');
    });
    completeTimerRef.current = window.setTimeout(() => {
      transitionTo('playing', () => {
        setLevel(l => l + 1);
        setActivated(0);
        setTotal(0);
        setPaused(false);
        setGameKey(k => k + 1);
        setScreen('playing');
      });
    }, 1800);
  }, [transitionTo]);

  const callbacks: GameCallbacks = {
    onNodeActivated: (act, tot) => {
      setActivated(act);
      setTotal(tot);
    },
    onDeath: () => {},
    onLevelComplete: handleLevelComplete,
    onSwitchTriggered: () => {},
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      background: '#000',
      position: 'relative',
    }}>
      <style>{`
        .fade-in {
          animation: fadeIn 0.35s ease forwards;
        }
        .fade-out {
          animation: fadeOut 0.25s ease forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.97); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes fadeOut {
          from { opacity: 1; transform: scale(1); }
          to { opacity: 0; transform: scale(0.97); }
        }
        @keyframes titleGlow {
          0%, 100% { text-shadow: 0 0 30px rgba(100,180,255,0.5), 0 0 60px rgba(130,100,255,0.3); }
          50% { text-shadow: 0 0 40px rgba(100,255,200,0.6), 0 0 80px rgba(100,180,255,0.4); }
        }
        @keyframes subtitlePulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.9; }
        }
        @keyframes floatUp {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .title-glow {
          animation: titleGlow 3s ease-in-out infinite;
        }
        .subtitle-pulse {
          animation: subtitlePulse 2s ease-in-out infinite;
        }
        .float-up {
          animation: floatUp 0.6s ease forwards;
        }
      `}</style>

      {screen === 'title' && (
        <div className={fadeClass} style={{
          position: 'absolute',
          top: 0, left: 0, width: '100%', height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'radial-gradient(ellipse at center, #0a0a2e 0%, #050520 50%, #000008 100%)',
        }}>
          <div className="title-glow" style={{
            fontSize: 'clamp(32px, 7vw, 64px)',
            fontWeight: 800,
            color: '#c8d8ff',
            letterSpacing: 8,
            marginBottom: 16,
            fontFamily: "'Segoe UI', 'PingFang SC', sans-serif",
          }}>
            极光之线
          </div>
          <div className="subtitle-pulse" style={{
            fontSize: 'clamp(13px, 2.5vw, 16px)',
            color: 'rgba(160, 180, 255, 0.7)',
            letterSpacing: 3,
            marginBottom: 60,
          }}>
            AURORA LINE
          </div>
          <button
            onClick={handleStart}
            style={{
              background: 'rgba(60, 40, 140, 0.35)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(130, 100, 255, 0.35)',
              borderRadius: 16,
              padding: '14px 56px',
              color: '#d0d8ff',
              fontSize: 18,
              fontWeight: 600,
              cursor: 'pointer',
              letterSpacing: 3,
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(80, 50, 180, 0.5)';
              e.currentTarget.style.transform = 'scale(1.06)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(60, 40, 140, 0.35)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            开始游戏
          </button>
        </div>
      )}

      {screen === 'playing' && (
        <div className={fadeClass} style={{ width: '100%', height: '100%' }}>
          <GameCanvas
            level={level}
            paused={paused}
            gameKey={gameKey}
            callbacks={callbacks}
          />
          <HUD
            level={level}
            activated={activated}
            total={total}
            paused={paused}
            onPause={handlePause}
            onResume={handleResume}
            onReset={handleReset}
          />
        </div>
      )}

      {screen === 'levelComplete' && (
        <div className={fadeClass} style={{
          position: 'absolute',
          top: 0, left: 0, width: '100%', height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'radial-gradient(ellipse at center, rgba(20,60,40,0.85) 0%, rgba(5,5,30,0.95) 70%)',
        }}>
          <div className="float-up" style={{
            fontSize: 'clamp(24px, 5vw, 40px)',
            fontWeight: 700,
            color: '#7fffb0',
            letterSpacing: 4,
            textShadow: '0 0 30px rgba(100,255,180,0.5)',
            marginBottom: 16,
          }}>
            ✓ 关卡完成
          </div>
          <div className="float-up" style={{
            fontSize: 'clamp(16px, 3vw, 22px)',
            color: 'rgba(160, 220, 200, 0.7)',
            letterSpacing: 2,
          }}>
            进入第 {level + 1} 关...
          </div>
        </div>
      )}
    </div>
  );
}
