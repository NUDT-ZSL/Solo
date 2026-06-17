import React from 'react';

interface ControlPanelProps {
  fishCount: number;
  predatorCount: number;
  algaeCount: number;
  stabilityScore: number;
  onSpawnFish: () => void;
  onSpawnPredator: () => void;
  onSpawnAlgae: () => void;
  onReset: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  fishCount,
  predatorCount,
  algaeCount,
  stabilityScore,
  onSpawnFish,
  onSpawnPredator,
  onSpawnAlgae,
  onReset,
}) => {
  const isLowScore = stabilityScore < 30;
  
  const adjustBrightness = (hex: string, percent: number): string => {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
    const B = Math.min(255, (num & 0x0000FF) + amt);
    return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
  };

  const buttonStyle = (color: string) => ({
    backgroundColor: color,
    transition: 'background-color 0.2s ease, transform 0.1s ease',
  });

  return (
    <div style={{
      width: '200px',
      backgroundColor: 'rgba(26, 26, 46, 0.9)',
      borderRadius: '12px',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '15px',
      color: '#FFFFFF',
      fontFamily: 'monospace',
      fontSize: '14px',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
    }}>
      <h2 style={{
        margin: '0 0 10px 0',
        fontSize: '18px',
        textAlign: 'center',
        color: '#00D4FF',
        borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
        paddingBottom: '10px',
      }}>
        控制面板
      </h2>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        padding: '10px',
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        borderRadius: '8px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#FFD700' }}>● 小鱼:</span>
          <span>{fishCount}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#FF4500' }}>● 大鱼:</span>
          <span>{predatorCount}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#2ECC40' }}>● 海藻:</span>
          <span>{algaeCount}</span>
        </div>
      </div>

      <div style={{
        padding: '10px',
        backgroundColor: isLowScore ? 'rgba(255, 0, 0, 0.1)' : 'rgba(0, 0, 0, 0.2)',
        borderRadius: '8px',
        border: isLowScore ? '2px solid #FF0000' : '2px solid transparent',
        animation: isLowScore ? 'pulse 0.5s infinite alternate' : 'none',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '12px', marginBottom: '5px', opacity: 0.8 }}>
            生态稳定性
          </div>
          <div style={{
            fontSize: '28px',
            fontWeight: 'bold',
            color: isLowScore ? '#FF0000' : 
                   stabilityScore < 60 ? '#FFA500' : '#00FF88',
          }}>
            {stabilityScore}
          </div>
          <div style={{ fontSize: '12px', opacity: 0.6 }}>
            / 100
          </div>
        </div>
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        marginTop: '10px',
      }}>
        <button
          onClick={onSpawnFish}
          style={{
            ...buttonStyle('#FFD700'),
            color: '#000',
            border: 'none',
            borderRadius: '8px',
            padding: '12px',
            fontWeight: 'bold',
            cursor: 'pointer',
            fontSize: '14px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = adjustBrightness('#FFD700', 20);
            e.currentTarget.style.transform = 'scale(1.02)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#FFD700';
            e.currentTarget.style.transform = 'scale(1)';
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'scale(0.98)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'scale(1.02)';
          }}
        >
          投放小鱼 (+5)
        </button>

        <button
          onClick={onSpawnPredator}
          style={{
            ...buttonStyle('#FF4500'),
            color: '#FFF',
            border: 'none',
            borderRadius: '8px',
            padding: '12px',
            fontWeight: 'bold',
            cursor: 'pointer',
            fontSize: '14px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = adjustBrightness('#FF4500', 20);
            e.currentTarget.style.transform = 'scale(1.02)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#FF4500';
            e.currentTarget.style.transform = 'scale(1)';
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'scale(0.98)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'scale(1.02)';
          }}
        >
          投放大鱼 (+5)
        </button>

        <button
          onClick={onSpawnAlgae}
          style={{
            ...buttonStyle('#2ECC40'),
            color: '#FFF',
            border: 'none',
            borderRadius: '8px',
            padding: '12px',
            fontWeight: 'bold',
            cursor: 'pointer',
            fontSize: '14px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = adjustBrightness('#2ECC40', 20);
            e.currentTarget.style.transform = 'scale(1.02)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#2ECC40';
            e.currentTarget.style.transform = 'scale(1)';
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'scale(0.98)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'scale(1.02)';
          }}
        >
          投放海藻 (+5)
        </button>

        <button
          onClick={onReset}
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            color: '#FFF',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '8px',
            padding: '12px',
            fontWeight: 'bold',
            cursor: 'pointer',
            fontSize: '14px',
            marginTop: '5px',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
          }}
        >
          重置场景 (R)
        </button>
      </div>

      <div style={{
        fontSize: '11px',
        opacity: 0.5,
        textAlign: 'center',
        marginTop: 'auto',
        paddingTop: '10px',
      }}>
        按 R 键快速重置
      </div>

      <style>{`
        @keyframes pulse {
          from { box-shadow: 0 0 5px rgba(255, 0, 0, 0.5); }
          to { box-shadow: 0 0 20px rgba(255, 0, 0, 0.8); }
        }
      `}</style>
    </div>
  );
};

export default ControlPanel;
