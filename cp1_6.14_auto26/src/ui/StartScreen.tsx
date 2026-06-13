import React from 'react'
import { FONT_FAMILY, COLORS } from '../game/constants'

interface StartScreenProps {
  onStart: () => void
}

export const StartScreen: React.FC<StartScreenProps> = ({ onStart }) => {
  return (
    <div style={styles.container}>
      <div style={styles.title}>LOOP ESCAPE</div>
      <div style={styles.subtitle}>时间循环解谜</div>
      <div style={styles.instructions}>
        <div style={styles.instructionTitle}>操作说明</div>
        <div style={styles.instructionItem}>A / D - 左右移动</div>
        <div style={styles.instructionItem}>W / 空格 - 跳跃</div>
        <div style={styles.instructionItem}>E - 交互 / 解谜</div>
        <div style={styles.instructionItem}>ESC - 关闭谜题</div>
      </div>
      <div style={styles.hint}>
        收集5个记忆碎片，解开最终谜题，逃出时间循环！
      </div>
      <button style={styles.startButton} onClick={onStart}>
        开始游戏
      </button>
      <div style={styles.footer}>每次循环120秒，收集的记忆碎片会永久保留</div>
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bgDark,
    zIndex: 50,
    gap: '24px',
  },
  title: {
    fontFamily: FONT_FAMILY,
    fontSize: '36px',
    color: COLORS.goldBright,
    textShadow: `4px 4px 0 ${COLORS.magenta}, 8px 8px 0 rgba(0,0,0,0.5)`,
    letterSpacing: '4px',
    animation: 'titleFloat 3s ease-in-out infinite',
  },
  subtitle: {
    fontFamily: FONT_FAMILY,
    fontSize: '14px',
    color: COLORS.teal,
    letterSpacing: '2px',
  },
  instructions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '20px',
    backgroundColor: 'rgba(26, 10, 46, 0.8)',
    border: `2px solid ${COLORS.gold}`,
    borderRadius: '4px',
  },
  instructionTitle: {
    fontFamily: FONT_FAMILY,
    fontSize: '12px',
    color: COLORS.gold,
    marginBottom: '8px',
    textAlign: 'center',
  },
  instructionItem: {
    fontFamily: FONT_FAMILY,
    fontSize: '10px',
    color: COLORS.white,
  },
  hint: {
    fontFamily: FONT_FAMILY,
    fontSize: '10px',
    color: COLORS.magenta,
    textAlign: 'center',
    maxWidth: '400px',
    lineHeight: 1.8,
  },
  startButton: {
    fontFamily: FONT_FAMILY,
    fontSize: '14px',
    padding: '12px 32px',
    backgroundColor: COLORS.wall,
    color: COLORS.goldBright,
    border: `3px solid ${COLORS.gold}`,
    cursor: 'pointer',
    transition: 'all 0.1s ease',
    letterSpacing: '2px',
  },
  footer: {
    fontFamily: FONT_FAMILY,
    fontSize: '8px',
    color: COLORS.gray,
    marginTop: '16px',
  },
}

export default StartScreen
