import React from 'react'
import { FONT_FAMILY, FONT_SIZE, WARNING_TIME, COLORS, MAX_SHARDS } from '../game/constants'

interface HUDProps {
  loopCount: number
  timeRemaining: number
  shardCount: number
}

export const HUD: React.FC<HUDProps> = ({ loopCount, timeRemaining, shardCount }) => {
  const isWarning = timeRemaining <= WARNING_TIME
  const minutes = Math.floor(timeRemaining / 60)
  const seconds = Math.floor(timeRemaining % 60)
  const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`

  return (
    <div style={styles.container}>
      <div style={styles.leftInfo}>
        <span style={styles.loopText}>循环 #{loopCount}</span>
      </div>
      <div style={styles.rightInfo}>
        <span
          style={{
            ...styles.timeText,
            color: isWarning ? COLORS.danger : COLORS.white,
            animation: isWarning ? 'blink 1s infinite' : 'none',
          }}
        >
          {timeStr}
        </span>
      </div>
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '16px',
    pointerEvents: 'none',
    zIndex: 10,
  },
  leftInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  rightInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '8px',
  },
  loopText: {
    fontFamily: FONT_FAMILY,
    fontSize: `${FONT_SIZE}px`,
    color: COLORS.white,
    textShadow: '2px 2px 0 #000',
  },
  timeText: {
    fontFamily: FONT_FAMILY,
    fontSize: `${FONT_SIZE}px`,
    textShadow: '2px 2px 0 #000',
  },
}

export default HUD
