import { useState, useRef, useEffect } from 'react';
import { useStore } from '@/store';

const panelStyle: React.CSSProperties = {
  position: 'fixed',
  right: '20px',
  top: '20px',
  width: '280px',
  backgroundColor: 'rgba(26, 26, 46, 0.85)',
  borderRadius: '16px',
  padding: '24px',
  backdropFilter: 'blur(10px)',
  zIndex: 1000,
};

const sectionStyle: React.CSSProperties = {
  marginBottom: '24px',
};

const labelStyle: React.CSSProperties = {
  color: '#e0e0e0',
  fontSize: '14px',
  marginBottom: '8px',
  display: 'block',
  fontFamily: 'system-ui, -apple-system, sans-serif',
};

const valueStyle: React.CSSProperties = {
  color: '#64b5f6',
  fontFamily: "'Courier New', monospace",
  fontWeight: 'bold',
};

const sliderContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
};

const sliderStyle: React.CSSProperties = {
  flex: 1,
  height: '6px',
  WebkitAppearance: 'none',
  appearance: 'none',
  background: '#333',
  borderRadius: '3px',
  outline: 'none',
  cursor: 'pointer',
};

const buttonGroupStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
};

const buttonStyle: React.CSSProperties = {
  flex: 1,
  padding: '10px 12px',
  backgroundColor: '#1e3a5f',
  color: '#e0e0e0',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '14px',
  fontFamily: "'Courier New', monospace",
  transition: 'background-color 0.2s ease, transform 0.2s ease',
};

const activeButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  backgroundColor: '#64b5f6',
  color: '#1a1a2e',
};

const resetButtonStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px',
  backgroundColor: '#64b5f6',
  color: '#1a1a2e',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: '600',
  transition: 'all 0.5s ease-in-out',
};

export default function ControlPanel() {
  const {
    simulationTime,
    particleSize,
    speedMultiplier,
    setSimulationTime,
    setParticleSize,
    setSpeedMultiplier,
    resetCamera,
    fetchParticles,
  } = useStore();

  const [isResetAnimating, setIsResetAnimating] = useState(false);
  const [clickedButton, setClickedButton] = useState<number | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const formatTime = (simulationTime: number): string => {
    const actualSeconds = (simulationTime / 100) * 30;
    const mins = Math.floor(actualSeconds / 60);
    const secs = Math.floor(actualSeconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSimulationTime = parseInt(e.target.value, 10);
    setSimulationTime(newSimulationTime);

    const actualSeconds = (newSimulationTime / 100) * 30;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      fetchParticles(actualSeconds);
    }, 50);
  };

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleParticleSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setParticleSize(parseFloat(e.target.value));
  };

  const handleSpeedChange = (multiplier: number) => {
    setClickedButton(multiplier);
    setSpeedMultiplier(multiplier);
    setTimeout(() => setClickedButton(null), 200);
  };

  const handleResetCamera = () => {
    setIsResetAnimating(true);
    resetCamera();
    setTimeout(() => setIsResetAnimating(false), 500);
  };

  const speedOptions = [1, 2, 5, 10];

  return (
    <div style={panelStyle}>
      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          background: #64b5f6;
          border-radius: 50%;
          cursor: pointer;
          transition: transform 0.15s ease;
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }
        input[type="range"]::-moz-range-thumb {
          width: 18px;
          height: 18px;
          background: #64b5f6;
          border-radius: 50%;
          cursor: pointer;
          border: none;
          transition: transform 0.15s ease;
        }
        input[type="range"]::-moz-range-thumb:hover {
          transform: scale(1.2);
        }
        .speed-btn:hover {
          background-color: #90caf9 !important;
          color: #1a1a2e !important;
        }
        .speed-btn:active {
          animation: clickScale 0.2s ease;
        }
        .reset-btn:hover {
          background-color: #90caf9 !important;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(100, 181, 246, 0.4);
        }
        .reset-btn.animating {
          transform: scale(1.05);
          background-color: #90caf9 !important;
        }
        @keyframes clickScale {
          0% { transform: scale(1.0); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1.0); }
        }
      `}</style>

      <div style={sectionStyle}>
        <span style={labelStyle}>模拟时间</span>
        <div style={sliderContainerStyle}>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={simulationTime}
            onChange={handleTimeChange}
            style={sliderStyle}
          />
          <span style={valueStyle}>{formatTime(simulationTime)}</span>
        </div>
      </div>

      <div style={sectionStyle}>
        <span style={labelStyle}>粒子大小</span>
        <div style={sliderContainerStyle}>
          <input
            type="range"
            min="0.5"
            max="3"
            step="0.1"
            value={particleSize}
            onChange={handleParticleSizeChange}
            style={sliderStyle}
          />
          <span style={valueStyle}>{particleSize.toFixed(1)}</span>
        </div>
      </div>

      <div style={sectionStyle}>
        <span style={labelStyle}>流动速度</span>
        <div style={buttonGroupStyle}>
          {speedOptions.map((speed) => (
            <button
              key={speed}
              className="speed-btn"
              onClick={() => handleSpeedChange(speed)}
              style={{
                ...(speedMultiplier === speed ? activeButtonStyle : buttonStyle),
                transform: clickedButton === speed ? 'scale(1.1)' : 'scale(1.0)',
                animation: clickedButton === speed ? 'clickScale 0.2s ease' : 'none',
              }}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>

      <div style={sectionStyle}>
        <button
          className={`reset-btn ${isResetAnimating ? 'animating' : ''}`}
          onClick={handleResetCamera}
          style={{
            ...resetButtonStyle,
            transform: isResetAnimating ? 'scale(1.05)' : 'scale(1.0)',
          }}
        >
          重置视角
        </button>
      </div>
    </div>
  );
}
