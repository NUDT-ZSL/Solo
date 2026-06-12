import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GameEngine } from './game/GameEngine';
import { GameState, TowerType } from './game/types';
import GameCanvas from './ui/GameCanvas';
import UIPanel from './ui/UIPanel';

export default function App() {
  const engineRef = useRef<GameEngine | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedTowerType, setSelectedTowerType] = useState<TowerType | null>(null);

  useEffect(() => {
    const engine = new GameEngine();
    engineRef.current = engine;
    engine.onUpdate((state) => {
      setGameState({ ...state });
    });
    setGameState({ ...engine.state });
    return () => {
      engine.destroy();
    };
  }, []);

  const handleCanvasClick = useCallback((x: number, y: number) => {
    if (engineRef.current) {
      engineRef.current.handleClick(x, y, selectedTowerType);
    }
  }, [selectedTowerType]);

  const handlePlaceTower = useCallback((type: TowerType) => {
    setSelectedTower(prev => prev === type ? null : type);
  }, []);

  const handleUpgradeTower = useCallback((towerId: string) => {
    if (engineRef.current) {
      engineRef.current.emitAction('upgradeTower', { towerId });
    }
  }, []);

  const handleFreezeSkill = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.emitAction('freezeSkill');
    }
  }, []);

  const handleStartGame = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.emitAction('startGame');
    }
  }, []);

  const handleNextWave = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.emitAction('nextWave');
    }
  }, []);

  if (!gameState) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#1a1a2e',
        color: '#e0e0e0',
        fontFamily: 'monospace'
      }}>
        加载中...
      </div>
    );
  }

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '24px',
      background: '#1a1a2e',
      fontFamily: 'monospace'
    }}>
      <GameCanvas
        state={gameState}
        onCanvasClick={handleCanvasClick}
        selectedTowerType={selectedTowerType}
      />
      <UIPanel
        state={gameState}
        onPlaceTower={handlePlaceTower}
        onUpgradeTower={handleUpgradeTower}
        onFreezeSkill={handleFreezeSkill}
        onStartGame={handleStartGame}
        onNextWave={handleNextWave}
      />
    </div>
  );
}
