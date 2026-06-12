import { useState, useEffect } from 'react'

interface ControlPanelProps {
  heatmapEnabled: boolean
  heatRange: [number, number]
  onHeatmapToggle: (enabled: boolean) => void
  onHeatRangeChange: (range: [number, number]) => void
  onResetView: () => void
}

export default function ControlPanel({
  heatmapEnabled,
  heatRange,
  onHeatmapToggle,
  onHeatRangeChange,
  onResetView
}: ControlPanelProps) {
  const [visible, setVisible] = useState(false)
  const [localRange, setLocalRange] = useState<[number, number]>(heatRange)
  const [dragging, setDragging] = useState<'min' | 'max' | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    setLocalRange(heatRange)
  }, [heatRange])

  const handleSliderMouseDown = (type: 'min' | 'max') => (e: React.MouseEvent) => {
    e.preventDefault()
    setDragging(type)
  }

  useEffect(() => {
    if (!dragging) return
    const handleMove = (e: MouseEvent) => {
      const slider = document.getElementById('heat-range-slider')
      if (!slider) return
      const rect = slider.getBoundingClientRect()
      let pct = ((e.clientX - rect.left) / rect.width) * 100
      pct = Math.max(0, Math.min(100, pct))
      const val = Math.round(pct)
      setLocalRange((prev) => {
        if (dragging === 'min') {
          const newMin = Math.min(val, prev[1] - 1)
          onHeatRangeChange([newMin, prev[1]])
          return [newMin, prev[1]]
        } else {
          const newMax = Math.max(val, prev[0] + 1)
          onHeatRangeChange([prev[0], newMax])
          return [prev[0], newMax]
        }
      })
    }
    const handleUp = () => setDragging(null)
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }
  }, [dragging, onHeatRangeChange])

  const minPct = localRange[0]
  const maxPct = localRange[1]

  return (
    <div
      style={{
        position: 'absolute',
        top: 20,
        left: 20,
        zIndex: 10,
        background: 'rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderRadius: 16,
        padding: 16,
        width: 280,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(-10px)',
        transition: 'opacity 0.3s ease, transform 0.3s ease',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        color: '#f1f5f9',
        border: '1px solid rgba(255,255,255,0.1)'
      }}
    >
      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, letterSpacing: 0.2 }}>
        控制面板
      </div>

      <div style={{ marginBottom: 20 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8
          }}
        >
          <span style={{ fontSize: 13, color: '#cbd5e1' }}>热力图叠加</span>
          <button
            onClick={() => onHeatmapToggle(!heatmapEnabled)}
            style={{
              position: 'relative',
              width: 44,
              height: 24,
              borderRadius: 12,
              background: heatmapEnabled ? '#3b82f6' : 'rgba(148, 163, 184, 0.4)',
              border: 'none',
              cursor: 'pointer',
              transition: 'background 0.2s ease',
              padding: 0
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 2,
                left: heatmapEnabled ? 22 : 2,
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: '#fff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                transition: 'left 0.2s ease'
              }}
            />
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 13, color: '#cbd5e1' }}>热度阈值过滤</span>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>
            {localRange[0]} - {localRange[1]}
          </span>
        </div>
        <div
          id="heat-range-slider"
          style={{
            position: 'relative',
            height: 6,
            background: 'rgba(148, 163, 184, 0.3)',
            borderRadius: 3,
            margin: '10px 0'
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: `${minPct}%`,
              right: `${100 - maxPct}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #3b82f6, #fbbf24, #ef4444)',
              borderRadius: 3
            }}
          />
          <div
            onMouseDown={handleSliderMouseDown('min')}
            style={{
              position: 'absolute',
              left: `calc(${minPct}% - 8px)`,
              top: -5,
              width: 16,
              height: 16,
              borderRadius: '50%',
              background: '#fff',
              boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
              cursor: 'grab',
              border: '2px solid #3b82f6'
            }}
          />
          <div
            onMouseDown={handleSliderMouseDown('max')}
            style={{
              position: 'absolute',
              left: `calc(${maxPct}% - 8px)`,
              top: -5,
              width: 16,
              height: 16,
              borderRadius: '50%',
              background: '#fff',
              boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
              cursor: 'grab',
              border: '2px solid #ef4444'
            }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b' }}>
          <span>0</span>
          <span>50</span>
          <span>100</span>
        </div>
      </div>

      <button
        onClick={onResetView}
        style={{
          width: '100%',
          height: 40,
          borderRadius: 10,
          background: 'rgba(59, 130, 246, 0.2)',
          border: '1px solid rgba(59, 130, 246, 0.4)',
          color: '#93c5fd',
          fontSize: 13,
          fontWeight: 500,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          transition: 'transform 0.15s ease, background 0.15s ease'
        }}
        onMouseEnter={(e) => {
          ;(e.currentTarget as HTMLElement).style.transform = 'scale(1.1)'
          ;(e.currentTarget as HTMLElement).style.background = 'rgba(59, 130, 246, 0.35)'
        }}
        onMouseLeave={(e) => {
          ;(e.currentTarget as HTMLElement).style.transform = 'scale(1)'
          ;(e.currentTarget as HTMLElement).style.background = 'rgba(59, 130, 246, 0.2)'
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="3" />
          <line x1="12" y1="2" x2="12" y2="5" />
          <line x1="12" y1="19" x2="12" y2="22" />
          <line x1="2" y1="12" x2="5" y2="12" />
          <line x1="19" y1="12" x2="22" y2="12" />
        </svg>
        重置视角
      </button>

      <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>图例</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#3b82f6' }} />
            <span style={{ fontSize: 11, color: '#94a3b8' }}>低 {'<'}30</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#fbbf24' }} />
            <span style={{ fontSize: 11, color: '#94a3b8' }}>中 30-70</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />
            <span style={{ fontSize: 11, color: '#94a3b8' }}>高 {'>'}70</span>
          </div>
        </div>
      </div>
    </div>
  )
}
