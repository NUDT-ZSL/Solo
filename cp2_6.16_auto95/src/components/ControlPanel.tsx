import { useRef, useEffect, useCallback } from 'react'
import type { Earthquake } from '@/hooks/useEarthquakeData'
import './ControlPanel.css'

interface ControlPanelProps {
  earthquakes: Earthquake[]
  selectedEarthquake: Earthquake | null
  minMagnitude: number
  onMinMagnitudeChange: (value: number) => void
  onEarthquakeClick: (earthquake: Earthquake) => void
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${hours}:${minutes}`
}

function getMagnitudeColor(magnitude: number): string {
  if (magnitude >= 6) return '#ff4444'
  if (magnitude >= 4) return '#ff8833'
  return '#ffdd55'
}

export function ControlPanel({
  earthquakes,
  selectedEarthquake,
  minMagnitude,
  onMinMagnitudeChange,
  onEarthquakeClick
}: ControlPanelProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  useEffect(() => {
    if (selectedEarthquake && listRef.current) {
      const key = `${selectedEarthquake.longitude}-${selectedEarthquake.latitude}-${selectedEarthquake.timestamp}`
      const element = itemRefs.current.get(key)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [selectedEarthquake])

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onMinMagnitudeChange(parseFloat(e.target.value))
    },
    [onMinMagnitudeChange]
  )

  const handleItemClick = useCallback(
    (earthquake: Earthquake) => {
      onEarthquakeClick(earthquake)
    },
    [onEarthquakeClick]
  )

  const isSelected = (eq: Earthquake) => {
    if (!selectedEarthquake) return false
    return (
      selectedEarthquake.longitude === eq.longitude &&
      selectedEarthquake.latitude === eq.latitude &&
      selectedEarthquake.timestamp === eq.timestamp
    )
  }

  return (
    <div className="control-panel">
      <h2 className="panel-title">全球地震事件</h2>

      <div className="slider-container">
        <div className="slider-label">
          <span>最小震级</span>
          <span className="slider-value">{minMagnitude.toFixed(1)}</span>
        </div>
        <input
          type="range"
          min="3.0"
          max="8.0"
          step="0.1"
          value={minMagnitude}
          onChange={handleSliderChange}
          className="magnitude-slider"
        />
        <div className="slider-marks">
          <span>3.0</span>
          <span>5.5</span>
          <span>8.0</span>
        </div>
      </div>

      <div className="list-container" ref={listRef}>
        {earthquakes.length === 0 ? (
          <div className="empty-state">暂无符合条件的地震记录</div>
        ) : (
          earthquakes.map((eq) => {
            const key = `${eq.longitude}-${eq.latitude}-${eq.timestamp}`
            return (
              <div
                key={key}
                ref={(el) => {
                  if (el) {
                    itemRefs.current.set(key, el)
                  }
                }}
                className={`list-item ${isSelected(eq) ? 'selected' : ''}`}
                onClick={() => handleItemClick(eq)}
              >
                <div className="item-time">{formatTime(eq.timestamp)}</div>
                <div
                  className="item-magnitude"
                  style={{ color: getMagnitudeColor(eq.magnitude) }}
                >
                  M {eq.magnitude.toFixed(1)}
                </div>
                <div className="item-depth">{Math.round(eq.depth)} km</div>
                <div className="item-region">{eq.region}</div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
