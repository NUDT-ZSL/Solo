import { useState, useCallback } from 'react'
import type { Aroma } from '@/types'
import './AromaWheel.css'

interface AromaWheelProps {
  aromas: Aroma[]
  selectedAromas: Aroma[]
  onSelectAroma: (aroma: Aroma) => void
}

const CATEGORY_LABELS: Record<string, string> = {
  floral: '花香',
  woody: '木质',
  fruity: '果香',
  fresh: '清新',
  spicy: '辛香',
  herbal: '草本',
}

const CATEGORY_ANGLES: Record<string, number> = {
  floral: 0,
  woody: 60,
  fruity: 120,
  fresh: 180,
  spicy: 240,
  herbal: 300,
}

function polarToCartesian(cx: number, cy: number, radius: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad),
  }
}

export default function AromaWheel({
  aromas,
  selectedAromas,
  onSelectAroma,
}: AromaWheelProps) {
  const [hoveredId, setHoveredId] = useState<number>(-1)

  const isSelected = useCallback(
    (id: number) => selectedAromas.some((a) => a.id === id),
    [selectedAromas]
  )

  const grouped = aromas.reduce<Record<string, Aroma[]>>((acc, aroma) => {
    if (!acc[aroma.category]) acc[aroma.category] = []
    acc[aroma.category].push(aroma)
    return acc
  }, {})

  const categories = Object.keys(grouped)
  const size = 400
  const cx = size / 2
  const cy = size / 2
  const labelRadius = size / 2 - 50

  const items: { aroma: Aroma; x: number; y: number }[] = []

  for (const cat of categories) {
    const catAngle = CATEGORY_ANGLES[cat] ?? 0
    const itemsInCat = grouped[cat]
    const spread = 45
    for (let i = 0; i < itemsInCat.length; i++) {
      const offset =
        itemsInCat.length === 1
          ? 0
          : ((i - (itemsInCat.length - 1) / 2) * spread) / (itemsInCat.length - 1)
      const angle = catAngle + offset
      const pos = polarToCartesian(cx, cy, labelRadius, angle)
      items.push({ aroma: itemsInCat[i], x: pos.x, y: pos.y })
    }
  }

  const hoveredAroma = aromas.find((a) => a.id === hoveredId)

  return (
    <div className="aroma-wheel-container">
      <h2 className="aroma-wheel-title">香味轮盘</h2>
      <div className="aroma-wheel" style={{ width: size, height: size }}>
        <div className="aroma-wheel-bg" />

        {categories.map((cat) => {
          const angle = CATEGORY_ANGLES[cat] ?? 0
          const innerPos = polarToCartesian(cx, cy, 40, angle)
          const outerPos = polarToCartesian(cx, cy, labelRadius - 30, angle)
          return (
            <svg
              key={cat}
              className="aroma-wheel-svg"
              width={size}
              height={size}
            >
              <line
                x1={innerPos.x}
                y1={innerPos.y}
                x2={outerPos.x}
                y2={outerPos.y}
                stroke="#e0c8a0"
                strokeWidth="1"
                strokeDasharray="4,4"
                opacity="0.5"
              />
            </svg>
          )
        })}

        {items.map(({ aroma, x, y }) => {
          const selected = isSelected(aroma.id)
          const isHovered = hoveredId === aroma.id
          return (
            <div
              key={aroma.id}
              className={`aroma-tag ${isHovered ? 'hovered' : ''} ${selected ? 'selected' : ''}`}
              style={{
                left: x - 32,
                top: y - 16,
              }}
              onClick={() => onSelectAroma(aroma)}
              onMouseEnter={() => setHoveredId(aroma.id)}
              onMouseLeave={() => setHoveredId(-1)}
            >
              <div
                className="aroma-tag-inner"
                style={{
                  background: aroma.color,
                  borderRadius: 10,
                  color: aroma.category === 'fresh' ? '#5d4037' : '#fff',
                  boxShadow: selected
                    ? `0 0 0 3px #fff, 0 0 0 5px ${aroma.color}, 0 2px 8px rgba(0,0,0,0.15)`
                    : '0 2px 6px rgba(0,0,0,0.1)',
                  opacity: selected ? 0.7 : 1,
                  border: selected ? '2px dashed rgba(255,255,255,0.6)' : 'none',
                }}
              >
                {aroma.name}
              </div>
            </div>
          )
        })}

        <div
          className="aroma-wheel-center"
          style={{
            left: cx - 36,
            top: cy - 36,
            width: 72,
            height: 72,
          }}
        >
          <span className="aroma-wheel-center-text">调香盘</span>
        </div>

        {categories.map((cat) => {
          const angle = CATEGORY_ANGLES[cat] ?? 0
          const pos = polarToCartesian(cx, cy, 22, angle)
          return (
            <div
              key={`label-${cat}`}
              className="aroma-category-label"
              style={{ left: pos.x - 14, top: pos.y - 6 }}
            >
              {CATEGORY_LABELS[cat]}
            </div>
          )
        })}
      </div>

      {hoveredAroma && hoveredId !== -1 && (
        <div className="aroma-tooltip">
          <div className="aroma-tooltip-header">
            <div
              className="aroma-tooltip-color"
              style={{ background: hoveredAroma.color }}
            />
            <span className="aroma-tooltip-name">{hoveredAroma.name}</span>
            <span className="aroma-tooltip-category">
              {CATEGORY_LABELS[hoveredAroma.category]}
            </span>
          </div>
          <p className="aroma-tooltip-desc">{hoveredAroma.description}</p>
        </div>
      )}

      <div className="aroma-legend">
        {categories.map((cat) => (
          <div key={cat} className="aroma-legend-item">
            <div
              className="aroma-legend-dot"
              style={{
                background:
                  cat === 'floral'
                    ? '#F48FB1'
                    : cat === 'woody'
                      ? '#A1887F'
                      : cat === 'fruity'
                        ? '#FFA726'
                        : cat === 'fresh'
                          ? '#A5D6A7'
                          : cat === 'spicy'
                            ? '#D4A373'
                            : '#81C784',
              }}
            />
            {CATEGORY_LABELS[cat]}
          </div>
        ))}
      </div>
    </div>
  )
}
