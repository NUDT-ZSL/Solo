import React, { useState, useEffect } from 'react';
import GameCanvas from './components/GameCanvas';
import UIPanel from './ui/UIPanel';
import GameOverModal from './ui/GameOverModal';
import { gameManager } from './engine/GameManager';
import { eventBus, GameEvent } from './engine/EventBus';
import { PlantType } from './types/gameTypes';
import './App.css';

const App: React.FC = () => {
  const [selectedPlant, setSelectedPlant] = useState<PlantType | null>(null);
  const [isGameOver, setIsGameOver] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);

  useEffect(() => {
    gameManager.init();

    const gameOverUnsub = eventBus.on(GameEvent.GAME_OVER, (data) => {
      const { score } = data as { score: number };
      setFinalScore(score);
      setIsGameOver(true);
    });

    const plantPlacedUnsub = eventBus.on(GameEvent.PLANT_PLACED, () => {
    });

    return () => {
      gameOverUnsub();
      plantPlacedUnsub();
    };
  }, []);

  const handleSelectPlant = (plant: PlantType | null) => {
    setSelectedPlant(plant);
    gameManager.selectPlant(plant);
  };

  const handleCanvasReady = () => {
    if (!gameStarted) {
      setGameStarted(true);
      gameManager.startGame();
    }
  };

  const handleRestart = () => {
    setIsGameOver(false);
    setSelectedPlant(null);
    gameManager.restartGame();
  };

  return (
    <div className="app">
      <div className="game-container">
        <UIPanel
          selectedPlant={selectedPlant}
          onSelectPlant={handleSelectPlant}
        />
        <GameCanvas onCanvasReady={handleCanvasReady} />
      </div>

      {isGameOver && (
        <GameOverModal score={finalScore} onRestart={handleRestart} />
      )}
    </div>
  );
};

export default App;
