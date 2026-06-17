import { useEffect } from 'react';
import { useGameStore } from './store';
import GameScene from './components/GameScene';
import EnergyBar from './components/EnergyBar';
import ScoreDisplay from './components/ScoreDisplay';
import Countdown from './components/Countdown';
import GameOverPanel from './components/GameOverPanel';

function App() {
  const { phase, startGame } = useGameStore();

  useEffect(() => {
    startGame();
  }, [startGame]);

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      position: 'relative',
      overflow: 'hidden',
      background: 'linear-gradient(180deg, #0A0A2E 0%, #1A1A3E 100%)',
    }}>
      <GameScene />
      
      {phase === 'countdown' && <Countdown />}
      
      {phase !== 'countdown' && (
        <>
          <EnergyBar />
          <ScoreDisplay />
        </>
      )}
      
      {phase === 'gameover' && <GameOverPanel />}
    </div>
  );
}

export default App;
