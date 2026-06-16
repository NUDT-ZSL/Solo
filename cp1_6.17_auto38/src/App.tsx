import { useCallback, useEffect, useRef, useState } from 'react';
import Starfield, { StarfieldHandle } from './components/Starfield';
import TypingPanel, { TypingPanelHandle } from './components/TypingPanel';
import MeteorShower, { MeteorShowerHandle } from './components/MeteorShower';
import {
  generateLevelText,
  calculateScore,
  isGameOver,
  LevelResult
} from './logic/gameLogic';

type GameState = 'idle' | 'playing' | 'transitioning' | 'gameover';

const INITIAL_LIVES = 5;

function App() {
  const [gameState, setGameState] = useState<GameState>('idle');
  const [level, setLevel] = useState(1);
  const [levelData, setLevelData] = useState<LevelResult | null>(null);
  const [lives, setLives] = useState(INITIAL_LIVES);
  const [correctChars, setCorrectChars] = useState(0);
  const [destroyedMeteors, setDestroyedMeteors] = useState(0);
  const [completedLevels, setCompletedLevels] = useState(0);
  const [transitionLevelName, setTransitionLevelName] = useState('');

  const starfieldRef = useRef<StarfieldHandle>(null);
  const typingPanelRef = useRef<TypingPanelHandle>(null);
  const meteorShowerRef = useRef<MeteorShowerHandle>(null);

  const finalScore = calculateScore(correctChars, destroyedMeteors, completedLevels);

  const startGame = useCallback(() => {
    const firstLevel = generateLevelText(1);
    setLevel(1);
    setLevelData(firstLevel);
    setLives(INITIAL_LIVES);
    setCorrectChars(0);
    setDestroyedMeteors(0);
    setCompletedLevels(0);
    setGameState('playing');

    starfieldRef.current?.start();
    setTimeout(() => {
      typingPanelRef.current?.reset();
      meteorShowerRef.current?.reset();
      meteorShowerRef.current?.start();
    }, 50);
  }, []);

  const restartGame = useCallback(() => {
    starfieldRef.current?.stop();
    meteorShowerRef.current?.stop();
    setGameState('idle');
    setTimeout(() => startGame(), 100);
  }, [startGame]);

  const goToNextLevel = useCallback(() => {
    const nextLevel = level + 1;
    const nextLevelData = generateLevelText(nextLevel);
    setLevel(nextLevel);
    setLevelData(nextLevelData);
    setCompletedLevels(prev => prev + 1);
    setTransitionLevelName(nextLevelData.name);
    setGameState('transitioning');

    meteorShowerRef.current?.stop();
    meteorShowerRef.current?.reset();

    setTimeout(() => {
      setGameState('playing');
      typingPanelRef.current?.reset();
      meteorShowerRef.current?.start();
    }, 600);
  }, [level]);

  const handleCorrect = useCallback(() => {
    setCorrectChars(prev => prev + 1);
  }, []);

  const handleWrong = useCallback(() => {
    setLives(prev => {
      const newLives = prev - 1;
      if (isGameOver(newLives)) {
        setGameState('gameover');
        starfieldRef.current?.stop();
        meteorShowerRef.current?.stop();
      }
      return newLives;
    });
  }, []);

  const handleComplete = useCallback(() => {
    if (gameState === 'playing') {
      goToNextLevel();
    }
  }, [gameState, goToNextLevel]);

  const handleMeteorDestroyed = useCallback(() => {
    setDestroyedMeteors(prev => prev + 1);
    setLives(prev => Math.min(INITIAL_LIVES + 5, prev + 0.5));
  }, []);

  const handleMeteorHit = useCallback(() => {
    typingPanelRef.current?.triggerShake();
    setLives(prev => {
      const newLives = prev - 1;
      if (isGameOver(newLives)) {
        setGameState('gameover');
        starfieldRef.current?.stop();
        meteorShowerRef.current?.stop();
      }
      return newLives;
    });
  }, []);

  const getPanelRect = useCallback(() => {
    return typingPanelRef.current?.getPanelRect() || null;
  }, []);

  useEffect(() => {
    return () => {
      starfieldRef.current?.stop();
      meteorShowerRef.current?.stop();
    };
  }, []);

  const renderHearts = () => {
    const hearts = [];
    const fullHearts = Math.floor(lives);
    const hasHalf = lives % 1 >= 0.5;

    for (let i = 0; i < fullHearts; i++) {
      hearts.push(<span key={`h-${i}`} style={{ color: '#FF6B6B' }}>♥</span>);
    }
    if (hasHalf) {
      hearts.push(<span key="half" style={{ color: '#FF6B6B', opacity: 0.5 }}>♥</span>);
    }
    const emptyHearts = Math.max(0, INITIAL_LIVES - Math.ceil(lives));
    for (let i = 0; i < emptyHearts; i++) {
      hearts.push(<span key={`e-${i}`} style={{ color: '#333' }}>♥</span>);
    }
    return hearts;
  };

  return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body, #root {
          width: 100%;
          height: 100%;
          overflow: hidden;
          background: #000000;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        @keyframes rippleExpand {
          0% { transform: translate(-50%, -50%) scale(0); opacity: 0.9; }
          100% { transform: translate(-50%, -50%) scale(50); opacity: 0; }
        }
        @keyframes fadeInScale {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(1.1); }
        }
        @keyframes pulseGlow {
          0%, 100% { text-shadow: 0 0 10px #66FCF1, 0 0 20px #66FCF1; }
          50% { text-shadow: 0 0 20px #66FCF1, 0 0 40px #66FCF1, 0 0 60px #45A29E; }
        }
        .ripple {
          position: fixed;
          top: 50%;
          left: 50%;
          width: 200px;
          height: 200px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(102, 252, 241, 0.6) 0%, rgba(69, 162, 158, 0.3) 50%, transparent 70%);
          animation: rippleExpand 0.6s ease-out forwards;
          pointer-events: none;
          z-index: 100;
        }
        .transition-text {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
          pointer-events: none;
          z-index: 101;
        }
        .transition-title {
          font-size: 48px;
          font-weight: bold;
          color: #66FCF1;
          margin-bottom: 16px;
          animation: fadeInScale 0.6s ease-in-out forwards, pulseGlow 1s ease-in-out infinite;
          letter-spacing: 4px;
        }
        .transition-subtitle {
          font-size: 24px;
          color: #C5C6C7;
          animation: fadeInScale 0.6s ease-in-out 0.1s forwards;
          opacity: 0;
          letter-spacing: 2px;
        }
      `}</style>

      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden'
      }}>
        <Starfield ref={starfieldRef} />

        {gameState !== 'idle' && levelData && (
          <MeteorShower
            ref={meteorShowerRef}
            level={level}
            getPanelRect={getPanelRect}
            onMeteorDestroyed={handleMeteorDestroyed}
            onMeteorHit={handleMeteorHit}
            disabled={gameState !== 'playing'}
          />
        )}

        {gameState !== 'idle' && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            padding: '20px 32px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            zIndex: 5,
            color: '#C5C6C7',
            fontSize: '16px'
          }}>
            <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
              <div>
                <span style={{ color: '#45A29E', marginRight: '8px' }}>关卡</span>
                <span style={{ color: '#66FCF1', fontWeight: 'bold', fontSize: '20px' }}>
                  {level} · {levelData?.name || ''}
                </span>
              </div>
              <div>
                <span style={{ color: '#45A29E', marginRight: '8px' }}>得分</span>
                <span style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: '20px' }}>
                  {finalScore}
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '4px', fontSize: '22px' }}>
              {renderHearts()}
            </div>
          </div>
        )}

        {(gameState === 'playing' || gameState === 'transitioning') && levelData && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2
          }}>
            <TypingPanel
              ref={typingPanelRef}
              text={levelData.text}
              onCorrect={handleCorrect}
              onWrong={handleWrong}
              onComplete={handleComplete}
              disabled={gameState !== 'playing'}
            />
          </div>
        )}

        {gameState === 'transitioning' && (
          <>
            <div className="ripple" />
            <div className="transition-text">
              <div className="transition-title">跃迁完成</div>
              <div className="transition-subtitle">进入：{transitionLevelName}</div>
            </div>
          </>
        )}

        {gameState === 'idle' && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            textAlign: 'center',
            padding: '20px'
          }}>
            <h1 style={{
              fontSize: '64px',
              color: '#66FCF1',
              marginBottom: '16px',
              letterSpacing: '8px',
              textShadow: '0 0 20px #66FCF1, 0 0 40px #45A29E',
              animation: 'pulseGlow 3s ease-in-out infinite'
            }}>
              迷航打字机
            </h1>
            <p style={{
              fontSize: '18px',
              color: '#C5C6C7',
              marginBottom: '48px',
              maxWidth: '500px',
              lineHeight: 1.8
            }}>
              打字推进飞船，击碎来袭陨石，穿越未知星域。<br />
              每个字符都将带你更远一步。
            </p>
            <button
              onClick={startGame}
              style={{
                padding: '16px 48px',
                fontSize: '20px',
                background: 'transparent',
                border: '2px solid #45A29E',
                color: '#66FCF1',
                borderRadius: '8px',
                cursor: 'pointer',
                letterSpacing: '4px',
                transition: 'all 0.3s ease',
                fontFamily: 'inherit',
                backdropFilter: 'blur(4px)'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(69, 162, 158, 0.3)';
                e.currentTarget.style.boxShadow = '0 0 30px rgba(69, 162, 158, 0.5)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              开始航行
            </button>
            <div style={{
              marginTop: '60px',
              color: '#45A29E',
              fontSize: '14px',
              lineHeight: 2
            }}>
              <p>💡 正确输入文字推进飞船</p>
              <p>⚠️ 敲击对应字母击碎陨石</p>
              <p>❤️ 拼错或被撞击损失生命值</p>
            </div>
          </div>
        )}

        {gameState === 'gameover' && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            textAlign: 'center',
            padding: '20px',
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(8px)'
          }}>
            <h1 style={{
              fontSize: '56px',
              color: '#FF6B6B',
              marginBottom: '12px',
              letterSpacing: '6px',
              textShadow: '0 0 20px rgba(255, 107, 107, 0.6)'
            }}>
              飞船失事
            </h1>
            <p style={{
              fontSize: '18px',
              color: '#C5C6C7',
              marginBottom: '48px'
            }}>
              你的航程在这里结束了...
            </p>
            <div style={{
              display: 'flex',
              gap: '64px',
              marginBottom: '48px'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#45A29E', fontSize: '16px', marginBottom: '8px' }}>最终得分</div>
                <div style={{ color: '#66FCF1', fontSize: '48px', fontWeight: 'bold' }}>{finalScore}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#45A29E', fontSize: '16px', marginBottom: '8px' }}>完成关卡</div>
                <div style={{ color: '#FFFFFF', fontSize: '48px', fontWeight: 'bold' }}>{completedLevels}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#45A29E', fontSize: '16px', marginBottom: '8px' }}>击碎陨石</div>
                <div style={{ color: '#FFFFFF', fontSize: '48px', fontWeight: 'bold' }}>{destroyedMeteors}</div>
              </div>
            </div>
            <button
              onClick={restartGame}
              style={{
                padding: '16px 48px',
                fontSize: '20px',
                background: 'transparent',
                border: '2px solid #45A29E',
                color: '#66FCF1',
                borderRadius: '8px',
                cursor: 'pointer',
                letterSpacing: '4px',
                transition: 'all 0.3s ease',
                fontFamily: 'inherit'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(69, 162, 158, 0.3)';
                e.currentTarget.style.boxShadow = '0 0 30px rgba(69, 162, 158, 0.5)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              重新启航
            </button>
          </div>
        )}
      </div>
    </>
  );
}

export default App;
