import { useState, useCallback } from 'react';
import GameBoard from './GameBoard';
import CardHand from './CardHand';
import { GameState, createInitialState, placePlant, endPlayerTurn } from './utils/gameLogic';
import { PlantConfig } from './utils/plants';

const PHASE_LABELS: Record<string, string> = {
  player: '🪴 种植阶段',
  attack: '⚔️ 攻击阶段',
  enemy_move: '👹 敌人移动',
  game_over: '💀 森林沦陷',
  victory: '🎉 守护成功',
};

export default function App() {
  const [gameState, setGameState] = useState<GameState>(createInitialState);
  const [selectedCard, setSelectedCard] = useState<PlantConfig | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{ col: number; row: number } | null>(null);

  const handleSelectCard = useCallback((card: PlantConfig) => {
    setSelectedCard((prev) => (prev?.id === card.id ? null : card));
  }, []);

  const handleCellClick = useCallback(
    (col: number, row: number) => {
      if (gameState.phase === 'game_over' || gameState.phase === 'victory') {
        setGameState(createInitialState());
        setSelectedCard(null);
        return;
      }

      if (gameState.phase !== 'player') return;
      if (!selectedCard) return;

      const newState = placePlant(gameState, selectedCard, col, row);
      if (newState !== gameState) {
        setGameState(newState);
        setSelectedCard(null);
      }
    },
    [gameState, selectedCard]
  );

  const handleEndTurn = useCallback(() => {
    if (gameState.phase !== 'player') return;
    const newState = endPlayerTurn(gameState);
    setGameState(newState);
    setSelectedCard(null);
  }, [gameState]);

  const handleStateUpdate = useCallback((state: GameState) => {
    setGameState(state);
  }, []);

  const handleMouseMove = useCallback((cell: { col: number; row: number } | null) => {
    setHoveredCell(cell);
  }, []);

  return (
    <div className="game-container">
      <header className="game-header">
        <h1 className="game-title">🌲 四季之森 🌲</h1>
        <div className="game-stats">
          <div className="stat-pill">
            <span className="stat-icon">🔄</span>
            <span>回合 {gameState.turn}</span>
          </div>
          <div className="stat-pill">
            <span className="stat-icon">🌊</span>
            <span>波次 {gameState.wave}/{5}</span>
          </div>
          <div className="stat-pill stat-pill--lives">
            <span className="stat-icon">❤️</span>
            <span>{gameState.lives}</span>
          </div>
          <div className="stat-pill stat-pill--score">
            <span className="stat-icon">⭐</span>
            <span>{gameState.score}</span>
          </div>
          <div className="stat-pill stat-pill--energy">
            <span className="stat-icon">⚡</span>
            <span>{gameState.energy}</span>
          </div>
        </div>
        <div className="game-phase-badge">{PHASE_LABELS[gameState.phase]}</div>
      </header>

      <main className="game-main">
        <GameBoard
          gameState={gameState}
          onStateUpdate={handleStateUpdate}
          hoveredCell={hoveredCell}
          onMouseMove={handleMouseMove}
          onCellClick={handleCellClick}
        />
      </main>

      <footer className="game-footer">
        <CardHand
          cards={gameState.handCards}
          energy={gameState.energy}
          onSelectCard={handleSelectCard}
          selectedCard={selectedCard}
        />
        {gameState.phase === 'player' && (
          <button className="end-turn-btn" onClick={handleEndTurn}>
            结束回合 →
          </button>
        )}
      </footer>

      {selectedCard && gameState.phase === 'player' && (
        <div className="placement-hint">
          点击棋盘空格放置 <strong>{selectedCard.name}</strong>
        </div>
      )}
    </div>
  );
}
