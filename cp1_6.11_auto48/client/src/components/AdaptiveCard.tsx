import { CSSProperties } from 'react'
import './AdaptiveCard.css'

interface CardLayout {
  id: string
  score: number
  gridWeight: number
  backgroundColor: string
  textColor: string
  glowColor: string
  scoreLevel: 'high' | 'medium' | 'low'
}

interface AdaptiveCardProps {
  id: string
  title: string
  description: string
  icon: string
  layout: CardLayout
  onClick: () => void
  onHoverStart: () => void
  onHoverEnd: () => void
  isPulsing: boolean
  clickAnimations: { id: string; key: number }[]
  gridArea: string
}

function AdaptiveCard({
  title,
  description,
  icon,
  layout,
  onClick,
  onHoverStart,
  onHoverEnd,
  isPulsing,
  clickAnimations,
  gridArea,
}: AdaptiveCardProps) {
  const cardStyle: CSSProperties = {
    backgroundColor: layout.backgroundColor,
    color: layout.textColor,
    gridArea,
    transition: 'background-color 0.8s ease-in-out, color 0.8s ease-in-out, transform 0.3s ease',
  }

  const pulseStyle: CSSProperties = isPulsing
    ? {
        boxShadow: `0 0 20px ${layout.glowColor}, 0 4px 12px rgba(0,0,0,0.1)`,
        animation: 'pulseGlow 0.5s ease-in-out',
      }
    : {}

  const handleMouseDown = () => {
    onClick()
  }

  return (
    <div
      className={`adaptive-card ${isPulsing ? 'pulsing' : ''}`}
      style={{ ...cardStyle, ...pulseStyle }}
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
      onMouseDown={handleMouseDown}
    >
      <div className="card-icon">{icon}</div>
      <h3 className="card-title">{title}</h3>
      <p className="card-description">{description}</p>

      {clickAnimations.map((anim) => (
        <span key={anim.key} className="plus-one">
          +1
        </span>
      ))}

      <div className="card-score-indicator">
        <span className="score-value">{layout.score.toFixed(1)}</span>
        <span className="score-label">分</span>
      </div>
    </div>
  )
}

export default AdaptiveCard
