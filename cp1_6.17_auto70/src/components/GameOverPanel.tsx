import { useGameStore } from '../store';

function GameOverPanel() {
  const { score, perfectHits, resetGame } = useGameStore();

  const handleRestart = () => {
    resetGame();
  };

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      animation: 'fadeIn 1s ease-out',
    }}>
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '20px',
        padding: '40px 60px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
        textAlign: 'center',
        animation: 'fadeIn 1s ease-out',
      }}>
        <h2 style={{
          fontFamily: 'monospace',
          fontSize: '32px',
          color: '#333',
          marginBottom: '20px',
        }}>
          游戏结束
        </h2>
        <div style={{
          fontFamily: 'monospace',
          fontSize: '20px',
          color: '#555',
          marginBottom: '10px',
        }}>
          最终得分: <span style={{ color: '#1E90FF', fontWeight: 'bold' }}>{score}</span>
        </div>
        <div style={{
          fontFamily: 'monospace',
          fontSize: '18px',
          color: '#666',
          marginBottom: '30px',
        }}>
          完美命中: <span style={{ color: '#00CC00', fontWeight: 'bold' }}>{perfectHits}</span> 次
        </div>
        <button
          onClick={handleRestart}
          style={{
            backgroundColor: '#1E90FF',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 30px',
            fontSize: '18px',
            fontFamily: 'monospace',
            cursor: 'pointer',
            transition: 'background-color 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#4169E1';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#1E90FF';
          }}
        >
          重新开始
        </button>
      </div>
    </div>
  );
}

export default GameOverPanel;
