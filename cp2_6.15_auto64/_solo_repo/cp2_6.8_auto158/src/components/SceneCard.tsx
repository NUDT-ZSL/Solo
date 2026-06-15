import React from 'react'

export type SceneType = 'traffic' | 'ocean' | 'space'

interface SceneCardProps {
  type: SceneType
  label: string
  icon: string
  active: boolean
  onClick: () => void
}

const SceneCard: React.FC<SceneCardProps> = ({ type, label, icon, active, onClick }) => {
  const cardClass = `scene-card card-${type} ${active ? 'active' : ''}`

  return (
    <div className={cardClass} onClick={onClick}>
      <div className="card-icon">{icon}</div>
      <div className="card-label">{label}</div>
    </div>
  )
}

export default SceneCard
