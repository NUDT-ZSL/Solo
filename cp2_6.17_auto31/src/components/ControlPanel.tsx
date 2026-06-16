import type { ChangeEvent } from 'react';
import type { SequenceParams } from '../types';

interface ControlPanelProps {
  params: SequenceParams;
  onParamChange: (key: keyof SequenceParams, value: number) => void;
  onAcquire: () => void;
  isAcquiring: boolean;
}

const panelStyle: React.CSSProperties = {
  padding: '20px',
  display: 'flex',
  flexDirection: 'column',
  gap: '24px',
  flex: 1,
};

const titleStyle: React.CSSProperties = {
  fontSize: '18px',
  fontWeight: 600,
  color: '#eaeaea',
  paddingBottom: '12px',
  borderBottom: '1px solid #0f3460',
  marginBottom: '4px',
};

const sliderGroupStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const sliderLabelStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  fontSize: '14px',
  color: '#eaeaea',
};

const sliderValueStyle: React.CSSProperties = {
  color: '#4ecdc4',
  fontWeight: 600,
  fontSize: '13px',
  backgroundColor: 'rgba(78, 205, 196, 0.1)',
  padding: '2px 8px',
  borderRadius: '4px',
};

const sliderStyle: React.CSSProperties = {
  width: '100%',
  height: '6px',
  borderRadius: '3px',
  background: '#0f3460',
  outline: 'none',
  appearance: 'none',
  cursor: 'pointer',
  transition: 'all 0.25s ease',
};

const buttonStyle: React.CSSProperties = {
  width: '100%',
  height: '44px',
  borderRadius: '8px',
  border: 'none',
  backgroundColor: '#2ecc71',
  color: 'white',
  fontSize: '15px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.25s ease',
  marginTop: '8px',
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#8892b0',
  marginBottom: '4px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
};

function ControlPanel({ params, onParamChange, onAcquire, isAcquiring }: ControlPanelProps) {
  const handleSliderChange = (key: keyof SequenceParams) => (e: ChangeEvent<HTMLInputElement>) => {
    onParamChange(key, Number(e.target.value));
  };

  return (
    <div style={panelStyle}>
      <div style={titleStyle}>脉冲序列参数</div>

      <div style={sliderGroupStyle}>
        <span style={sectionTitleStyle}>序列参数</span>

        <div style={sliderLabelStyle}>
          <span>重复时间 TR</span>
          <span style={sliderValueStyle}>{params.TR} ms</span>
        </div>
        <input
          type="range"
          min="200"
          max="1000"
          step="10"
          value={params.TR}
          onChange={handleSliderChange('TR')}
          style={sliderStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'linear-gradient(to right, #4ecdc4, #44a08d)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#0f3460';
          }}
        />

        <div style={{ height: '8px' }} />

        <div style={sliderLabelStyle}>
          <span>回波时间 TE</span>
          <span style={sliderValueStyle}>{params.TE} ms</span>
        </div>
        <input
          type="range"
          min="10"
          max="100"
          step="1"
          value={params.TE}
          onChange={handleSliderChange('TE')}
          style={sliderStyle}
        />

        <div style={{ height: '8px' }} />

        <div style={sliderLabelStyle}>
          <span>翻转角</span>
          <span style={sliderValueStyle}>{params.flipAngle}°</span>
        </div>
        <input
          type="range"
          min="30"
          max="180"
          step="1"
          value={params.flipAngle}
          onChange={handleSliderChange('flipAngle')}
          style={sliderStyle}
        />
      </div>

      <div style={{ flex: 1 }} />

      <button
        style={{
        ...buttonStyle,
        backgroundColor: isAcquiring ? '#27ae60' : '#2ecc71',
        cursor: isAcquiring ? 'not-allowed' : 'pointer',
        opacity: isAcquiring ? 0.8 : 1,
      }}
        onClick={onAcquire}
        disabled={isAcquiring}
        onMouseEnter={(e) => {
          if (!isAcquiring) {
            e.currentTarget.style.backgroundColor = '#27ae60';
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(46, 204, 113, 0.3)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = isAcquiring ? '#27ae60' : '#2ecc71';
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        {isAcquiring ? '采集中...' : '采集图像'}
      </button>

      <div style={{
        fontSize: '12px',
        color: '#8892b0',
        textAlign: 'center',
        lineHeight: 1.6,
        padding: '12px',
        backgroundColor: 'rgba(15, 52, 96, 0.3)',
        borderRadius: '6px',
        border: '1px solid rgba(15, 52, 96, 0.5)',
      }}>
        调节参数观察质子自旋变化
        <br />
        点击采集按钮生成重建图像
      </div>

      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #4ecdc4;
          cursor: pointer;
          transition: all 0.25s ease;
          box-shadow: 0 0 0 0 rgba(78, 205, 196, 0.4);
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 0 0 6px rgba(78, 205, 196, 0.2);
        }
        input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #4ecdc4;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  );
}

export default ControlPanel;
