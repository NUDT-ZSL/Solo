import { useState, useCallback } from 'react'
import { usePerfumeStore } from '@/stores/perfumeStore'
import type { Aroma } from '@/stores/perfumeStore'

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

export default function AromaWheel() {
  const { aromas, addAroma, selectedAromas } = usePerfumeStore()
  const [hoveredId, setHoveredId] = useState<number>(-1)

  const isSelected = useCallback(
    (id: number) => selectedAromas.some((s) => s.aroma.id === id),
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
    <div className="relative flex flex-col items-center">
      <h2 className="text-2xl font-serif mb-4 text-amber-800 tracking-wider">香味轮盘</h2>
      <div className="relative" style={{ width: size, height: size }}>
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'radial-gradient(circle, #fff5e6 0%, #ffe0b2 100%)',
            boxShadow:
              '0 4px 24px rgba(224, 200, 160, 0.4), inset 0 0 30px rgba(255,255,255,0.5)',
          }}
        />

        {categories.map((cat) => {
          const angle = CATEGORY_ANGLES[cat] ?? 0
          const innerPos = polarToCartesian(cx, cy, 40, angle)
          const outerPos = polarToCartesian(cx, cy, labelRadius - 30, angle)
          return (
            <svg
              key={cat}
              className="absolute inset-0 pointer-events-none"
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
              className="absolute flex items-center justify-center cursor-pointer transition-transform duration-200"
              style={{
                left: x - 32,
                top: y - 16,
                transform: isHovered ? 'scale(1.1)' : 'scale(1)',
                zIndex: isHovered ? 20 : selected ? 10 : 5,
              }}
              onClick={() => addAroma(aroma)}
              onMouseEnter={() => setHoveredId(aroma.id)}
              onMouseLeave={() => setHoveredId(-1)}
            >
              <div
                className="flex items-center justify-center px-3 py-1.5 text-sm font-medium whitespace-nowrap select-none"
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
          className="absolute flex items-center justify-center rounded-full"
          style={{
            left: cx - 36,
            top: cy - 36,
            width: 72,
            height: 72,
            background: 'radial-gradient(circle, #fff 0%, #ffe0b2 100%)',
            boxShadow: '0 2px 12px rgba(224,200,160,0.3)',
          }}
        >
          <span className="text-xs text-amber-800 font-serif tracking-wider">调香盘</span>
        </div>

        {categories.map((cat) => {
          const angle = CATEGORY_ANGLES[cat] ?? 0
          const pos = polarToCartesian(cx, cy, 22, angle)
          return (
            <div
              key={`label-${cat}`}
              className="absolute text-[10px] text-amber-700/60 font-serif pointer-events-none"
              style={{ left: pos.x - 14, top: pos.y - 6 }}
            >
              {CATEGORY_LABELS[cat]}
            </div>
          )
        })}
      </div>

      {hoveredAroma && hoveredId !== -1 && (
        <div
          className="absolute z-30 px-3 py-2 rounded-lg text-sm max-w-[200px] pointer-events-none"
          style={{
            background: 'rgba(255,255,255,0.95)',
            border: '1px solid #e0c8a0',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            left: '50%',
            bottom: -10,
            transform: 'translateX(-50%) translateY(100%)',
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full" style={{ background: hoveredAroma.color }} />
            <span className="font-medium text-amber-900">{hoveredAroma.name}</span>
            <span className="text-xs text-amber-600">{CATEGORY_LABELS[hoveredAroma.category]}</span>
          </div>
          <p className="text-xs text-amber-700 leading-relaxed">{hoveredAroma.description}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mt-4 justify-center max-w-[400px]">
        {categories.map((cat) => (
          <div key={cat} className="flex items-center gap-1 text-xs text-amber-700">
            <div
              className="w-2.5 h-2.5 rounded-full"
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
