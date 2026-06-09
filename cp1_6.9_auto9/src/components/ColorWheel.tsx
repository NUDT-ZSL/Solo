import React from 'react'

export interface ColorOption {
  hex: string
  name: string
}

export const COLORS: ColorOption[] = [
  { hex: '#FFB347', name: '暖橙' },
  { hex: '#FFA07A', name: '珊瑚' },
  { hex: '#FF6B6B', name: '玫红' },
  { hex: '#F0A5AC', name: '樱粉' },
  { hex: '#DDA0DD', name: '梅紫' },
  { hex: '#B19CD9', name: '薰衣草' },
  { hex: '#87CEEB', name: '天蓝' },
  { hex: '#89CFF0', name: '冰蓝' },
  { hex: '#7FD8BE', name: '薄荷' },
  { hex: '#98D8AA', name: '嫩绿' },
  { hex: '#F7DC6F', name: '柠黄' },
  { hex: '#F5CBA7', name: '杏色' }
]

interface ColorWheelProps {
  selectedColor: ColorOption | null
  onSelect: (color: ColorOption) => void
}

const ColorWheel: React.FC<ColorWheelProps> = ({ selectedColor, onSelect }) => {
  const size = 280
  const centerX = size / 2
  const centerY = size / 2
  const radius = size / 2 - 30
  const sliceAngle = (2 * Math.PI) / COLORS.length

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {COLORS.map((color, index) => {
          const startAngle = index * sliceAngle - Math.PI / 2 - sliceAngle / 2
          const endAngle = startAngle + sliceAngle

          const x1 = centerX + radius * Math.cos(startAngle)
          const y1 = centerY + radius * Math.sin(startAngle)
          const x2 = centerX + radius * Math.cos(endAngle)
          const y2 = centerY + radius * Math.sin(endAngle)

          const innerRadius = radius - 40
          const x3 = centerX + innerRadius * Math.cos(endAngle)
          const y3 = centerY + innerRadius * Math.sin(endAngle)
          const x4 = centerX + innerRadius * Math.cos(startAngle)
          const y4 = centerY + innerRadius * Math.sin(startAngle)

          const path = [
            `M ${x1} ${y1}`,
            `A ${radius} ${radius} 0 0 1 ${x2} ${y2}`,
            `L ${x3} ${y3}`,
            `A ${innerRadius} ${innerRadius} 0 0 0 ${x4} ${y4}`,
            'Z'
          ].join(' ')

          const midAngle = (startAngle + endAngle) / 2
          const labelRadius = (radius + innerRadius) / 2
          const labelX = centerX + labelRadius * Math.cos(midAngle)
          const labelY = centerY + labelRadius * Math.sin(midAngle)

          const isSelected = selectedColor?.hex === color.hex

          return (
            <g
              key={color.hex}
              onClick={() => onSelect(color)}
              style={{ cursor: 'pointer' }}
            >
              <path
                d={path}
                fill={color.hex}
                stroke={isSelected ? '#ffffff' : 'rgba(255,255,255,0.1)'}
                strokeWidth={isSelected ? 3 : 1}
                opacity={selectedColor && !isSelected ? 0.7 : 1}
                style={{
                  transition: 'all 0.2s ease',
                  filter: isSelected ? 'brightness(1.1)' : 'none'
                }}
              />
              <text
                x={labelX}
                y={labelY}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="rgba(255,255,255,0.9)"
                fontSize="10"
                fontWeight="500"
                pointerEvents="none"
                style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
              >
                {color.name}
              </text>
            </g>
          )
        })}
        <circle
          cx={centerX}
          cy={centerY}
          r={40}
          fill={selectedColor ? selectedColor.hex : 'rgba(255,255,255,0.05)'}
          stroke="rgba(255,255,255,0.2)"
          strokeWidth={2}
          style={{ transition: 'fill 0.3s ease' }}
        />
        <text
          x={centerX}
          y={centerY - 8}
          textAnchor="middle"
          fill="rgba(255,255,255,0.9)"
          fontSize="12"
          fontWeight="600"
          pointerEvents="none"
        >
          {selectedColor ? selectedColor.name : '选择'}
        </text>
        <text
          x={centerX}
          y={centerY + 10}
          textAnchor="middle"
          fill="rgba(255,255,255,0.6)"
          fontSize="10"
          pointerEvents="none"
        >
          {selectedColor ? selectedColor.hex : '心情色'}
        </text>
      </svg>
    </div>
  )
}

export default ColorWheel
