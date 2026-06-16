import { useState, useEffect, useCallback } from 'react';
import LevelSelect from './ui/LevelSelect';
import GameHUD from './ui/GameHUD';
import { GameEngine } from './game/GameEngine';
import { useGameProgress } from './hooks/useGameProgress';
import type { HUDData } from './types';

type Scene = 'levelSelect' | 'playing' | 'transitioning';

function App() {
  const [currentScene, setCurrentScene] = useState<Scene>('levelSelect');
  const [currentLevelId, setCurrentLevelId] = useState<string | null>(null);
  const [hudData, setHudData] = useState<HUDData>({
    alertLevel: 'safe',
    stolenCount: 0,
    totalItems: 3,
    echoCooldown: 0,
    maxEchoCooldown: 3000,
    detectionProgress: 0,
    currentLevelName: ''
  });
  const [gameEngine, setGameEngine] = useState<GameEngine | null>(null);
  const [gameOverOverlay, setGameOverOverlay] = useState(false);
  const [victoryOverlay, setVictoryOverlay] = useState(false);
  const [showExitHint, setShowExitHint] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    progress,
    totalStolen,
    totalPossible,
    completedLevels,
    markItemStolen,
    markLevelComplete,
    getStolenItems,
    isLevelUnlocked,
    isLevelComplete,
    resetProgress
  } = useGameProgress();

  const handleSelectLevel = useCallback((levelId: string) => {
    if (!isLevelUnlocked(levelId)) return;
    setIsLoading(true);
    setTimeout(() => {
      setCurrentLevelId(levelId);
      setCurrentScene('playing');
      setShowExitHint(false);
      setGameOverOverlay(false);
      setVictoryOverlay(false);
      setIsLoading(false);
    }, 400);
  }, [isLevelUnlocked]);

  const handleHUDUpdate = useCallback((data: HUDData) => {
    setHudData(prev => {
      const changed =
        prev.alertLevel !== data.alertLevel ||
        prev.stolenCount !== data.stolenCount ||
        prev.echoCooldown !== data.echoCooldown ||
        prev.detectionProgress !== data.detectionProgress ||
        prev.currentLevelName !== data.currentLevelName;
      return changed ? data : prev;
    });
  }, []);

  const handleStolenItem = useCallback((levelId: string, itemId: string) => {
    markItemStolen(levelId, itemId);
  }, [markItemStolen]);

  const handleAllItemsStolen = useCallback(() => {
    setShowExitHint(true);
  }, []);

  const handleGameOver = useCallback(() => {
    setGameOverOverlay(true);
    setTimeout(() => {
      if (gameEngine) {
        gameEngine.destroy();
        setGameEngine(null);
      }
      setGameOverOverlay(false);
      setCurrentScene('levelSelect');
      setCurrentLevelId(null);
      setShowExitHint(false);
    }, 1800);
  }, [gameEngine]);

  const handleVictory = useCallback((levelId: string) => {
    markLevelComplete(levelId);
    setVictoryOverlay(true);
    setTimeout(() => {
      if (gameEngine) {
        gameEngine.destroy();
        setGameEngine(null);
      }
      setVictoryOverlay(false);
      setCurrentScene('levelSelect');
      setCurrentLevelId(null);
      setShowExitHint(false);
    }, 2500);
  }, [gameEngine, markLevelComplete]);

  const handleBackToMenu = useCallback(() => {
    if (gameEngine) {
      gameEngine.destroy();
      setGameEngine(null);
    }
    setCurrentScene('levelSelect');
    setCurrentLevelId(null);
    setShowExitHint(false);
  }, [gameEngine]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100vh',
        background: 'linear-gradient(180deg, #0f0f23 0%, #1a1a36 50%, #0f0f23 100%)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            radial-gradient(circle at 20% 30%, rgba(255, 221, 87, 0.04) 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, rgba(255, 221, 87, 0.03) 0%, transparent 50%)
          `,
          pointerEvents: 'none'
        }}
      />

      {currentScene === 'levelSelect' && (
        <LevelSelect
          progress={progress}
          totalStolen={totalStolen}
          totalPossible={totalPossible}
          completedLevels={completedLevels}
          onSelectLevel={handleSelectLevel}
          isLevelUnlocked={isLevelUnlocked}
          isLevelComplete={isLevelComplete}
          getStolenItems={getStolenItems}
          onResetProgress={resetProgress}
        />
      )}

      {currentScene === 'playing' && currentLevelId && !isLoading && (
        <GameScene
          levelId={currentLevelId}
          progress={progress}
          hudData={hudData}
          showExitHint={showExitHint}
          onHUDUpdate={handleHUDUpdate}
          onStolenItem={handleStolenItem}
          onAllItemsStolen={handleAllItemsStolen}
          onGameOver={handleGameOver}
          onVictory={handleVictory}
          onBackToMenu={handleBackToMenu}
          onEngineReady={setGameEngine}
        />
      )}

      {isLoading && <LoadingOverlay />}

      {gameOverOverlay && <GameOverOverlay />}

      {victoryOverlay && <VictoryOverlay levelName={hudData.currentLevelName} />}
    </div>
  );
}

function GameScene(props: {
  levelId: string;
  progress: any;
  hudData: HUDData;
  showExitHint: boolean;
  onHUDUpdate: (data: HUDData) => void;
  onStolenItem: (levelId: string, itemId: string) => void;
  onAllItemsStolen: () => void;
  onGameOver: () => void;
  onVictory: (levelId: string) => void;
  onBackToMenu: () => void;
  onEngineReady: (engine: GameEngine) => void;
}) {
  const canvasId = `game-canvas-${props.levelId}`;

  useEffect(() => {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) return;

    const engine = new GameEngine(canvas, {
      levelId: props.levelId,
      progress: props.progress,
      onHUDUpdate: props.onHUDUpdate,
      onStolenItem: props.onStolenItem,
      onAllItemsStolen: props.onAllItemsStolen,
      onGameOver: props.onGameOver,
      onVictory: props.onVictory
    });

    engine.init();
    props.onEngineReady(engine);

    return () => {
      engine.destroy();
    };
  }, [props.levelId]);

  return (
    <div
      style={{
        position: 'relative',
        width: 960,
        height: 640,
        animation: 'scaleIn 0.3s ease-out'
      }}
    >
      <canvas
        id={canvasId}
        width={960}
        height={640}
        style={{
          display: 'block',
          borderRadius: '10px',
          boxShadow: `
            0 0 40px rgba(255, 221, 87, 0.12),
            0 8px 32px rgba(0, 0, 0, 0.4)
          `
        }}
      />

      <GameHUD data={props.hudData} onBack={props.onBackToMenu} />

      <ControlHints />

      {props.showExitHint && <ExitHint />}

      <style>{`
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}

