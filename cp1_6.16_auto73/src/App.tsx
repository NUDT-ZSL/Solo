import { useState, useEffect } from 'react'
import Calendar from './Calendar'
import Editor from './Editor'
import './App.css'

export interface EmojiItem {
  id: string
  emoji: string
  x: number
  y: number
  scale: number
}

export interface JournalEntry {
  date: string
  emojis: EmojiItem[]
  note: string
}

function App() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [view, setView] = useState<'calendar' | 'editor'>('calendar')
  const [entries, setEntries] = useState<Record<string, JournalEntry>>({})

  useEffect(() => {
    const saved = localStorage.getItem('emoji-journal-entries')
    if (saved) {
      setEntries(JSON.parse(saved))
    }
  }, [])

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }

  const handleDateClick = (date: string) => {
    setSelectedDate(date)
    setView('editor')
  }

  const handleBackToCalendar = () => {
    setView('calendar')
    setSelectedDate(null)
  }

  const handleSaveEntry = (entry: JournalEntry) => {
    const newEntries = { ...entries, [entry.date]: entry }
    setEntries(newEntries)
    localStorage.setItem('emoji-journal-entries', JSON.stringify(newEntries))
    handleBackToCalendar()
  }

  const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']
  const monthTitle = `${currentMonth.getFullYear()}年 ${monthNames[currentMonth.getMonth()]}`

  return (
    <div style={styles.app}>
      {view === 'calendar' ? (
        <div style={styles.calendarView}>
          <div style={styles.header}>
            <button className="arrow-button" style={styles.arrowButton} onClick={handlePrevMonth}>
              <div style={styles.leftArrow}></div>
            </button>
            <h1 style={styles.monthTitle}>{monthTitle}</h1>
            <button className="arrow-button" style={styles.arrowButton} onClick={handleNextMonth}>
              <div style={styles.rightArrow}></div>
            </button>
          </div>
          <Calendar
            currentMonth={currentMonth}
            entries={entries}
            onDateClick={handleDateClick}
          />
        </div>
      ) : (
        <div style={styles.editorView}>
          <button className="back-button" style={styles.backButton} onClick={handleBackToCalendar}>
            <div style={styles.leftArrow}></div>
            <span style={styles.backText}>返回日历</span>
          </button>
          {selectedDate && (
            <Editor
              date={selectedDate}
              entry={entries[selectedDate]}
              onSave={handleSaveEntry}
            />
          )}
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: '100vh',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    background: '#F5F7FA',
  },
  calendarView: {
    padding: '24px',
    maxWidth: '900px',
    margin: '0 auto',
  },
  editorView: {
    padding: '24px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '24px',
  },
  monthTitle: {
    fontSize: '24px',
    fontWeight: 600,
    color: '#2C3E50',
    margin: 0,
  },
  arrowButton: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: '#FFFFFF',
    border: '1px solid #E1E8ED',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'transform 0.1s ease',
  },
  leftArrow: {
    width: '0',
    height: '0',
    borderTop: '6px solid transparent',
    borderBottom: '6px solid transparent',
    borderRight: '8px solid #2C3E50',
  },
  rightArrow: {
    width: '0',
    height: '0',
    borderTop: '6px solid transparent',
    borderBottom: '6px solid transparent',
    borderLeft: '8px solid #2C3E50',
  },
  backButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    background: '#FFFFFF',
    border: '1px solid #E1E8ED',
    borderRadius: '8px',
    cursor: 'pointer',
    marginBottom: '16px',
    transition: 'transform 0.1s ease',
  },
  backText: {
    fontSize: '14px',
    color: '#2C3E50',
    fontWeight: 500,
  },
}

export default App
