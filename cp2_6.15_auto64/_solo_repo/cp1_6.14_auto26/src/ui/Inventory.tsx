import React from 'react'
import { FONT_FAMILY, FONT_SIZE, MOBILE_FONT_SIZE, COLORS, MAX_INVENTORY_SLOTS, MAX_SHARDS } from '../game/constants'

interface InventoryProps {
  shardsCollected: string[]
  isMobile?: boolean
}

export const Inventory: React.FC<InventoryProps> = ({ shardsCollected, isMobile = false }) => {
  const gridCols = isMobile ? 4 : 8
  const gridRows = isMobile ? 4 : 2
  const cellSize = isMobile ? 28 : 32
  const fontSize = isMobile ? MOBILE_FONT_SIZE - 4 : FONT_SIZE - 4

  const slots = []
  for (let i = 0; i < MAX_INVENTORY_SLOTS; i++) {
    const hasShard = i < shardsCollected.length
    slots.push(
      <div
        key={i}
        style={{
          ...styles.slot,
          width: cellSize,
          height: cellSize,
          border: hasShard ? `2px solid ${COLORS.goldBright}` : `2px solid ${COLORS.gray}`,
          backgroundColor: hasShard ? 'rgba(255, 215, 0, 0.2)' : 'rgba(0, 0, 0, 0.5)',
          transition: 'transform 0.15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.15)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)'
        }}
      >
        {hasShard && (
          <div
            style={{
              ...styles.shardIcon,
              width: cellSize - 12,
              height: cellSize - 12,
            }}
          />
        )}
      </div>,
    )
  }

  return (
    <div style={styles.container}>
      <div style={{ ...styles.label, fontSize: `${fontSize}px` }}>
        背包 {shardsCollected.length}/{MAX_SHARDS}
      </div>
      <div
        style={{
          ...styles.grid,
          gridTemplateColumns: `repeat(${gridCols}, ${cellSize}px)`,
          gridTemplateRows: `repeat(${gridRows}, ${cellSize}px)`,
          gap: isMobile ? '4px' : '6px',
        }}
      >
        {slots}
      </div>
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    position: 'absolute',
    bottom: '16px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    zIndex: 10,
  },
  label: {
    fontFamily: FONT_FAMILY,
    color: COLORS.white,
    textShadow: '2px 2px 0 #000',
  },
  grid: {
    display: 'grid',
    padding: '8px',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    border: `2px solid ${COLORS.gold}`,
    borderRadius: '4px',
  },
  slot: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '2px',
    cursor: 'pointer',
    boxSizing: 'border-box',
  },
  shardIcon: {
    backgroundColor: COLORS.goldBright,
    boxShadow: `0 0 8px ${COLORS.goldBright}`,
  },
}

export default Inventory
