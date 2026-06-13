import { useState, useEffect, useCallback } from 'react'
import type { FilterState } from './App'

interface ControlPanelProps {
  filter: FilterState
  onFilterChange: (newFilter: Partial<FilterState>) => void
}

const REGIONS = [
  { value: 'all', label: '全部地区' },
  { value: 'asia', label: '亚洲' },
  { value: 'europe', label: '欧洲' },
  { value: 'northAmerica', label: '北美洲' },
  { value: 'southAmerica', label: '南美洲' },
  { value: 'africa', label: '非洲' },
  { value: 'oceania', label: '大洋洲' },
]

const DATE_RANGES: { value: 'week' | 'month' | 'all'; label: string }[] = [
  { value: 'all', label: '全部时间' },
  { value: 'month', label: '最近一月' },
  { value: 'week', label: '最近一周' },
]

function PanelContent({ filter, onFilterChange, compact }: { filter: FilterState; onFilterChange: (f: Partial<FilterState>) => void; compact?: boolean }) {
  const selectStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    background: 'rgba(30,41,59,0.8)',
    border: '1px solid rgba(99,102,241,0.2)',
    borderRadius: '8px',
    color: '#e2e8f0',
    fontSize: '14px',
    fontFamily: "'Noto Sans SC', sans-serif",
    outline: 'none',
    cursor: 'pointer',
    appearance: 'none',
    WebkitAppearance: 'none',
    transition: 'border-color 0.2s ease-out, background 0.2s ease-out',
  }

  return (
    <div style={{ padding: compact ? '16px' : '24px' }}>
      <h2 style={{
        margin: '0 0 24px 0',
        fontSize: compact ? '16px' : '18px',
        fontWeight: 700,
        fontFamily: "'Orbitron', sans-serif",
        letterSpacing: '2px',
        color: '#c4b5fd',
        textShadow: '0 0 20px rgba(139,92,246,0.5), 0 0 40px rgba(139,92,246,0.2)',
        textTransform: 'uppercase',
      }}>
        GlobeStories
      </h2>

      <div style={{ marginBottom: '20px' }}>
        <label style={{
          display: 'block',
          marginBottom: '8px',
          fontSize: '12px',
          color: '#94a3b8',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          fontFamily: "'Orbitron', sans-serif",
        }}>
          地区
        </label>
        <select
          value={filter.region}
          onChange={e => onFilterChange({ region: e.target.value })}
          style={selectStyle}
          onFocus={e => { e.currentTarget.style.borderColor = 'rgba(139,92,246,0.5)'; e.currentTarget.style.background = 'rgba(30,41,59,1)' }}
          onBlur={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.2)'; e.currentTarget.style.background = 'rgba(30,41,59,0.8)' }}
        >
          {REGIONS.map(r => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: '8px' }}>
        <label style={{
          display: 'block',
          marginBottom: '8px',
          fontSize: '12px',
          color: '#94a3b8',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          fontFamily: "'Orbitron', sans-serif",
        }}>
          时间
        </label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {DATE_RANGES.map(dr => (
            <button
              key={dr.value}
              onClick={() => onFilterChange({ dateRange: dr.value })}
              style={{
                flex: '1 1 auto',
                padding: '8px 12px',
                background: filter.dateRange === dr.value
                  ? 'rgba(139,92,246,0.3)'
                  : 'rgba(30,41,59,0.6)',
                border: filter.dateRange === dr.value
                  ? '1px solid rgba(139,92,246,0.5)'
                  : '1px solid rgba(51,65,85,0.5)',
                borderRadius: '8px',
                color: filter.dateRange === dr.value ? '#c4b5fd' : '#94a3b8',
                fontSize: '13px',
                fontFamily: "'Noto Sans SC', sans-serif",
                cursor: 'pointer',
                transition: 'background 0.2s ease-out, border-color 0.2s ease-out, color 0.2s ease-out',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => {
                if (filter.dateRange !== dr.value) {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(30,41,59,0.9)'
                }
              }}
              onMouseLeave={e => {
                if (filter.dateRange !== dr.value) {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(30,41,59,0.6)'
                }
              }}
            >
              {dr.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function ControlPanel({ filter, onFilterChange }: ControlPanelProps) {
  const [isMobile, setIsMobile] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [dragY, setDragY] = useState(0)
  const dragging = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    dragging[1](true)
    setDragY(e.touches[0].clientY)
  }, [dragging])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragging[0]) return
    const currentY = e.touches[0].clientY
    const delta = currentY - dragY
    if (delta > 50 && drawerOpen) {
      setDrawerOpen(false)
      dragging[1](false)
    } else if (delta < -50 && !drawerOpen) {
      setDrawerOpen(true)
      dragging[1](false)
    }
  }, [dragging, drawerOpen, dragY])

  const handleTouchEnd = useCallback(() => {
    dragging[1](false)
  }, [dragging])

  if (isMobile) {
    return (
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 15,
          background: 'rgba(15,23,42,0.95)',
          borderTopLeftRadius: '20px',
          borderTopRightRadius: '20px',
          transform: drawerOpen ? 'translateY(0)' : 'translateY(calc(100% - 40px))',
          transition: 'transform 0.3s ease-out',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 -10px 40px rgba(0,0,0,0.5)',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          padding: '12px 0 4px',
          cursor: 'grab',
        }}>
          <div style={{
            width: '40px',
            height: '4px',
            borderRadius: '2px',
            background: 'rgba(148,163,184,0.4)',
          }} />
        </div>
        <PanelContent filter={filter} onFilterChange={onFilterChange} compact />
      </div>
    )
  }

  return (
    <div style={{
      position: 'absolute',
      top: '24px',
      left: '24px',
      width: '240px',
      background: 'rgba(15,23,42,0.75)',
      borderRadius: '12px',
      zIndex: 15,
      backdropFilter: 'blur(12px)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 0 1px rgba(255,255,255,0.1)',
      border: '1px solid rgba(99,102,241,0.1)',
    }}>
      <PanelContent filter={filter} onFilterChange={onFilterChange} />
    </div>
  )
}
