import { POIData } from '../scene/DataLoader'

interface InfoPopupProps {
  poi: POIData
  position: { x: number; y: number }
  onClose: () => void
}

export default function InfoPopup({ poi, position, onClose }: InfoPopupProps) {
  const heatColor =
    poi.heat < 30 ? '#3b82f6' : poi.heat <= 70 ? '#fbbf24' : '#ef4444'

  const popupWidth = 240
  const popupHeight = 160
  let left = position.x + 15
  let top = position.y - popupHeight / 2
  if (left + popupWidth > window.innerWidth - 10) {
    left = position.x - popupWidth - 15
  }
  if (top < 10) top = 10
  if (top + popupHeight > window.innerHeight - 10) {
    top = window.innerHeight - popupHeight - 10
  }

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        left,
        top,
        zIndex: 100,
        width: popupWidth,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderRadius: 12,
        padding: 12,
        border: '1px solid rgba(255, 255, 255, 0.12)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        color: '#f1f5f9',
        animation: 'popupFade 0.15s ease-out'
      }}
    >
      <style>{`
        @keyframes popupFade {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 10
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.3, maxWidth: 180 }}>
          {poi.name}
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            fontSize: 16,
            padding: 0,
            lineHeight: 1,
            width: 20,
            height: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          ×
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>类别</span>
          <span
            style={{
              fontSize: 12,
              background: 'rgba(255,255,255,0.08)',
              padding: '2px 8px',
              borderRadius: 4,
              color: '#cbd5e1'
            }}
          >
            {poi.category}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>热度值</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 80,
                height: 6,
                background: 'rgba(148, 163, 184, 0.2)',
                borderRadius: 3,
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  width: `${poi.heat}%`,
                  height: '100%',
                  background: `linear-gradient(90deg, #3b82f6, #fbbf24, #ef4444)`,
                  borderRadius: 3
                }}
              />
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: heatColor, minWidth: 28, textAlign: 'right' }}>
              {poi.heat}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>经纬度</span>
          <span style={{ fontSize: 11, color: '#cbd5e1', fontFamily: 'monospace' }}>
            {poi.lng.toFixed(4)}, {poi.lat.toFixed(4)}
          </span>
        </div>
      </div>
    </div>
  )
}
