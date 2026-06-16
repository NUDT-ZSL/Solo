import { useEffect } from 'react';
import { useGameStore } from './store';
import { loadGame } from './gameEngine';
import MainMenu from './components/MainMenu';
import GameCanvas from './components/GameCanvas';
import InventoryBar from './components/InventoryBar';
import PuzzlePanel from './components/PuzzlePanel';
import RoomTransition from './components/RoomTransition';
import GameEnding from './components/GameEnding';
import './styles.css';

export default function App() {
  const {
    showMenu,
    gameStarted,
    gameCompleted,
    isTransitioning,
    activePuzzleId,
    errorFlash,
    combineFlash,
    startNewGame,
    continueGame
  } = useGameStore();

  useEffect(() => {
    const saved = loadGame();
    if (saved && saved.currentRoomId) {
      // saved data exists, menu will show "continue" option
    }
  }, []);

  return (
    <div className="app-root">
      {showMenu && !gameStarted && (
        <MainMenu onNewGame={startNewGame} onContinue={continueGame} />
      )}

      {gameStarted && !gameCompleted && (
        <>
          <GameCanvas />
          <InventoryBar />
          {activePuzzleId && <PuzzlePanel puzzleId={activePuzzleId} />}
          {isTransitioning && <RoomTransition />}
        </>
      )}

      {gameCompleted && <GameEnding />}

      {errorFlash && <div className="error-flash" />}
      {combineFlash && <div className="combine-flash" />}
    </div>
  );
}
