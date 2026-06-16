import React from 'react'
import type { SimulationParams } from '../types'

interface ControlPanelProps {
  params: SimulationParams
  onFrequencyChange: (value: number) => void
  onAnisotropyChange: (value: number) => void
  onWaveTypeChange: (value: 'P' | 'S') => void
  onToggleRunning: () => void
  currentFps: number
  particleCount: number
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 'bold',
  lineHeight: '24px',
  color: '#e0fbfc',
  marginBottom: '8px',
  paddingBottom: '4px',
  borderBottom: '2px solid #ee6c4d',
}

const sliderContainerStyle: React.CSSProperties = {
  marginBottom: '16px',
}

const labelStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  fontSize: '12px',
  color: '#e0fbfc',
  marginBottom: '8px',
}

const valueDisplayStyle: React.CSSProperties = {
  background: '#293241',
  padding: '2px 8px',
  borderRadius: '4px',
  fontSize: '11px',
  color: '#ee6c4d',
  fontWeight: 'bold',
}

const sliderStyle: React.CSSProperties = {
  width: '100%',
  height: '6px',
  borderRadius: '3px',
  background: '#415a77',
  outline: 'none',
  WebkitAppearance: 'none',
  appearance: 'none',
  cursor: 'pointer',
}

const radioGroupStyle: React.CSSProperties = {
  display: 'flex',
  gap: '12px',
  marginBottom: '16px',
}

const radioLabelStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  fontSize: '12px',
  color: '#e0fbfc',
  cursor: 'pointer',
}

const buttonContainerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  marginTop: '8px',
}

const buttonStyle: React.CSSProperties = {
  width: '50%',
  height: '44px',
  borderRadius: '6px',
  border: 'none',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: 'bold',
  color: 'white',
  background: '#ee6c4d',
  transition: 'all 0.2s ease',
}

const buttonHoverStyle: React.CSSProperties = {
  ...buttonStyle,
  background: '#d65a3a',
}

const statsContainerStyle: React.CSSProperties = {
  marginTop: '16px',
  padding: '12px',
  background: '#293241',
  borderRadius: '8px',
  fontSize: '11px',
  color: '#98c1d9',
}

export function ControlPanel({
  params,
  onFrequencyChange,
  onAnisotropyChange,
  onWaveTypeChange,
  onToggleRunning,
  currentFps,
  particleCount,
}: ControlPanelProps) {
  const [isButtonHovered, setIsButtonHovered] = React.useState(false)

  return (
    <div
      style={{
        width: '320px',
        height: '100%',
        background: '#1b263b',
        borderRadius: '12px',
        padding: '20px',
        boxSizing: 'border-box',
        overflowY: 'auto',
        color: '#e0fbfc',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #e0fbfc;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          background: #98c1d9;
          box-shadow: 0 0 0 4px rgba(152, 193, 217, 0.4);
        }
        input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #e0fbfc;
          cursor: pointer;
          border: none;
          transition: all 0.2s ease;
        }
        input[type="range"]::-moz-range-thumb:hover {
          background: #98c1d9;
          box-shadow: 0 0 0 4px rgba(152, 193, 217, 0.4);
        }
        input[type="range"]:focus {
          outline: none;
        }
        input[type="range"]:focus::-webkit-slider-thumb {
          box-shadow: 0 0 0 4px rgba(238, 108, 77, 0.4);
        }
        input[type="radio"] {
          accent-color: #ee6c4d;
          width: 14px;
          height: 14px;
          cursor: pointer;
        }
        input[type="radio"]:focus {
          outline: 2px solid #ee6c4d;
          outline-offset: 2px;
        }
      `}</style>

      <h2
        style={{
          fontSize: '18px',
          fontWeight: 'bold',
          marginBottom: '20px',
          color: '#e0fbfc',
          textAlign: 'center',
        }}
      >
        地震波模拟控制面板
      </h2>

      <div style={sliderContainerStyle}>
        <div style={sectionTitleStyle}>波类型选择</div>
        <div style={radioGroupStyle}>
          <label style={radioLabelStyle}>
            <input
              type="radio"
              name="waveType"
              value="P"
              checked={params.waveType === 'P'}
              onChange={() => onWaveTypeChange('P')}
            />
            <span>P波（纵波）</span>
          </label>
          <label style={radioLabelStyle}>
            <input
              type="radio"
              name="waveType"
              value="S"
              checked={params.waveType === 'S'}
              onChange={() => onWaveTypeChange('S')}
            />
            <span>S波（横波）</span>
          </label>
        </div>
      </div>

      <div style={sliderContainerStyle}>
        <div style={sectionTitleStyle}>震源频率</div>
        <div style={labelStyle}>
          <span>频率 (Hz)</span>
          <span style={valueDisplayStyle}>{params.frequency.toFixed(1)}</span>
        </div>
        <input
          type="range"
          min="1"
          max="10"
          step="0.5"
          value={params.frequency}
          onChange={(e) => onFrequencyChange(parseFloat(e.target.value))}
          style={sliderStyle}
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '10px',
            color: '#98c1d9',
            marginTop: '4px',
          }}
        >
          <span>1</span>
          <span>10</span>
        </div>
      </div>

      <div style={sliderContainerStyle}>
        <div style={sectionTitleStyle}>各向异性强度</div>
        <div style={labelStyle}>
          <span>强度系数</span>
          <span style={valueDisplayStyle}>{params.anisotropyStrength.toFixed(1)}</span>
        </div>
        <input
          type="range"
          min="0.5"
          max="3.0"
          step="0.1"
          value={params.anisotropyStrength}
          onChange={(e) => onAnisotropyChange(parseFloat(e.target.value))}
          style={sliderStyle}
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '10px',
            color: '#98c1d9',
            marginTop: '4px',
          }}
        >
          <span>0.5</span>
          <span>3.0</span>
        </div>
      </div>

      <div style={buttonContainerStyle}>
        <button
          onClick={onToggleRunning}
          onMouseEnter={() => setIsButtonHovered(true)}
          onMouseLeave={() => setIsButtonHovered(false)}
          style={isButtonHovered ? buttonHoverStyle : buttonStyle}
        >
          {params.isRunning ? '停止模拟' : '开始模拟'}
        </button>
      </div>

      <div style={statsContainerStyle}>
        <div style={{ marginBottom: '6px' }}>
          <strong>性能指标</strong>
        </div>
        <div>帧率: {currentFps.toFixed(0)} FPS</div>
        <div>粒子数量: {particleCount}</div>
        <div>运行状态: {params.isRunning ? '运行中' : '已暂停'}</div>
      </div>

      <div
        style={{
          marginTop: '16px',
          padding: '12px',
          background: '#293241',
          borderRadius: '8px',
          fontSize: '11px',
          color: '#98c1d9',
          lineHeight: '1.6',
        }}
      >
        <div style={{ marginBottom: '6px', fontWeight: 'bold', color: '#e0fbfc' }}>
          操作说明
        </div>
        <div>• 鼠标左键拖动：旋转视角</div>
        <div>• 鼠标右键拖动：平移视图</div>
        <div>• 鼠标滚轮：缩放视图</div>
        <div>• 粒子颜色：蓝=低速，红=高速</div>
      </div>
    </div>
  )
}
