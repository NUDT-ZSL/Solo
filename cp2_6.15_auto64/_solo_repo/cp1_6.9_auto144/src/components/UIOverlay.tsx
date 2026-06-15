import type { LightMode } from '../App'

interface UIOverlayProps {
  lightMode: LightMode
  bloomEnabled: boolean
  fps: number
  particleCount: number
  mounted: boolean
  onResetView: () => void
  onToggleLightMode: () => void
  onToggleBloom: () => void
}

const lightModeLabels: Record<LightMode, string> = {
  white: '白光模式',
  colorful: '彩光模式',
  gradient: '渐变模式',
}

export default function UIOverlay({
  lightMode,
  bloomEnabled,
  fps,
  particleCount,
  mounted,
  onResetView,
  onToggleLightMode,
  onToggleBloom,
}: UIOverlayProps) {
  return (
    <>
      <div
        style={{
          ...styles.topLeft,
          transform: mounted ? 'translateY(0)' : 'translateY(-20px)',
          opacity: mounted ? 1 : 0,
        }}
      >
        <h1 style={styles.title}>浮光棱镜</h1>
        <p style={styles.hint}>
          🖱️ 鼠标拖拽旋转 &nbsp;|&nbsp; 🔍 滚轮缩放 &nbsp;|&nbsp; 👆 点击光谱交互
        </p>
        <div style={styles.buttonGroup}>
          <button style={styles.button} onClick={onResetView}>
            🔄 重置视角
          </button>
          <button style={styles.button} onClick={onToggleLightMode}>
            💡 {lightModeLabels[lightMode]}
          </button>
          <button
            style={{
              ...styles.button,
              background: bloomEnabled ? 'rgba(0,60,120,0.7)' : 'rgba(0,20,50,0.6)',
            }}
            onClick={onToggleBloom}
          >
            {bloomEnabled ? '✨ Bloom开' : '⭕ Bloom关'}
          </button>
        </div>
      </div>

      <div
        style={{
          ...styles.bottomCenter,
          transform: mounted ? 'translateY(0)' : 'translateY(20px)',
          opacity: mounted ? 1 : 0,
        }}
      >
        <div style={styles.perfItem}>
          <span style={styles.perfLabel}>粒子总数</span>
          <span style={styles.perfValue}>{particleCount.toLocaleString()}</span>
        </div>
        <div style={styles.perfDivider} />
        <div style={styles.perfItem}>
          <span style={styles.perfLabel}>FPS</span>
          <span
            style={{
              ...styles.perfValue,
              color: fps >= 50 ? '#6BFF9B' : fps >= 30 ? '#FFD26B' : '#FF6B6B',
            }}
          >
            {fps}
          </span>
        </div>
      </div>
    </>
  )
}

const styles: Record<string, React.CSSProperties> = {
  topLeft: {
    position: 'absolute',
    top: 24,
    left: '5%',
    zIndex: 10,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    pointerEvents: 'none',
    transition: 'transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.6s ease',
  },
  title: {
    fontSize: 32,
    fontWeight: 300,
    color: '#C0D9FF',
    letterSpacing: 4,
    margin: 0,
    textShadow: '0 0 20px rgba(192, 217, 255, 0.5), 0 0 40px rgba(100, 150, 255, 0.2)',
  },
  hint: {
    fontSize: 13,
    fontWeight: 300,
    color: 'rgba(192, 217, 255, 0.6)',
    margin: 0,
    letterSpacing: 1,
  },
  buttonGroup: {
    display: 'flex',
    gap: 10,
    marginTop: 4,
    pointerEvents: 'auto',
  },
  button: {
    padding: '8px 18px',
    fontSize: 13,
    fontWeight: 400,
    color: '#C0D9FF',
    background: 'rgba(0, 20, 50, 0.6)',
    border: '1px solid rgba(100, 150, 255, 0.2)',
    borderRadius: 8,
    cursor: 'pointer',
    letterSpacing: 1,
    transition: 'all 0.3s ease',
    backdropFilter: 'blur(8px)',
    fontFamily: 'inherit',
  },
  bottomCenter: {
    position: 'absolute',
    bottom: 20,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 10,
    display: 'flex',
    alignItems: 'center',
    gap: 20,
    padding: '10px 28px',
    background: 'rgba(0, 15, 35, 0.5)',
    border: '1px solid rgba(100, 150, 255, 0.15)',
    borderRadius: 12,
    backdropFilter: 'blur(10px)',
    transition: 'transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.6s ease',
  },
  perfItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
  },
  perfLabel: {
    fontSize: 11,
    fontWeight: 300,
    color: 'rgba(192, 217, 255, 0.5)',
    letterSpacing: 1,
  },
  perfValue: {
    fontSize: 18,
    fontWeight: 300,
    color: '#C0D9FF',
    fontFamily: 'monospace',
  },
  perfDivider: {
    width: 1,
    height: 28,
    background: 'rgba(100, 150, 255, 0.2)',
  },
}
