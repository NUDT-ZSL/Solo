import React, { useRef, useState, useEffect, useCallback } from 'react'
import { TimeRange } from './types'

interface TimelineProps {
  onTimeRangeChange: (range: TimeRange) => void
  totalDays?: number
}

export const Timeline: React.FC<TimelineProps> = ({
  onTimeRangeChange,
  totalDays = 30
}) => {
  const trackRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [startPercent, setStartPercent] = useState(0)
  const [endPercent, setEndPercent] = useState(100)
  const [activeHandle, setActiveHandle] = useState<'start' | 'end' | null>(null)

  const now = Date.now()
  const startTime = now - totalDays * 24 * 60 * 60 * 1000
  const endTime = now

  const percentToTimestamp = useCallback(
    (percent: number) => {
      return startTime + (endTime - startTime) * (percent / 100)
    },
    [startTime, endTime]
  )

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    const month = date.getMonth() + 1
    const day = date.getDate()
    return `${month}月${day}日`
  }

  const updateTimeRange = useCallback(
    (startPct: number, endPct: number) => {
      onTimeRangeChange({
        start: percentToTimestamp(startPct),
        end: percentToTimestamp(endPct)
      })
    },
    [onTimeRangeChange, percentToTimestamp]
  )

  const getPercentFromEvent = useCallback(
    (clientX: number) => {
      if (!trackRef.current) return 0
      const rect = trackRef.current.getBoundingClientRect()
      const percent = ((clientX - rect.left) / rect.width) * 100
      return Math.max(0, Math.min(100, percent))
    },
    []
  )

  const handleMouseDown = (handle: 'start' | 'end') => (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    setActiveHandle(handle)
  }

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !activeHandle) return
      const percent = getPercentFromEvent(e.clientX)

      if (activeHandle === 'start') {
        const newStart = Math.min(percent, endPercent - 5)
        setStartPercent(newStart)
        updateTimeRange(newStart, endPercent)
      } else {
        const newEnd = Math.max(percent, startPercent + 5)
        setEndPercent(newEnd)
        updateTimeRange(startPercent, newEnd)
      }
    },
    [isDragging, activeHandle, startPercent, endPercent, getPercentFromEvent, updateTimeRange]
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    setActiveHandle(null)
  }, [])

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  useEffect(() => {
    updateTimeRange(startPercent, endPercent)
  }, [])

  const dayMarkers = []
  for (let i = 0; i <= totalDays; i += 5) {
    dayMarkers.push(i)
  }

  return (
    <div className="timeline-container">
      <div className="timeline-header">
        <span className="timeline-label">时间轴</span>
        <span className="timeline-range">
          {formatDate(percentToTimestamp(startPercent))} - {formatDate(percentToTimestamp(endPercent))}
        </span>
      </div>

      <div className="timeline-track" ref={trackRef}>
        <div
          className="timeline-selected"
          style={{
            left: `${startPercent}%`,
            width: `${endPercent - startPercent}%`
          }}
        />

        {dayMarkers.map((day) => (
          <div
            key={day}
            className="timeline-marker"
            style={{ left: `${(day / totalDays) * 100}%` }}
          >
            <div className="timeline-marker-dot" />
            <span className="timeline-marker-label">
              {day === 0 ? '今天' : `${day}天前`}
            </span>
          </div>
        ))}

        <div
          className={`timeline-handle ${activeHandle === 'start' ? 'active' : ''}`}
          style={{ left: `${startPercent}%` }}
          onMouseDown={handleMouseDown('start')}
        >
          <div className="timeline-handle-circle" />
          <div className={`timeline-handle-label ${isDragging && activeHandle === 'start' ? 'enlarged' : ''}`}>
            {formatDate(percentToTimestamp(startPercent))}
          </div>
        </div>

        <div
          className={`timeline-handle ${activeHandle === 'end' ? 'active' : ''}`}
          style={{ left: `${endPercent}%` }}
          onMouseDown={handleMouseDown('end')}
        >
          <div className="timeline-handle-circle" />
          <div className={`timeline-handle-label ${isDragging && activeHandle === 'end' ? 'enlarged' : ''}`}>
            {formatDate(percentToTimestamp(endPercent))}
          </div>
        </div>
      </div>

      <style>{`
        .timeline-container {
          width: 70%;
          max-width: 70%;
          padding: 16px 24px;
          background: #2a2a3e;
          border-radius: 8px;
          border: 0.5px solid rgba(205, 214, 244, 0.1);
        }

        .timeline-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .timeline-label {
          font-size: 14px;
          color: #cdd6f4;
          font-weight: 500;
        }

        .timeline-range {
          font-size: 12px;
          color: #89b4fa;
        }

        .timeline-track {
          position: relative;
          height: 50px;
          cursor: pointer;
          user-select: none;
        }

        .timeline-track::before {
          content: '';
          position: absolute;
          top: 24px;
          left: 0;
          right: 0;
          height: 4px;
          background: rgba(205, 214, 244, 0.15);
          border-radius: 2px;
        }

        .timeline-selected {
          position: absolute;
          top: 24px;
          height: 4px;
          background: linear-gradient(90deg, #89b4fa, #b4befe);
          border-radius: 2px;
          z-index: 1;
        }

        .timeline-marker {
          position: absolute;
          top: 24px;
          transform: translateX(-50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          z-index: 0;
        }

        .timeline-marker-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: rgba(205, 214, 244, 0.3);
          margin-bottom: 4px;
        }

        .timeline-marker-label {
          font-size: 10px;
          color: rgba(205, 214, 244, 0.5);
          white-space: nowrap;
          margin-top: 16px;
        }

        .timeline-handle {
          position: absolute;
          top: 14px;
          transform: translateX(-50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: grab;
          z-index: 10;
        }

        .timeline-handle:active {
          cursor: grabbing;
        }

        .timeline-handle-circle {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: linear-gradient(135deg, #89b4fa, #b4befe);
          box-shadow: 0 2px 8px rgba(137, 180, 250, 0.4);
          transition: box-shadow 0.2s ease-out, transform 0.2s ease-out;
          border: 3px solid #2a2a3e;
          box-sizing: content-box;
        }

        .timeline-handle:hover .timeline-handle-circle {
          box-shadow: 0 4px 12px rgba(137, 180, 250, 0.6);
        }

        .timeline-handle.active .timeline-handle-circle {
          transform: scale(1.15);
          box-shadow: 0 6px 16px rgba(137, 180, 250, 0.8);
        }

        .timeline-handle-label {
          position: absolute;
          top: 28px;
          background: rgba(30, 30, 46, 0.95);
          color: #cdd6f4;
          font-size: 11px;
          padding: 4px 8px;
          border-radius: 4px;
          white-space: nowrap;
          transition: transform 0.2s ease-out, opacity 0.2s ease-out;
          border: 1px solid rgba(137, 180, 250, 0.3);
          opacity: 0;
          transform: translateY(-4px);
        }

        .timeline-handle:hover .timeline-handle-label,
        .timeline-handle.active .timeline-handle-label {
          opacity: 1;
          transform: translateY(0);
        }

        .timeline-handle-label.enlarged {
          transform: scale(1.2);
          font-weight: 500;
          color: #89b4fa;
          border-color: #89b4fa;
        }
      `}</style>
    </div>
  )
}
