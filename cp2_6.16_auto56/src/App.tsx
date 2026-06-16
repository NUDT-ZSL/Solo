import { useState, useEffect } from 'react';
import GameBoard from './components/GameBoard';
import { GameEngine } from './game/GameEngine';

interface LevelInfo {
  id: string;
  name: string;
  difficulty: 'easy' | 'medium' | 'hard';
  initialGold: number;
  waveCount: number;
}

type Screen = 'menu' | 'game';

export default function App() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [levels, setLevels] = useState<LevelInfo[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<LevelInfo | null>(null);
  const [unlockedLevels, setUnlockedLevels] = useState<Set<string>>(new Set(['level-1']));
  const [engine, setEngine] = useState<GameEngine | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/levels')
      .then((res) => res.json())
      .then((data) => {
        setLevels(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const startLevel = (level: LevelInfo) => {
    setSelectedLevel(level);
    const newEngine = new GameEngine(level.initialGold, level.waveCount);
    setEngine(newEngine);
    setScreen('game');
  };

  const handleLevelComplete = () => {
    if (selectedLevel) {
      const levelIndex = levels.findIndex((l) => l.id === selectedLevel.id);
      if (levelIndex < levels.length - 1) {
        const nextLevel = levels[levelIndex + 1];
        setUnlockedLevels((prev) => new Set([...prev, nextLevel.id]));
      }
    }
  };

  const backToMenu = () => {
    if (engine) {
      engine.stop();
    }
    setEngine(null);
    setSelectedLevel(null);
    setScreen('menu');
  };

  if (screen === 'menu') {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          color: '#ecf0f1',
        }}
      >
        <h1
          style={{
            fontSize: '48px',
            marginBottom: '12px',
            color: '#d4af37',
            textShadow: '0 0 20px rgba(212, 175, 55, 0.5)',
          }}
        >
          古埃及神话塔防
        </h1>
        <p style={{ fontSize: '18px', marginBottom: '40px', color: '#bdc3c7' }}>
          选择关卡开始游戏
        </p>
        {loading ? (
          <p style={{ color: '#95a5a6' }}>加载中...</p>
        ) : (
          <div
            style={{
              display: 'flex',
              gap: '24px',
              flexWrap: 'wrap',
              justifyContent: 'center',
              maxWidth: '900px',
            }}
          >
            {levels.map((level) => {
              const isUnlocked = unlockedLevels.has(level.id);
              const diffColors = {
                easy: '#27ae60',
                medium: '#f39c12',
                hard: '#e74c3c',
              };
              const diffText = {
                easy: '简单',
                medium: '中等',
                hard: '困难',
              };
              return (
                <div
                  key={level.id}
                  onClick={() => isUnlocked && startLevel(level)}
                  style={{
                    width: '220px',
                    padding: '24px',
                    borderRadius: '12px',
                    background: isUnlocked ? '#2d2d3e' : '#1a1a2e',
                    border: `2px solid ${isUnlocked ? diffColors[level.difficulty] : '#555'}`,
                    cursor: isUnlocked ? 'pointer' : 'not-allowed',
                    opacity: isUnlocked ? 1 : 0.5,
                    transition: 'transform 0.2s, box-shadow 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (isUnlocked) {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = `0 8px 24px ${diffColors[level.difficulty]}40`;
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <h3 style={{ fontSize: '22px', marginBottom: '8px', color: '#d4af37' }}>
                    {level.name}
                  </h3>
                  <p style={{ marginBottom: '8px', color: diffColors[level.difficulty] }}>
                    难度：{diffText[level.difficulty]}
                  </p>
                  <p style={{ marginBottom: '4px', color: '#ecf0f1' }}>
                    初始金币：{level.initialGold}
                  </p>
                  <p style={{ marginBottom: '4px', color: '#ecf0f1' }}>
                    波次数：{level.waveCount}
                  </p>
                  {!isUnlocked && (
                    <p style={{ marginTop: '12px', color: '#95a5a6', fontSize: '14px' }}>
                      🔒 通关前一关解锁
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <GameBoard
      engine={engine!}
      levelInfo={selectedLevel!}
      onBack={backToMenu}
      onLevelComplete={handleLevelComplete}
    />
  );
}
