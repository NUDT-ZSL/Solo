import { useState, useEffect, useCallback } from 'react'
import { getDailySummary } from '../clock/emotionData'
import {
  saveEmotionLog,
  getAllEmotionLogs,
  generateLogId,
  type EmotionLogEntry,
} from './LocalStorage'
import './EmotionLog.css'

interface DotDetail {
  date: string
  hour: number
  emotionValue: number
  note?: string
  x: number
  y: number
}

const EMOJIS = [
  { emoji: '😊', label: '开心', value: 80 },
  { emoji: '😌', label: '平静', value: 65 },
  { emoji: '😐', label: '一般', value: 50 },
  { emoji: '😔', label: '低落', value: 30 },
  { emoji: '😠', label: '烦躁', value: 20 },
]

export default function EmotionLog() {
  const [selectedDot, setSelectedDot] = useState<DotDetail | null>(null)
  const [selectedEmoji, setSelectedEmoji] = useState<number | null>(null)
  const [noteText, setNoteText] = useState('')
  const [userLogs, setUserLogs] = useState<EmotionLogEntry[]>([])
  const [isAnimating, setIsAnimating] = useState<number | null>(null)

  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

  const getWeekData = useCallback(() => {
    const data = []
    const today = new Date()

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const summary = getDailySummary(date)
      const dateStr = date.toISOString().split('T')[0]
      const dayName = i === 0 ? '今天' : weekDays[date.getDay()]

      const userLogsForDay = userLogs.filter((log) => {
        const logDate = new Date(log.timestamp).toISOString().split('T')[0]
        return logDate === dateStr
      })

      const peaks = [...summary.peaks]
      userLogsForDay.slice(0, 2).forEach((log) => {
        const hour = new Date(log.timestamp).getHours()
        const exists = peaks.some((p) => p.hour === hour)
        if (!exists) {
          peaks.push({ hour, emotionValue: log.emotionValue })
        }
      })

      peaks.sort((a, b) => b.emotionValue - a.emotionValue)

      data.push({
        date: dateStr,
        dayName,
        peaks: peaks.slice(0, 3),
        userLogs: userLogsForDay,
        avgEmotion: summary.avgEmotion,
      })
    }

    return data
  }, [userLogs])

  const [weekData, setWeekData] = useState(getWeekData())

  useEffect(() => {
    setWeekData(getWeekData())
  }, [getWeekData])

  useEffect(() => {
    setUserLogs(getAllEmotionLogs())
  }, [])

  const getEmotionColor = (value: number) => {
    const t = value / 100
    return `hsl(${200 - t * 200}, 100%, ${50 + t * 15}%)`
  }

  const handleDotClick = (
    date: string,
    hour: number,
    emotionValue: number,
    note: string | undefined,
    event: React.MouseEvent
  ) => {
    const rect = (event.target as HTMLElement).getBoundingClientRect()
    const parentRect = (event.currentTarget as HTMLElement).closest('.emotion-log-panel')?.getBoundingClientRect()

    if (parentRect) {
      setSelectedDot({
        date,
        hour,
        emotionValue,
        note,
        x: rect.left - parentRect.left + rect.width / 2,
        y: rect.top - parentRect.top + rect.height / 2,
      })
    }
  }

  const handleCloseDetail = () => {
    setSelectedDot(null)
  }

  const handleEmojiClick = (index: number) => {
    setSelectedEmoji(index)
    setIsAnimating(index)
    setTimeout(() => setIsAnimating(null), 400)
  }

  const handleSubmit = () => {
    if (selectedEmoji === null && noteText.trim() === '') return

    const emojiData = selectedEmoji !== null ? EMOJIS[selectedEmoji] : null
    const entry: EmotionLogEntry = {
      id: generateLogId(),
      timestamp: Date.now(),
      emotionValue: emojiData?.value || 50,
      emoji: emojiData?.emoji,
      note: noteText.trim() || undefined,
    }

    saveEmotionLog(entry)
    setUserLogs(getAllEmotionLogs())
    setNoteText('')
    setSelectedEmoji(null)
  }

  const formatTime = (hour: number) => {
    return `${hour.toString().padStart(2, '0')}:00`
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return `${date.getMonth() + 1}/${date.getDate()}`
  }

  return (
    <div className="emotion-log-panel" onClick={handleCloseDetail}>
      <h3 className="log-title">情绪日志</h3>
      <p className="log-subtitle">最近7天的情绪记录</p>

      <div className="timeline-container" onClick={(e) => e.stopPropagation()}>
        {weekData.map((day) => (
          <div key={day.date} className="timeline-day">
            <div className="day-label">
              <span className="day-name">{day.dayName}</span>
              <span className="day-date">{formatDate(day.date)}</span>
            </div>
            <div className="day-dots">
              {day.peaks.map((peak, peakIndex) => {
                const userLog = day.userLogs.find(
                  (log) => new Date(log.timestamp).getHours() === peak.hour
                )
                return (
                  <div
                    key={peakIndex}
                    className="emotion-dot-wrapper"
                    style={{
                      left: `${(peak.hour / 24) * 100}%`,
                    }}
                  >
                    <div
                      className={`emotion-dot ${userLog ? 'has-log' : ''}`}
                      style={{
                        backgroundColor: getEmotionColor(peak.emotionValue),
                        width: '12px',
                        height: '12px',
                      }}
                      onClick={(e) =>
                        handleDotClick(
                          day.date,
                          peak.hour,
                          peak.emotionValue,
                          userLog?.note,
                          e
                        )
                      }
                    />
                    {userLog?.emoji && (
                      <span className="dot-emoji">{userLog.emoji}</span>
                    )}
                  </div>
                )
              })}
            </div>
            <div className="day-avg">
              平均: <span style={{ color: getEmotionColor(day.avgEmotion) }}>{day.avgEmotion}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="time-axis-labels">
        <span>00:00</span>
        <span>06:00</span>
        <span>12:00</span>
        <span>18:00</span>
        <span>24:00</span>
      </div>

      {selectedDot && (
        <div
          className="detail-card"
          style={{
            left: `${Math.min(Math.max(selectedDot.x - 100, 10), 260)}px`,
            top: `${selectedDot.y + 20}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="detail-card-header">
            <span className="detail-time">{formatTime(selectedDot.hour)}</span>
            <span
              className="detail-emotion-value"
              style={{ color: getEmotionColor(selectedDot.emotionValue) }}
            >
              {selectedDot.emotionValue}
            </span>
          </div>
          <div className="detail-card-date">
            {formatDate(selectedDot.date)}
          </div>
          {selectedDot.note && (
            <div className="detail-card-note">{selectedDot.note}</div>
          )}
          {!selectedDot.note && (
            <div className="detail-card-no-note">暂无备注</div>
          )}
        </div>
      )}

      <div className="input-section">
        <div className="emoji-selector">
          {EMOJIS.map((item, index) => (
            <button
              key={index}
              className={`emoji-btn ${selectedEmoji === index ? 'selected' : ''} ${isAnimating === index ? 'animating' : ''}`}
              onClick={() => handleEmojiClick(index)}
              title={item.label}
            >
              {item.emoji}
            </button>
          ))}
        </div>
        <div className="note-input-wrapper">
          <input
            type="text"
            className="note-input"
            placeholder="记录此刻的心情..."
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
          <button
            className="submit-btn"
            onClick={handleSubmit}
            disabled={selectedEmoji === null && noteText.trim() === ''}
          >
            记录
          </button>
        </div>
      </div>
    </div>
  )
}
