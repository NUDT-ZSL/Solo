import { useCallback } from 'react'
import { useStore } from '@/store/useStore'

export default function ControlPanel() {
  const avgWindSpeed = useStore((s) => s.avgWindSpeed)
  const resetView = useStore((s) => s.resetView)

  const displaySpeed = Math.round(avgWindSpeed * 10) / 10
  const speedPercent = Math.min(100, Math.max(0, ((avgWindSpeed - 5) / 35) * 100))
  const handleReset = useCallback(() => {
    resetView()
  }, [resetView])

  return (
    <div style={styles.panel}>
      <div style={styles.title}>全球风场监测</div>
      <div style={styles.speedSection}>
        <div style={styles.speedLabel}>
          <span>平均风速</span>
          <span style={styles.speedValue}>{displaySpeed} m/s</span>
        </div>
        <div style={styles.speedBarBg}>
          <div
            style={{
              ...styles.speedBarFill,
              width: `${speedPercent}%`,
            }}
          />
        </div>
        <div style={styles.speedRange}>
          <span>5</span>
          <span>40</span>
        </div>
      </div>
      <button style={styles.resetBtn} onClick={handleReset} onMouseEnter={onBtnHover} onMouseLeave={onBtnLeave}>
        ↻ 重置视角
      </button>
    </div>
  )
}

function onBtnHover(e: React.MouseEvent<HTMLButtonElement>) {
  const el = e.currentTarget as HTMLElement
  el.style.background = 'rgba(255,255,255,0.2)'
}

function onBtnLeave(e: React.MouseEvent<HTMLButtonElement>) {
  const el = e.currentTarget as HTMLElement
  el.style.background = 'rgba(255,255,255,0.08)'
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    position: 'fixed',
    top: 16,
    left: 16,
    width: 200,
    padding: 12,
    background: 'rgba(10,10,26,0.85)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    borderRadius: 12,
    border: '1px solid rgba(30,136,229,0.2)',
    zIndex: 100,
    fontFamily: "'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif",
    boxSizing: 'border-box',
  },
  title: {
    color: 'rgba(30,136,229,0.9)',
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 10,
    letterSpacing: 1,
  },
  speedSection: {
    marginBottom: 12,
  },
  speedLabel: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    marginBottom: 6,
  },
  speedValue: {
    color: '#ffeb3b',
    fontWeight: 600,
    fontSize: 12,
  },
  speedBarBg: {
    width: '100%',
    height: 4,
    background: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  speedBarFill: {
    height: '100%',
    background: 'linear-gradient(to right, #1e88e5, #e53935)',
    borderRadius: 2,
    transition: 'width 0.3s ease-out',
  },
  speedRange: {
    display: 'flex',
    justifyContent: 'space-between',
    color: 'rgba(255,255,255,0.3)',
    fontSize: 9,
    marginTop: 2,
  },
  resetBtn: {
    width: '100%',
    padding: '6px 0',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(30,136,229,0.25)',
    borderRadius: 6,
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    cursor: 'pointer',
    transition: 'background 0.15s, color 0.15s',
    fontFamily: "'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif",
  },
}
