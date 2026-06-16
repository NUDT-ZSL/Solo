import React from 'react'

export interface ControlPanelProps {
  theme: string
  particleCount: number
  onThemeChange: (theme: string) => void
  onParticleCountChange: (count: number) => void
  onResetView: () => void
}

const themeOptions = [
  { value: 'default', label: '默认蓝紫粉' },
  { value: 'aurora', label: '极光绿紫' },
  { value: 'fire', label: '火焰红橙' },
  { value: 'ice', label: '冰蓝银白' }
]

const ControlPanel: React.FC<ControlPanelProps> = ({
  theme,
  particleCount,
  onThemeChange,
  onParticleCountChange,
  onResetView
}) => {
  return (
    <div style={panelStyle}>
      <div style={titleStyle}>控制面板</div>

      <div style={controlGroupStyle}>
        <label style={labelStyle}>颜色主题</label>
        <select
          value={theme}
          onChange={(e) => onThemeChange(e.target.value)}
          style={selectStyle}
        >
          {themeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div style={controlGroupStyle}>
        <label style={labelStyle}>
          粒子数量: {(particleCount / 10000).toFixed(0)}万
        </label>
        <input
          type="range"
          min="10000"
          max="100000"
          step="10000"
          value={particleCount}
          onChange={(e) => onParticleCountChange(Number(e.target.value))}
          style={sliderStyle}
        />
        <div style={rangeLabelsStyle}>
          <span>1万</span>
          <span>10万</span>
        </div>
      </div>

      <button onClick={onResetView} style={buttonStyle}>
        重置视角
      </button>
    </div>
  )
}

const panelStyle: React.CSSProperties = {
  position: 'absolute',
  top: '24px',
  left: '24px',
  padding: '20px',
  borderRadius: '16px',
  backgroundColor: 'rgba(0, 0, 0, 0.3)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  color: '#bbbbbb',
  fontSize: '14px',
  minWidth: '200px',
  zIndex: 100,
  userSelect: 'none'
}

const titleStyle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 600,
  marginBottom: '16px',
  color: '#dddddd',
  letterSpacing: '0.5px'
}

const controlGroupStyle: React.CSSProperties = {
  marginBottom: '16px'
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '8px',
  fontSize: '12px',
  color: '#999999'
}

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  backgroundColor: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid #555555',
  borderRadius: '8px',
  color: '#bbbbbb',
  fontSize: '13px',
  cursor: 'pointer',
  outline: 'none',
  transition: 'border-color 0.3s ease, background-color 0.3s ease',
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23999' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 10px center',
  paddingRight: '30px'
}

const sliderStyle: React.CSSProperties = {
  width: '100%',
  height: '4px',
  borderRadius: '2px',
  backgroundColor: '#333333',
  outline: 'none',
  cursor: 'pointer',
  appearance: 'none',
  WebkitAppearance: 'none'
}

const rangeLabelsStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: '10px',
  color: '#666666',
  marginTop: '4px'
}

const buttonStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 16px',
  backgroundColor: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid #555555',
  borderRadius: '8px',
  color: '#bbbbbb',
  fontSize: '13px',
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  marginTop: '4px'
}

export default ControlPanel
