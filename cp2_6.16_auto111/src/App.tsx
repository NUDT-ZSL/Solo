import { GameProvider } from './hooks/useGameState';
import GameCanvas from './components/GameCanvas';
import GameUI from './components/GameUI';

function App() {
  return (
    <GameProvider>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
        <h1 style={{
          fontFamily: "'MedievalSharp', cursive",
          fontSize: '28px',
          color: '#c9a959',
          textShadow: '2px 2px 4px rgba(201, 169, 89, 0.3)',
          letterSpacing: '2px',
        }}>
          ⚔️ 地牢潜行 ⚔️
        </h1>
        <div style={{
          position: 'relative',
          padding: '16px',
          background: '#3d2b1f',
          borderRadius: '4px',
          boxShadow: '0 0 30px rgba(0, 0, 0, 0.8), inset 0 0 20px rgba(0, 0, 0, 0.5)',
        }}>
          <div style={{
            position: 'absolute',
            top: '16px',
            left: '16px',
            right: '16px',
            bottom: '16px',
            pointerEvents: 'none',
            border: '1px solid rgba(201, 169, 89, 0.2)',
            borderRadius: '2px',
          }} />
          <GameCanvas />
          <GameUI />
        </div>
        <div style={{
          color: '#c9a959',
          fontSize: '14px',
          opacity: 0.8,
          fontFamily: "'MedievalSharp', cursive",
        }}>
          WASD移动 | 空格潜行/站立 | E使用药水
        </div>
      </div>
    </GameProvider>
  );
}

export default App;
