import React from 'react'
import type { Plant, Season } from '../plantData'

interface PlantInfoTooltipProps {
  plant: Plant
  season: Season
}

const seasonLabels: Record<Season, string> = {
  spring: '春',
  summer: '夏',
  autumn: '秋',
  winter: '冬'
}

const PlantInfoTooltip: React.FC<PlantInfoTooltipProps> = ({ plant, season }) => {
  const currentHeight = plant.seasonalHeight[season]
  const description = plant.seasonalDescription[season]

  return (
    <div style={styles.tooltip}>
      <div style={styles.header}>
        <span style={styles.icon}>{plant.icon}</span>
        <span style={styles.name}>{plant.name}</span>
      </div>
      <div style={styles.divider} />
      <div style={styles.row}>
        <span style={styles.label}>季节状态</span>
        <span style={styles.value}>{description}</span>
      </div>
      <div style={styles.row}>
        <span style={styles.label}>当前高度</span>
        <span style={styles.value}>{currentHeight}m</span>
      </div>
      <div style={styles.row}>
        <span style={styles.label}>冠幅半径</span>
        <span style={styles.value}>{plant.canopyRadius}m</span>
      </div>
      <div style={styles.seasonTag}>
        {seasonLabels[season]}季
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  tooltip: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 200,
    background: 'rgba(45, 52, 54, 0.9)',
    borderRadius: 8,
    padding: 14,
    color: '#dfe6e9',
    zIndex: 10,
    pointerEvents: 'none',
    backdropFilter: 'blur(4px)'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8
  },
  icon: {
    fontSize: 20
  },
  name: {
    fontSize: 15,
    fontWeight: 600,
    color: '#dfe6e9'
  },
  divider: {
    height: 1,
    background: 'rgba(223, 230, 233, 0.2)',
    margin: '8px 0'
  },
  row: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    marginBottom: 8
  },
  label: {
    fontSize: 11,
    color: '#b2bec3',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  value: {
    fontSize: 13,
    color: '#dfe6e9',
    lineHeight: 1.4
  },
  seasonTag: {
    display: 'inline-block',
    marginTop: 4,
    padding: '2px 10px',
    borderRadius: 10,
    background: '#00b894',
    color: '#fff',
    fontSize: 12,
    fontWeight: 500
  }
}

export default PlantInfoTooltip
