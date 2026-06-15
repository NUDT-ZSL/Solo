import React from 'react'

interface ControlPanelProps {
  text: string
  onTextChange: (text: string) => void
  dissipationIntensity: number
  onDissipationChange: (v: number) => void
  reassemblySpeed: number
  onReassemblyChange: (v: number) => void
  onReset: () => void
  onSave: () => void
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  text,
  onTextChange,
  dissipationIntensity,
  onDissipationChange,
  reassemblySpeed,
  onReassemblyChange,
  onReset,
  onSave,
}) => {
  return (
    <div style={styles.panel}>
      <div style={styles.inner}>
        <div style={styles.group}>
          <input
            type="text"
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            placeholder="输入文字..."
            style={styles.input}
          />
        </div>

        <div style={styles.group}>
          <label style={styles.label}>
            <span style={styles.labelText}>消散强度</span>
            <span style={styles.labelValue}>{Math.round(dissipationIntensity * 100)}%</span>
          </label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={dissipationIntensity}
            onChange={(e) => onDissipationChange(parseFloat(e.target.value))}
            style={styles.slider}
          />
        </div>

        <div style={styles.group}>
          <label style={styles.label}>
            <span style={styles.labelText}>重组速度</span>
            <span style={styles.labelValue}>{Math.round(reassemblySpeed * 100)}%</span>
          </label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={reassemblySpeed}
            onChange={(e) => onReassemblyChange(parseFloat(e.target.value))}
            style={styles.slider}
          />
        </div>

        <div style={styles.buttonGroup}>
          <button onClick={onReset} style={styles.button}>
            重置
          </button>
          <button onClick={onSave} style={{ ...styles.button, ...styles.saveButton }}>
            保存
          </button>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    background: 'rgba(20, 18, 15, 0.65)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    borderTop: '1px solid rgba(218, 165, 32, 0.2)',
    boxShadow: '0 -4px 30px rgba(0, 0, 0, 0.4)',
  },
  inner: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
    padding: '14px 32px',
    maxWidth: 1200,
    margin: '0 auto',
    flexWrap: 'wrap',
  },
  group: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flex: '1 1 auto',
    minWidth: 140,
  },
  label: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: 11,
    color: 'rgba(218, 185, 100, 0.85)',
    fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
    letterSpacing: '0.5px',
  },
  labelText: {
    fontWeight: 500,
  },
  labelValue: {
    fontSize: 10,
    color: 'rgba(218, 185, 100, 0.5)',
    fontFamily: 'monospace',
  },
  input: {
    background: 'rgba(255, 255, 255, 0.06)',
    border: '1px solid rgba(218, 165, 32, 0.25)',
    borderRadius: 8,
    padding: '8px 14px',
    color: 'rgba(255, 240, 200, 0.9)',
    fontSize: 14,
    fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
    outline: 'none',
    transition: 'all 0.25s ease',
    boxShadow: '0 0 8px rgba(218, 165, 32, 0.08)',
    width: '100%',
    minWidth: 180,
  },
  slider: {
    WebkitAppearance: 'none',
    appearance: 'none',
    width: '100%',
    height: 4,
    background: 'rgba(218, 165, 32, 0.15)',
    borderRadius: 2,
    outline: 'none',
    cursor: 'pointer',
    boxShadow: '0 0 6px rgba(218, 165, 32, 0.1)',
  },
  buttonGroup: {
    display: 'flex',
    gap: 10,
    flexShrink: 0,
  },
  button: {
    background: 'rgba(218, 165, 32, 0.1)',
    border: '1px solid rgba(218, 165, 32, 0.35)',
    borderRadius: 8,
    padding: '8px 20px',
    color: 'rgba(255, 230, 150, 0.9)',
    fontSize: 13,
    fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
    cursor: 'pointer',
    transition: 'all 0.25s ease',
    boxShadow: '0 0 10px rgba(218, 165, 32, 0.08)',
    whiteSpace: 'nowrap',
  },
  saveButton: {
    background: 'rgba(218, 165, 32, 0.18)',
    border: '1px solid rgba(218, 165, 32, 0.45)',
  },
}

export default ControlPanel
