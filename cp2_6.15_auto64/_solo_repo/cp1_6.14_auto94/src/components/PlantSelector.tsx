import React from 'react'
import type { Plant } from '../plantData'

interface PlantSelectorProps {
  plants: Plant[]
  selectedIds: string[]
  onSelect: (plant: Plant) => void
  onClearAll: () => void
  onUndo: () => void
  canUndo: boolean
}

const PlantSelector: React.FC<PlantSelectorProps> = ({
  plants,
  selectedIds,
  onSelect,
  onClearAll,
  onUndo,
  canUndo
}) => {
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.headerIcon}>🌳</span>
        <span style={styles.headerTitle}>植物配置</span>
      </div>
      <div style={styles.cardList}>
        {plants.map((plant) => {
          const isSelected = selectedIds.includes(plant.id)
          return (
            <div
              key={plant.id}
              style={{
                ...styles.card,
                border: isSelected ? '2px solid #00b894' : '2px solid transparent',
                transform: isSelected ? 'scale(1.02)' : 'scale(1)'
              }}
              onClick={() => onSelect(plant)}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  ;(e.currentTarget as HTMLDivElement).style.transform = 'scale(1.05)'
                  ;(e.currentTarget as HTMLDivElement).style.background = '#3d4446'
                }
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLDivElement).style.transform = isSelected ? 'scale(1.02)' : 'scale(1)'
                ;(e.currentTarget as HTMLDivElement).style.background = '#353b3d'
              }}
            >
              <span style={styles.icon}>{plant.icon}</span>
              <div style={styles.info}>
                <span style={styles.name}>{plant.name}</span>
                <span style={styles.height}>{plant.minHeight}m - {plant.maxHeight}m</span>
              </div>
            </div>
          )
        })}
      </div>
      <div style={styles.actions}>
        <button
          style={{ ...styles.btn, ...styles.clearBtn }}
          onClick={onClearAll}
          onMouseEnter={(e) => {
            ;(e.target as HTMLButtonElement).style.transform = 'scale(1.05)'
          }}
          onMouseLeave={(e) => {
            ;(e.target as HTMLButtonElement).style.transform = 'scale(1)'
          }}
        >
          清空全部
        </button>
        <button
          style={{
            ...styles.btn,
            ...styles.undoBtn,
            opacity: canUndo ? 1 : 0.5,
            cursor: canUndo ? 'pointer' : 'not-allowed'
          }}
          onClick={onUndo}
          disabled={!canUndo}
          onMouseEnter={(e) => {
            if (canUndo) (e.target as HTMLButtonElement).style.transform = 'scale(1.05)'
          }}
          onMouseLeave={(e) => {
            ;(e.target as HTMLButtonElement).style.transform = 'scale(1)'
          }}
        >
          撤销上一步
        </button>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: 240,
    height: '100%',
    background: '#2d3436',
    borderRadius: 12,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    flexShrink: 0
  },
  header: {
    padding: '16px 16px 12px',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    borderBottom: '1px solid #3d4446'
  },
  headerIcon: {
    fontSize: 20
  },
  headerTitle: {
    color: '#dfe6e9',
    fontSize: 16,
    fontWeight: 600
  },
  cardList: {
    flex: 1,
    overflowY: 'auto',
    padding: '8px 8px 4px'
  },
  card: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 12px',
    marginBottom: 6,
    borderRadius: 8,
    background: '#353b3d',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxSizing: 'border-box'
  },
  icon: {
    fontSize: 24,
    lineHeight: 1
  },
  info: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2
  },
  name: {
    color: '#dfe6e9',
    fontSize: 14,
    fontWeight: 500
  },
  height: {
    color: '#b2bec3',
    fontSize: 12
  },
  actions: {
    padding: 12,
    display: 'flex',
    gap: 8,
    borderTop: '1px solid #3d4446'
  },
  btn: {
    width: 100,
    height: 36,
    borderRadius: 8,
    border: 'none',
    color: '#fff',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'transform 0.2s ease',
    fontFamily: 'inherit'
  },
  clearBtn: {
    background: '#d63031'
  },
  undoBtn: {
    background: '#636e72'
  }
}

export default PlantSelector
