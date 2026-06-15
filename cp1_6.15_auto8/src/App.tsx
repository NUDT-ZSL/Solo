import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { generateMaze } from './mazeGenerator';
import { GameEngine, GameStatus } from './gameEngine';
import { useGameControls, useMobileControls, useMobileMoveListener } from './hooks/useGameControls';

const MAZE_SIZE = 7;

const App: React.FC = () => {
  const [engine, setEngine] = useState<GameEngine | null>(null);
  const [gameStatus, setGameStatus] = useState<GameStatus | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isWin, setIsWin] = useState(false);
  const [fps, setFps] = useState(60);
  const [isMobile, setIsMobile] = useState(false);
  const initialRenderRef = useRef(true);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const initializeGame = useCallback(() => {
    const maze = generateMaze(MAZE_SIZE);
    const newEngine = new GameEngine(maze);
    setEngine(newEngine);
    setShowModal(false);
    setIsWin(false);
    initialRenderRef.current = true;
  }, []);

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  useEffect(() => {
    if (!engine) return;

    engine.setCallbacks(
      (status) => {
        setGameStatus({ ...status });
        
        if (status.state === 'won' || status.state === 'lost') {
          setTimeout(() => {
            setIsWin(status.state === 'won');
            setShowModal(true);
          }, 300);
        }
      },
      () => {}
    );

    if (initialRenderRef.current) {
      setGameStatus(engine.getStatus());
      initialRenderRef.current = false;
    }
  }, [engine]);

  const handleMove = useCallback((direction: 'north' | 'south' | 'east' | 'west') => {
    if (engine && engine.getGameState() === 'playing') {
      engine.movePlayer(direction);
    }
  }, [engine]);

  useGameControls({
    onMove: handleMove,
    enabled: engine?.getGameState() === 'playing'
  });

  useMobileMoveListener(
    handleMove,
    engine?.getGameState() === 'playing'
  );

  const { handleButtonDown } = useMobileControls();

  const handleRestart = useCallback(() => {
    if (engine) {
      const newMaze = generateMaze(MAZE_SIZE);
      engine.restart(newMaze);
      setShowModal(false);
      setIsWin(false);
    } else {
      initializeGame();
    }
  }, [engine, initializeGame]);

  const handleFPSUpdate = useCallback((newFps: number) => {
    setFps(newFps);
  }, []);

  const hudItems = useMemo(() => {
    if (!gameStatus) return [];
    return [
      { icon: '❤️', value: `${gameStatus.health}/${gameStatus.maxHealth}`, color: '#FF6B6B' },
      { icon: '🪙', value: `${gameStatus.coins}`, color: '#FFD700' },
      { icon: '🧭', value: `${gameStatus.exploredCount}/${gameStatus.totalRooms}`, color: '#4ECDC4' }
    ];
  }, [gameStatus]);

  return (
    <div className="game-container">
      {engine && (
        <GameCanvas engine={engine} onFPSUpdate={handleFPSUpdate} />
      )}

      <div className="hud">
        {hudItems.map((item, index) => (
          <div key={index} className="hud-item">
            <span className="hud-icon">{item.icon}</span>
            <span style={{ color: item.color, fontWeight: 'bold' }}>{item.value}</span>
          </div>
        ))}
      </div>

      <div className="fps-counter">
        FPS: {fps}
      </div>

      {isMobile && engine?.getGameState() === 'playing' && (
        <div className="mobile-controls">
          <button
            className="mobile-btn up"
            onTouchStart={(e) => { e.preventDefault(); handleButtonDown('north'); }}
            onClick={() => handleButtonDown('north')}
          >
            ↑
          </button>
          <button
            className="mobile-btn left"
            onTouchStart={(e) => { e.preventDefault(); handleButtonDown('west'); }}
            onClick={() => handleButtonDown('west')}
          >
            ←
          </button>
          <button
            className="mobile-btn right"
            onTouchStart={(e) => { e.preventDefault(); handleButtonDown('east'); }}
            onClick={() => handleButtonDown('east')}
          >
            →
          </button>
          <button
            className="mobile-btn down"
            onTouchStart={(e) => { e.preventDefault(); handleButtonDown('south'); }}
            onClick={() => handleButtonDown('south')}
          >
            ↓
          </button>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={handleRestart}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className={`modal-title ${isWin ? 'win' : 'lose'}`}>
              {isWin ? '🎉 恭喜通关！' : '💀 游戏结束'}
            </h2>
            <p className="modal-message">
              {isWin
                ? `你成功找到了出口！收集了 ${gameStatus?.coins || 0} 枚金币，探索了 ${gameStatus?.exploredCount || 0} 个房间。`
                : '你被怪物击败了...不要灰心，再来一局！'}
            </p>
            <button className="restart-btn" onClick={handleRestart}>
              再来一局
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
