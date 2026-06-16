import React, { useEffect, useState } from 'react'
import { User } from '@game/collaboration'
import { formatTime } from '@game/puzzleBoard'
import './CelebrationModal.css'

interface CelebrationModalProps {
  isOpen: boolean
  totalTime: number
  users: User[]
  onClose: () => void
}

const CelebrationModal: React.FC<CelebrationModalProps> = ({
  isOpen,
  totalTime,
  users,
  onClose,
}) => {
  const [confettiPieces, setConfettiPieces] = useState<Array<{
    id: number
    left: number
    delay: number
    duration: number
    color: string
    size: number
  }>>([])

  useEffect(() => {
    if (isOpen) {
      const colors = ['#F39C12', '#3498DB', '#E74C3C', '#2ECC71', '#9B59B6', '#FFD700']
      const pieces = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.3,
        duration: 0.8,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 6 + Math.random() * 8,
      }))
      setConfettiPieces(pieces)
    } else {
      setConfettiPieces([])
    }
  }, [isOpen])

  if (!isOpen) return null

  const sortedUsers = [...users].sort((a, b) => b.piecesCompleted - a.piecesCompleted)

  return (
    <div className="celebration-overlay">
      <div className="confetti-container">
        {confettiPieces.map((piece) => (
          <div
            key={piece.id}
            className="confetti-piece"
            style={{
              left: `${piece.left}%`,
              backgroundColor: piece.color,
              width: `${piece.size}px`,
              height: `${piece.size}px`,
              animationDelay: `${piece.delay}s`,
              animationDuration: `${piece.duration}s`,
            }}
          />
        ))}
      </div>

      <div className="celebration-modal">
        <h2 className="celebration-title">
          🎉 恭喜完成！🎉
        </h2>

        <div className="total-time">
          <span className="time-label">总耗时</span>
          <span className="time-value">{formatTime(totalTime)}</span>
        </div>

        <div className="ranking-section">
          <h3 className="ranking-title">贡献排名</h3>
          <div className="ranking-list">
            {sortedUsers.map((user, index) => (
              <div key={user.id} className="ranking-item">
                <div className="rank-badge" style={{ backgroundColor: index < 3 ? '#F39C12' : '#5D6D7E' }}>
                  {index + 1}
                </div>
                <div className="user-avatar-small" style={{ backgroundColor: user.avatarColor }}>
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="user-name-rank">{user.name}</span>
                <span className="user-score">{user.piecesCompleted} 块</span>
              </div>
            ))}
          </div>
        </div>

        <button className="close-button" onClick={onClose}>
          继续游戏
        </button>
      </div>
    </div>
  )
}

export default CelebrationModal
