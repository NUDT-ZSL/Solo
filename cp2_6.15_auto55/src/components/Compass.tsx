import { useState } from 'react';
import { useStore } from '@/store';

const compassStyle: React.CSSProperties = {
  position: 'fixed',
  right: '20px',
  bottom: '20px',
  width: '80px',
  height: '80px',
  borderRadius: '50%',
  backgroundColor: 'rgba(26, 26, 46, 0.85)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(100, 181, 246, 0.3)',
  zIndex: 1000,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  userSelect: 'none',
};

const nLabelStyle: React.CSSProperties = {
  position: 'absolute',
  top: '8px',
  left: '50%',
  transform: 'translateX(-50%)',
  fontSize: '16px',
  fontWeight: 'bold',
  color: '#64b5f6',
  fontFamily: 'system-ui, -apple-system, sans-serif',
};

const triangleStyle: React.CSSProperties = {
  width: 0,
  height: 0,
  borderLeft: '8px solid transparent',
  borderRight: '8px solid transparent',
  borderBottom: '14px solid #64b5f6',
  position: 'absolute',
  top: '26px',
  left: '50%',
  transform: 'translateX(-50%)',
};

const crossStyle: React.CSSProperties = {
  position: 'absolute',
  width: '60px',
  height: '60px',
  pointerEvents: 'none',
};

const crossLineH: React.CSSProperties = {
  position: 'absolute',
  top: '50%',
  left: '0',
  width: '100%',
  height: '1px',
  backgroundColor: 'rgba(100, 181, 246, 0.3)',
  transform: 'translateY(-50%)',
};

const crossLineV: React.CSSProperties = {
  position: 'absolute',
  left: '50%',
  top: '0',
  width: '1px',
  height: '100%',
  backgroundColor: 'rgba(100, 181, 246, 0.3)',
  transform: 'translateX(-50%)',
};

const tickStyleBase: React.CSSProperties = {
  position: 'absolute',
  width: '1px',
  height: '6px',
  backgroundColor: 'rgba(100, 181, 246, 0.5)',
  left: '50%',
  transformOrigin: 'center 40px',
};

export default function Compass() {
  const { resetCamera } = useStore();
  const [isAnimating, setIsAnimating] = useState(false);

  const handleClick = () => {
    setIsAnimating(true);
    resetCamera();
    setTimeout(() => setIsAnimating(false), 200);
  };

  const tickAngles = [30, 60, 120, 150, 210, 240, 300, 330];

  return (
    <>
      <style>{`
        .compass-btn.clicking {
          animation: compassClick 0.2s ease;
        }
        @keyframes compassClick {
          0% { transform: scale(1.0); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1.0); }
        }
      `}</style>
      <div
        className={`compass-btn ${isAnimating ? 'clicking' : ''}`}
        style={compassStyle}
        onClick={handleClick}
      >
        <div style={crossStyle}>
          <div style={crossLineH} />
          <div style={crossLineV} />
        </div>
        {tickAngles.map((angle) => (
          <div
            key={angle}
            style={{
              ...tickStyleBase,
              transform: `translateX(-50%) rotate(${angle}deg)`,
            }}
          />
        ))}
        <span style={nLabelStyle}>N</span>
        <div style={triangleStyle} />
      </div>
    </>
  );
}
