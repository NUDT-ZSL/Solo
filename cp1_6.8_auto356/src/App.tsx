import React, { useState, useCallback, useRef } from 'react';
import GameCanvas, { GameState, LevelData, createInitialGameState } from './GameCanvas';
import ControlPanel from './ControlPanel';

const LEVELS: LevelData[] = [
  {
    id: 1,
    name: '初见星辉',
    asteroids: [
      { id: 'a1', x: 150, y: 400, radius: 14 },
      { id: 'a2', x: 200, y: 250, radius: 12 },
      { id: 'a3', x: 100, y: 550, radius: 13 },
    ],
    starGates: [
      { id: 'g1', x: 900, y: 400, radius: 35, type: 'normal', hitsRequired: 3 },
    ],
    hazards: [],
    starFragments: [
      { id: 'f1', x: 500, y: 200 },
      { id: 'f2', x: 700, y: 600 },
      { id: 'f3', x: 400, y: 500 },
    ],
  },
  {
    id: 2,
    name: '引力漩涡',
    asteroids: [
      { id: 'a1', x: 120, y: 350, radius: 13 },
      { id: 'a2', x: 180, y: 200, radius: 12 },
      { id: 'a3', x: 100, y: 500, radius: 14 },
      { id: 'a4', x: 250, y: 600, radius: 11 },
      { id: 'a5', x: 200, y: 450, radius: 12 },
    ],
    starGates: [
      { id: 'g1', x: 850, y: 300, radius: 35, type: 'normal', hitsRequired: 3 },
      { id: 'g2', x: 950, y: 550, radius: 30, type: 'rare', hitsRequired: 5 },
    ],
    hazards: [
      { id: 'h1', x: 500, y: 350, radius: 60, type: 'gravity_interference', strength: 1 },
    ],
    starFragments: [
      { id: 'f1', x: 350, y: 150 },
      { id: 'f2', x: 650, y: 500 },
      { id: 'f3', x: 750, y: 200 },
      { id: 'f4', x: 450, y: 650 },
    ],
  },
  {
    id: 3,
    name: '暗域迷踪',
    asteroids: [
      { id: 'a1', x: 100, y: 400, radius: 14 },
      { id: 'a2', x: 150, y: 200, radius: 12 },
      { id: 'a3', x: 80, y: 600, radius: 13 },
      { id: 'a4', x: 200, y: 350, radius: 11 },
      { id: 'a5', x: 130, y: 500, radius: 12 },
    ],
    starGates: [
      { id: 'g1', x: 900, y: 250, radius: 35, type: 'normal', hitsRequired: 3 },
      { id: 'g2', x: 800, y: 550, radius: 30, type: 'rare', hitsRequired: 5 },
      { id: 'g3', x: 1050, y: 400, radius: 28, type: 'hidden', hitsRequired: 3, hiddenOrbitType: 'circular' },
    ],
    hazards: [
      { id: 'h1', x: 450, y: 300, radius: 70, type: 'blackhole', strength: 1 },
      { id: 'h2', x: 600, y: 500, radius: 50, type: 'gravity_interference', strength: 1.2 },
    ],
    starFragments: [
      { id: 'f1', x: 300, y: 150 },
      { id: 'f2', x: 700, y: 450 },
      { id: 'f3', x: 550, y: 650 },
      { id: 'f4', x: 350, y: 350 },
      { id: 'f5', x: 850, y: 150 },
    ],
  },
  {
    id: 4,
    name: '星跃长廊',
    asteroids: [
      { id: 'a1', x: 100, y: 300, radius: 13 },
      { id: 'a2', x: 150, y: 500, radius: 14 },
      { id: 'a3', x: 80, y: 150, radius: 12 },
      { id: 'a4', x: 200, y: 650, radius: 11 },
      { id: 'a5', x: 120, y: 450, radius: 13 },
      { id: 'a6', x: 180, y: 350, radius: 12 },
    ],
    starGates: [
      { id: 'g1', x: 850, y: 200, radius: 35, type: 'normal', hitsRequired: 3 },
      { id: 'g2', x: 950, y: 500, radius: 30, type: 'rare', hitsRequired: 5 },
      { id: 'g3', x: 1050, y: 350, radius: 28, type: 'hidden', hitsRequired: 3, hiddenOrbitType: 'curved' },
    ],
    hazards: [
      { id: 'h1', x: 400, y: 250, radius: 55, type: 'blackhole', strength: 0.8 },
      { id: 'h2', x: 600, y: 450, radius: 45, type: 'boost_star', strength: 1 },
      { id: 'h3', x: 500, y: 600, radius: 60, type: 'gravity_interference', strength: 1.5 },
    ],
    starFragments: [
      { id: 'f1', x: 250, y: 100 },
      { id: 'f2', x: 550, y: 300 },
      { id: 'f3', x: 750, y: 650 },
      { id: 'f4', x: 350, y: 500 },
      { id: 'f5', x: 650, y: 150 },
      { id: 'f6', x: 450, y: 700 },
    ],
  },
  {
    id: 5,
    name: '终焉织梦',
    asteroids: [
      { id: 'a1', x: 80, y: 400, radius: 14 },
      { id: 'a2', x: 130, y: 200, radius: 13 },
      { id: 'a3', x: 60, y: 550, radius: 12 },
      { id: 'a4', x: 180, y: 300, radius: 11 },
      { id: 'a5', x: 100, y: 650, radius: 14 },
      { id: 'a6', x: 200, y: 500, radius: 12 },
      { id: 'a7', x: 150, y: 350, radius: 13 },
    ],
    starGates: [
      { id: 'g1', x: 800, y: 150, radius: 35, type: 'normal', hitsRequired: 3 },
      { id: 'g2', x: 1000, y: 450, radius: 30, type: 'rare', hitsRequired: 5 },
      { id: 'g3', x: 900, y: 650, radius: 28, type: 'hidden', hitsRequired: 3, hiddenOrbitType: 'circular' },
      { id: 'g4', x: 1100, y: 300, radius: 28, type: 'hidden', hitsRequired: 3, hiddenOrbitType: 'curved' },
    ],
    hazards: [
      { id: 'h1', x: 350, y: 200, radius: 65, type: 'blackhole', strength: 1.2 },
      { id: 'h2', x: 550, y: 400, radius: 50, type: 'boost_star', strength: 1 },
      { id: 'h3', x: 450, y: 550, radius: 55, type: 'gravity_interference', strength: 1.3 },
      { id: 'h4', x: 650, y: 250, radius: 50, type: 'blackhole', strength: 0.7 },
      { id: 'h5', x: 700, y: 600, radius: 45, type: 'boost_star', strength: 1.5 },
    ],
    starFragments: [
      { id: 'f1', x: 250, y: 100 },
      { id: 'f2', x: 400, y: 350 },
      { id: 'f3', x: 600, y: 550 },
      { id: 'f4', x: 750, y: 300 },
      { id: 'f5', x: 500, y: 700 },
      { id: 'f6', x: 300, y: 500 },
      { id: 'f7', x: 850, y: 550 },
    ],
  },
];

