import React, { useRef, useEffect, useCallback } from 'react'
import type { SalesData } from '../DataEngine'

interface TimelinePanelProps {
  data: SalesData
  currentIndex: number
  isPlaying: boolean
  speed: number
  onIndexChange: (index: number) => void
  onPlayToggle: () => void
  onSpeedChange: (speed: number) => void
}

const speedOptions = [0.5, 1, 2, 4]

const TimelinePanel: React.FC<TimelinePanelProps> = ({
  data,
  currentIndex,
  isPlaying,
  speed,
  onIndexChange,
  onPlayToggle,
  onSpeedChange,
}) => {
  const sliderRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)

  const totalMonths = data.months.length
  const percentage = totalMonths > 1 ? (currentIndex / (totalMonths - 1)) * 100 : 0

  const getIndexFromPosition = useCallback(
    (clientX: number): number => {
      if (!sliderRef.current) return 0
      const rect = sliderRef.current.getBoundingClientRect()
      const x = clientX - rect.left
      const ratio = Math.max(0, Math.min(1, x / rect.width))
      return Math.round(ratio * (totalMonths - 1))
    },
    [totalMonths]
  )

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true
    const index = getIndexFromPosition(e.clientX)
    onIndexChange(index)
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return
      const index = getIndexFromPosition(e.clientX)
      onIndexChange(index)
    }

    const handleMouseUp = () => {
      isDragging.current = false
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [getIndexFromPosition, onIndexChange])

  const turningPointIndices = data.turningPoints.map((month) =>
    data.months.indexOf(month)
  ).filter((idx) => idx >= 0)

  return (
    <div className="timeline-panel">
      <div className="timeline-info">
        <span className="current-month">
          当前月份: <strong>{data.months[currentIndex] || '-'}</strong>
        </span>
        <div className="timeline-controls">
          <button
            className={`play-btn ${isPlaying ? 'playing' : ''}`}
            onClick={onPlayToggle}
            aria-label={isPlaying ? '暂停' : '播放'}
          >
            {isPlaying ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5,3 19,12 5,21" />
              </svg>
            )}
          </button>

          <div className="speed-control">
            <span className="speed-label">速度:</span>
            <div className="speed-buttons">
              {speedOptions.map((s) => (
                <button
                  key={s}
                  className={`speed-btn ${speed === s ? 'active' : ''}`}
                  onClick={() => onSpeedChange(s)}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="slider-container" ref={sliderRef} onMouseDown={handleMouseDown}>
        <div className="slider-track">
          <div
            className="slider-progress"
            style={{
              width: `${percentage}%`,
              transition: 'width 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            }}
          />
        </div>

        {turningPointIndices.map((idx) => {
          const pos = totalMonths > 1 ? (idx / (totalMonths - 1)) * 100 : 0
          return (
            <div
              key={idx}
              className="turning-point-marker"
              style={{ left: `${pos}%` }}
              title={`${data.months[idx]} - 转折点`}
            />
          )
        })}

        <div
          className="slider-thumb"
          style={{
            left: `calc(${percentage}% - 14px)`,
            transition: 'left 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          }}
        />

        <div className="slider-labels">
          {data.months.map((month, idx) => {
            const showLabel = idx === 0 || idx === totalMonths - 1 || idx % 3 === 0
            if (!showLabel) return null
            const pos = totalMonths > 1 ? (idx / (totalMonths - 1)) * 100 : 0
            return (
              <span
                key={idx}
                className="slider-label"
                style={{ left: `${pos}%` }}
              >
                {month}
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default TimelinePanel
