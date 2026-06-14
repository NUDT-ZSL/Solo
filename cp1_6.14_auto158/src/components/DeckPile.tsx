import React from 'react'

interface DeckPileProps {
  remaining: number
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
}

export const DeckPile: React.FC<DeckPileProps> = ({ remainingCount, position }) => {
  return (
    <div className={`deck-pile ${position}`}>
      <div className="deck-pile-cards">
        {remainingCount > 0 && <div className="deck-card deck-card-1"></div>}
        {remainingCount > 2 && <div className="deck-card deck-card-2"></div>}
        {remainingCount > 4 && <div className="deck-card deck-card-3"></div>}
      </div>
      <div className="deck-pile-count">{remainingCount}</div>
    </div>
  )
}
