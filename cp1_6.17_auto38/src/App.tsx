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
  const [heartAnimKey, setHeartAnimKey] = useState<{ [key: number]: string }>({});

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

  const triggerHeartDecreaseAnim = useCallback((heartIndex: number) => {
    setHeartAnimKey(prev => ({
      ...prev,
      [heartIndex]: `decrease-${Date.now()}-${Math.random()}`
    }));
  }, []);

  const triggerHeartIncreaseAnim = useCallback((heartIndex: number) => {
    setHeartAnimKey(prev => ({
      ...prev,
      [heartIndex]: `increase-${Date.now()}-${Math.random()}`
    }));
  }, []);

  const handleCorrect = useCallback(() => {
    setCorrectChars(prev => prev + 1);
  }, []);

  const handleWrong = useCallback(() => {
    setLives(prev => {
      const newLives = prev - 1;
      const affectedHeart = Math.ceil(prev) - 1;
      if (affectedHeart >= 0) {
        triggerHeartDecreaseAnim(affectedHeart);
      }
      if (isGameOver(newLives)) {
        setGameState('gameover');
        starfieldRef.current?.stop();
        meteorShowerRef.current?.stop();
      }
      return newLives;
    });
  }, [triggerHeartDecreaseAnim]);

  const handleComplete = useCallback(() => {
    if (gameState === 'playing') {
      goToNextLevel();
    }
  }, [gameState, goToNextLevel]);

  const handleMeteorDestroyed = useCallback(() => {
    setDestroyedMeteors(prev => prev + 1);
    setLives(prev => {
      const newLives = Math.min(INITIAL_LIVES + 5, prev + 0.5);
      if (newLives > prev) {
        const affectedHeart = Math.floor(newLives - 0.01);
        if (affectedHeart >= 0) {
          triggerHeartIncreaseAnim(affectedHeart);
        }
      }
      return newLives;
    });
  }, [triggerHeartIncreaseAnim]);

  const handleMeteorHit = useCallback(() => {
    typingPanelRef.current?.triggerShake();
    setLives(prev => {
      const newLives = prev - 1;
      const affectedHeart = Math.ceil(prev) - 1;
      if (affectedHeart >= 0) {
        triggerHeartDecreaseAnim(affectedHeart);
      }
      if (isGameOver(newLives)) {
        setGameState('gameover');
        starfieldRef.current?.stop();
        meteorShowerRef.current?.stop();
      }
      return newLives;
    });
  }, [triggerHeartDecreaseAnim]);

  const getPanelRect = useCallback(() => {
    return typingPanelRef.current?.getPanelRect() || null;
  }, []);

  useEffect(() => {
    return () => {
      starfieldRef.current?.stop();
      meteorShowerRef.current?.stop();
    };
  }, []);

  const renderHearts = (size: 'small' | 'large' = 'small') => {
    const hearts = [];
    const displayLives = Math.min(INITIAL_LIVES, Math.max(0, lives));
    const fontSize = size === 'large' ? '36px' : '22px';
    const gap = size === 'large' ? '10px' : '6px';
    const width = size === 'large' ? '44px' : '28px';
    const height = size === 'large' ? '44px' : '28px';

    for (let i = 0; i < INITIAL_LIVES; i++) {
      const heartValue = i + 1;
      let fillRatio = 0;
      if (displayLives >= heartValue) {
        fillRatio = 1;
      } else if (displayLives >= heartValue - 0.5) {
        fillRatio = 0.5;
      }

      let color: string;
      if (fillRatio === 1) {
        color = '#FF4757';
      } else if (fillRatio === 0.5) {
        color = '#FF8C94';
      } else if (displayLives <= 1) {
        color = '#2A2A2A';
      } else {
        color = '#3D3D3D';
      }

      const glowIntensityPx = displayLives <= 2 ? '30px' : '15px';
      const animKey = heartAnimKey[i];
      const animClass = animKey?.startsWith('decrease')
        ? 'heart-decrease'
        : animKey?.startsWith('increase')
        ? 'heart-increase'
        : '';

      hearts.push(
        <div
          key={`h-${i}-${size}`}
          className={animClass}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width,
            height,
            fontSize,
            lineHeight: 1,
            color,
            textShadow: fillRatio > 0
              ? `0 0 ${glowIntensityPx} ${color}, 0 0 ${glowIntensityPx} ${color}`
              : 'none',
            transition: 'color 0.4s ease, text-shadow 0.4s ease',
            position: 'relative',
            filter: fillRatio > 0 ? 'drop-shadow(0 0 4px rgba(255, 71, 87, 0.5))' : 'none'
          }}
        >
          <span style={{ position: 'absolute', zIndex: 1, color: fillRatio === 0.5 ? color : 'transparent' }}>♥</span>
          <span
            style={{
              position: 'absolute',
              zIndex: 2,
              overflow: 'hidden',
              width: `${fillRatio * 100}%`,
              whiteSpace: 'nowrap',
              display: 'inline-block'
            }}
          >
            ♥
          </span>
        </div>
      );
    }
    return (
      <div style={{ display: 'flex', gap, alignItems: 'center' }}>
        {hearts}
      </div>
    );
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
        @keyframes heartDecrease {
          0% { transform: scale(1); }
          30% { transform: scale(0.55); opacity: 0.7; }
          60% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
        @keyframes heartIncrease {
          0% { transform: scale(1); filter: brightness(1); }
          30% { transform: scale(1.5); filter: brightness(2); }
          60% { transform: scale(0.9); filter: brightness(1.5); }
          100% { transform: scale(1); filter: brightness(1); }
        }
        .heart-decrease {
          animation: heartDecrease 0.4s ease-out;
        }
        .heart-increase {
          animation: heartIncrease 0.5s ease-out;
        }
        @keyframes livesPanelPulse {
          0%, 100% { box-shadow: 0 0 15px rgba(255, 71, 87, 0.2); }
          50% { box-shadow: 0 0 30px rgba(255, 71, 87, 0.4); }
        }
        .lives-panel {
          animation: livesPanelPulse 3s ease-in-out infinite;
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
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2,
            gap: '20px'
          }}>
            <div
              className="lives-panel"
              style={{
                background: 'rgba(31, 40, 51, 0.75)',
                border: '1px solid rgba(255, 71, 87, 0.4)',
                borderRadius: '14px',
                padding: '14px 32px',
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
                backdropFilter: 'blur(6px)',
                transition: 'all 0.3s ease'
              }}
            >
              <span style={{
                color: '#FF6B6B',
                fontSize: '14px',
                letterSpacing: '2px',
                fontWeight: '600',
                textTransform: 'uppercase'
              }}>
                生命值
              </span>
              {renderHearts('large')}
              <span style={{
                color: lives <= 1 ? '#FF4757' : '#C5C6C7',
                fontSize: '18px',
                fontWeight: 'bold',
                minWidth: '50px',
                textAlign: 'right',
                transition: 'color 0.3s ease'
              }}>
                {lives.toFixed(1)}
              </span>
            </div>
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
