import React from 'react'
import { Card, elementColors, effectTypeNames } from '../data/cards'

interface CardComponentProps {
  card: Card
  selected?: boolean
  onClick?: () => void
  size?: 'normal' | 'small'
  draggable?: boolean
  onDragStart?: (e: React.DragEvent) => void
  onDragEnd?: (e: React.DragEvent) => void
  showBack?: boolean
  index?: number
}

export const CardComponent: React.FC<CardComponentProps> = ({
  card,
  selected = false,
  onClick,
  size = 'normal',
  draggable = false,
  onDragStart,
  onDragEnd,
  showBack = false,
  index = 0,
}) => {
  const colors = elementColors[card.element]
  const width = size === 'small' ? '90px' : '120px'
  const height = size === 'small' ? '120px' : '160px'

  return (
    <div
      className={`card ${selected ? 'selected' : ''} ${size}`}
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      style={{
        '--card-width': width,
        '--card-height': height,
        '--gradient-start': colors.start,
        '--gradient-end': colors.end,
        '--card-index': index,
        transitionDelay: `${index * 0.05}s`,
      } as React.CSSProperties}
    >
      {showBack ? (
        <div className="card-back">
          <div className="card-back-pattern">✦</div>
        </div>
      ) : (
        <>
          <div className="card-header">
            <span className="card-element">{card.element[0].toUpperCase()}</span>
            <span className="card-value">{card.value}</span>
          </div>
          <div className="card-art">
            <div className="card-art-icon">
              {card.effectType === 'damage' && '⚔'}
              {card.effectType === 'shield' && '🛡'}
              {card.effectType === 'heal' && '❤'}
              {card.effectType === 'curse' && '☠'}
            </div>
          </div>
          <div className="card-footer">
            <div className="card-name">{card.name}</div>
            <div className="card-type">{effectTypeNames[card.effectType]}</div>
          </div>
        </>
      )}
    </div>
  )
}
