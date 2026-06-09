import type { LogEntry } from './types'
import './Diary.css'

interface Props {
  logs: LogEntry[]
}

function getWeatherEmoji(weather: string): string {
  switch (weather) {
    case '晴': return '☀️'
    case '多云': return '⛅'
    case '阴': return '☁️'
    case '雨': return '🌧️'
    default: return '🌤️'
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function Diary({ logs }: Props) {
  if (logs.length === 0) {
    return (
      <div className="diary-empty">
        <div className="empty-icon">📝</div>
        <p>还没有观察日志</p>
        <p className="empty-hint">点击"添加日志"开始记录你的植物日记</p>
      </div>
    )
  }

  return (
    <div className="diary-container">
      <h3 className="diary-title">🌿 观察日记</h3>
      <div className="timeline">
        {logs.map((log, index) => (
          <div
            key={log.id}
            className="log-card"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="log-dot" />
            <div className="log-content">
              <div className="log-header">
                <span className="log-date">{formatDate(log.date)}</span>
                <span className="log-weather">{getWeatherEmoji(log.weather)} {log.weather}</span>
              </div>
              <div className="log-meta">
                <span className="log-tag water">💧 {log.water}ml</span>
                <span className="log-tag light">☀️ {log.light}小时</span>
              </div>
              {log.description && (
                <p className="log-desc">{log.description}</p>
              )}
              <div className="log-snapshot">
                <span>茎高 {log.stemHeight.toFixed(1)}cm</span>
                <span>·</span>
                <span>叶片 {log.leafCount}片</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
