import { useGameStore } from '../store';

function EnergyBar() {
  const { energy } = useGameStore();

  return (
    <div style={{
      position: 'absolute',
      top: '20px',
      left: '20px',
      zIndex: 10,
    }}>
      <div style={{
        width: '200px',
        height: '20px',
        backgroundColor: '#333333',
        borderRadius: '4px',
        overflow: 'hidden',
        border: '1px solid #555',
      }}>
        <div style={{
          height: '100%',
          background: 'linear-gradient(90deg, #00FF00 0%, #00CC00 100%)',
          transition: 'width 0.2s ease-out',
          width: `${energy}%`,
          boxShadow: energy > 0 ? '0 0 10px rgba(0, 255, 0, 0.5)' : 'none',
        }} />
      </div>
      <div style={{
        marginTop: '4px',
        fontSize: '12px',
        color: '#AAA',
        fontFamily: 'monospace',
      }}>
        能量: {Math.floor(energy)}%
      </div>
      {energy >= 100 && (
        <div style={{
          marginTop: '4px',
          fontSize: '11px',
          color: '#FFD700',
          fontFamily: 'monospace',
          animation: 'pulse 0.5s infinite',
        }}>
          按 E 释放能量爆发!
        </div>
      )}
    </div>
  );
}

export default EnergyBar;
