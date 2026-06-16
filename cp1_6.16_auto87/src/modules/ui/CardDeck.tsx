import React, { useState } from 'react'
import { TacticCard } from '../game/TacticCardSystem'

interface CardDeckProps {
  cards: TacticCard[]
  selectedCardId: string | null
  onSelectCard: (cardId: string | null) => void
  canPlay: boolean
}

const CardDeck: React.FC<CardDeckProps> = ({
  cards,
  selectedCardId,
  onSelectCard,
  canPlay
}) => {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)
  const [flippingCards, setFlippingCards] = useState<Set<string>>(new Set())

  const handleCardClick = (cardId: string) => {
    if (!canPlay) return

    if (!flippingCards.has(cardId)) {
      setFlippingCards(prev => new Set(prev).add(cardId))
      setTimeout(() => {
        setFlippingCards(prev => {
          const next = new Set(prev)
          next.delete(cardId)
          return next
        })
      }, 500)
    }

    onSelectCard(selectedCardId === cardId ? null : cardId)
  }

  const getCardColor = (type: string): string => {
    switch (type) {
      case 'ambush': return '#8B4513'
      case 'fireAttack': return '#B22222'
      case 'rally': return '#DAA520'
      case 'confusion': return '#6A0DAD'
      default: return '#DEB887'
    }
  }

  return (
    <div className="card-deck-container">
      <div className="deck-title">🎴 计策卡牌 ({cards.length}/5)</div>
      <div className="card-hand">
        {cards.length === 0 && (
          <div className="empty-hand">暂无卡牌，请等待下一回合抽牌</div>
        )}
        {cards.map((card, index) => {
          const isSelected = selectedCardId === card.id
          const isHovered = hoveredCard === card.id
          const isFlipping = flippingCards.has(card.id)
          const rotation = (index - cards.length / 2) * 3

          return (
            <div
              key={card.id}
              className={`tactic-card ${isSelected ? 'selected' : ''} ${isFlipping ? 'flipping' : ''} ${!canPlay ? 'disabled' : ''}`}
              onClick={() => handleCardClick(card.id)}
              onMouseEnter={() => setHoveredCard(card.id)}
              onMouseLeave={() => setHoveredCard(null)}
              style={{
                transform: `rotate(${rotation}deg) translateY(${isHovered || isSelected ? -20 : 0}px) scale(${isSelected ? 1.1 : 1})`,
                zIndex: isSelected ? 20 : isHovered ? 10 : index
              }}
            >
              <div className="card-inner">
                <div className="card-front" style={{ borderColor: getCardColor(card.type) }}>
                  <div className="card-icon" style={{ background: getCardColor(card.type) }}>
                    {card.icon}
                  </div>
                  <div className="card-name">{card.name}</div>
                  <div className="card-description">{card.description}</div>
                  <div className="card-type-badge">
                    {card.needsTarget === 'none' ? '立即生效' : card.needsTarget === 'unit' ? '指定单位' : '指定区域'}
                  </div>
                </div>
                <div className="card-back">
                  <div className="card-back-pattern">
                    <div className="card-back-seal">策</div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      {selectedCardId && (
        <div className="card-hint">
          ✨ 已选择计策，请点击目标{cards.find(c => c.id === selectedCardId)?.needsTarget === 'unit' ? '单位' : cards.find(c => c.id === selectedCardId)?.needsTarget === 'cell' ? '格子' : '再次点击卡牌使用'}，或再次点击卡牌取消
        </div>
      )}
    </div>
  )
}

export default CardDeck
