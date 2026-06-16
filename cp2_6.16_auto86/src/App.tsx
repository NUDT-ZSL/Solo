import { useCallback } from 'react';
import { GameCanvas } from './GameCanvas';
import { PauseMenu } from './PauseMenu';
import { useGameState } from './useGameState';
import { usePhysics } from './usePhysics';
import { GAME_WIDTH, GAME_HEIGHT } from './constants';

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill={filled ? '#e74c3c' : '#555555'}
      style={{ marginRight: '4px' }}
    >
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}

function App() {
  const {
    gameState,
    playerStartPos,
    startGame,
    pauseGame,
    resumeGame,
    resetGame,
    hitSpike,
    addScore,
    nextLevel,
    defeatBoss,
    updateBubbles,
    updateBoss,
    updateSpikes,
    damageBoss,
  } = useGameState();

  const { player, updatePhysics, handleBubbleClick, resetPlayer } = usePhysics(
    playerStartPos.x,
    playerStartPos.y
  );

  const handleStartGame = useCallback(() => {
    startGame();
    resetPlayer(playerStartPos.x, playerStartPos.y);
  }, [startGame, resetPlayer, playerStartPos]);

  const handleResetGame = useCallback(() => {
    resetGame();
    resetPlayer(playerStartPos.x, playerStartPos.y);
  }, [resetGame, resetPlayer, playerStartPos]);

  const onBubbleClick = useCallback(
    (bubbleId: string): boolean => {
      return handleBubbleClick(bubbleId, gameState, hitSpike);
    },
    [handleBubbleClick, gameState, hitSpike]
  );

  return (
    <div
      style={{
        width: '100%',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0a0a23',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: GAME_WIDTH,
          height: GAME_HEIGHT,
        }}
      >
        <GameCanvas
          gameState={gameState}
          player={player}
          onBubbleClick={onBubbleClick}
          onUpdatePhysics={updatePhysics}
          onUpdateBubbles={updateBubbles}
          onUpdateBoss={updateBoss}
          onUpdateSpikes={updateSpikes}
          onAddScore={addScore}
          onHitSpike={hitSpike}
          onNextLevel={nextLevel}
          onDamageBoss={damageBoss}
          onDefeatBoss={defeatBoss}
        />

        {gameState.phase !== 'menu' && (
          <>
            <div
              style={{
                position: 'absolute',
                top: '20px',
                left: '20px',
                color: '#ffffff',
                fontFamily: 'sans-serif',
                zIndex: 10,
              }}
            >
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  marginBottom: '8px',
                  textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                }}
              >
                第 {gameState.level} 层
              </div>
              <div
                style={{
                  fontSize: '16px',
                  marginBottom: '8px',
                  textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                }}
              >
                得分: {Math.floor(gameState.score)}
                {gameState.scoreMultiplier > 1 && (
                  <span style={{ color: '#f1c40f', marginLeft: '8px' }}>
                    x{gameState.scoreMultiplier}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {Array.from({ length: gameState.maxLives }).map((_, i) => (
                  <HeartIcon key={i} filled={i < gameState.lives} />
                ))}
              </div>
            </div>

            <button
              onClick={pauseGame}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: 'rgba(0, 0, 0, 0.25)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.3s ease',
                zIndex: 10,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.25)';
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="#ffffff"
              >
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            </button>
          </>
        )}

        {gameState.phase === 'menu' && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 50,
            }}
          >
            <h1
              style={{
                color: '#ffffff',
                fontSize: '48px',
                fontWeight: 'bold',
                marginBottom: '20px',
                textShadow: '0 0 30px rgba(192, 132, 252, 0.8)',
                background: 'linear-gradient(135deg, #c084fc, #48dbfb)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              梦境泡泡塔
            </h1>
            <p
              style={{
                color: '#bdc3c7',
                fontSize: '16px',
                marginBottom: '40px',
                textAlign: 'center',
                maxWidth: '400px',
                lineHeight: '1.6',
              }}
            >
              点击泡泡向上攀爬，利用不同泡泡的特性到达更高层！
              <br />
              弹性泡泡弹起你，粘性泡泡吸附你，易碎泡泡会破碎，小心尖刺泡泡！
            </p>
            <button
              onClick={handleStartGame}
              style={{
                width: '160px',
                height: '52px',
                borderRadius: '26px',
                background: 'linear-gradient(135deg, #c084fc, #a855f7)',
                color: '#ffffff',
                fontSize: '18px',
                fontWeight: 'bold',
                border: 'none',
                cursor: 'pointer',
                transition: 'filter 0.3s ease',
                boxShadow: '0 4px 20px rgba(168, 85, 247, 0.5)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.filter = 'brightness(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.filter = 'brightness(1)';
              }}
            >
              开始游戏
            </button>
          </div>
        )}

        {gameState.phase === 'paused' && <PauseMenu onResume={resumeGame} />}

        {gameState.phase === 'gameover' && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
              zIndex: 100,
            }}
          >
            <h2
              style={{
                color: '#e74c3c',
                fontSize: '36px',
                fontWeight: 'bold',
                marginBottom: '20px',
                textShadow: '0 0 20px rgba(231, 76, 60, 0.5)',
              }}
            >
              游戏结束
            </h2>
            <p
              style={{
                color: '#ffffff',
                fontSize: '20px',
                marginBottom: '10px',
              }}
            >
              最终层数: {gameState.level}
            </p>
            <p
              style={{
                color: '#f1c40f',
                fontSize: '24px',
                fontWeight: 'bold',
                marginBottom: '40px',
              }}
            >
              最终得分: {Math.floor(gameState.score)}
            </p>
            <button
              onClick={handleResetGame}
              style={{
                width: '160px',
                height: '52px',
                borderRadius: '26px',
                background: 'linear-gradient(135deg, #c084fc, #a855f7)',
                color: '#ffffff',
                fontSize: '18px',
                fontWeight: 'bold',
                border: 'none',
                cursor: 'pointer',
                transition: 'filter 0.3s ease',
                boxShadow: '0 4px 15px rgba(168, 85, 247, 0.4)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.filter = 'brightness(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.filter = 'brightness(1)';
              }}
            >
              重新开始
            </button>
          </div>
        )}

        {gameState.phase === 'reward' && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: '#f1c40f',
              fontSize: '32px',
              fontWeight: 'bold',
              textShadow: '0 0 20px rgba(241, 196, 15, 0.8)',
              zIndex: 60,
              animation: 'pulse 0.5s ease-in-out infinite',
            }}
          >
            积分翻倍! x{gameState.scoreMultiplier}
          </div>
        )}

        {gameState.phase === 'boss' && gameState.boss && (
          <div
            style={{
              position: 'absolute',
              top: '80px',
              left: '50%',
              transform: 'translateX(-50%)',
              color: '#e74c3c',
              fontSize: '20px',
              fontWeight: 'bold',
              textShadow: '0 0 10px rgba(231, 76, 60, 0.8)',
              zIndex: 10,
            }}
          >
            ⚠️ BOSS战！利用弹力泡泡反弹尖刺击败Boss！
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.1); }
        }
      `}</style>
    </div>
  );
}

export default App;
