import React from 'react'
import type { Season } from '../plantData'

interface SeasonSelectorProps {
  season: Season
  onChange: (season: Season) => void
}

const seasons: { key: Season; label: string }[] = [
  { key: 'spring', label: '春' },
  { key: 'summer', label: '夏' },
  { key: 'autumn', label: '秋' },
  { key: 'winter', label: '冬' }
]

const SeasonSelector: React.FC<SeasonSelectorProps> = ({ season, onChange }) => {
  return (
    <div style={styles.container}>
      {seasons.map((s) => (
        <button
          key={s.key}
          style={{
            ...styles.btn,
            background: season === s.key ? '#00b894' : '#b2bec3',
            color: '#fff',
            transform: season === s.key ? 'scale(1.05)' : 'scale(1)'
          }}
          onClick={() => onChange(s.key)}
          onMouseEnter={(e) => {
            if (season !== s.key) {
              ;(e.target as HTMLButtonElement).style.background = '#a0adb2'
            }
          }}
          onMouseLeave={(e) => {
            ;(e.target as HTMLButtonElement).style.background =
              season === s.key ? '#00b894' : '#b2bec3'
          }}
        >
          {s.label}
        </button>
      ))}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    background: '#dfe6e9',
    borderRadius: 20,
    padding: '0 12px'
  },
  btn: {
    width: 60,
    height: 36,
    borderRadius: 16,
    border: 'none',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    fontFamily: 'inherit'
  }
}

export default SeasonSelector