function ControlHints() {
  const hints = [
    { key: 'W A S D', text: '移动' },
    { key: '空格', text: '回声' },
    { key: 'E', text: '偷窃' },
    { key: 'ESC', text: '菜单' }
  ];

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '16px',
        padding: '10px 22px',
        background: 'rgba(15, 15, 35, 0.9)',
        borderRadius: '12px',
        border: '1px solid rgba(45, 45, 68, 0.8)',
        backdropFilter: 'blur(10px)'
      }}
    >
      {hints.map((h, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: `hintFadeIn 0.35s ease-out ${i * 0.12}s both`
          }}
        >
          <span
            style={{
              padding: '4px 10px',
              background: 'linear-gradient(180deg, #353552 0%, #252538 100%)',
              borderRadius: '6px',
              color: '#ffdd57',
              fontSize: '11px',
              fontWeight: 'bold',
              fontFamily: 'monospace',
              border: '1px solid #3f3f5c',
              minWidth: '30px',
              textAlign: 'center',
              letterSpacing: '1px'
            }}
          >
            {h.key}
          </span>
          <span style={{ color: '#a0a0b0', fontSize: '12px' }}>{h.text}</span>
        </div>
      ))}
      <style>{`
        @keyframes hintFadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

function ExitHint() {
  return (
    <div
      style={{
        position: 'absolute',
        top: 80,
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '12px 24px',
        background: 'rgba(34, 197, 94, 0.15)',
        border: '1.5px solid rgba(34, 197, 94, 0.6)',
        borderRadius: '10px',
        color: '#22c55e',
        fontSize: '14px',
        fontWeight: 'bold',
        textAlign: 'center',
        animation: 'exitPulse 1.4s ease-in-out infinite',
        zIndex: 50,
        pointerEvents: 'none',
        letterSpacing: '2px',
        boxShadow: '0 0 20px rgba(34, 197, 94, 0.2)'
      }}
    >
      ✓ 所有物品已窃取！前往绿色箭头出口
      <style>{`
        @keyframes exitPulse {
          0%, 100% {
            opacity: 0.85;
            transform: translateX(-50%) scale(1);
          }
          50% {
            opacity: 1;
            transform: translateX(-50%) scale(1.04);
          }
        }
      `}</style>
    </div>
  );
}

function LoadingOverlay() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 15, 35, 0.95)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
        gap: '20px'
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          border: '3px solid #2d2d44',
          borderTopColor: '#ffdd57',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }}
      />
      <div
        style={{
          color: '#ffdd57',
          fontSize: '16px',
          letterSpacing: '4px',
          textShadow: '0 0 12px rgba(255, 221, 87, 0.5)'
        }}
      >
        正在潜入中...
      </div>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function GameOverOverlay() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(239, 68, 68, 0.55)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        animation: 'redFadeIn 0.5s ease-out'
      }}
    >
      <div
        style={{
          textAlign: 'center',
          animation: 'shakeIn 0.6s ease-out'
        }}
      >
        <div
          style={{
            fontSize: '72px',
            fontWeight: 900,
            color: '#fff',
            letterSpacing: '12px',
            textShadow: `
              0 0 30px rgba(239, 68, 68, 0.8),
              0 4px 20px rgba(0, 0, 0, 0.5)
            `,
            marginBottom: '12px'
          }}
        >
          被发现了！
        </div>
        <div
          style={{
            fontSize: '16px',
            color: 'rgba(255, 255, 255, 0.9)',
            letterSpacing: '2px'
          }}
        >
          正在返回关卡选择...
        </div>
      </div>
      <style>{`
        @keyframes redFadeIn {
          from { background: rgba(239, 68, 68, 0); }
          to { background: rgba(239, 68, 68, 0.55); }
        }
        @keyframes shakeIn {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-6px); }
          20%, 40%, 60%, 80% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
}

function VictoryOverlay({ levelName }: { levelName: string }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(34, 197, 94, 0.35)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        animation: 'greenFadeIn 0.5s ease-out'
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            fontSize: '80px',
            marginBottom: '16px',
            animation: 'bounce 1s ease-in-out infinite'
          }}
        >
          🏆
        </div>
        <div
          style={{
            fontSize: '56px',
            fontWeight: 900,
            color: '#ffdd57',
            letterSpacing: '10px',
            textShadow: `
              0 0 30px rgba(255, 221, 87, 0.7),
              0 4px 20px rgba(0, 0, 0, 0.4)
            `,
            marginBottom: '12px'
          }}
        >
          潜入成功！
        </div>
        <div
          style={{
            fontSize: '18px',
            color: '#fff',
            letterSpacing: '3px',
            opacity: 0.95
          }}
        >
          {levelName || '关卡'} 已完成
        </div>
      </div>
      <style>{`
        @keyframes greenFadeIn {
          from { background: rgba(34, 197, 94, 0); }
          to { background: rgba(34, 197, 94, 0.35); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }
      `}</style>
    </div>
  );
}

export default App;
