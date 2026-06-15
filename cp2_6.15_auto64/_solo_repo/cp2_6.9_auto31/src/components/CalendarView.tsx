import { useState, useRef, useEffect } from 'react'
import {
  EMOTIONS,
  EmotionRecord,
  getCalendarDays,
  isCurrentMonth,
  isToday,
  getDayNumber,
  getWeekDays,
  formatMonthYear,
  nextMonth,
  prevMonth,
  getTodayStr,
  updateNote,
  getEmotionColor,
  searchRecords,
} from '../utils/calendar'

interface CalendarViewProps {
  records: Record<string, EmotionRecord>
  onReturnToToday: () => void
}

export default function CalendarView({ records, onReturnToToday }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [animDirection, setAnimDirection] = useState<'left' | 'right' | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [highlightToday, setHighlightToday] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [matchedDates, setMatchedDates] = useState<string[]>([])

  useEffect(() => {
    setMatchedDates(searchRecords(searchQuery))
  }, [searchQuery, records])

  const handlePrevMonth = () => {
    setAnimDirection('right')
    setTimeout(() => {
      setCurrentMonth(prevMonth(currentMonth))
      setAnimDirection(null)
    }, 150)
  }

  const handleNextMonth = () => {
    setAnimDirection('left')
    setTimeout(() => {
      setCurrentMonth(nextMonth(currentMonth))
      setAnimDirection(null)
    }, 150)
  }

  const handleReturnToToday = () => {
    onReturnToToday()
    setCurrentMonth(new Date())
    setHighlightToday(true)
    setTimeout(() => setHighlightToday(false), 500)
  }

  const days = getCalendarDays(currentMonth)
  const weekDays = getWeekDays()
  const todayStr = getTodayStr()

  return (
    <div className="calendar-container">
      <div className="search-bar">
        <input
          type="text"
          placeholder="搜索备注或表情..."
          className="search-input"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="calendar-nav">
        <button className="nav-btn" onClick={handlePrevMonth} aria-label="上一月">
          ‹
        </button>
        <div className="month-label">{formatMonthYear(currentMonth)}</div>
        <button className="nav-btn" onClick={handleNextMonth} aria-label="下一月">
          ›
        </button>
        <button className="today-btn" onClick={handleReturnToToday} aria-label="返回今日" title="返回今日">
          ★
        </button>
      </div>

      <div className="weekdays-row">
        {weekDays.map((day) => (
          <div key={day} className="weekday-label">{day}</div>
        ))}
      </div>

      <div
        className={`days-grid ${animDirection ? `slide-${animDirection}` : ''}`}
      >
        {days.map((date, idx) => {
          const dateStr = getTodayStr(date)
          const record = records[dateStr]
          const inMonth = isCurrentMonth(date, currentMonth)
          const isTodayDate = isToday(date)
          const isMatched = matchedDates.includes(dateStr)
          const shouldHighlight = highlightToday && isTodayDate

          return (
            <div
              key={idx}
              className={`day-cell
                ${!inMonth ? 'out-of-month' : ''}
                ${isTodayDate ? 'today' : ''}
                ${shouldHighlight ? 'highlight' : ''}
                ${isMatched ? 'matched' : ''}
              `}
              onClick={() => record && setSelectedDate(dateStr)}
              style={record ? { backgroundColor: getEmotionColor(EMOTIONS[record.emojiIndex]?.hue || 0, 45, 78) } : undefined}
            >
              <span className="day-number">{getDayNumber(date)}</span>
              {record && <span className="day-emoji">{EMOTIONS[record.emojiIndex]?.emoji}</span>}
            </div>
          )
        })}
      </div>

      {selectedDate && (
        <DetailPopover
          dateStr={selectedDate}
          record={records[selectedDate]}
          onClose={() => setSelectedDate(null)}
          onSaveNote={(note) => {
            updateNote(selectedDate, note)
          }}
        />
      )}

      <style>{`
        .calendar-container {
          max-width: 720px;
          margin: 0 auto;
          padding: 16px;
        }
        .search-bar {
          margin-bottom: 16px;
          display: flex;
          justify-content: center;
        }
        .search-input {
          width: 100%;
          max-width: 400px;
          padding: 10px 16px;
          border-radius: 20px;
          border: 1px solid #e0d8d0;
          background: rgba(255, 255, 255, 0.8);
          font-size: 0.95rem;
          outline: none;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .search-input:focus {
          border-color: #f5b97d;
          box-shadow: 0 0 0 3px rgba(245, 185, 125, 0.2);
        }
        .calendar-nav {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 12px 16px;
          margin-bottom: 12px;
          background: rgba(255, 252, 247, 0.75);
          backdrop-filter: blur(12px);
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.5);
        }
        .nav-btn, .today-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: none;
          background: #fff3e6;
          cursor: pointer;
          font-size: 1.3rem;
          color: #7a5a3a;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
        }
        .nav-btn:hover, .today-btn:hover {
          background: #ffe6cc;
        }
        .nav-btn:active, .today-btn:active {
          transform: translateY(1px);
          transition: transform 0.1s ease;
        }
        .today-btn {
          font-size: 1rem;
          background: linear-gradient(135deg, #ffe4b5, #ffd4a3);
        }
        .month-label {
          font-size: 1.15rem;
          font-weight: 600;
          color: #5a4230;
          min-width: 140px;
          text-align: center;
        }
        .weekdays-row {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 4px;
          margin-bottom: 6px;
        }
        .weekday-label {
          text-align: center;
          font-size: 0.85rem;
          color: #9a8570;
          font-weight: 500;
          padding: 8px 0;
        }
        .days-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 4px;
        }
        .days-grid.slide-left {
          animation: slideInLeft 0.3s ease;
        }
        .days-grid.slide-right {
          animation: slideInRight 0.3s ease;
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .day-cell {
          position: relative;
          aspect-ratio: 1;
          border-radius: 10px;
          background: rgba(245, 240, 235, 0.6);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: default;
          padding: 4px;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .day-cell.out-of-month {
          background: rgba(235, 230, 225, 0.3);
        }
        .day-cell.out-of-month .day-number,
        .day-cell.out-of-month .day-emoji {
          opacity: 0.35;
        }
        .day-cell.today {
          box-shadow: inset 0 0 0 2px #e8a860;
        }
        .day-cell.highlight {
          animation: todayHighlight 0.5s ease;
        }
        @keyframes todayHighlight {
          0% { box-shadow: inset 0 0 0 2px #e8a860, 0 0 0 0 rgba(232, 168, 96, 0.7); }
          50% { box-shadow: inset 0 0 0 2px #e8a860, 0 0 0 8px rgba(232, 168, 96, 0); }
          100% { box-shadow: inset 0 0 0 2px #e8a860, 0 0 0 0 rgba(232, 168, 96, 0); }
        }
        .day-cell.matched {
          animation: pulseBlue 1.5s ease-in-out infinite;
        }
        @keyframes pulseBlue {
          0%, 100% { box-shadow: 0 0 0 0 rgba(80, 150, 255, 0.6); }
          50% { box-shadow: 0 0 0 3px rgba(80, 150, 255, 0.3); }
        }
        .day-cell:not(.out-of-month) {
          cursor: pointer;
        }
        .day-number {
          font-size: 0.78rem;
          color: #6a5848;
          line-height: 1;
        }
        .day-emoji {
          font-size: 1.3rem;
          line-height: 1;
          margin-top: 2px;
        }
        @media (max-width: 600px) {
          .day-emoji {
            font-size: 1.1rem;
          }
        }
      `}</style>
    </div>
  )
}

