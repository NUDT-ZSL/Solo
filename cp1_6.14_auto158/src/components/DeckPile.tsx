import React from 'react'

interface DeckPileProps {
  remaining: number
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  label?: string
}

export const DeckPile: React.FC<DeckPileProps> = ({ remaining, position, label }) => {
  return (
    <div className={`deck-pile ${position}`}>
      {label && <div className="deck-pile-label">{label}</div>}
      <div className="deck-pile-cards">
        {remaining > 0 && <div className="deck-card deck-card-1"></div>}
        {remaining > 2 && <div className="deck-card deck-card-2"></div>}
        {remaining > 4 && <div className="deck-card deck-card-3"></div>}
      </div>
      <div className="deck-pile-count">{remaining}</div>
    </div>
  )
}
