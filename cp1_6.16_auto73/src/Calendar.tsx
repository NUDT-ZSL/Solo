import { useState } from 'react'
import type { JournalEntry } from './App'

interface CalendarProps {
  currentMonth: Date
  entries: Record<string, JournalEntry>
  onDateClick: (date: string) => void
}

interface HoverInfo {
  date: string
  x: number
  y: number
}

function Calendar({ currentMonth, entries, onDateClick }: CalendarProps) {
  const [hoveredCell, setHoveredCell] = useState<HoverInfo | null>(null)

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay()
  }

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)
  const today = new Date()

  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) {
    cells.push(null)
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(day)
  }
  while (cells.length < 35) {
    cells.push(null)
  }

  const formatDateKey = (day: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  const isToday = (day: number) => {
    return (
      year === today.getFullYear() &&
      month === today.getMonth() &&
      day === today.getDate()
    )
  }

  const handleMouseEnter = (day: number, event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect()
    setHoveredCell({
      date: formatDateKey(day),
      x: rect.left + rect.width / 2,
      y: rect.top,
    })
  }

  const handleMouseLeave = () => {
    setHoveredCell(null)
  }

  const renderEmojiThumbnail = (entry: JournalEntry) => {
    const sortedEmojis = [...entry.emojis].sort((a, b) => a.y - b.y)
    return (
      <div style={styles.thumbnailContainer}>
        <div style={styles.thumbnailCanvas}>
          {sortedEmojis.slice(0, 6).map((item) => (
            <span
              key={item.id}
              style={{
                ...styles.thumbnailEmoji,
                fontSize: `${16 * item.scale}px`,
                transform: `translate(${item.x * 0.3}px, ${item.y * 0.3}px)`,
              }}
            >
              {item.emoji}
            </span>
          ))}
        </div>
      </div>
    )
  }

  const weekDays = ['日', '一', '二', '三', '四', '五', '六']

  return (
    <div style={styles.calendarContainer}>
      <div style={styles.weekDayHeader}>
        {weekDays.map((day) => (
          <div key={day} style={styles.weekDayLabel}>
            {day}
          </div>
        ))}
      </div>
      <div style={styles.grid}>
        {cells.map((day, index) => {
          if (day === null) {
            return <div key={`empty-${index}`} style={styles.emptyCell} />
          }
          const dateKey = formatDateKey(day)
          const entry = entries[dateKey]
          const hasEntry = !!entry

          return (
            <div
              key={day}
              className="calendar-cell"
              style={{
                ...styles.cell,
                border: hasEntry ? 'none' : `2px dashed #BDC3C7`,
                background: hasEntry ? '#FFFFFF' : 'transparent',
                outline: isToday(day) ? '2px solid #FFB74D' : 'none',
                outlineOffset: isToday(day) ? '-2px' : '0',
              }}
              onClick={() => onDateClick(dateKey)}
              onMouseEnter={(e) => hasEntry && handleMouseEnter(day, e)}
              onMouseLeave={handleMouseLeave}
            >
              <div style={styles.dateNumber}>{day}</div>
              {hasEntry && renderEmojiThumbnail(entry)}
            </div>
          )
        })}
      </div>

      {hoveredCell && entries[hoveredCell.date] && (
        <div
          className="preview-bubble"
          style={{
            ...styles.previewBubble,
            left: hoveredCell.x,
            top: hoveredCell.y - 12,
          }}
        >
          <div style={styles.previewEmojis}>
            {entries[hoveredCell.date].emojis.slice(0, 6).map((item) => (
              <span
                key={item.id}
                style={{
                  ...styles.previewEmoji,
                  fontSize: `${24 * item.scale}px`,
                }}
              >
                {item.emoji}
              </span>
            ))}
          </div>
          {entries[hoveredCell.date].note && (
            <div style={styles.previewNote}>
              {entries[hoveredCell.date].note.slice(0, 20)}
              {entries[hoveredCell.date].note.length > 20 ? '...' : ''}
            </div>
          )}
          <div style={styles.bubbleArrow} />
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  calendarContainer: {
    background: '#F5F7FA',
    borderRadius: '16px',
    padding: '16px',
    position: 'relative',
  },
  weekDayHeader: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '8px',
    marginBottom: '8px',
  },
  weekDayLabel: {
    textAlign: 'center',
    fontSize: '12px',
    color: '#7F8C8D',
    fontWeight: 500,
    padding: '8px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gridTemplateRows: 'repeat(5, 1fr)',
    gap: '8px',
    minHeight: '500px',
  },
  emptyCell: {
    background: 'transparent',
  },
  cell: {
    borderRadius: '12px',
    padding: '8px',
    cursor: 'pointer',
    minHeight: '90px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  },
  dateNumber: {
    fontSize: '14px',
    color: '#2C3E50',
    fontWeight: 500,
    alignSelf: 'flex-start',
    marginBottom: '4px',
  },
  thumbnailContainer: {
    width: '60px',
    height: '60px',
    overflow: 'hidden',
  },
  thumbnailCanvas: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  thumbnailEmoji: {
    position: 'absolute',
    lineHeight: 1,
  },
  previewBubble: {
    position: 'fixed',
    transform: 'translateX(-50%)',
    background: '#FFFFFF',
    borderRadius: '12px',
    padding: '12px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
    zIndex: 1000,
    minWidth: '180px',
    pointerEvents: 'none',
  },
  previewEmojis: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
    justifyContent: 'center',
    marginBottom: '8px',
  },
  previewEmoji: {
    lineHeight: 1,
  },
  previewNote: {
    fontSize: '12px',
    color: '#5D6D7E',
    textAlign: 'center',
    wordBreak: 'break-word',
  },
  bubbleArrow: {
    position: 'absolute',
    bottom: '-6px',
    left: '50%',
    transform: 'translateX(-50%) rotate(45deg)',
    width: '12px',
    height: '12px',
    background: '#FFFFFF',
    boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.05)',
  },
}

export default Calendar