interface DetailPopoverProps {
  dateStr: string
  record: EmotionRecord
  onClose: () => void
  onSaveNote: (note: string) => void
}

function DetailPopover({ dateStr, record, onClose, onSaveNote }: DetailPopoverProps) {
  const [note, setNote] = useState(record.note || '')
  const [editing, setEditing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
    }
  }, [editing])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSaveNote(note)
      setEditing(false)
    } else if (e.key === 'Escape') {
      setNote(record.note || '')
      setEditing(false)
    }
  }

  const emotion = EMOTIONS[record.emojiIndex]

  return (
    <div className="popover-overlay">
      <div ref={containerRef} className="detail-popover">
        <div className="popover-date">{dateStr}</div>
        <div className="popover-emoji" style={{ backgroundColor: getEmotionColor(emotion?.hue || 0, 50, 85) }}>
          {emotion?.emoji}
        </div>
        <div className="popover-time">记录时间：{record.timestamp}</div>
        <div className="popover-note-section">
          {editing ? (
            <input
              ref={inputRef}
              type="text"
              className="note-input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => {
                onSaveNote(note)
                setEditing(false)
              }}
              placeholder="添加备注（按Enter保存）"
            />
          ) : (
            <div className="note-display" onClick={() => setEditing(true)}>
              {note || <span className="note-placeholder">点击添加备注...</span>}
            </div>
          )}
        </div>
      </div>
      <style>{`
        .popover-overlay {
          position: fixed;
          inset: 0;
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.15);
        }
        .detail-popover {
          background: #fffaf2;
          border-radius: 18px;
          padding: 24px;
          min-width: 280px;
          max-width: 90%;
          box-shadow: 0 20px 50px rgba(100, 70, 40, 0.2);
          animation: popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes popIn {
          from { opacity: 0; transform: translateY(20px) scale(0.9); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .popover-date {
          text-align: center;
          font-size: 0.95rem;
          color: #8a7060;
          margin-bottom: 16px;
        }
        .popover-emoji {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          margin: 0 auto 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 3rem;
        }
        .popover-time {
          text-align: center;
          font-size: 0.85rem;
          color: #9a8570;
          margin-bottom: 16px;
        }
        .popover-note-section {
          margin-top: 8px;
        }
        .note-display {
          padding: 12px 14px;
          background: rgba(255, 240, 220, 0.6);
          border-radius: 10px;
          cursor: text;
          min-height: 44px;
          font-size: 0.95rem;
          color: #5a4230;
          transition: background 0.2s ease;
        }
        .note-display:hover {
          background: rgba(255, 235, 210, 0.8);
        }
        .note-placeholder {
          color: #b5a090;
          font-style: italic;
        }
        .note-input {
          width: 100%;
          padding: 12px 14px;
          border-radius: 10px;
          border: 2px solid #e8b88a;
          background: #fff;
          font-size: 0.95rem;
          color: #5a4230;
          outline: none;
          box-sizing: border-box;
        }
        .note-input:focus {
          border-color: #d9944a;
        }
      `}</style>
    </div>
  )
}
