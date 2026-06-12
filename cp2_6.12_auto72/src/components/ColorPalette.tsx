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
      <div className="color-bars">
        {sortedColors.map((color, index) => (
          <div
            key={`${color.hex}-${index}`}
            className="color-bar"
            style={{
              backgroundColor: color.hex,
              width: '30px',
              height: '20px'
            }}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            {hoveredIndex === index && (
              <div className="color-tooltip">
                {color.hex.toUpperCase()} · {color.percentage}%
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default ColorPalette
