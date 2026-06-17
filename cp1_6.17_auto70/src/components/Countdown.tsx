import { useGameStore } from '../store';

function Countdown() {
  const { countdown } = useGameStore();

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
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      animation: 'fadeIn 0.5s ease-out',
    }}>
      <div
        key={countdown}
        style={{
          fontFamily: 'monospace',
          fontSize: '48px',
          color: '#FFFFFF',
          fontWeight: 'bold',
          animation: 'countdownScale 1.5s ease-out',
          textShadow: '0 0 20px rgba(0, 255, 255, 0.8)',
        }}
      >
        {countdown > 0 ? countdown : '开始!'}
      </div>
    </div>
  );
}

export default Countdown;
