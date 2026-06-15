import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Board } from './game/Board';
import { GameEngine } from './game/GameEngine';
import { AIPlayer } from './game/AIPlayer';
import { GameState, CellClickHandler } from './game/types';

const App: React.FC = () => {
  const gameEngineRef = useRef<GameEngine>(new GameEngine(6));
  const aiPlayerRef = useRef<AIPlayer>(new AIPlayer(1500));
  const animationFrameRef = useRef<number>(0);
  
  const [gameState, setGameState] = useState<GameState>(() => 
    gameEngineRef.current.initializeGame()
  );
  const [isFading, setIsFading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (gameState.isGameOver && !showModal) {
      const timer = setTimeout(() => setShowModal(true), 300);
      return () => clearTimeout(timer);
    }
  }, [gameState.isGameOver, showModal]);

  const gameLoop = useCallback((timestamp: number) => {
    if (gameState.isGameOver) {
      return;
    }

    const aiPlayer = aiPlayerRef.current;
    
    if (aiPlayer.shouldMove(timestamp)) {
      const nextMove = aiPlayer.getNextMove(gameState);
      if (nextMove) {
        aiPlayer.updateLastMoveTime(timestamp);
        setGameState(prevState => 
          gameEngineRef.current.moveAI(prevState, nextMove)
        );
      }
    }

    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, [gameState]);

  useEffect(() => {
    if (!gameState.isGameOver) {
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameLoop, gameState.isGameOver]);

  const handleCellClick: CellClickHandler = useCallback((x: number, y: number) => {
    if (gameState.isGameOver) return;

    const cell = gameState.board[y][x];
    if (cell.type !== 'empty') return;
    if (x === gameState.aiPos.x && y === gameState.aiPos.y) return;
    if (x === gameState.playerPos.x && y === gameState.playerPos.y) return;

    setGameState(prevState => {
      const stateWithTrap = gameEngineRef.current.placeTrap(prevState, x, y);
      return gameEngineRef.current.addCellParticles(stateWithTrap, x, y);
    });
  }, [gameState]);

  const handleReset = useCallback(() => {
    setIsFading(true);
    
    setTimeout(() => {
      gameEngineRef.current = new GameEngine(6);
      aiPlayerRef.current = new AIPlayer(1500);
      setGameState(gameEngineRef.current.initializeGame());
      setShowModal(false);
      setIsFading(false);
    }, 500);
  }, []);

  return (
    <div className="app">
      <div className="status-bar">
        <div className="status-item">
          <span className="status-label">回合数</span>
          <span className="status-value">{gameState.turn}</span>
        </div>
        <div className="status-item">
          <span className="status-label">阻挡得分</span>
          <span className="status-value">{gameState.score} / 5</span>
        </div>
        <div className="status-item">
          <span className="status-label">AI剩余步数</span>
          <span className="status-value">{gameState.aiStepsRemaining}</span>
        </div>
      </div>

      <div className={`board-container ${isFading ? 'fading' : ''}`}>
        <Board 
          state={gameState} 
          onCellClick={handleCellClick}
          cellSize={typeof window !== 'undefined' && window.innerWidth < 768 ? 50 : 70}
        />
      </div>

      <div className="controls">
        <button className="reset-btn" onClick={handleReset}>
          重置游戏
        </button>
      </div>

      {showModal && gameState.isGameOver && (
        <div className="modal-overlay" onClick={handleReset}>
          <div 
            className={`modal ${gameState.winner === 'player' ? 'win' : 'lose'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="modal-title">
              {gameState.winner === 'player' ? '🎉 胜利！' : '💀 失败'}
            </h2>
            <p className="modal-message">
              {gameState.winner === 'player' 
                ? `恭喜！你成功阻挡了AI ${gameState.score} 次！` 
                : `AI到达了终点！总回合数：${gameState.turn}`}
            </p>
            <button className="modal-btn" onClick={handleReset}>
              再来一局
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
