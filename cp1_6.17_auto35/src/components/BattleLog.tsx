import React, { useEffect, useRef, useState } from 'react'
import { useGame } from '../context/GameContext'
import type { BattleLog as BattleLogType } from '../types'

type LogFilter = 'all' | 'attack' | 'skill' | 'death' | 'heal' | 'stun'

export const BattleLog: React.FC = () => {
  const { logs, phase, engine } = useGame()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [filter, setFilter] = useState<LogFilter>('all')
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const prevLengthRef = useRef(0)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (logs.length > prevLengthRef.current && logs.length > 0) {
      const newLogs = logs.slice(prevLengthRef.current)
      if (newLogs.length > 0) {
        setHighlightId(newLogs[newLogs.length - 1].id)
        setUnreadCount(c => c + newLogs.length)
        setTimeout(() => setHighlightId(null), 1200)
      }
    }
    prevLengthRef.current = logs.length
  }, [logs.length])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
      setUnreadCount(0)
    }
  }, [logs.length, filter])

  useEffect(() => {
    if (!engine) return
    const off = engine.on('phaseChange', () => {
      prevLengthRef.current = 0
      setUnreadCount(0)
    })
    return () => off()
  }, [engine])

  if (phase !== 'battle' && phase !== 'result') return null

  const getLogColor = (type: string) => {
    switch (type) {
      case 'attack': return '#FF8A65'
      case 'skill': return '#CE93D8'
      case 'death': return '#FF5252'
      case 'heal': return '#81C784'
      case 'stun': return '#1E88E5'
      default: return '#90A4AE'
    }
  }

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'attack': return '⚔️'
      case 'skill': return '✨'
      case 'death': return '💥'
      case 'heal': return '💚'
      case 'stun': return '⚡'
      default: return '📢'
    }
  }

  const formatTime = (ts: number) => {
    const diff = Math.max(0, (Date.now() - ts) / 1000)
    if (diff < 1) return '刚刚'
    if (diff < 60) return `${Math.floor(diff)}s前`
    return `${Math.floor(diff / 60)}m前`
  }

  const filteredLogs = filter === 'all'
    ? logs
    : logs.filter(l => l.type === filter)

  const filters: { key: LogFilter; label: string; icon: string }[] = [
    { key: 'all', label: '全部', icon: '📋' },
    { key: 'attack', label: '攻击', icon: '⚔️' },
    { key: 'skill', label: '技能', icon: '✨' },
    { key: 'death', label: '击毁', icon: '💥' },
    { key: 'heal', label: '治疗', icon: '💚' },
  ]

  return (
    <div className="battle-log-panel">
      <div className="log-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h3>📜 战斗战报</h3>
          {unreadCount > 0 && (
            <span className="log-unread-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
          )}
        </div>
        <span className="log-count" style={{ color: '#90A4AE', fontSize: 11 }}>
          {filteredLogs.length}/{logs.length} 条
        </span>
      </div>

      <div className="log-filters">
        {filters.map(f => (
          <button
            key={f.key}
            className={`log-filter-btn ${filter === f.key ? 'active' : ''}`}
            onClick={() => setFilter(f.key)}
            title={f.label}
          >
            <span>{f.icon}</span>
            <span className="filter-label">{f.label}</span>
          </button>
        ))}
      </div>

      <div className="log-content" ref={scrollRef}>
        {filteredLogs.length === 0 ? (
          <div className="log-empty">
            {phase === 'battle' ? '⚔️ 战斗进行中，等待事件...' : '暂无战报记录'}
          </div>
        ) : (
          filteredLogs.map((log: BattleLogType) => (
            <div
              key={log.id}
              className={`log-item ${highlightId === log.id ? 'log-highlight' : ''}`}
              style={{ borderLeftColor: getLogColor(log.type) }}
            >
              <span className="log-icon">{getLogIcon(log.type)}</span>
              <div className="log-body">
                <span className="log-message">{log.message}</span>
                <span className="log-time">{formatTime(log.timestamp)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
