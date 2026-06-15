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
  const isInitial = layout.score === 0

  const cardStyle: CSSProperties = {
    '--glow-color': layout.glowColor,
    color: layout.textColor,
    gridArea,
    transition: 'background-color 0.8s ease-in-out, background 0.8s ease-in-out, color 0.8s ease-in-out, box-shadow 0.5s ease, transform 0.3s ease',
  } as CSSProperties

  if (isInitial) {
    cardStyle.background = 'linear-gradient(135deg, #add8e6 0%, #c5e3f0 100%)'
  } else {
    cardStyle.backgroundColor = layout.backgroundColor
  }

  return (
    <div
      className={`adaptive-card ${isPulsing ? 'pulsing' : ''}`}
      style={cardStyle}
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
      onClick={onClick}
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
