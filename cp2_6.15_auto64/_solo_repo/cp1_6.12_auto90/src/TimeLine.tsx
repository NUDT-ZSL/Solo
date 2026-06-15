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
    e.stopPropagation()
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

  const dayMarkers: number[] = []
  for (let i = 0; i <= totalDays; i += 5) {
    dayMarkers.push(i)
  }

  const startActive = isDragging && activeHandle === 'start'
  const endActive = isDragging && activeHandle === 'end'

  return (
    <div className="mb-timeline">
      <div className="mb-timeline-header">
        <span className="mb-timeline-label">时间轴</span>
        <span className="mb-timeline-range">
          {formatDate(percentToTimestamp(startPercent))} — {formatDate(percentToTimestamp(endPercent))}
        </span>
      </div>

      <div className="mb-timeline-body" ref={trackRef}>
        <div className="mb-timeline-rail" />

        <div
          className="mb-timeline-selected"
          style={{
            left: `${startPercent}%`,
            width: `${endPercent - startPercent}%`
          }}
        />

        {dayMarkers.map((day) => (
          <div
            key={day}
            className="mb-timeline-tick"
            style={{ left: `${(day / totalDays) * 100}%` }}
          >
            <div className="mb-timeline-tick-dot" />
            <span className="mb-timeline-tick-text">
              {day === 0 ? '今天' : `${day}天前`}
            </span>
          </div>
        ))}

        <div
          className={`mb-timeline-handle ${startActive ? 'mb-handle-active' : ''}`}
          style={{ left: `${startPercent}%` }}
          onMouseDown={handleMouseDown('start')}
        >
          <div className="mb-handle-grip" />
          <div className={`mb-handle-date ${startActive ? 'mb-handle-date-enlarged' : ''}`}>
            {formatDate(percentToTimestamp(startPercent))}
          </div>
        </div>

        <div
          className={`mb-timeline-handle ${endActive ? 'mb-handle-active' : ''}`}
          style={{ left: `${endPercent}%` }}
          onMouseDown={handleMouseDown('end')}
        >
          <div className="mb-handle-grip" />
          <div className={`mb-handle-date ${endActive ? 'mb-handle-date-enlarged' : ''}`}>
            {formatDate(percentToTimestamp(endPercent))}
          </div>
        </div>
      </div>

      <style>{`
        .mb-timeline {
          width: 70%;
          max-width: 70%;
          padding: 16px 24px 12px;
          background: #2a2a3e;
          border-radius: 8px;
          border: 0.5px solid rgba(205,214,244,.1);
        }
        .mb-timeline-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .mb-timeline-label {
          font-size: 14px;
          color: #cdd6f4;
          font-weight: 500;
        }
        .mb-timeline-range {
          font-size: 12px;
          color: #89b4fa;
        }

        .mb-timeline-body {
          position: relative;
          height: 72px;
          cursor: pointer;
          user-select: none;
          -webkit-user-select: none;
        }

        .mb-timeline-rail {
          position: absolute;
          top: 12px;
          left: 0;
          right: 0;
          height: 4px;
          background: rgba(205,214,244,.15);
          border-radius: 2px;
        }

        .mb-timeline-selected {
          position: absolute;
          top: 12px;
          height: 4px;
          background: linear-gradient(90deg,#89b4fa,#b4befe);
          border-radius: 2px;
          z-index: 1;
        }

        .mb-timeline-tick {
          position: absolute;
          top: 12px;
          transform: translateX(-50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          z-index: 0;
        }
        .mb-timeline-tick-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: rgba(205,214,244,.25);
        }
        .mb-timeline-tick-text {
          margin-top: 6px;
          font-size: 10px;
          color: rgba(205,214,244,.45);
          white-space: nowrap;
        }

        .mb-timeline-handle {
          position: absolute;
          top: 2px;
          transform: translateX(-50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: grab;
          z-index: 10;
        }
        .mb-timeline-handle:active {
          cursor: grabbing;
        }

        .mb-handle-grip {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: linear-gradient(135deg,#89b4fa,#b4befe);
          border: 3px solid #2a2a3e;
          box-sizing: border-box;
          box-shadow: 0 2px 8px rgba(137,180,250,.4);
          transition: box-shadow .2s ease-out, transform .2s ease-out;
        }
        .mb-timeline-handle:hover .mb-handle-grip {
          box-shadow: 0 4px 14px rgba(137,180,250,.6);
        }
        .mb-handle-active .mb-handle-grip {
          transform: scale(1.15);
          box-shadow: 0 6px 18px rgba(137,180,250,.8);
        }

        .mb-handle-date {
          margin-top: 6px;
          font-size: 11px;
          color: rgba(205,214,244,.7);
          background: rgba(30,30,46,.85);
          padding: 3px 8px;
          border-radius: 4px;
          border: 1px solid rgba(137,180,250,.25);
          white-space: nowrap;
          transition: transform .2s ease-out, color .2s ease-out, border-color .2s ease-out, font-weight .2s ease-out;
        }
        .mb-handle-date-enlarged {
          transform: scale(1.2);
          font-weight: 600;
          color: #89b4fa;
          border-color: #89b4fa;
        }
      `}</style>
    </div>
  )
}
