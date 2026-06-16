import { useRef, useEffect, useCallback, useState, useMemo } from 'react'
import type { Earthquake } from '@/hooks/useEarthquakeData'
import './ControlPanel.css'

interface ControlPanelProps {
  earthquakes: Earthquake[]
  selectedEarthquake: Earthquake | null
  minMagnitude: number
  onMinMagnitudeChange: (value: number) => void
  onEarthquakeClick: (earthquake: Earthquake) => void
}

const ITEM_HEIGHT = 48
const BUFFER_ITEMS = 3

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

function getEarthquakeKey(eq: Earthquake): string {
  return `${eq.longitude}-${eq.latitude}-${eq.timestamp}`
}

interface ListItemProps {
  earthquake: Earthquake
  isSelected: boolean
  onClick: (eq: Earthquake) => void
  onRef: (key: string, el: HTMLDivElement | null) => void
}

function ListItem({ earthquake, isSelected, onClick, onRef }: ListItemProps) {
  const key = getEarthquakeKey(earthquake)

  return (
    <div
      ref={(el) => onRef(key, el)}
      className={`list-item ${isSelected ? 'selected' : ''}`}
      onClick={() => onClick(earthquake)}
    >
      <div className="item-time">{formatTime(earthquake.timestamp)}</div>
      <div
        className="item-magnitude"
        style={{ color: getMagnitudeColor(earthquake.magnitude) }}
      >
        M {earthquake.magnitude.toFixed(1)}
      </div>
      <div className="item-depth">{Math.round(earthquake.depth)} km</div>
      <div className="item-region">{earthquake.region}</div>
    </div>
  )
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
  const [scrollTop, setScrollTop] = useState(0)
  const [containerHeight, setContainerHeight] = useState(0)

  const { startIndex, endIndex, offsetY, totalHeight } = useMemo(() => {
    const total = earthquakes.length
    const totalHeight = total * ITEM_HEIGHT
    const visibleCount = Math.ceil(containerHeight / ITEM_HEIGHT) + BUFFER_ITEMS * 2

    let start = Math.floor(scrollTop / ITEM_HEIGHT) - BUFFER_ITEMS
    start = Math.max(0, start)
    let end = start + visibleCount
    end = Math.min(total, end)

    const offset = start * ITEM_HEIGHT

    return {
      startIndex: start,
      endIndex: end,
      offsetY: offset,
      totalHeight
    }
  }, [earthquakes.length, scrollTop, containerHeight])

  const visibleItems = useMemo(() => {
    return earthquakes.slice(startIndex, endIndex)
  }, [earthquakes, startIndex, endIndex])

  useEffect(() => {
    if (!listRef.current) return

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height)
      }
    })

    observer.observe(listRef.current)
    return () => observer.disconnect()
  }, [])

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  const handleItemRef = useCallback((key: string, el: HTMLDivElement | null) => {
    if (el) {
      itemRefs.current.set(key, el)
    } else {
      itemRefs.current.delete(key)
    }
  }, [])

  useEffect(() => {
    if (selectedEarthquake && listRef.current) {
      const key = getEarthquakeKey(selectedEarthquake)
      const index = earthquakes.findIndex((eq) => getEarthquakeKey(eq) === key)
      if (index >= 0) {
        const targetScroll = index * ITEM_HEIGHT - containerHeight / 2 + ITEM_HEIGHT / 2
        listRef.current.scrollTo({
          top: Math.max(0, targetScroll),
          behavior: 'smooth'
        })
      }
    }
  }, [selectedEarthquake, earthquakes, containerHeight])

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onMinMagnitudeChange(parseFloat(e.target.value))
      if (listRef.current) {
        listRef.current.scrollTop = 0
        setScrollTop(0)
      }
    },
    [onMinMagnitudeChange]
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

      <div className="list-container" ref={listRef} onScroll={handleScroll}>
        {earthquakes.length === 0 ? (
          <div className="empty-state">暂无符合条件的地震记录</div>
        ) : (
          <div style={{ height: totalHeight, position: 'relative' }}>
            <div style={{ transform: `translateY(${offsetY}px)` }}>
              {visibleItems.map((eq) => (
                <ListItem
                  key={getEarthquakeKey(eq)}
                  earthquake={eq}
                  isSelected={isSelected(eq)}
                  onClick={onEarthquakeClick}
                  onRef={handleItemRef}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