export default function App() {
  const [currentLevel, setCurrentLevel] = useState(1);
  const [gameState, setGameState] = useState<GameState>(() =>
    createInitialGameState(LEVELS[0]),
  );
  const [unlockedLevels, setUnlockedLevels] = useState(1);
  const prevLevelComplete = useRef(false);

  const handleGameStateUpdate = useCallback(
    (updater: (prev: GameState) => GameState) => {
      setGameState((prev) => {
        const next = updater(prev);
        if (next.levelComplete && !prevLevelComplete.current) {
          prevLevelComplete.current = true;
          setUnlockedLevels((ul) => Math.max(ul, next.level + 1));
        }
        if (!next.levelComplete) {
          prevLevelComplete.current = false;
        }
        return next;
      });
    },
    [],
  );

  const handleReset = useCallback(() => {
    const levelData = LEVELS.find((l) => l.id === currentLevel) || LEVELS[0];
    setGameState(createInitialGameState(levelData));
    prevLevelComplete.current = false;
  }, [currentLevel]);

  const handleLevelSelect = useCallback(
    (level: number) => {
      if (level > unlockedLevels) return;
      const levelData = LEVELS.find((l) => l.id === level) || LEVELS[0];
      setCurrentLevel(level);
      setGameState(createInitialGameState(levelData));
      prevLevelComplete.current = false;
    },
    [unlockedLevels],
  );

  const score = gameState.levelComplete
    ? {
        time: (Date.now() - gameState.levelStartTime) / 1000,
        energyEfficiency: gameState.energy / gameState.maxEnergy,
        fragmentRate:
          gameState.totalFragments > 0
            ? gameState.fragmentsCollected / gameState.totalFragments
            : 0,
      }
    : null;

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        position: 'relative',
        overflow: 'hidden',
        background: '#0a0a1a',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 16,
          left: 20,
          zIndex: 10,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            background: 'rgba(15, 20, 40, 0.55)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderRadius: 12,
            border: '1px solid rgba(100, 160, 255, 0.12)',
            padding: '10px 18px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
          }}
        >
          <div
            style={{
              color: 'rgba(180, 210, 255, 0.9)',
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: 2,
            }}
          >
            {gameState.levelName}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginTop: 4,
            }}
          >
            {Array.from({ length: gameState.totalFragments }, (_, i) => (
              <div
                key={i}
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background:
                    i < gameState.fragmentsCollected
                      ? 'radial-gradient(circle, #ffdd66, #cc9922)'
                      : 'rgba(60, 70, 90, 0.4)',
                  boxShadow:
                    i < gameState.fragmentsCollected
                      ? '0 0 4px rgba(255, 220, 100, 0.4)'
                      : 'none',
                  transition: 'all 0.3s',
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <GameCanvas
        gameState={gameState}
        onGameStateUpdate={handleGameStateUpdate}
        width={1200}
        height={800}
      />

      <ControlPanel
        energy={gameState.energy}
        maxEnergy={gameState.maxEnergy}
        level={currentLevel}
        levelName={gameState.levelName}
        fragmentsCollected={gameState.fragmentsCollected}
        totalFragments={gameState.totalFragments}
        starGatesTotal={gameState.starGates.length}
        starGatesUnlocked={gameState.starGates.filter((g) => g.unlocked).length}
        onReset={handleReset}
        onLevelSelect={handleLevelSelect}
        maxLevel={Math.min(unlockedLevels, LEVELS.length)}
        levelComplete={gameState.levelComplete}
        score={score}
      />

      {gameState.levelComplete && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 20,
            pointerEvents: 'none',
            textAlign: 'center',
            animation: 'levelCompleteFade 1s ease-out',
          }}
        >
          <div
            style={{
              fontSize: 42,
              fontWeight: 800,
              letterSpacing: 6,
              background: 'linear-gradient(135deg, #66ccff, #aa88ff, #ffdd66)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              textShadow: 'none',
              filter: 'drop-shadow(0 0 20px rgba(100, 180, 255, 0.4))',
            }}
          >
            关卡通过
          </div>
          <div
            style={{
              color: 'rgba(180, 210, 255, 0.7)',
              fontSize: 14,
              marginTop: 8,
              letterSpacing: 2,
            }}
          >
            {currentLevel < LEVELS.length ? '下一关已解锁' : '恭喜通关！'}
          </div>
        </div>
      )}

      <style>{`
        @keyframes levelCompleteFade {
          from { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
          to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        @keyframes scoreSlideIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
