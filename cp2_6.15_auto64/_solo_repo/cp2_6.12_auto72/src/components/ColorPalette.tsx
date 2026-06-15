import { useState } from 'react'
import type { ColorSwatch } from '@/types'

interface ColorPaletteProps {
  colors: ColorSwatch[]
}

const ColorPalette = ({ colors }: ColorPaletteProps) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const sortedColors = [...colors].sort((a, b) => b.percentage - a.percentage)

  return (
    <div className="color-palette-container">
      <h4 className="detail-section-title">色板分析</h4>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          flexWrap: 'wrap'
        }}
      >
        {sortedColors.map((color, index) => (
          <div
            key={`${color.hex}-${index}`}
            style={{
              width: '30px',
              height: '20px',
              borderRadius: '4px',
              backgroundColor: color.hex,
              cursor: 'pointer',
              position: 'relative',
              transition: 'transform 0.15s ease',
              transform: hoveredIndex === index ? 'scaleY(1.15)' : 'scaleY(1)',
              transformOrigin: 'bottom'
            }}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            {hoveredIndex === index && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 'calc(100% + 6px)',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  padding: '6px 10px',
                  backgroundColor: 'rgba(45, 45, 45, 0.95)',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: 500,
                  borderRadius: '6px',
                  whiteSpace: 'nowrap',
                  zIndex: 10,
                  pointerEvents: 'none',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
                }}
              >
                <span style={{ textTransform: 'uppercase' }}>{color.hex}</span>
                <span style={{ margin: '0 6px', opacity: 0.6 }}>·</span>
                <span>{color.percentage}%</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default ColorPalette
