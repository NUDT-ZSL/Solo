import { useState, useRef, useEffect, useMemo } from 'react'

interface MoodRecord {
  id: string
  date: string
  emotionResult: {
    dominantColor: string
    dominantEmotion: string
  }
}

interface TimeLineProps {
  records: MoodRecord[]
  currentDate: string
  onDateSelect: (date: string) => void
  onLoadMore: (direction: 'before' | 'after') => void
  isMobile: boolean
}

export default function TimeLine({ records, currentDate, onDateSelect, onLoadMore, isMobile }: TimeLineProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartX, setDragStartX] = useState(0)
  const [scrollStart, setScrollStart] = useState(0)
  const [animatingDates, setAnimatingDates] = useState<Set<string>>(new Set())

  const timelineHeight = isMobile ? 60 : 80

  const sortedRecords = useMemo(() => {
    return [...records].sort((a, b) => a.date.localeCompare(b.date))
  }, [records])

  const visibleDates = useMemo(() => {
    const dates: string[] = []
    const today = new Date().toISOString().split('T')[0]

    const todayIndex = sortedRecords.findIndex((r) => r.date === today)
    const startIndex = Math.max(0, todayIndex - 3)
    const endIndex = Math.min(sortedRecords.length, startIndex + 7)

    for (let i = startIndex; i < endIndex; i++) {
      dates.push(sortedRecords[i].date)
    }

    return dates
  }, [sortedRecords])

  const currentIndex = visibleDates.indexOf(currentDate)

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStartX(e.clientX)
    setScrollStart(e.currentTarget.scrollLeft || 0)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    e.preventDefault()
    const deltaX = dragStartX - e.clientX
    if (trackRef.current) {
      trackRef.current.scrollLeft = scrollStart + deltaX
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDragging(false)
    }
    window.addEventListener('mouseup', handleGlobalMouseUp)
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp)
  }, [])

  const handleMarkerClick = (date: string, e: React.MouseEvent) => {
    if (isDragging) return
    e.stopPropagation()
    onDateSelect(date)
  }

  const handleLoadMore = (direction: 'before' | 'after') => {
    const newDates: string[] = []
    const referenceDate = direction === 'before' 
      ? (sortedRecords.length > 0 ? sortedRecords[0].date : new Date().toISOString().split('T')[0])
      : (sortedRecords.length > 0 ? sortedRecords[sortedRecords.length - 1].date : new Date().toISOString().split('T')[0])
    
    const baseDate = new Date(referenceDate)
    for (let i = 0; i < 7; i++) {
      const d = new Date(baseDate)
      if (direction === 'before') {
        d.setDate(d.getDate() - 7 + i)
      } else {
        d.setDate(d.getDate() + 1 + i)
      }
      newDates.push(d.toISOString().split('T')[0])
    }

    setAnimatingDates(new Set(newDates))
    setTimeout(() => {
      setAnimatingDates(new Set())
    }, 600)

    onLoadMore(direction)
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return {
      month: d.getMonth() + 1,
      day: d.getDate(),
      weekday: ['日', '一', '二', '三', '四', '五', '六'][d.getDay()],
    }
  }

  const getRecordForDate = (date: string) => {
    return sortedRecords.find((r) => r.date === date)
  }

  const isToday = (dateStr: string) => {
    return dateStr === new Date().toISOString().split('T')[0]
  }

  return (
    <div style={{ ...styles.container, height: timelineHeight }}>
      <button
        style={styles.arrowButton}
        onClick={() => handleLoadMore('before')}
        title="更早的日期"
      >
        ‹
      </button>

      <div
        ref={trackRef}
        style={{
          ...styles.track,
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div style={styles.markersContainer}>
          {sortedRecords.map((record, index) => {
            const dateInfo = formatDate(record.date)
            const isSelected = record.date === currentDate
            const isAnimating = animatingDates.has(record.date)
            const hasRecord = !!record

            return (
              <div
                key={record.id || record.date}
                style={{
                  ...styles.markerWrapper,
                  ...(isAnimating ? styles.markerAnimating : {}),
                  transitionDelay: `${(index % 7) * 30}ms`,
                }}
                onClick={(e) => handleMarkerClick(record.date, e)}
              >
                <div
                  style={{
                    ...styles.marker,
                    width: isMobile ? 24 : 30,
                    height: isMobile ? 24 : 30,
                    backgroundColor: hasRecord ? record.emotionResult.dominantColor : '#666',
                    ...(isSelected ? styles.markerActive : {}),
                    boxShadow: isSelected
                      ? `0 0 0 3px rgba(255, 255, 255, 0.5), 0 4px 12px ${record.emotionResult.dominantColor}66`
                      : '0 2px 8px rgba(0, 0, 0, 0.2)',
                  }}
                >
                  {isToday(record.date) && (
                    <span style={styles.todayDot} />
                  )}
                </div>
                {!isMobile && (
                  <span style={styles.dateLabel}>
                    {dateInfo.month}/{dateInfo.day}
                  </span>
                )}
                <span style={styles.weekdayLabel}>
                  {dateInfo.weekday}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <button
        style={styles.arrowButton}
        onClick={() => handleLoadMore('after')}
        title="更晚的日期"
      >
        ›
      </button>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    backgroundColor: '#2C3E50',
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    padding: '0 8px',
    boxSizing: 'border-box',
    flexShrink: 0,
    position: 'relative',
    overflow: 'hidden',
  },
  arrowButton: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    border: 'none',
    background: 'rgba(255, 255, 255, 0.1)',
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 20,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    flexShrink: 0,
  },
  track: {
    flex: 1,
    overflowX: 'auto',
    overflowY: 'hidden',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    margin: '0 8px',
    padding: '4px 0',
  },
  markersContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around',
    minWidth: '100%',
    gap: 8,
    padding: '0 8px',
  },
  markerWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
    cursor: 'pointer',
    transition: 'transform 0.3s ease, opacity 0.3s ease',
    flexShrink: 0,
  },
  markerAnimating: {
    transform: 'translateY(20px)',
    opacity: 0,
    animation: 'slideInUp 300ms ease forwards',
  },
  marker: {
    borderRadius: '50%',
    position: 'relative',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerActive: {
    transform: 'scale(1.2)',
  },
  todayDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    backgroundColor: 'white',
    position: 'absolute',
    bottom: 2,
    right: 2,
  },
  dateLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  weekdayLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.4)',
  },
}
