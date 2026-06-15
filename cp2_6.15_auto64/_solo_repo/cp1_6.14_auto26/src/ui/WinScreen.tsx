import React, { useState, useEffect } from 'react'
import { FONT_FAMILY, COLORS } from '../game/constants'

interface WinScreenProps {
  loopCount: number
  onRestart: () => void
}

export const WinScreen: React.FC<WinScreenProps> = ({ loopCount, onRestart }) => {
  const [show, setShow] = useState(false)
  const [showText, setShowText] = useState(false)

  useEffect(() => {
    setTimeout(() => setShow(true), 100)
    setTimeout(() => setShowText(true), 800)
  }, [])

  return (
    <div
      style={{
        ...styles.overlay,
        opacity: show ? 1 : 0,
        transition: 'opacity 1s ease',
      }}
    >
      <div style={styles.container}>
        <div style={{ ...styles.title, opacity: showText ? 1 : 0, transition: 'opacity 0.5s ease' }}>
          逃脱成功！
        </div>
        <div style={{ ...styles.subtitle, opacity: showText ? 1 : 0, transition: 'opacity 0.5s ease 0.3s' }}>
          你在第 <span style={{ color: COLORS.goldBright }}>{loopCount}</span> 次循环中成功逃脱
        </div>
        <div
          style={{
            ...styles.stats,
            opacity: showText ? 1 : 0,
            transition: 'opacity 0.5s ease 0.6s',
          }}
        >
          <div style={styles.statItem}>
            <div style={styles.statLabel}>总循环次数</div>
            <div style={styles.statValue}>{loopCount}</div>
          </div>
        </div>
        <button
          style={{
            ...styles.restartButton,
            opacity: showText ? 1 : 0,
            transition: 'opacity 0.5s ease 0.9s',
          }}
          onClick={onRestart}
        >
          再来一次
        </button>
      </div>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes glow {
          0%, 100% { text-shadow: 0 0 10px ${COLORS.goldBright}, 0 0 20px ${COLORS.goldBright}; }
          50% { text-shadow: 0 0 20px ${COLORS.goldBright}, 0 0 40px ${COLORS.goldBright}, 0 0 60px ${COLORS.magenta}; }
        }
      `}</style>
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10, 10, 15, 0.95)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
  },
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '24px',
    animation: 'float 3s ease-in-out infinite',
  },
  title: {
    fontFamily: FONT_FAMILY,
    fontSize: '32px',
    color: COLORS.goldBright,
    animation: 'glow 2s ease-in-out infinite',
    textAlign: 'center',
    lineHeight: 1.5,
  },
  subtitle: {
    fontFamily: FONT_FAMILY,
    fontSize: '14px',
    color: COLORS.white,
    textAlign: 'center',
  },
  stats: {
    display: 'flex',
    gap: '32px',
    marginTop: '16px',
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  statLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: '10px',
    color: COLORS.teal,
  },
  statValue: {
    fontFamily: FONT_FAMILY,
    fontSize: '24px',
    color: COLORS.goldBright,
  },
  restartButton: {
    fontFamily: FONT_FAMILY,
    fontSize: '12px',
    padding: '12px 24px',
    backgroundColor: COLORS.wall,
    color: COLORS.white,
    border: `3px solid ${COLORS.gold}`,
    cursor: 'pointer',
    transition: 'all 0.1s ease',
    marginTop: '16px',
  },
}

export default WinScreen
