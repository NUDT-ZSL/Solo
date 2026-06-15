import { memo } from 'react'
import type { HistoricalEvent } from './data'
import { CATEGORY_LABELS, CATEGORY_COLORS } from './data'

interface EventCardProps {
  event: HistoricalEvent
  x: number
  y: number
  containerWidth: number
  containerHeight: number
  onSelect: () => void
}

function EventCardInner({ event, x, y, containerWidth, containerHeight, onSelect }: EventCardProps) {
  const cardW = 320
  const cardH = 220
  let posX = x + 20
  let posY = y - cardH / 2

  if (posX + cardW > containerWidth - 20) posX = x - cardW - 20
  if (posY < 20) posY = 20
  if (posY + cardH > containerHeight - 20) posY = containerHeight - cardH - 20

  const yearStr = event.year < 0 ? `公元前${Math.abs(event.year)}年` : `公元${event.year}年`
  const categoryColor = CATEGORY_COLORS[event.category] || '#ffb347'
  const categoryLabel = CATEGORY_LABELS[event.category] || event.category

  return (
    <div
      className="absolute z-50 pointer-events-auto animate-card-in"
      style={{
        left: posX,
        top: posY,
        width: cardW,
      }}
    >
      <div
        className="relative rounded-xl p-4 overflow-hidden"
        style={{
          background: 'rgba(15, 15, 40, 0.75)',
          backdropFilter: 'blur(20px)',
          border: `1px solid ${categoryColor}44`,
          boxShadow: `0 0 30px ${categoryColor}22, 0 8px 32px rgba(0,0,0,0.4)`,
        }}
      >
        <div
          className="absolute inset-0 opacity-10"
          style={{
            background: `radial-gradient(circle at 30% 20%, ${categoryColor}33, transparent 70%)`,
          }}
        />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-2">
            <span
              className="text-xs px-2 py-0.5 rounded-full font-mono"
              style={{
                background: `${categoryColor}22`,
                color: categoryColor,
                border: `1px solid ${categoryColor}44`,
              }}
            >
              {categoryLabel}
            </span>
            <span className="text-xs font-mono" style={{ color: 'rgba(200, 200, 220, 0.7)' }}>
              {yearStr}
            </span>
          </div>

          <h3 className="text-base font-bold mb-1.5 font-mono" style={{ color: '#e8e0ff' }}>
            {event.title}
          </h3>

          <p className="text-xs leading-relaxed mb-3 font-mono" style={{ color: 'rgba(200, 200, 220, 0.8)' }}>
            {event.description}
          </p>

          <button
            onClick={onSelect}
            className="w-full relative overflow-hidden rounded-full py-2 font-mono text-xs transition-all duration-300 hover:scale-105 active:scale-95"
            style={{
              background: `linear-gradient(135deg, ${categoryColor}33, ${categoryColor}11)`,
              color: categoryColor,
              border: `1px solid ${categoryColor}55`,
              boxShadow: `0 0 15px ${categoryColor}11`,
            }}
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              <span
                className="inline-block w-4 h-4 rounded-full border-2 flex items-center justify-center"
                style={{ borderColor: categoryColor }}
              >
                <span className="block w-1 h-1 rounded-full" style={{ background: categoryColor }} />
              </span>
              查看详细时间线
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}

const EventCard = memo(EventCardInner)
export default EventCard
