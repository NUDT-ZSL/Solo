import React from 'react'
import { FONT_FAMILY, COLORS } from '../game/constants'

interface InteractionHintProps {
  text: string
  visible: boolean
}

export const InteractionHint: React.FC<InteractionHintProps> = ({ text, visible }) => {
  if (!visible) return null

  return (
    <div style={styles.container}>
      <span style={styles.key}>E</span>
      <span style={styles.text}>{text}</span>
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    position: 'absolute',
    bottom: '80px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    border: `2px solid ${COLORS.gold}`,
    borderRadius: '4px',
    zIndex: 10,
  },
  key: {
    fontFamily: FONT_FAMILY,
    fontSize: '10px',
    color: COLORS.bgDark,
    backgroundColor: COLORS.gold,
    padding: '4px 8px',
    borderRadius: '2px',
  },
  text: {
    fontFamily: FONT_FAMILY,
    fontSize: '10px',
    color: COLORS.white,
  },
}

export default InteractionHint
