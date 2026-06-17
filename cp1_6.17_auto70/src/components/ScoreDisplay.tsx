import { useGameStore } from '../store';

function ScoreDisplay() {
  const { score, scoreAnimation, isPowerUpActive } = useGameStore();

  return (
    <div style={{
      position: 'absolute',
      top: '20px',
      right: '20px',
      zIndex: 10,
      textAlign: 'right',
    }}>
      <div style={{
        fontFamily: 'monospace',
        fontSize: '24px',
        color: '#FFFFFF',
        animation: scoreAnimation ? 'scorePulse 0.3s ease-out' : 'none',
        textShadow: '0 0 10px rgba(255, 255, 255, 0.5)',
      }}>
        得分: {score}
      </div>
      {isPowerUpActive && (
        <div style={{
          marginTop: '4px',
          fontSize: '14px',
          color: '#FFD700',
          fontFamily: 'monospace',
          animation: 'pulse 0.5s infinite',
        }}>
          双倍得分中!
        </div>
      )}
    </div>
  );
}

export default ScoreDisplay;
