import { useEffect, useState } from 'react';
import { loadGame } from '../gameEngine';

interface Props {
  onNewGame: () => void;
  onContinue: () => boolean;
}

export default function MainMenu({ onNewGame, onContinue }: Props) {
  const [hasSave, setHasSave] = useState(false);

  useEffect(() => {
    const saved = loadGame();
    setHasSave(!!saved && !!saved.currentRoomId);
  }, []);

  const handleContinue = () => {
    const success = onContinue();
    if (!success) {
      setHasSave(false);
    }
  };

  return (
    <div className="main-menu">
      <h1 className="menu-title">脱逃禁室</h1>
      <p className="menu-subtitle">ESCAPE ROOM</p>
      <div className="menu-buttons">
        <button className="menu-btn primary" onClick={onNewGame}>
          新游戏
        </button>
        <button className="menu-btn" onClick={handleContinue} disabled={!hasSave}>
          继续游戏
        </button>
      </div>
    </div>
  );
}
