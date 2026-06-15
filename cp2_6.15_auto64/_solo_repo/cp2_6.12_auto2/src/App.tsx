import React, { useState, useCallback } from 'react';
import { GameBoard } from './modules/GameBoard/GameBoard';
import { LEVELS } from './modules/ColorEngine/ColorEngine';

interface GameResult {
  level: number;
  matchPercentage: number;
  elapsedTime: number;
  isSuccess: boolean;
  isPerfect: boolean;
}

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'home' | 'game'>('home');
  const [selectedLevel, setSelectedLevel] = useState(0);
  const [gameHistory, setGameHistory] = useState<Record<number, GameResult>>({});

  const handleLevelSelect = useCallback((levelIndex: number) => {
    setSelectedLevel(levelIndex);
    setCurrentView('game');
  }, []);

  const handleGameComplete = useCallback((result: GameResult) => {
    setGameHistory((prev) => ({
      ...prev,
      [result.level]: result,
    }));
  }, []);

  const handleBack = useCallback(() => {
    setCurrentView('home');
  }, []);

  return (
    <div className="app-container">
      {currentView === 'home' && (
        <div className="home-page">
          <div className="home-content">
            <h1 className="home-title">颜色迷宫</h1>
            <p className="home-subtitle">
              通过拖拽彩色方块填充网格，还原隐藏的渐变图案。
              挑战你的色彩感知能力！
            </p>

            <div className="level-cards">
              {LEVELS.map((level, index) => {
                const history = gameHistory[level.id];
                return (
                  <div
                    key={level.id}
                    className="level-card"
                    onClick={() => handleLevelSelect(index)}
                  >
                    <div className="level-card-number">{level.id}</div>
                    <div className="level-card-name">{level.name}</div>
                    <div className="level-card-desc">
                      {history
                        ? `最佳: ${history.matchPercentage}% / ${Math.floor(history.elapsedTime / 60)}:${(history.elapsedTime % 60).toString().padStart(2, '0')}`
                        : '未完成'}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              <p>🎮 操作说明：从右侧色板拖拽颜色到网格中</p>
              <p>💡 每关有3次提示机会，可显示最不匹配的5个格子</p>
              <p>🎯 达到80%匹配度即可通关，100%解锁成就</p>
            </div>
          </div>
        </div>
      )}

      {currentView === 'game' && (
        <GameBoard
          key={selectedLevel}
          onComplete={handleGameComplete}
          onBack={handleBack}
        />
      )}
    </div>
  );
};

export default App;
