import { useState, useEffect, useCallback } from 'react';
import LevelSelect from './ui/LevelSelect';
import GameHUD from './ui/GameHUD';
import { GameEngine } from './game/GameEngine';
import type { HUDData, AlertLevel, LevelProgress } from './types';

function App() {
  const [currentScene, setCurrentScene] = useState<'menu' | 'levelSelect' | 'playing' | 'gameover' | 'victory'>('levelSelect');
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
  const [progress, setProgress] = useState<Record<string, LevelProgress>>(() => {
    try {
      const saved = localStorage.getItem('darkAlleyProgress');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      '1': { levelId: '1', stolenItems: [], completed: false, unlocked: true },
      '2': { levelId: '2', stolenItems: [], completed: false, unlocked: false },
      '3': { levelId: '3', stolenItems: [], completed: false, unlocked: false }
    };
  });
  const [gameEngine, setGameEngine] = useState<GameEngine | null>(null);
  const [redOverlay, setRedOverlay] = useState(0);
  const [showExit, setShowExit] = useState(false);

  useEffect(() => {
    localStorage.setItem('darkAlleyProgress', JSON.stringify(progress));
  }, [progress]);

  const handleSelectLevel = useCallback((levelId: string) => {
    setCurrentLevelId(levelId);
    setCurrentScene('playing');
  }, []);

  const handleHUDUpdate = useCallback((data: HUDData) => {
    setHudData(data);
  }, []);

  const handleStolenItem = useCallback((levelId: string, itemId: string) => {
    setProgress(prev => {
      const updated = { ...prev };
      if (!updated[levelId]) {
        updated[levelId] = { levelId, stolenItems: [], completed: false, unlocked: true };
      }
      if (!updated[levelId].stolenItems.includes(itemId)) {
        updated[levelId] = {
          ...updated[levelId],
          stolenItems: [...updated[levelId].stolenItems, itemId]
        };
      }
      return updated;
    });
  }, []);

  const handleAllItemsStolen = useCallback(() => {
    setShowExit(true);
  }, []);

  const handleGameOver = useCallback(() => {
    setRedOverlay(1);
    setTimeout(() => {
      setRedOverlay(0);
      setCurrentScene('levelSelect');
      setCurrentLevelId(null);
      setShowExit(false);
    }, 1500);
  }, []);

  const handleVictory = useCallback((levelId: string) => {
    setProgress(prev => {
      const updated = { ...prev };
      updated[levelId] = {
        ...updated[levelId],
        completed: true
      };
      const nextId = String(parseInt(levelId) + 1);
      if (updated[nextId]) {
        updated[nextId] = { ...updated[nextId], unlocked: true };
      }
      return updated;
    });
    setTimeout(() => {
      setCurrentScene('levelSelect');
      setCurrentLevelId(null);
      setShowExit(false);
    }, 2000);
  }, []);

  const handleBackToMenu = useCallback(() => {
    setCurrentScene('levelSelect');
    setCurrentLevelId(null);
    setShowExit(false);
    if (gameEngine) {
      gameEngine.destroy();
      setGameEngine(null);
    }
  }, [gameEngine]);

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100vh',
      background: '#0f0f23',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden'
    }}>
      {currentScene === 'levelSelect' && (
        <LevelSelect
          progress={progress}
          onSelectLevel={handleSelectLevel}
        />
      )}

      {currentScene === 'playing' && currentLevelId && (
        <div style={{ position: 'relative', width: 960, height: 640 }}>
          <canvas
            id="game-canvas"
            width={960}
            height={640}
            style={{
              display: 'block',
              borderRadius: '8px',
              boxShadow: '0 0 40px rgba(255, 221, 87, 0.15)'
            }}
          />
          <GameEngineWrapper
            levelId={currentLevelId}
            progress={progress}
            onHUDUpdate={handleHUDUpdate}
            onStolenItem={handleStolenItem}
            onAllItemsStolen={handleAllItemsStolen}
            onGameOver={handleGameOver}
            onVictory={handleVictory}
            onEngineReady={setGameEngine}
            showExit={showExit}
          />
          <GameHUD
            data={hudData}
            onBack={handleBackToMenu}
          />
          {currentScene === 'playing' && (
            <ControlHints />
          )}
        </div>
      )}

      {redOverlay > 0 && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: `rgba(239, 68, 68, ${redOverlay * 0.7})`,
          pointerEvents: 'none',
          zIndex: 9999,
          transition: 'background 0.5s ease-out',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <div style={{
            fontSize: '48px',
            fontWeight: 'bold',
            color: '#fff',
            textShadow: '0 0 20px rgba(0,0,0,0.8)',
            letterSpacing: '8px'
          }}>
            被发现了！
          </div>
        </div>
      )}

      {currentScene === 'playing' && showExit && (
        <VictoryHint />
      )}
    </div>
  );
}

function GameEngineWrapper(props: {
  levelId: string;
  progress: Record<string, LevelProgress>;
  onHUDUpdate: (data: HUDData) => void;
  onStolenItem: (levelId: string, itemId: string) => void;
  onAllItemsStolen: () => void;
  onGameOver: () => void;
  onVictory: (levelId: string) => void;
  onEngineReady: (engine: GameEngine) => void;
  showExit: boolean;
}) {
  useEffect(() => {
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
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

  return null;
}

function ControlHints() {
  const hints = [
    { key: 'W A S D', text: '移动' },
    { key: '空格', text: '回声' },
    { key: 'E', text: '偷窃' },
    { key: 'ESC', text: '菜单' }
  ];

  return (
    <div style={{
      position: 'absolute',
      bottom: 16,
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      gap: '16px',
      padding: '10px 20px',
      background: 'rgba(15, 15, 35, 0.85)',
      borderRadius: '12px',
      border: '1px solid #2d2d44',
      backdropFilter: 'blur(8px)'
    }}>
      {hints.map((h, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: `fadeIn 0.3s ease-out ${i * 0.15}s both`
          }}
        >
          <span style={{
            padding: '4px 10px',
            background: '#2d2d44',
            borderRadius: '6px',
            color: '#ffdd57',
            fontSize: '12px',
            fontWeight: 'bold',
            fontFamily: 'monospace',
            border: '1px solid #3f3f5c',
            minWidth: '28px',
            textAlign: 'center'
          }}>{h.key}</span>
          <span style={{ color: '#a0a0b0', fontSize: '13px' }}>{h.text}</span>
        </div>
      ))}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function VictoryHint() {
  return (
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -150px)',
      padding: '16px 32px',
      background: 'rgba(34, 197, 94, 0.2)',
      border: '2px solid #22c55e',
      borderRadius: '12px',
      color: '#22c55e',
      fontSize: '20px',
      fontWeight: 'bold',
      textAlign: 'center',
      animation: 'pulse 1.5s ease-in-out infinite',
      zIndex: 100,
      pointerEvents: 'none'
    }}>
      所有物品已窃取！前往绿色箭头出口！
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.8; transform: translate(-50%, -150px) scale(1); }
          50% { opacity: 1; transform: translate(-50%, -150px) scale(1.05); }
        }
      `}</style>
    </div>
  );
}

export default App;
