import React, { useEffect, useRef } from 'react'
import { useGame } from '../context/GameContext'

export const BattleLog: React.FC = () => {
  const { logs, phase } = useGame()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs.length])

  if (phase !== 'battle' && phase !== 'result') return null

  const getLogColor = (type: string) => {
    switch (type) {
      case 'attack': return '#FF8A65'
      case 'skill': return '#CE93D8'
      case 'death': return '#FF5252'
      case 'heal': return '#81C784'
      case 'stun': return '#1E88E5'
      default: return '#E0E0FF'
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

  return (
    <div className="battle-log-panel">
      <div className="log-header">
        <h3>📜 战斗战报</h3>
        <span className="log-count">{logs.length} 条</span>
      </div>
      <div className="log-content" ref={scrollRef}>
        {logs.length === 0 ? (
          <div className="log-empty">等待战斗开始...</div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className="log-item"
              style={{ borderLeftColor: getLogColor(log.type) }}
            >
              <span className="log-icon">{getLogIcon(log.type)}</span>
              <span className="log-message">{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
