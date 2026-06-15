import { useState, useEffect } from 'react'
import EmotionGrid from './components/EmotionGrid'
import CalendarView from './components/CalendarView'
import {
  EmotionRecord,
  getAllRecords,
  saveEmotionRecord,
  getTodayStr,
  getTimestamp,
} from './utils/calendar'

type View = 'grid' | 'calendar'

export default function App() {
  const [view, setView] = useState<View>('grid')
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [records, setRecords] = useState<Record<string, EmotionRecord>>({})

  useEffect(() => {
    setRecords(getAllRecords())
  }, [])

  const refreshRecords = () => {
    setRecords(getAllRecords())
  }

  const handleRecord = () => {
    if (selectedIndex === null) return
    const record: EmotionRecord = {
      date: getTodayStr(),
      emojiIndex: selectedIndex,
      timestamp: getTimestamp(),
    }
    saveEmotionRecord(record)
    refreshRecords()
    setSelectedIndex(null)
    setView('calendar')
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">情绪日记</h1>
        <nav className="view-tabs">
          <button
            className={`tab-btn ${view === 'grid' ? 'active' : ''}`}
            onClick={() => setView('grid')}
          >
            今日记录
          </button>
          <button
            className={`tab-btn ${view === 'calendar' ? 'active' : ''}`}
            onClick={() => setView('calendar')}
          >
            月份概览
          </button>
        </nav>
      </header>

      <main className="app-main">
        {view === 'grid' ? (
          <>
            <EmotionGrid selectedIndex={selectedIndex} onSelect={setSelectedIndex} />
            <div className="record-btn-wrapper">
              {selectedIndex !== null && (
                <button className="record-btn" onClick={handleRecord}>
                  <span>记录今日</span>
                </button>
              )}
            </div>
          </>
        ) : (
          <CalendarView records={records} onReturnToToday={refreshRecords} />
        )}
      </main>

      <style>{`
        * {
          box-sizing: border-box;
        }
        html, body, #root {
          margin: 0;
          padding: 0;
          min-height: 100vh;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
        }
        body {
          background: #fdf8f1;
          color: #4a3828;
        }
        .app-container {
          min-height: 100vh;
          padding-bottom: 100px;
        }
        .app-header {
          position: sticky;
          top: 0;
          z-index: 50;
          padding: 16px 20px 12px;
          background: rgba(253, 248, 241, 0.8);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(230, 215, 200, 0.5);
        }
        .app-title {
          margin: 0 0 12px;
          text-align: center;
          font-size: 1.5rem;
          font-weight: 700;
          color: #6a4a2a;
          letter-spacing: 2px;
        }
        .view-tabs {
          display: flex;
          justify-content: center;
          gap: 8px;
        }
        .tab-btn {
          padding: 8px 20px;
          border-radius: 20px;
          border: none;
          background: rgba(255, 240, 220, 0.6);
          color: #8a6a4a;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .tab-btn:hover {
          background: rgba(255, 230, 200, 0.8);
        }
        .tab-btn.active {
          background: linear-gradient(135deg, #ffc48a, #ff9e6a);
          color: #fff;
        }
        .tab-btn:active {
          transform: translateY(1px);
          transition: transform 0.1s ease;
        }
        .app-main {
          padding: 8px 0;
        }
        .record-btn-wrapper {
          display: flex;
          justify-content: center;
          padding: 24px;
        }
        .record-btn {
          position: relative;
          width: 120px;
          height: 120px;
          border-radius: 50%;
          border: none;
          background: linear-gradient(135deg, #ffb57a, #ff8555);
          color: white;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 8px 24px rgba(255, 133, 85, 0.4);
          transition: transform 0.1s ease;
        }
        .record-btn::before {
          content: '';
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          border: 2px solid rgba(255, 133, 85, 0.5);
          animation: pulseRing 1.6s ease-in-out infinite;
        }
        @keyframes pulseRing {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 0; transform: scale(1.2); }
        }
        .record-btn:hover {
          filter: brightness(1.05);
        }
        .record-btn:active {
          transform: translateY(1px);
        }
        .record-btn span {
          position: relative;
          z-index: 1;
        }
      `}</style>
    </div>
  )
}
