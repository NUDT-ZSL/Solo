import ClockCanvas from './clock/ClockCanvas'
import EmotionLog from './log/EmotionLog'
import WeeklyReport from './report/WeeklyReport'

function App() {
  return (
    <div className="app-container">
      <div className="main-layout">
        <div className="clock-section">
          <h2 className="clock-title">声音情绪时钟</h2>
          <p className="clock-subtitle">悬停表盘聆听时间的情绪</p>
          <ClockCanvas />
        </div>
        <div className="report-section">
          <h3 className="report-title">上周情绪趋势</h3>
          <WeeklyReport />
        </div>
      </div>
      <EmotionLog />
    </div>
  )
}

export default App
