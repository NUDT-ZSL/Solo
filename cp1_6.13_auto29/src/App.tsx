import { useState, useCallback } from 'react';
import GameCanvas from './components/GameCanvas';
import Leaderboard from './components/Leaderboard';

type Page = 'game' | 'leaderboard';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('game');
  const [gameKey, setGameKey] = useState(0);

  const handleNewGame = useCallback(() => {
    setGameKey(prev => prev + 1);
    setCurrentPage('game');
  }, []);

  const handleLeaderboard = useCallback(() => {
    setCurrentPage('leaderboard');
  }, []);

  return (
    <div style={styles.container}>
      <nav style={styles.navbar}>
        <div style={styles.logo}>ShadowRacer</div>
        <div style={styles.navButtons}>
          <button style={styles.navButton} onClick={handleNewGame}>
            开始新游戏
          </button>
          <button style={styles.navButton} onClick={handleLeaderboard}>
            排行榜
          </button>
        </div>
      </nav>
      
      <main style={styles.main}>
        {currentPage === 'game' && <GameCanvas key={gameKey} />}
        {currentPage === 'leaderboard' && <Leaderboard />}
      </main>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    width: '100vw',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#0f172a',
    overflow: 'hidden'
  },
  navbar: {
    height: '64px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 24px',
    backgroundColor: '#0f172a',
    borderBottom: '1px solid #1e293b'
  },
  logo: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#38bdf8'
  },
  navButtons: {
    display: 'flex',
    gap: '12px'
  },
  navButton: {
    padding: '8px 20px',
    borderRadius: '8px',
    backgroundColor: '#1e293b',
    color: '#94a3b8',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'background-color 0.2s'
  },
  main: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'auto'
  }
};

export default App;
